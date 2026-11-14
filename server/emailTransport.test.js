import { describe, expect, it } from "vitest";
import {
  buildSmtpTransportOptions,
  envValue,
  isSmtpAuthError,
  isSmtpConnectionError,
  resolveEmailProvider,
  smtpPortCandidates,
  tcpProbe,
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
  it("is always SMTP", () => {
    expect(resolveEmailProvider()).toBe("smtp");
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
