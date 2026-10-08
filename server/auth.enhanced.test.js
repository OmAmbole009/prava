import { describe, expect, it } from "vitest";
import { signInUnified, requestOtp, signInWithOtp } from "./adminLogin.js";
import { getUserByIdentifier, registerUser, verifyPassword } from "./db.js";

describe("Enhanced Authentication & Security", () => {
  it("rejects login with unknown email/mobile with standard template error", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    await expect(
      signInUnified(mockCtx, {
        identifier: "nonexistent_user_999@test.com",
        password: "anyPassword123",
      })
    ).rejects.toThrow("Invalid email, mobile number, or password. Please verify your credentials and try again.");
  });

  it("registers a new business user, securely hashes password, and allows sign in only with correct password", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const email = `testfounder_${Date.now()}@prava.in`;
    const password = "SuperSecretPassword#123";

    // 1. Explicit registration
    const registerRes = await signInUnified(mockCtx, {
      email,
      password,
      companyName: "Zenith FinTech Pvt Ltd",
      isRegistration: true,
    });

    expect(registerRes.success).toBe(true);
    expect(registerRes.user.email).toBe(email);
    expect(registerRes.user.name).toBe("Zenith FinTech Pvt Ltd");

    // Verify password was hashed in database
    const user = await getUserByIdentifier(email);
    expect(user).toBeDefined();
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordSalt).toBeDefined();
    expect(user.passwordHash).not.toBe(password); // must be hashed, not plaintext
    expect(verifyPassword(password, user.passwordHash, user.passwordSalt)).toBe(true);

    // 2. Reject sign in with incorrect password
    await expect(
      signInUnified(mockCtx, {
        identifier: email,
        password: "WrongPassword!456",
      })
    ).rejects.toThrow("Invalid email, mobile number, or password. Please verify your credentials and try again.");

    // 3. Accept sign in with correct password
    const loginRes = await signInUnified(mockCtx, {
      identifier: email,
      password,
    });
    expect(loginRes.success).toBe(true);
    expect(loginRes.user.email).toBe(email);
  });

  it("registers and logs in a user using mobile phone number", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const phone = `+9198${Math.floor(10000000 + Math.random() * 90000000)}`;
    const password = "MobileUserPassword#789";

    const registerRes = await signInUnified(mockCtx, {
      phone,
      password,
      companyName: "Mobile Retail Services",
      isRegistration: true,
    });

    expect(registerRes.success).toBe(true);
    expect(registerRes.user.phone).toBe(phone);

    // Sign in using mobile phone
    const loginRes = await signInUnified(mockCtx, {
      identifier: phone,
      password,
    });
    expect(loginRes.success).toBe(true);
    expect(loginRes.user.name).toBe("Mobile Retail Services");

    // Reject wrong password on mobile
    await expect(
      signInUnified(mockCtx, {
        identifier: phone,
        password: "WrongPassword999",
      })
    ).rejects.toThrow("Invalid email, mobile number, or password. Please verify your credentials and try again.");
  });

  it("handles mobile SMS OTP request, verification, and session creation", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const mobile = "+919876543210";

    // 1. Send OTP
    const sendRes = await requestOtp({
      identifier: mobile,
      method: "mobile",
    });
    expect(sendRes.success).toBe(true);
    expect(sendRes.channel).toBe("mobile");
    expect(sendRes.previewCode).toBeDefined();

    const code = sendRes.previewCode;

    // 2. Reject invalid OTP code
    await expect(
      signInWithOtp(mockCtx, {
        identifier: mobile,
        code: "000000",
      })
    ).rejects.toThrow("Invalid verification code");

    // 3. Authenticate with correct OTP code
    const verifyRes = await signInWithOtp(mockCtx, {
      identifier: mobile,
      code,
      name: "SMS Verified User",
    });
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.role).toBe("user");
    expect(verifyRes.user.name).toBe("SMS Verified User");
  });

  it("handles Gmail / Email OTP request, verification, and session creation", async () => {
    const mockCtx = {
      req: { ip: "127.0.0.1" },
      res: { cookie: () => {} },
    };

    const email = "omambole.test.otp@gmail.com";

    // 1. Send Email OTP
    const sendRes = await requestOtp({
      identifier: email,
      method: "email",
    });
    expect(sendRes.success).toBe(true);
    expect(sendRes.channel).toBe("email");
    expect(sendRes.previewCode).toBeDefined();

    // 2. Authenticate with correct OTP code
    const verifyRes = await signInWithOtp(mockCtx, {
      identifier: email,
      code: sendRes.previewCode,
      name: "Gmail Verified User",
    });
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.email).toBe(email);
  });
});
