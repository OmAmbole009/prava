import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loginStep1,
  loginStep2,
  registerAccount,
} from "./controllers/auth.controller.js";
import { getUserByIdentifier, verifyPassword } from "./db.js";
import { resetGmailToken, sendOtpEmail } from "./services/emailService.js";
import {
  __clearDispatchedNotifications,
  __getLastDispatchedOtpFor,
} from "./services/notification.service.js";
import { __peekOtpChallengeForTesting } from "./services/otp.service.js";
import { COOKIE_NAME } from "../shared/const.js";

/**
 * Covers the OMTeleServices business login end to end and, in particular, that a
 * production OTP leaves through the Gmail API as ambole.rajesh@gmail.com instead
 * of the SMTP transport Render blocks.
 *
 * The address is a plus-tagged variant so a stray run can never touch the real
 * account; the delivery and role assertions are the ones that matter.
 */
const BUSINESS_EMAIL = `omteleservices2007+otp-test-${Date.now()}@gmail.com`;
const BUSINESS_PASSWORD = "OMTeleServices#2026";

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

describe("OMTeleServices business login and Gmail API OTP delivery", () => {
  let businessChallenge = null;

  afterEach(() => {
    // The access token is cached across sends, so drop it between cases.
    resetGmailToken();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("registers the business account as a normal user, never an administrator", async () => {
    const result = await registerAccount(
      { req: createMockReq(), res: createMockRes() },
      {
        email: BUSINESS_EMAIL,
        password: BUSINESS_PASSWORD,
        companyName: "OMTeleServices Business",
      }
    );

    expect(result.requireOtp).toBe(true);

    const user = await getUserByIdentifier(BUSINESS_EMAIL);
    expect(user).toBeDefined();
    expect(user.role).not.toBe("admin");
    expect(user.passwordHash).not.toBe(BUSINESS_PASSWORD);
    expect(verifyPassword(BUSINESS_PASSWORD, user.passwordHash, user.passwordSalt)).toBe(true);
  });

  it("issues the login OTP challenge addressed to the business email entered", async () => {
    __clearDispatchedNotifications();

    const result = await loginStep1(
      { req: createMockReq(), res: createMockRes() },
      { identifier: BUSINESS_EMAIL, email: BUSINESS_EMAIL, password: BUSINESS_PASSWORD }
    );

    expect(result.requiresOtp).toBe(true);
    expect(result.challengeToken).toBeDefined();
    expect(result.maskedTarget).toContain("@gmail.com");
    expect(result.maskedTarget).not.toBe(BUSINESS_EMAIL);

    businessChallenge = result.challengeToken;
    expect(__peekOtpChallengeForTesting(businessChallenge)).toBeDefined();

    // The code is dispatched to the account's own mailbox, not to an admin.
    expect(__getLastDispatchedOtpFor(BUSINESS_EMAIL)).toMatch(/^\d{6}$/);
  });

  it("rejects a wrong OTP, then accepts the correct one and opens a session", async () => {
    const code = __getLastDispatchedOtpFor(BUSINESS_EMAIL);

    await expect(
      loginStep2(
        { req: createMockReq(), res: createMockRes() },
        { challengeToken: businessChallenge, code: code === "000000" ? "111111" : "000000" }
      )
    ).rejects.toThrow();

    const res = createMockRes();
    const verified = await loginStep2(
      { req: createMockReq(), res },
      { challengeToken: businessChallenge, code }
    );

    expect(verified.success).toBe(true);
    expect(verified.token).toBeDefined();
    expect(res.cookies[COOKIE_NAME]?.opts?.httpOnly).toBe(true);
    expect(verified.user?.role).not.toBe("admin");

    // Single use: the challenge is gone.
    expect(__peekOtpChallengeForTesting(businessChallenge)).toBeUndefined();
  });

  it("delivers a production OTP through the Gmail API as ambole.rajesh@gmail.com", async () => {
    const calls = [];
    const jsonResponse = (body, status = 200) => ({
      ok: status >= 200 && status < 300,
      status,
      statusText: `HTTP ${status}`,
      headers: { get: () => null },
      json: async () => body,
    });

    const originalFetch = global.fetch;
    global.fetch = async (url, options = {}) => {
      calls.push({ url, options });
      if (url.includes("oauth2.googleapis.com")) {
        return jsonResponse({ access_token: "ya29.production", expires_in: 3600 });
      }
      return jsonResponse({ id: "gmail-message-id", threadId: "gmail-thread-id" });
    };

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("EMAIL_PROVIDER", "");
    vi.stubEnv("GMAIL_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GMAIL_REFRESH_TOKEN", "1//refresh-token");
    vi.stubEnv("GMAIL_SENDER", "");
    vi.stubEnv("SMTP_USER", "");
    vi.stubEnv("SMTP_PASS", "");

    try {
      const result = await sendOtpEmail({
        to: BUSINESS_EMAIL,
        otp: "482913",
        purpose: "login",
        expiryMinutes: 5,
      });

      expect(result).toMatchObject({
        success: true,
        provider: "gmail_api",
        sender: "ambole.rajesh@gmail.com",
        id: "gmail-message-id",
      });

      // Exactly one token exchange and one send; never an SMTP connection.
      expect(calls.map((call) => new URL(call.url).host)).toEqual([
        "oauth2.googleapis.com",
        "gmail.googleapis.com",
      ]);

      const payload = JSON.parse(calls[1].options.body);
      const mime = Buffer.from(payload.raw, "base64url").toString("utf8");
      expect(mime).toContain("From: \"Prava Security\" <ambole.rajesh@gmail.com>");
      expect(mime).toContain(BUSINESS_EMAIL);
      expect(mime).not.toContain("omambole2007@gmail.com");
      // The OTP is inside the encoded body, not on the wire in clear text.
      expect(mime).not.toContain("482913");
      expect(mime).toContain(Buffer.from("482913", "utf8").toString("base64").slice(0, 4));
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("reports a Gmail authorisation failure instead of claiming the OTP was sent", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      headers: { get: () => null },
      json: async () => ({
        error: "invalid_grant",
        error_description: "Token has been expired or revoked.",
      }),
    });

    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VITEST", "");
    vi.stubEnv("EMAIL_PROVIDER", "");
    vi.stubEnv("GMAIL_CLIENT_ID", "client-id.apps.googleusercontent.com");
    vi.stubEnv("GMAIL_CLIENT_SECRET", "client-secret");
    vi.stubEnv("GMAIL_REFRESH_TOKEN", "1//expired");

    try {
      await expect(
        sendOtpEmail({ to: BUSINESS_EMAIL, otp: "123456", purpose: "login", expiryMinutes: 5 })
      ).rejects.toMatchObject({ code: "EMAIL_GMAIL_AUTH_FAILED" });
    } finally {
      global.fetch = originalFetch;
    }
  });
});
