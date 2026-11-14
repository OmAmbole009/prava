import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GMAIL_API_SENDER_DEFAULT,
  buildGmailRawMessage,
  buildSmtpTransportOptions,
  describeEmailTransport,
  envValue,
  gmailApiConfig,
  gmailSenderAddress,
  isSmtpAuthError,
  isSmtpConnectionError,
  parseAddress,
  resetGmailToken,
  resolveEmailProvider,
  sendViaGmailApi,
  smtpPortCandidates,
  tcpProbe,
  verifyEmailDelivery,
} from "./services/emailService.js";

/**
 * SMTP is the only delivery channel. These tests pin the transport behaviour
 * that the production timeout depended on.
 */

describe("SMTP transport options", () => {
  it("honours SMTP_PORT/SMTP_SECURE instead of the Gmail preset", () => {
    const options = buildSmtpTransportOptions({
      SMTP_USER: "founder@gmail.com",
      SMTP_PASS: "abcd efgh ijkl mnop",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "587",
      SMTP_SECURE: "false",
    });

    expect(options.host).toBe("smtp.gmail.com");
    expect(options.port).toBe(587);
    expect(options.secure).toBe(false);
    expect(options.requireTLS).toBe(true);
    // App passwords are pasted with spaces; they must be stripped.
    expect(options.auth.pass).toBe("abcdefghijklmnop");
    // nodemailer's gmail preset would silently drop every timeout below.
    expect(options.service).toBeUndefined();
  });

  it("uses implicit TLS on port 465", () => {
    const options = buildSmtpTransportOptions({
      SMTP_USER: "founder@gmail.com",
      SMTP_PASS: "secret",
      SMTP_HOST: "smtp.gmail.com",
      SMTP_PORT: "465",
    });
    expect(options.secure).toBe(true);
    expect(options.requireTLS).toBe(false);
  });

  it("allows a port override for fallback attempts", () => {
    const options = buildSmtpTransportOptions(
      {
        SMTP_USER: "founder@gmail.com",
        SMTP_PASS: "secret",
        SMTP_HOST: "smtp.gmail.com",
        SMTP_PORT: "587",
      },
      465
    );
    expect(options.port).toBe(465);
    expect(options.secure).toBe(true);
  });

  it("always sets connect, greeting and socket timeouts", () => {
    const options = buildSmtpTransportOptions({
      SMTP_USER: "ops@prava.in",
      SMTP_PASS: "secret",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "2525",
    });
    expect(options.connectionTimeout).toBe(12_000);
    expect(options.greetingTimeout).toBe(10_000);
    expect(options.socketTimeout).toBe(20_000);
  });

  it("fails fast on fallback ports", () => {
    const options = buildSmtpTransportOptions(
      {
        SMTP_USER: "ops@prava.in",
        SMTP_PASS: "secret",
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
      },
      2525
    );
    expect(options.connectionTimeout).toBe(5_000);
  });

  it("respects explicit timeout overrides", () => {
    const options = buildSmtpTransportOptions({
      SMTP_USER: "ops@prava.in",
      SMTP_PASS: "secret",
      SMTP_HOST: "smtp.example.com",
      SMTP_CONNECTION_TIMEOUT_SEC: "3",
      SMTP_GREETING_TIMEOUT_SEC: "4",
      SMTP_SOCKET_TIMEOUT_SEC: "5",
    });
    expect(options.connectionTimeout).toBe(3_000);
    expect(options.greetingTimeout).toBe(4_000);
    expect(options.socketTimeout).toBe(5_000);
  });

  it("strips quotes pasted into Render environment values", () => {
    expect(envValue('"smtp.gmail.com"')).toBe("smtp.gmail.com");
    expect(envValue("  '587'  ")).toBe("587");
    expect(envValue(undefined)).toBe("");

    const options = buildSmtpTransportOptions({
      SMTP_USER: '"founder@gmail.com"',
      SMTP_PASS: '"abcd efgh ijkl mnop"',
      SMTP_HOST: '"smtp.gmail.com"',
      SMTP_PORT: '"465"',
    });
    expect(options.host).toBe("smtp.gmail.com");
    expect(options.port).toBe(465);
    expect(options.secure).toBe(true);
    expect(options.auth.user).toBe("founder@gmail.com");
    expect(options.auth.pass).toBe("abcdefghijklmnop");
  });

  it("returns null without credentials or a resolvable host", () => {
    expect(buildSmtpTransportOptions({})).toBeNull();
    expect(buildSmtpTransportOptions({ SMTP_USER: "a@b.com" })).toBeNull();
    expect(
      buildSmtpTransportOptions({ SMTP_USER: "a@b.com", SMTP_PASS: "x" })
    ).toBeNull();
  });
});

describe("Port fallback chain", () => {
  it("retries Gmail on 465 when 587 is unreachable", () => {
    expect(
      smtpPortCandidates({ SMTP_USER: "founder@gmail.com", SMTP_PORT: "587" })
    ).toEqual([587, 465]);
  });

  it("starts from 465 when that is configured", () => {
    expect(
      smtpPortCandidates({ SMTP_USER: "founder@gmail.com", SMTP_PORT: "465" })
    ).toEqual([465, 587]);
  });

  it("includes 2525 for non-Gmail providers", () => {
    expect(
      smtpPortCandidates({ SMTP_HOST: "smtp.mailprovider.com", SMTP_PORT: "587" })
    ).toEqual([587, 465, 2525]);
  });

  it("can be disabled or overridden", () => {
    expect(
      smtpPortCandidates({ SMTP_PORT: "587", SMTP_PORT_FALLBACKS: "" })
    ).toEqual([587]);
    expect(
      smtpPortCandidates({ SMTP_PORT: "587", SMTP_PORT_FALLBACKS: "2525" })
    ).toEqual([587, 2525]);
  });
});

describe("SMTP error classification", () => {
  it("recognises credential rejection", () => {
    expect(isSmtpAuthError({ responseCode: 535 })).toBe(true);
    expect(
      isSmtpAuthError({
        message: "Invalid login: 535-5.7.8 Username and Password not accepted",
      })
    ).toBe(true);
    expect(isSmtpAuthError({ code: "ETIMEDOUT", message: "Connection timeout" })).toBe(false);
  });

  it("recognises connection failures that deserve another port", () => {
    expect(isSmtpConnectionError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isSmtpConnectionError({ code: "ECONNECTION", message: "Connection timeout" })).toBe(true);
    expect(isSmtpConnectionError({ responseCode: 535, message: "Invalid login" })).toBe(false);
  });
});

describe("Provider", () => {
  it("explicit EMAIL_PROVIDER=smtp returns smtp", () => {
    expect(resolveEmailProvider({ EMAIL_PROVIDER: "smtp" })).toBe("smtp");
  });
  it("no provider returns null when not in production", () => {
    expect(resolveEmailProvider({})).toBeNull();
  });
});

describe("TCP reachability probe", () => {
  it("reports a refused connection quickly instead of hanging", async () => {
    // Port 1 on loopback is closed, so the probe resolves with an error code.
    const result = await tcpProbe("127.0.0.1", 1, 2000);
    expect(result.ok).toBe(false);
    expect(result.port).toBe(1);
    expect(typeof result.code).toBe("string");
  });

  it("rejects a missing host without throwing", async () => {
    const result = await tcpProbe("", 587, 500);
    expect(result.ok).toBe(false);
    expect(result.code).toBe("EINVAL");
  });
});

describe("Gmail API transport", () => {
  afterEach(() => {
    resetGmailToken();
    vi.unstubAllEnvs();
  });

  const gmailEnv = {
    GMAIL_CLIENT_ID: "client-id.apps.googleusercontent.com",
    GMAIL_CLIENT_SECRET: "client-secret",
    GMAIL_REFRESH_TOKEN: "1//refresh-token",
  };

  function stubFetch(handlers) {
    const calls = [];
    const fetchImpl = async (url, options = {}) => {
      calls.push({ url, options });
      if (url.includes("oauth2.googleapis.com")) return handlers.token();
      if (url.includes("gmail.googleapis.com")) return handlers.send();
      throw new Error(`Unexpected fetch to ${url}`);
    };
    fetchImpl.calls = calls;
    return fetchImpl;
  }

  function jsonResponse(body, status = 200) {
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: `HTTP ${status}`,
      headers: { get: () => null },
      json: async () => body,
    };
  }

  const tokenOk = () =>
    jsonResponse({ access_token: "ya29.token", expires_in: 3600 });

  it("is the default provider when the OAuth credentials exist", () => {
    expect(resolveEmailProvider(gmailEnv)).toBe("gmail_api");
    expect(resolveEmailProvider({})).toBeNull();
    expect(resolveEmailProvider({ ...gmailEnv, EMAIL_PROVIDER: "smtp" })).toBe("smtp");
    expect(resolveEmailProvider({ EMAIL_PROVIDER: "gmail_api" })).toBe("gmail_api");
    expect(gmailApiConfig({})).toBeNull();
  });

  it("never falls back to SMTP in production", () => {
    expect(resolveEmailProvider({ NODE_ENV: "production", ...gmailEnv })).toBe("gmail_api");
    expect(resolveEmailProvider({ RENDER: "true", ...gmailEnv })).toBe("gmail_api");
    expect(resolveEmailProvider({ NODE_ENV: "production" })).toBeNull();
    expect(resolveEmailProvider({ RENDER: "true" })).toBeNull();
    expect(
      resolveEmailProvider({ NODE_ENV: "production", EMAIL_PROVIDER: "smtp" })
    ).toBe("smtp");
  });

  it("describes the active transport for the startup log", () => {
    expect(describeEmailTransport({ NODE_ENV: "production", ...gmailEnv })).toEqual({
      provider: "gmail_api",
      sender: "ambole.rajesh@gmail.com",
      configured: true,
      production: true,
    });
    expect(describeEmailTransport({ NODE_ENV: "production" })).toMatchObject({
      provider: "unconfigured",
      configured: false,
      production: true,
    });
  });

  it("sends as ambole.rajesh@gmail.com by default", () => {
    expect(GMAIL_API_SENDER_DEFAULT).toBe("ambole.rajesh@gmail.com");
    expect(gmailSenderAddress({})).toBe("ambole.rajesh@gmail.com");
    expect(gmailSenderAddress({ GMAIL_SENDER: "ops@prava.io" })).toBe("ops@prava.io");
    expect(parseAddress('"Prava Security" <ambole.rajesh@gmail.com>')).toEqual({
      email: "ambole.rajesh@gmail.com",
      name: "Prava Security",
    });
  });

  it("builds a multipart message the Gmail API accepts", () => {
    const raw = buildGmailRawMessage({
      from: '"Prava Security" <ambole.rajesh@gmail.com>',
      to: "user@example.com",
      subject: "Your Prava verification code",
      text: "Your code is 123456",
      html: "<p>Your code is 123456</p>",
    });

    expect(raw).toContain("From: \"Prava Security\" <ambole.rajesh@gmail.com>");
    expect(raw).toContain("To: user@example.com");
    expect(raw).toContain("multipart/alternative");
    // Every part is base64 encoded, so the plain code never appears on the wire.
    expect(raw).not.toContain("123456");
    expect(raw).toMatch(/Content-Transfer-Encoding: base64/);
    expect(raw).toContain(Buffer.from("Your code is 123456", "utf8").toString("base64"));
    expect(raw).toContain(Buffer.from("<p>Your code is 123456</p>", "utf8").toString("base64"));
  });

  it("encodes a non-ASCII subject as RFC 2047", () => {
    const raw = buildGmailRawMessage({
      from: "a@b.com",
      to: "c@d.com",
      subject: "Vérification Prava",
      text: "x",
      html: "<p>x</p>",
    });
    expect(raw).toMatch(/Subject: =\?UTF-8\?B\?/);
    const encoded = raw.match(/Subject: =\?UTF-8\?B\?([^?]+)\?=/)[1];
    expect(Buffer.from(encoded, "base64").toString("utf8")).toBe("Vérification Prava");
  });

  it("exchanges the refresh token and posts the raw message", async () => {
    const fetchImpl = stubFetch({ token: tokenOk, send: () => jsonResponse({ id: "18c1", threadId: "18c1" }) });

    const result = await sendViaGmailApi(
      { from: "Ignored <omambole2007@gmail.com>", to: "user@example.com", subject: "Code", text: "123456", html: "<p>123456</p>" },
      gmailEnv,
      fetchImpl
    );

    expect(result).toEqual({ id: "18c1", threadId: "18c1", sender: "ambole.rajesh@gmail.com" });

    const [tokenCall, sendCall] = fetchImpl.calls;
    expect(tokenCall.options.body).toContain("grant_type=refresh_token");
    expect(tokenCall.options.body).toContain("refresh_token=1%2F%2Frefresh-token");

    expect(sendCall.options.headers.Authorization).toBe("Bearer ya29.token");
    const payload = JSON.parse(sendCall.options.body);
    const mime = Buffer.from(payload.raw, "base64url").toString("utf8");
    // The admin login address must never become the sender.
    expect(mime).toContain("<ambole.rajesh@gmail.com>");
    expect(mime).not.toContain("omambole2007@gmail.com");
  });

  it("reuses the cached access token across sends", async () => {
    const fetchImpl = stubFetch({ token: tokenOk, send: () => jsonResponse({ id: "1" }) });
    const message = { from: "a@b.com", to: "user@example.com", subject: "s", text: "t", html: "<p>t</p>" };

    await sendViaGmailApi(message, gmailEnv, fetchImpl);
    await sendViaGmailApi(message, gmailEnv, fetchImpl);

    expect(fetchImpl.calls.filter((call) => call.url.includes("oauth2"))).toHaveLength(1);
  });

  it("reports a rejected refresh token instead of claiming success", async () => {
    const fetchImpl = stubFetch({
      token: () => jsonResponse({ error: "invalid_grant", error_description: "Token has been expired or revoked." }, 400),
      send: () => jsonResponse({ id: "never" }),
    });

    await expect(
      sendViaGmailApi({ from: "a@b.com", to: "u@example.com", subject: "s", text: "t", html: "<p>t</p>" }, gmailEnv, fetchImpl)
    ).rejects.toMatchObject({
      code: "EMAIL_GMAIL_AUTH_FAILED",
      message: expect.stringContaining("Google refused"),
    });
  });

  it("reports a send rejected for missing scope", async () => {
    const fetchImpl = stubFetch({
      token: tokenOk,
      send: () => jsonResponse({ error: { message: "Request had insufficient authentication scopes." } }, 403),
    });

    await expect(
      sendViaGmailApi({ from: "a@b.com", to: "u@example.com", subject: "s", text: "t", html: "<p>t</p>" }, gmailEnv, fetchImpl)
    ).rejects.toMatchObject({ code: "EMAIL_GMAIL_AUTH_FAILED" });
  });

  it("verifies the Gmail authorisation for the startup check", async () => {
    vi.stubEnv("GMAIL_CLIENT_ID", gmailEnv.GMAIL_CLIENT_ID);
    vi.stubEnv("GMAIL_CLIENT_SECRET", gmailEnv.GMAIL_CLIENT_SECRET);
    vi.stubEnv("GMAIL_REFRESH_TOKEN", gmailEnv.GMAIL_REFRESH_TOKEN);
    vi.stubEnv("GMAIL_SENDER", "");
    vi.stubEnv("EMAIL_PROVIDER", "");
    const originalFetch = global.fetch;
    global.fetch = stubFetch({ token: tokenOk, send: () => jsonResponse({ id: "1" }) });

    try {
      const report = await verifyEmailDelivery();
      expect(report.ok).toBe(true);
      expect(report.provider).toBe("gmail_api");
      expect(report.sender).toBe("ambole.rajesh@gmail.com");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
