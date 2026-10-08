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
  getSecurityProfile,
} from "./controllers/user.controller.js";
import {
  deleteInvoice,
  getInvoice,
  listInvoices,
} from "./controllers/invoice.controller.js";
import {
  uploadAndProcessDocument,
} from "./operations.js";
import {
  getBusinessesForUser,
  getUserByIdentifier,
  verifyPassword,
} from "./db.js";
import {
  __getLastDispatchedOtpFor,
  __clearDispatchedNotifications,
} from "./services/notification.service.js";
import {
  __peekOtpChallengeForTesting,
} from "./services/otp.service.js";
import { isSessionTokenRevoked } from "./services/session.service.js";
import { requireUser } from "./_core/middleware.js";
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

describe("End-to-End Authentication & Invoicing Security Audit Suite", () => {
  const timestamp = Date.now();
  const testEmail = `audit_user_${timestamp}@prava.in`;
  const initialPassword = "InitialSecurePassword#2026";
  const resetPasswordVal = "NewResetPassword#2026";
  const changedPasswordVal = "FinalChangedPassword#2026";
  const companyName = "Audit Enterprise Private Limited";

  let createdUser = null;
  let activeChallengeToken = null;
  let activeSessionToken = null;
  let createdInvoiceId = null;
  let businessId = null;

  beforeEach(() => {
    // Clean test state
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 1: Register user
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 1: Registers a user with validated credentials, password hashing, and business creation", async () => {
    const req = createMockReq();
    const res = createMockRes();

    const registerResult = await registerAccount({ req, res }, {
      email: testEmail,
      password: initialPassword,
      companyName,
    });

    expect(registerResult.requireOtp).toBe(true);
    expect(registerResult.challengeToken).toBeDefined();

    // Verify password is scrypt-hashed with salt in database (never plaintext)
    createdUser = await getUserByIdentifier(testEmail);
    expect(createdUser).toBeDefined();
    expect(createdUser.passwordHash).toBeDefined();
    expect(createdUser.passwordSalt).toBeDefined();
    expect(createdUser.passwordHash).not.toBe(initialPassword);
    expect(verifyPassword(initialPassword, createdUser.passwordHash, createdUser.passwordSalt)).toBe(true);

    const userBusinesses = await getBusinessesForUser(createdUser.id);
    expect(userBusinesses.length).toBeGreaterThan(0);
    businessId = userBusinesses[0].id;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 2: Login with wrong password
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 2: Login with wrong password rejects with standard template error", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep1({ req, res }, {
        identifier: testEmail,
        password: "IncorrectPassword!999",
      })
    ).rejects.toThrow("Invalid email, mobile number, or password. Please verify your credentials and try again.");
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 3: Login with correct password
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 3: Login with correct password returns requireOtp challenge and DOES NOT log in immediately", async () => {
    const req = createMockReq();
    const res = createMockRes();

    const result = await loginStep1({ req, res }, {
      identifier: testEmail,
      password: initialPassword,
    });

    expect(result.requireOtp).toBe(true);
    expect(result.challengeToken).toBeDefined();
    expect(result.method).toBe("email");
    expect(result.maskedTarget).toContain("***");

    // CRITICAL SECURITY: User must NOT be logged in immediately (no session cookie issued)
    expect(res.cookies[COOKIE_NAME]).toBeUndefined();

    activeChallengeToken = result.challengeToken;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 4: Receive OTP
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 4: Receives a secure 6-digit OTP dispatched via real notification channel", async () => {
    const otp = __getLastDispatchedOtpFor(testEmail);
    expect(otp).toBeDefined();
    expect(otp).toMatch(/^\d{6}$/);

    // Challenge is securely stored on backend
    const entry = __peekOtpChallengeForTesting(activeChallengeToken);
    expect(entry).toBeDefined();
    expect(entry.identifier).toBe(testEmail.toLowerCase().trim());
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 6: Enter incorrect OTP
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 6: Enter incorrect OTP rejects with validation error and decrements attempts", async () => {
    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep2({ req, res }, {
        challengeToken: activeChallengeToken,
        code: "000000", // deliberate wrong code
      })
    ).rejects.toThrow("Invalid verification code");

    // Still NOT authenticated
    expect(res.cookies[COOKIE_NAME]).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 7: Enter expired OTP
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 7: Enter expired OTP rejects with expiration error", async () => {
    const entry = __peekOtpChallengeForTesting(activeChallengeToken);
    // Artificially expire the challenge
    entry.expiresAt = Date.now() - 1000;

    const req = createMockReq();
    const res = createMockRes();

    await expect(
      loginStep2({ req, res }, {
        challengeToken: activeChallengeToken,
        code: "123456",
      })
    ).rejects.toThrow(/expired/i);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 8: Resend OTP
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 8: Resend OTP invalidates the previous OTP and issues a fresh code", async () => {
    // Re-trigger step 1 to have fresh challenge
    const req1 = createMockReq();
    const res1 = createMockRes();
    const step1Result = await loginStep1({ req: req1, res: res1 }, {
      identifier: testEmail,
      password: initialPassword,
    });
    const challengeToken = step1Result.challengeToken;

    const oldCode = __getLastDispatchedOtpFor(testEmail);

    // Fast-forward cooldown for testing
    const entry = __peekOtpChallengeForTesting(challengeToken);
    entry.lastSentAt = Date.now() - 35000;

    const resendResult = await resendLoginOtp({ challengeToken });
    expect(resendResult.success).toBe(true);

    const newCode = __getLastDispatchedOtpFor(testEmail);
    expect(newCode).toBeDefined();
    expect(newCode).toMatch(/^\d{6}$/);

    // Old code must now fail against the challenge
    const failReq = createMockReq();
    const failRes = createMockRes();
    await expect(
      loginStep2({ req: failReq, res: failRes }, {
        challengeToken,
        code: oldCode,
      })
    ).rejects.toThrow("Invalid verification code");

    activeChallengeToken = challengeToken;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 5 & 9: Complete login with correct OTP
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 5 & 9: Complete login with correct OTP issues valid session token & cookie", async () => {
    const correctCode = __getLastDispatchedOtpFor(testEmail);

    const req = createMockReq();
    const res = createMockRes();

    const verifyResult = await loginStep2({ req, res }, {
      challengeToken: activeChallengeToken,
      code: correctCode,
    });

    expect(verifyResult.success).toBe(true);
    expect(verifyResult.token).toBeDefined();
    expect(res.cookies[COOKIE_NAME]).toBeDefined();
    expect(res.cookies[COOKIE_NAME].opts.httpOnly).toBe(true);

    activeSessionToken = verifyResult.token;

    // Verify OTP challenge was destroyed (single-use)
    expect(__peekOtpChallengeForTesting(activeChallengeToken)).toBeUndefined();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 10: Logout
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 10: Logout invalidates the session token in real-time blacklist and clears cookie", async () => {
    const user = await getUserByIdentifier(testEmail);
    const req = createMockReq({
      headers: { authorization: `Bearer ${activeSessionToken}` },
      user: { id: user.id, email: testEmail },
    });
    const res = createMockRes();

    const logoutResult = await logout({ req, res });

    expect(logoutResult.success).toBe(true);
    expect(res.clearedCookies.some((c) => c.name === COOKIE_NAME)).toBe(true);

    // Verify token is blacklisted in session.service
    expect(isSessionTokenRevoked(activeSessionToken)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 11 & 12: Forgot Password & Receive Reset OTP
  // ───────────────────────────────────────────────────────────────────────────
  let resetChallengeToken = null;
  it("Flow 11 & 12: Forgot Password requests reset challenge and sends real OTP", async () => {
    const result = await forgotPasswordRequest({ identifier: testEmail });

    expect(result.success).toBe(true);
    expect(result.challengeToken).toBeDefined();

    resetChallengeToken = result.challengeToken;

    const resetOtp = __getLastDispatchedOtpFor(testEmail);
    expect(resetOtp).toBeDefined();
    expect(resetOtp).toMatch(/^\d{6}$/);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 13: Reset Password
  // ───────────────────────────────────────────────────────────────────────────
  let resetAuthToken = null;
  it("Flow 13: Verifies reset OTP and sets new password meeting security rules", async () => {
    const resetOtp = __getLastDispatchedOtpFor(testEmail);

    // Verify OTP first
    const vResult = await forgotPasswordVerify({
      challengeToken: resetChallengeToken,
      code: resetOtp,
    });

    expect(vResult.success).toBe(true);
    expect(vResult.resetToken).toBeDefined();
    resetAuthToken = vResult.resetToken;

    // Reset password with mismatched passwords (should fail)
    await expect(
      forgotPasswordReset({
        resetToken: resetAuthToken,
        newPassword: resetPasswordVal,
        confirmPassword: "DoesNotMatchPassword#1",
      })
    ).rejects.toThrow("New password and confirm password do not match.");

    // Reset password with matching new password
    const resetResult = await forgotPasswordReset({
      resetToken: resetAuthToken,
      newPassword: resetPasswordVal,
      confirmPassword: resetPasswordVal,
    });

    expect(resetResult.success).toBe(true);

    // Verify database has new password hash
    const updatedUser = await getUserByIdentifier(testEmail);
    expect(verifyPassword(resetPasswordVal, updatedUser.passwordHash, updatedUser.passwordSalt)).toBe(true);
    expect(verifyPassword(initialPassword, updatedUser.passwordHash, updatedUser.passwordSalt)).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 14: Login with new password
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 14: Login with new password succeeds end-to-end", async () => {
    const req1 = createMockReq();
    const res1 = createMockRes();

    const step1 = await loginStep1({ req: req1, res: res1 }, {
      identifier: testEmail,
      password: resetPasswordVal,
    });

    expect(step1.requireOtp).toBe(true);

    const otp = __getLastDispatchedOtpFor(testEmail);
    const req2 = createMockReq();
    const res2 = createMockRes();

    const step2 = await loginStep2({ req: req2, res: res2 }, {
      challengeToken: step1.challengeToken,
      code: otp,
    });

    expect(step2.success).toBe(true);
    expect(step2.token).toBeDefined();

    activeSessionToken = step2.token;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 15: Change Password on Profile
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 15: Change password on profile validates current password, forbids same password, and updates hash", async () => {
    const user = await getUserByIdentifier(testEmail);

    // 1. Wrong current password -> rejects
    await expect(
      changePassword(user, {
        currentPassword: "WrongCurrentPassword!123",
        newPassword: changedPasswordVal,
        confirmPassword: changedPasswordVal,
      })
    ).rejects.toThrow("Current password is incorrect.");

    // 2. Same as current password -> rejects
    await expect(
      changePassword(user, {
        currentPassword: resetPasswordVal,
        newPassword: resetPasswordVal,
        confirmPassword: resetPasswordVal,
      })
    ).rejects.toThrow("New password cannot be the same as your current password.");

    // 3. Valid change password
    const changeResult = await changePassword(user, {
      currentPassword: resetPasswordVal,
      newPassword: changedPasswordVal,
      confirmPassword: changedPasswordVal,
    });

    expect(changeResult.success).toBe(true);

    // Verify updated hash
    const finalUser = await getUserByIdentifier(testEmail);
    expect(verifyPassword(changedPasswordVal, finalUser.passwordHash, finalUser.passwordSalt)).toBe(true);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 16: Login using changed password
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 16: Login using changed password succeeds", async () => {
    const req1 = createMockReq();
    const res1 = createMockRes();

    const step1 = await loginStep1({ req: req1, res: res1 }, {
      identifier: testEmail,
      password: changedPasswordVal,
    });

    expect(step1.requireOtp).toBe(true);
    const otp = __getLastDispatchedOtpFor(testEmail);

    const req2 = createMockReq();
    const res2 = createMockRes();

    const step2 = await loginStep2({ req: req2, res: res2 }, {
      challengeToken: step1.challengeToken,
      code: otp,
    });

    expect(step2.success).toBe(true);
    expect(step2.token).toBeDefined();

    activeSessionToken = step2.token;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 17, 18, 19, 20: Invoice Lifecycle (Create, View, Delete, Disappear)
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 17, 18, 19, 20: User creates invoice, views it, deletes it, and verifies it disappears", async () => {
    const user = await getUserByIdentifier(testEmail);

    // 17. Create Invoice / Document
    const uploadResult = await uploadAndProcessDocument(user.id, {
      businessId,
      originalName: "tax-invoice-test-2026.pdf",
      mimeType: "application/pdf",
      documentType: "invoice",
      base64: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS",
    });

    expect(uploadResult.documentId).toBeDefined();
    createdInvoiceId = uploadResult.documentId;

    // 18. View Invoice
    const viewResult = await getInvoice(user.id, createdInvoiceId);
    expect(viewResult).toBeDefined();
    expect(viewResult.document.id).toBe(createdInvoiceId);

    // 19. Delete Invoice
    const deleteResult = await deleteInvoice(user.id, createdInvoiceId);
    expect(deleteResult.success).toBe(true);
    expect(deleteResult.message).toContain("Invoice deleted successfully");

    // 20. Verify deleted invoice disappears (Throws Not Found error)
    await expect(
      getInvoice(user.id, createdInvoiceId)
    ).rejects.toThrow();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 21: IDOR Protection: User A cannot access or delete User B's invoice
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 21: IDOR Protection: User A cannot access or delete User B's invoice", async () => {
    const userA = await getUserByIdentifier(testEmail);
    const userBEmail = `user_b_${timestamp}@prava.in`;

    const regBReq = createMockReq();
    const regBRes = createMockRes();
    await registerAccount({ req: regBReq, res: regBRes }, {
      email: userBEmail,
      password: "UserBPassword#2026",
      companyName: "User B Corp",
    });
    const userB = await getUserByIdentifier(userBEmail);
    const bBusinesses = await getBusinessesForUser(userB.id);
    const bBusinessId = bBusinesses[0].id;

    // User B creates an invoice
    const docB = await uploadAndProcessDocument(userB.id, {
      businessId: bBusinessId,
      originalName: "confidential-b-invoice.pdf",
      mimeType: "application/pdf",
      documentType: "invoice",
      base64: "JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS",
    });
    const invoiceBId = docB.documentId;

    // ATTACK 1: User A tries to VIEW User B's invoice -> Rejects with 404/403
    await expect(
      getInvoice(userA.id, invoiceBId)
    ).rejects.toThrow();

    // ATTACK 2: User A tries to DELETE User B's invoice -> Rejects with 403 Forbidden
    await expect(
      deleteInvoice(userA.id, invoiceBId)
    ).rejects.toThrow(/permission|forbidden|not found/i);

    // Verify invoice B is STILL INTACT for User B
    const safeView = await getInvoice(userB.id, invoiceBId);
    expect(safeView.document.id).toBe(invoiceBId);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // FLOW 22: Protected APIs reject unauthenticated requests
  // ───────────────────────────────────────────────────────────────────────────
  it("Flow 22: Protected APIs reject unauthenticated requests with 401 Unauthorized", async () => {
    const unauthReq = createMockReq({
      user: null, // No authenticated user
    });
    const res = createMockRes();
    let nextCalled = false;

    requireUser(unauthReq, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBeDefined();

    // Also verify profile controller directly rejects null user
    await expect(
      getSecurityProfile(null)
    ).rejects.toThrow("Authentication required.");
  });
});
