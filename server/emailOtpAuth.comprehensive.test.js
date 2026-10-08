import { describe, expect, it, beforeEach } from "vitest";
import {
  registerAccount,
  loginStep1,
  loginStep2,
  resendLoginOtp,
  forgotPasswordRequest,
  forgotPasswordVerify,
  forgotPasswordReset,
  logout,
} from "./controllers/auth.controller.js";
import {
  changePassword,
} from "./controllers/user.controller.js";
import {
  getUserByIdentifier,
} from "./db.js";
import {
  __getLastDispatchedOtpFor,
  __clearDispatchedNotifications,
} from "./services/emailService.js";
import {
  __peekOtpChallengeForTesting,
} from "./services/otp.service.js";
import { isSessionTokenRevoked } from "./services/session.service.js";
import { COOKIE_NAME } from "../shared/const.js";

function createMockReq(overrides = {}) {
  return {
    headers: {},
    cookies: {},
    body: {},
    params: {},
    query: {},
    user: null,
    ip: "127.0.0.1",
    ...overrides,
  };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    clearedCookies: [],
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    cookie(name, val, opts) {
      this.cookies[name] = { val, opts };
      return this;
    },
    clearCookie(name, opts) {
      this.clearedCookies.push({ name, opts });
      delete this.cookies[name];
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
  };
  return res;
}

describe("Comprehensive Email OTP Authentication Suite", () => {
  const timestamp = Date.now();
  const testEmail = `comprehensive_user_${timestamp}@prava.in`;
  const initialPassword = "SecureUserPassword!2026";
  const newPassword = "UpdatedSecurePassword#2026";

  let createdUser = null;
  let activeChallengeId = null;
  let activeSessionToken = null;

  beforeEach(() => {
    // Fresh state before each test
  });

  // 1. REGISTRATION
  it("Scenario 1: Registration creates user with hashed password & issues OTP challenge without session", async () => {
    const req = createMockReq();
    const res = createMockRes();

    const regResult = await registerAccount({ req, res }, {
      companyName: "Comprehensive Systems Pvt Ltd",
      email: testEmail,
      password: initialPassword,
    });

    expect(regResult.success).toBe(true);
    expect(regResult.requiresOtp).toBe(true);
    expect(regResult.challengeId).toBeDefined();
    // Must NOT issue authenticated session yet
    expect(res.cookies[COOKIE_NAME]).toBeUndefined();

    createdUser = await getUserByIdentifier(testEmail);
    expect(createdUser).toBeDefined();
    expect(createdUser.passwordHash).toBeDefined();
    expect(createdUser.passwordHash).not.toBe(initialPassword);
  });

  // 2. LOGIN WITH WRONG PASSWORD
  it("Scenario 2: Login with wrong password is rejected with generic error", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep1({ req, res }, {
        email: testEmail,
        password: "CompletelyWrongPassword123",
      })
    ).rejects.toThrow(/invalid/i);

    expect(res.cookies[COOKIE_NAME]).toBeUndefined();
  });

  // 3. LOGIN STEP 1 (CORRECT PASSWORD) -> DISPATCHES OTP
  it("Scenario 3: Login with correct password generates 6-digit OTP and does NOT authenticate yet", async () => {
    const req = createMockReq();
    const res = createMockRes();

    const result = await loginStep1({ req, res }, {
      email: testEmail,
      password: initialPassword,
    });

    expect(result.success).toBe(true);
    expect(result.requiresOtp).toBe(true);
    expect(result.challengeId).toBeDefined();
    expect(result.maskedTarget).toContain("***");
    expect(result.expiryMinutes).toBe(5);

    // CRITICAL: User is NOT authenticated yet
    expect(res.cookies[COOKIE_NAME]).toBeUndefined();

    activeChallengeId = result.challengeId;

    // Verify OTP was dispatched and has 6 digits
    const dispatchedCode = __getLastDispatchedOtpFor(testEmail);
    expect(dispatchedCode).toBeDefined();
    expect(dispatchedCode).toMatch(/^\d{6}$/);
  });

  // 4. WRONG OTP
  it("Scenario 4: Entering an incorrect OTP rejects and does NOT create a session", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep2({ req, res }, {
        challengeId: activeChallengeId,
        otp: "000000",
      })
    ).rejects.toThrow(/invalid/i);

    expect(res.cookies[COOKIE_NAME]).toBeUndefined();
  });

  // 5. EXPIRED OTP
  it("Scenario 5: Entering an expired OTP rejects with expiration message", async () => {
    const entry = __peekOtpChallengeForTesting(activeChallengeId);
    expect(entry).toBeDefined();
    // Simulate expired OTP
    entry.expiresAt = Date.now() - 1000;

    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep2({ req, res }, {
        challengeId: activeChallengeId,
        otp: "123456",
      })
    ).rejects.toThrow(/expired/i);

    expect(res.cookies[COOKIE_NAME]).toBeUndefined();
  });

  // 6. 5 FAILED OTP ATTEMPTS -> BRUTE FORCE PROTECTION
  it("Scenario 6: 5 consecutive failed OTP attempts revokes challenge with rate limit error", async () => {
    // Generate fresh challenge
    const reqStep1 = createMockReq();
    const resStep1 = createMockRes();
    const step1 = await loginStep1({ req: reqStep1, res: resStep1 }, {
      email: testEmail,
      password: initialPassword,
    });
    const challengeId = step1.challengeId;

    // Fail 5 times
    for (let i = 1; i <= 5; i++) {
      const req = createMockReq();
      const res = createMockRes();
      await expect(
        loginStep2({ req, res }, {
          challengeId,
          otp: "999999",
        })
      ).rejects.toThrow();
    }

    // 6th attempt should be rejected with rate limit / expired error
    const finalReq = createMockReq();
    const finalRes = createMockRes();
    await expect(
      loginStep2({ req: finalReq, res: finalRes }, {
        challengeId,
        otp: "999999",
      })
    ).rejects.toThrow(/invalid or expired|too many attempts/i);
  });

  // 7. RESEND COOLDOWN ENFORCEMENT
  it("Scenario 7: Resend OTP enforces cooldown before allowing a new code", async () => {
    const req = createMockReq();
    const res = createMockRes();
    const step1 = await loginStep1({ req, res }, {
      email: testEmail,
      password: initialPassword,
    });
    const challengeId = step1.challengeId;

    // Immediate resend should violate cooldown
    await expect(
      resendLoginOtp({ challengeId })
    ).rejects.toThrow(/wait/i);
  });

  // 8. RESEND OTP ISSUES NEW CODE & INVALIDATES OLD ONE
  it("Scenario 8: Resend OTP generates new OTP and invalidates previous OTP", async () => {
    const req = createMockReq();
    const res = createMockRes();
    const step1 = await loginStep1({ req, res }, {
      email: testEmail,
      password: initialPassword,
    });
    const challengeId = step1.challengeId;
    const oldCode = __getLastDispatchedOtpFor(testEmail);

    // Fast-forward cooldown
    const entry = __peekOtpChallengeForTesting(challengeId);
    entry.lastSentAt = Date.now() - 65000;

    const resendRes = await resendLoginOtp({ challengeId });
    expect(resendRes.success).toBe(true);

    const newCode = __getLastDispatchedOtpFor(testEmail);
    expect(newCode).toBeDefined();
    expect(newCode).not.toBe(oldCode);

    // Old code must now fail
    const reqOld = createMockReq();
    const resOld = createMockRes();
    await expect(
      loginStep2({ req: reqOld, res: resOld }, {
        challengeId,
        otp: oldCode,
      })
    ).rejects.toThrow(/invalid/i);

    // New code succeeds
    const reqNew = createMockReq();
    const resNew = createMockRes();
    const verifyRes = await loginStep2({ req: reqNew, res: resNew }, {
      challengeId,
      otp: newCode,
    });

    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.email).toBe(testEmail);
    expect(verifyRes.token).toBeDefined();
    expect(resNew.cookies[COOKIE_NAME]).toBeDefined();
    expect(resNew.cookies[COOKIE_NAME].opts.httpOnly).toBe(true);

    activeSessionToken = verifyRes.token;
  });

  // 9. FORGOT PASSWORD FLOW
  it("Scenario 9: Forgot password flow requests OTP, verifies OTP, and resets password", async () => {
    // 1. Request reset OTP
    const reqResult = await forgotPasswordRequest({
      email: testEmail,
    });
    expect(reqResult.success).toBe(true);
    expect(reqResult.requiresOtp).toBe(true);
    expect(reqResult.challengeId).toBeDefined();

    const resetOtp = __getLastDispatchedOtpFor(testEmail);
    expect(resetOtp).toBeDefined();

    // 2. Verify reset OTP -> returns resetToken
    const verifyResult = await forgotPasswordVerify({
      challengeId: reqResult.challengeId,
      otp: resetOtp,
    });
    expect(verifyResult.success).toBe(true);
    expect(verifyResult.resetToken).toBeDefined();

    // 3. Set new password
    const resetResult = await forgotPasswordReset({
      resetToken: verifyResult.resetToken,
      newPassword: newPassword,
      confirmPassword: newPassword,
    });
    expect(resetResult.success).toBe(true);

    // 4. Old password should now fail login
    const failReq = createMockReq();
    const failRes = createMockRes();
    await expect(
      loginStep1({ req: failReq, res: failRes }, {
        email: testEmail,
        password: initialPassword,
      })
    ).rejects.toThrow();

    // 5. New password succeeds login step 1
    const passReq = createMockReq();
    const passRes = createMockRes();
    const step1Result = await loginStep1({ req: passReq, res: passRes }, {
      email: testEmail,
      password: newPassword,
    });
    expect(step1Result.requiresOtp).toBe(true);
  });

  // 10. CHANGE PASSWORD FROM AUTHENTICATED PROFILE
  it("Scenario 10: Authenticated user changes password and invalidates previous sessions", async () => {
    const user = await getUserByIdentifier(testEmail);
    const updatedPassVal = "SuperFreshPassword!2027";

    const changeResult = await changePassword(user, {
      currentPassword: newPassword,
      newPassword: updatedPassVal,
      confirmPassword: updatedPassVal,
    });

    expect(changeResult.success).toBe(true);

    // Verify session token was revoked
    expect(isSessionTokenRevoked(activeSessionToken)).toBe(true);

    // Login with new changed password succeeds
    const req = createMockReq();
    const res = createMockRes();
    const loginRes = await loginStep1({ req, res }, {
      email: testEmail,
      password: updatedPassVal,
    });
    expect(loginRes.requiresOtp).toBe(true);
  });

  // 11. LOGOUT
  it("Scenario 11: Logout destroys session cookie and revokes token", async () => {
    const req = createMockReq({
      headers: {
        authorization: `Bearer ${activeSessionToken}`,
      },
    });
    const res = createMockRes();

    const logoutResult = logout({ req, res });
    expect(logoutResult.success).toBe(true);
    expect(res.clearedCookies.length).toBeGreaterThan(0);
    expect(isSessionTokenRevoked(activeSessionToken)).toBe(true);
  });

  // 12. PROTECTED ROUTES REJECT UNAUTHENTICATED USERS
  it("Scenario 12: Protected middleware strictly rejects unauthenticated users", async () => {
    const { requireUser } = await import("./_core/middleware.js");

    const unauthedReq = createMockReq({ user: null });
    const res = createMockRes();
    let nextCalled = false;

    requireUser(unauthedReq, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
  });
});
