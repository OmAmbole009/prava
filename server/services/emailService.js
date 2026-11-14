import nodemailer from "nodemailer";
import { HttpError } from "../../shared/_core/errors.js";

/**
 * Prava email delivery — SMTP only.
 *
 * Transport rules:
 * - SMTP is the single delivery channel. There is no second provider.
 * - Connections always use explicit host/port/secure settings with connect,
 *   greeting and socket timeouts. nodemailer's `service: "gmail"` preset is
 *   deliberately not used: it forces port 465 and discards every timeout.
 * - If a port cannot be reached the same message is retried on the other ports
 *   the provider supports (465 implicit TLS, 2525 plain STARTTLS), because a
 *   filtered port looks identical to "wrong credentials" to the sender.
 *
 * Security rules:
 * - OTP codes are never logged.
 * - Recipients are masked in every log line.
 * - Credentials are never returned to callers or included in errors.
 */

/** In-memory record for test suite verification only */
const testDispatchedNotifications = [];

export function __getDispatchedNotifications() {
  return testDispatchedNotifications;
}

export function __clearDispatchedNotifications() {
  testDispatchedNotifications.length = 0;
}

export function __getLastDispatchedOtpFor(target) {
  const normalized = String(target).toLowerCase().trim();
  const matched = [...testDispatchedNotifications].reverse().find(
    (n) =>
      n.to.toLowerCase().trim() === normalized ||
      n.to.replace(/\D/g, "") === normalized.replace(/\D/g, "")
  );
  return matched?.code || null;
}

function maskEmail(email) {
  if (!email || !email.includes("@")) return "***";
  const [name, domain] = email.split("@");
  if (name.length <= 2) return `${name[0] || "*"}***@${domain}`;
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

/** Mask phone identifier for logging */
function maskPhone(phone) {
  if (!phone) return "***";
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${digits.slice(0, 3)}******${digits.slice(-4)}`;
}

/** Ports that PaaS firewalls commonly drop (they blackhole, causing timeouts). */
const BLOCKED_SMTP_PORTS = [25, 465, 587];

const SMTP_PORT_BLOCK_HINT =
  "The network is silently dropping connections to this port (a timeout, not a " +
  "rejected login). Free and starter Render instances block outbound SMTP on " +
  "ports 25, 465 and 587, so no SMTP account can connect from them; running the " +
  "service on a paid instance opens those ports. Otherwise configure an SMTP " +
  "provider that publishes an unblocked port such as 2525.";

const SMTP_AUTH_HINT =
  "Google rejects normal account passwords. SMTP_USER must be the full Gmail " +
  "address and SMTP_PASS must be a 16-character App Password from " +
  "Google Account → Security → App passwords (2-Step Verification must be on). " +
  "Spaces in the App Password are removed automatically.";

function seconds(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * SMTP is the only provider. Kept as a function so callers (and tests) have one
 * place that describes the transport in use.
 */
export function resolveEmailProvider() {
  return "smtp";
}

/**
 * Ports to try, in order. Connection failures move to the next port; auth
 * failures do not, because they would fail identically everywhere.
 *
 * SMTP_PORT_FALLBACKS unset  -> provider-appropriate defaults
 * SMTP_PORT_FALLBACKS=""     -> disable fallbacks (single port)
 * SMTP_PORT_FALLBACKS="465"  -> explicit list
 */
export function smtpPortCandidates(env = process.env) {
  const primary = Number(env.SMTP_PORT || 587) || 587;
  if (env.SMTP_PORT_FALLBACKS !== undefined && String(env.SMTP_PORT_FALLBACKS).trim() === "") {
    return [primary];
  }

  const configured = String(env.SMTP_PORT_FALLBACKS || "")
    .split(",")
    .map((value) => Number(String(value).trim()))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (configured.length) {
    return [primary, ...configured.filter((port) => port !== primary)];
  }

  const user = String(env.SMTP_USER || "").toLowerCase();
  const host = String(env.SMTP_HOST || "").toLowerCase();
  const isGmail = host.includes("gmail") || user.endsWith("@gmail.com");
  // Gmail only listens on 465/587; other providers often publish 2525.
  const fallbacks = isGmail ? [465, 587] : [465, 2525, 587];
  return [primary, ...fallbacks.filter((port) => port !== primary)];
}

/** Connection-level failures are worth another port; auth failures are not. */
export function isSmtpConnectionError(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    ["ECONNECTION", "ETIMEDOUT", "ESOCKET", "EDNS", "EHOSTUNREACH", "ECONNREFUSED", "ENOTFOUND"].includes(code) ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("connection") ||
    message.includes("closed unexpectedly")
  );
}

/** Credential rejection (535 / "Username and Password not accepted"). */
export function isSmtpAuthError(error) {
  const responseCode = Number(error?.responseCode || 0);
  const message = String(error?.message || "").toLowerCase();
  return (
    responseCode === 535 ||
    message.includes("invalid login") ||
    message.includes("username and password not accepted") ||
    message.includes("authentication") ||
    message.includes("badcredentials")
  );
}

/**
 * Builds nodemailer transport options for one port.
 * Returns null when host/credentials are missing so callers can report a
 * configuration problem rather than a network one.
 */
export function buildSmtpTransportOptions(env = process.env, portOverride = null) {
  const user = env.SMTP_USER?.trim();
  // App passwords are often pasted with spaces in groups of four.
  const pass = env.SMTP_PASS ? String(env.SMTP_PASS).replace(/\s+/g, "") : null;
  if (!user || !pass) return null;

  const isGmailUser = user.toLowerCase().endsWith("@gmail.com");
  const host = (
    env.SMTP_HOST ||
    (isGmailUser || env.EMAIL_PROVIDER === "gmail" ? "smtp.gmail.com" : "")
  ).trim();
  if (!host) return null;

  const primaryPort = Number(env.SMTP_PORT || 587) || 587;
  const port = portOverride || primaryPort;
  // 465 is implicit TLS; 587 and 2525 upgrade with STARTTLS.
  const secure = port === 465 || env.SMTP_SECURE === "true";
  const isPrimary = port === primaryPort;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    requireTLS: !secure && env.SMTP_REQUIRE_TLS !== "false",
    // Give the configured port the full budget; fallbacks fail fast.
    connectionTimeout:
      seconds(env.SMTP_CONNECTION_TIMEOUT_SEC, isPrimary ? 12 : 5) * 1000,
    greetingTimeout: seconds(env.SMTP_GREETING_TIMEOUT_SEC, isPrimary ? 10 : 5) * 1000,
    socketTimeout: seconds(env.SMTP_SOCKET_TIMEOUT_SEC, 20) * 1000,
    tls: { servername: host, minVersion: "TLSv1.2" },
  };
}

// Cached transporter, tagged with the port it was built for.
let smtpTransporter = null;

function getSmtpTransporter(portOverride = null) {
  if (smtpTransporter && smtpTransporter.__port === (portOverride || null)) {
    return smtpTransporter;
  }
  const options = buildSmtpTransportOptions(process.env, portOverride);
  if (!options) return null;
  const transporter = nodemailer.createTransport(options);
  transporter.__port = portOverride || null;
  smtpTransporter = transporter;
  return transporter;
}

/** Drops the cached transport so a failed socket is never reused. */
function resetSmtpTransporter() {
  try {
    smtpTransporter?.close?.();
  } catch {
    // The transport is already unusable.
  }
  smtpTransporter = null;
}

/**
 * Sends one message over SMTP, retrying connection-level failures on the
 * remaining ports. Throws the last error if every port fails.
 */
async function sendViaSmtp(message) {
  const ports = smtpPortCandidates();
  const attempted = [];
  let lastError = null;

  for (const port of ports) {
    const transporter = getSmtpTransporter(port);
    if (!transporter) {
      throw new Error("SMTP transport could not be created from the configured settings.");
    }
    attempted.push(port);
    try {
      const info = await transporter.sendMail(message);
      return { info, port, attempted };
    } catch (error) {
      lastError = error;
      resetSmtpTransporter();
      if (isSmtpAuthError(error)) {
        error.attemptedPorts = attempted;
        throw error;
      }
      if (!isSmtpConnectionError(error)) {
        error.attemptedPorts = attempted;
        throw error;
      }
      console.warn(
        `[EmailService] SMTP port ${port} unreachable (${error.code || error.message}); trying the next port.`
      );
    }
  }

  lastError = lastError || new Error("SMTP delivery failed.");
  lastError.attemptedPorts = attempted;
  throw lastError;
}

/**
 * Builds the email HTML body using Prava's branded template.
 * The OTP code is included in the HTML but NEVER logged to console.
 */
function buildEmailHtml({
  title,
  heading,
  message,
  otp,
  expiryMinutes,
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px; text-align: center; border-bottom: 1px solid #f1f5f9;">
              <h1 style="margin: 0; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Prava Financial Cloud</h1>
              <p style="margin: 6px 0 0; color: #64748b; font-size: 13px; font-weight: 500;">Autonomous Tax, Accounting & Compliance Infrastructure</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <h2 style="margin: 0 0 12px; color: #1e293b; font-size: 18px; font-weight: 700;">${heading}</h2>
              <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">${message}</p>

              <!-- OTP Code Display -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center" style="background-color: #0f172a; border-radius: 12px; padding: 20px;">
                    <div style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 10px; line-height: 1;">
                      ${otp}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Security Information -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                      ⏱ <strong>Expires in ${expiryMinutes} minutes.</strong><br>
                      🔒 <strong>Security Notice:</strong> Never share this code with anyone. Prava representatives will never ask for your verification code.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you did not request this verification code, please ignore this email or review your account credentials immediately.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                This is an automated security transmission from Prava Security. Please do not reply directly to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}

function deliveryErrorFor(error, port) {
  if (isSmtpAuthError(error)) {
    return new HttpError(
      500,
      "Verification email could not be sent because the mail server rejected the login.",
      { code: "EMAIL_SMTP_AUTH_FAILED", hint: SMTP_AUTH_HINT, details: { port } }
    );
  }

  const attempted = Array.isArray(error?.attemptedPorts) ? error.attemptedPorts : [port];
  const blocked = attempted.some((value) => BLOCKED_SMTP_PORTS.includes(value));

  if (isSmtpConnectionError(error)) {
    return new HttpError(
      500,
      `Verification email could not be delivered: the server could not connect to the mail provider${
        attempted.length > 1 ? ` (tried ports ${attempted.join(", ")})` : ` on port ${port}`
      }.`,
      {
        code: blocked ? "EMAIL_PORT_BLOCKED" : "EMAIL_SMTP_UNREACHABLE",
        hint: SMTP_PORT_BLOCK_HINT,
        details: { attemptedPorts: attempted },
      }
    );
  }

  return new HttpError(
    500,
    "Verification email could not be delivered by the mail provider.",
    {
      code: "EMAIL_SMTP_FAILED",
      hint:
        "The mail server accepted the connection but rejected the message. Check that the sender address " +
        "(SMTP_FROM / EMAIL_FROM) belongs to the authenticated SMTP account, then retry.",
    }
  );
}

/**
 * Dispatches an email containing the secure 6-digit OTP code over SMTP.
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP code (NEVER logged)
 * @param {string} options.purpose - Purpose ("login" | "password_reset")
 * @param {number} [options.expiryMinutes=5] - Expiry in minutes
 * @returns {Promise<Object>} Dispatch result with provider, port and message ID
 */
export async function sendOtpEmail({ to, otp, purpose = "login", expiryMinutes = 5 }) {
  if (!to || !to.includes("@")) {
    throw new HttpError(400, "A valid recipient email address is required.");
  }
  if (!otp || String(otp).length !== 6) {
    throw new HttpError(500, "A valid 6-digit OTP is required for dispatch.");
  }

  const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  testDispatchedNotifications.push({
    type: "email",
    to: to.toLowerCase().trim(),
    code: String(otp).trim(), // Stored only for test verification, never logged in production
    purpose,
    timestamp: Date.now(),
  });

  const fromAddress =
    process.env.SMTP_FROM ||
    process.env.EMAIL_FROM ||
    (process.env.SMTP_USER
      ? `"Prava Security" <${process.env.SMTP_USER}>`
      : '"Prava Security" <no-reply@prava.io>');

  const isPasswordReset = purpose === "password_reset";
  const heading = isPasswordReset
    ? "Prava Password Reset Request"
    : "Prava Login Verification";
  const message = isPasswordReset
    ? "We received a request to reset the password for your Prava account. Please enter the following 6-digit verification code to authorize the reset:"
    : "We detected a sign-in attempt to your Prava account. Please enter the following 6-digit verification code to complete your sign-in:";

  // OTP code is intentionally NOT included in subject line to avoid logging it
  const subject = `Your Prava Verification Code: ${isPasswordReset ? "Password Reset" : "Login"}`;
  // OTP code included only in email body, never in console logs
  const textBody = `Prava Security Verification\n\n${heading}\n\n${message}\n\nYour 6-Digit Code: ${otp}\n\nThis code will expire in ${expiryMinutes} minutes. Never share this code with anyone.\n\nBest regards,\nPrava Security Team`;
  const htmlBody = buildEmailHtml({
    title: heading,
    heading,
    message,
    otp,
    expiryMinutes,
  });

  // In test environment, skip external network call to keep tests fast and offline
  if (isTestEnv) {
    return { success: true, provider: "test_mock", id: "test-mock-msg-id" };
  }

  if (!getSmtpTransporter()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[EmailService] SMTP credentials not set in .env. Dispatched mock OTP challenge to: ${maskEmail(to)}`
      );
      return { success: true, provider: "smtp_dev_fallback", id: "dev-smtp-otp" };
    }
    throw new HttpError(
      500,
      "Verification email could not be sent because SMTP is not configured on this server.",
      {
        code: "EMAIL_NOT_CONFIGURED",
        hint:
          "Set SMTP_HOST, SMTP_PORT, SMTP_USER (full email address), SMTP_PASS (App Password) " +
          "and SMTP_FROM in the service environment, then redeploy.",
      }
    );
  }

  const port = Number(process.env.SMTP_PORT || 587) || 587;

  try {
    const result = await sendViaSmtp({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `[EmailService] Verification email delivered via SMTP (port ${result.port}) to ${maskEmail(to)}`
    );
    return {
      success: true,
      provider: "smtp",
      port: result.port,
      id: result.info?.messageId,
    };
  } catch (err) {
    console.error(
      `[EmailService] SMTP delivery failure for ${maskEmail(to)}:`,
      err.code ? `${err.code}: ${err.message}` : err.message,
      Array.isArray(err.attemptedPorts) ? `| ports tried: ${err.attemptedPorts.join(", ")}` : ""
    );
    resetSmtpTransporter();

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[EmailService] SMTP transmission notice for ${maskEmail(to)}: ${err.message}`
      );
      return { success: true, provider: "smtp_dev_fallback", id: "dev-smtp-otp" };
    }

    throw deliveryErrorFor(err, port);
  }
}

/**
 * Convenience helper specifically for Login OTP dispatch.
 */
export async function sendLoginOtpEmail({ to, otp, expiryMinutes = 5 }) {
  return sendOtpEmail({ to, otp, purpose: "login", expiryMinutes });
}

/**
 * Convenience helper specifically for Password Reset OTP dispatch.
 */
export async function sendPasswordResetOtpEmail({ to, otp, expiryMinutes = 5 }) {
  return sendOtpEmail({ to, otp, purpose: "password_reset", expiryMinutes });
}

/**
 * Verifies SMTP configuration and handshake across every candidate port.
 * Returns a structured report and never throws.
 */
export async function verifySmtpConnection() {
  const options = buildSmtpTransportOptions();
  const ports = smtpPortCandidates();
  const host = options?.host || process.env.SMTP_HOST || "smtp.gmail.com";

  if (!options) {
    return {
      ok: false,
      configured: false,
      provider: "smtp",
      host,
      ports,
      message: "SMTP credentials missing. Set SMTP_USER (full email address) and SMTP_PASS (App Password).",
    };
  }

  const attempts = [];
  for (const port of ports) {
    const transporter = getSmtpTransporter(port);
    if (!transporter) continue;
    try {
      await transporter.verify();
      attempts.push({ port, ok: true });
      return {
        ok: true,
        configured: true,
        provider: "smtp",
        host,
        port,
        ports,
        attempts,
        message: `SMTP connection verified successfully to ${host}:${port}.`,
      };
    } catch (err) {
      resetSmtpTransporter();
      attempts.push({
        port,
        ok: false,
        code: err.code,
        responseCode: err.responseCode,
        error: err.message,
        authFailure: isSmtpAuthError(err),
      });
      // A rejected login will fail on every port; stop early.
      if (isSmtpAuthError(err)) break;
    }
  }

  const authFailure = attempts.some((attempt) => attempt.authFailure);
  const blockedPort = attempts.some(
    (attempt) => !attempt.ok && BLOCKED_SMTP_PORTS.includes(attempt.port)
  );

  return {
    ok: false,
    configured: true,
    provider: "smtp",
    host,
    ports,
    attempts,
    authFailure,
    blockedPort,
    hint: authFailure ? SMTP_AUTH_HINT : blockedPort ? SMTP_PORT_BLOCK_HINT : undefined,
    message: authFailure
      ? "SMTP connection reached the server but the login was rejected."
      : `SMTP verification failed: could not connect to ${host} on any of ${ports.join(", ")}.`,
  };
}

/**
 * Dispatches enterprise transactional emails with Prava branded templates.
 * SMTP is the only transport.
 */
export async function sendTransactionalNotification({
  to,
  templateType,
  templateData = {},
}) {
  if (!to || !to.includes("@")) {
    throw new HttpError(400, "Valid recipient email address is required.");
  }

  const {
    renderAccountVerificationEmail,
    renderPasswordResetEmail,
    renderSecurityEventEmail,
    renderOnboardingCompletionEmail,
    renderComplianceReminderEmail,
    renderOverdueTaskEmail,
    renderOcrFailureReviewEmail,
    renderFailedIntegrationEmail,
  } = await import("./emailTemplates.js");

  let rendered;
  switch (templateType) {
    case "account_verification":
      rendered = renderAccountVerificationEmail(templateData);
      break;
    case "password_reset":
      rendered = renderPasswordResetEmail(templateData);
      break;
    case "security_event":
      rendered = renderSecurityEventEmail(templateData);
      break;
    case "onboarding_completion":
      rendered = renderOnboardingCompletionEmail(templateData);
      break;
    case "compliance_reminder":
      rendered = renderComplianceReminderEmail(templateData);
      break;
    case "overdue_task":
      rendered = renderOverdueTaskEmail(templateData);
      break;
    case "ocr_failure":
      rendered = renderOcrFailureReviewEmail(templateData);
      break;
    case "failed_integration":
      rendered = renderFailedIntegrationEmail(templateData);
      break;
    default:
      throw new HttpError(400, `Unknown transactional email template "${templateType}".`);
  }

  const fromAddress =
    `${process.env.SMTP_FROM_NAME || "Prava Financial Cloud"} <${
      process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "notifications@prava.in"
    }>`;

  testDispatchedNotifications.push({
    to,
    templateType,
    subject: rendered.subject,
    text: rendered.text,
    timestamp: new Date().toISOString(),
  });

  const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
  if (isTest) {
    return { success: true, provider: "test_mock", templateType, id: `test-msg-${Date.now()}` };
  }

  if (!getSmtpTransporter()) {
    return { success: false, provider: "smtp", templateType, error: "SMTP is not configured." };
  }

  const port = Number(process.env.SMTP_PORT || 587) || 587;

  try {
    const result = await sendViaSmtp({
      from: fromAddress,
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    return { success: true, provider: "smtp", port: result.port, id: result.info?.messageId, templateType };
  } catch (err) {
    resetSmtpTransporter();
    console.error(
      `[EmailService] Transactional email SMTP error for ${maskEmail(to)}:`,
      err.message,
      Array.isArray(err.attemptedPorts) ? `| ports tried: ${err.attemptedPorts.join(", ")}` : ""
    );
    const failure = deliveryErrorFor(err, port);
    return {
      success: false,
      provider: "smtp",
      templateType,
      error: failure.message,
      hint: failure.hint,
      code: failure.code,
    };
  }
}

export { maskEmail, maskPhone, BLOCKED_SMTP_PORTS };
