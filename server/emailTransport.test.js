import { describe, expect, it } from "vitest";
import {
  buildSmtpTransportOptions,
  resolveEmailProvider,
} from "./services/emailService.js";

/**
 * Regression cover for the production SMTP connection timeout.
 *
 * The old code used nodemailer's `service: "gmail"` preset for Gmail users. That
 * preset forces port 465 + implicit TLS and drops every timeout option, so
 * SMTP_PORT/SMTP_SECURE were ignored and a blocked port hung indefinitely.
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

  it("always sets connect, greeting and socket timeouts", () => {
    const options = buildSmtpTransportOptions({
      SMTP_USER: "ops@prava.in",
      SMTP_PASS: "secret",
      SMTP_HOST: "smtp.example.com",
      SMTP_PORT: "2525",
    });
    expect(options.connectionTimeout).toBe(10_000);
    expect(options.greetingTimeout).toBe(10_000);
    expect(options.socketTimeout).toBe(20_000);
    // No `service` preset: that is what silently discarded the values above.
    expect(options.service).toBeUndefined();
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

  it("returns null without credentials or a resolvable host", () => {
    expect(buildSmtpTransportOptions({})).toBeNull();
    expect(buildSmtpTransportOptions({ SMTP_USER: "a@b.com" })).toBeNull();
    expect(
      buildSmtpTransportOptions({ SMTP_USER: "a@b.com", SMTP_PASS: "x" })
    ).toBeNull();
  });
});

describe("Provider selection", () => {
  it("prefers an explicit EMAIL_PROVIDER", () => {
    expect(resolveEmailProvider({ EMAIL_PROVIDER: "resend" })).toBe("resend");
    expect(
      resolveEmailProvider({ EMAIL_PROVIDER: "smtp", RESEND_API_KEY: "re_x" })
    ).toBe("smtp");
  });

  it("falls back to Resend when SMTP credentials are absent", () => {
    expect(resolveEmailProvider({ RESEND_API_KEY: "re_x" })).toBe("resend");
  });

  it("defaults to SMTP when SMTP credentials exist", () => {
    expect(
      resolveEmailProvider({ SMTP_USER: "a@b.com", SMTP_PASS: "x" })
    ).toBe("smtp");
  });

  it("defaults to SMTP when nothing is configured", () => {
    expect(resolveEmailProvider({})).toBe("smtp");
  });
});
