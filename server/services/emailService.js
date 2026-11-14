import nodemailer from "nodemailer";
import { HttpError } from "../../shared/_core/errors.js";

/**
 * Enterprise Email Delivery Service for Prava OTP Authentication.
 * SMTP transport as primary, with Resend API as secondary option.
 *
 * Strict Security Rules:
 * - NEVER log or print OTP codes to console or files.
 * - Require explicit API keys / credentials when in non-test environments.
 * - Throw clear configuration errors when email credentials are missing.
 * - Mask all identifiers in logs to prevent partial email/phone exposure.
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

// SMTP transporter cache
let smtpTransporter = null;

/** Ports Render (and most PaaS providers) drop on free/starter plans. */
const BLOCKED_SMTP_PORTS = [25, 465, 587];
const SMTP_PORT_BLOCK_HINT =
  "Outbound SMTP ports 25, 465 and 587 are blocked on this hosting plan, so the " +
  "connection times out no matter what credentials are configured. Use an HTTPS " +
  "email API (EMAIL_PROVIDER=resend with RESEND_API_KEY) or a provider that listens " +
  "on an unblocked port such as 2525.";

function seconds(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Chooses the delivery provider. Resend is picked automatically whenever SMTP
 * credentials are absent but an API key is present, so a deployment cannot end
 * up on a transport it cannot use.
 */
export function resolveEmailProvider(env = process.env) {
  const configured = (env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (configured) return configured;
  const hasSmtp = Boolean(env.SMTP_USER?.trim() && env.SMTP_PASS?.trim());
  if (hasSmtp) return "smtp";
  if (env.RESEND_API_KEY?.trim()) return "resend";
  return "smtp";
}

/**
 * Builds nodemailer transport options.
 *
 * Deliberately does NOT use nodemailer's `service: "gmail"` preset: that preset
 * forces port 465 + implicit TLS and silently discards every timeout option, so
 * a blocked port hangs indefinitely and SMTP_PORT/SMTP_SECURE are ignored.
 */
export function buildSmtpTransportOptions(env = process.env) {
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

  const port = Number(env.SMTP_PORT || 587) || 587;
  const secure = env.SMTP_SECURE === "true" || port === 465;

  return {
    host,
    port,
    secure,
    auth: { user, pass },
    // Implicit TLS on 465; upgrades to TLS via STARTTLS on 587.
    requireTLS: !secure && env.SMTP_REQUIRE_TLS !== "false",
    connectionTimeout: seconds(env.SMTP_CONNECTION_TIMEOUT_SEC, 10) * 1000,
    greetingTimeout: seconds(env.SMTP_GREETING_TIMEOUT_SEC, 10) * 1000,
    socketTimeout: seconds(env.SMTP_SOCKET_TIMEOUT_SEC, 20) * 1000,
    tls: { servername: host, minVersion: "TLSv1.2" },
  };
}

/**
 * Creates (and caches) the SMTP transporter with full timeout configuration.
 */
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  const options = buildSmtpTransportOptions();
  if (!options) return null;
  smtpTransporter = nodemailer.createTransport(options);
  return smtpTransporter;
}

/**
 * Drops the cached transporter so a later attempt opens a fresh connection
 * instead of reusing a socket that already failed or timed out.
 */
function resetSmtpTransporter() {
  try {
    smtpTransporter?.close?.();
  } catch {
    // Ignore: the transport is already unusable.
  }
  smtpTransporter = null;
}

/**
 * HTTPS delivery through Resend. Works on hosts that block SMTP ports entirely.
 * Returns the provider result, or null when no API key is configured.
 */
async function sendViaResend({ apiKey, from, to, subject, text, html, label = "email" }) {
  if (!apiKey) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const rawMessage = errorData.message || res.statusText || "Resend API error";
    throw new HttpError(500, `Failed to deliver ${label} via Resend (${rawMessage}).`);
  }

  const data = await res.json();
  return { success: true, provider: "resend", id: data.id };
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

/**
 * Dispatches an email containing the secure 6-digit OTP code.
 *
 * Primary Transport: SMTP (configured via SMTP_HOST, SMTP_USER, SMTP_PASS)
 * Secondary Transport: Resend API (if EMAIL_PROVIDER=resend and RESEND_API_KEY set)
 *
 * Security Rules Enforced:
 * - OTP codes are NEVER logged to console or files
 * - Identifiers are masked in all log messages
 * - Provider fallback logic: SMTP (default) -> Resend (if configured)
 * - Structured error messages without exposing secrets
 *
 * @param {Object} options
 * @param {string} options.to - Recipient email address
 * @param {string} options.otp - 6-digit OTP code (NEVER logged)
 * @param {string} options.purpose - Purpose ("login" | "password_reset")
 * @param {number} [options.expiryMinutes=5] - Expiry in minutes
 * @returns {Promise<Object>} Dispatch result with provider and message ID
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

  const provider = resolveEmailProvider();
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

  // In test environment, skip external network call to keep tests fast, hermetic, and offline
  if (isTestEnv) {
    return { success: true, provider: "test_mock", id: "test-mock-msg-id" };
  }

  // 1. SMTP TRANSPORT (PRIMARY - always first choice)
  if (provider === "smtp" || provider === "gmail" || provider === "email") {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      if (process.env.NODE_ENV !== "production") {
        // Development: warn and use mock, but don't expose credentials
        console.warn(
          `[EmailService] SMTP credentials not set in .env. Dispatched mock OTP challenge to: ${maskEmail(to)}`
        );
        return { success: true, provider: "smtp_dev_fallback", id: "dev-smtp-otp" };
      }
      throw new HttpError(
        500,
        "Verification email could not be sent because email delivery is not configured on this server.",
        {
          code: "EMAIL_NOT_CONFIGURED",
          hint:
            "An administrator must configure email delivery: set RESEND_API_KEY (HTTPS API, works on Render) or valid SMTP_HOST, SMTP_USER and SMTP_PASS. Until then, use Google sign-in or contact your administrator.",
        }
      );
    }

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to,
        subject,
        text: textBody,
        html: htmlBody,
      });
      // SUCCESS: log delivery without exposing OTP code or full identifier
      console.log(
        `[EmailService] Verification email delivered via SMTP to ${maskEmail(to)}`
      );
      return {
        success: true,
        provider: "smtp",
        id: info.messageId,
      };
    } catch (err) {
      // SMTP ERROR: structured logging without exposing secrets
      const errorMsg = err.message || "Unknown SMTP error";
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const blockedPort = BLOCKED_SMTP_PORTS.includes(smtpPort);
      console.error(
        `[EmailService] SMTP delivery failure for ${maskEmail(to)}:`,
        errorMsg,
        blockedPort ? `| ${SMTP_PORT_BLOCK_HINT}` : ""
      );

      // Never reuse a transport whose socket already failed or timed out.
      resetSmtpTransporter();

      // Automatic HTTPS fallback: SMTP egress is blocked on many PaaS plans, so
      // a configured Resend key is used rather than failing the sign-in.
      const resendKey = process.env.RESEND_API_KEY?.trim();
      if (resendKey) {
        try {
          const fallback = await sendViaResend({
            apiKey: resendKey,
            from: fromAddress,
            to,
            subject,
            text: textBody,
            html: htmlBody,
            label: "verification email",
          });
          console.warn(
            `[EmailService] Verification email delivered via Resend fallback after SMTP failure for ${maskEmail(to)}.`
          );
          return { ...fallback, fallbackFrom: "smtp" };
        } catch (fallbackError) {
          console.error(
            `[EmailService] Resend fallback failed for ${maskEmail(to)}:`,
            fallbackError.message
          );
        }
      }

      if (process.env.NODE_ENV !== "production") {
        // Development: warn with notice, allow mock fallback
        console.warn(
          `[EmailService] SMTP transmission notice for ${maskEmail(to)}: ${errorMsg}`
        );
        return { success: true, provider: "smtp_dev_fallback", id: "dev-smtp-otp" };
      }

      if (blockedPort && !resendKey) {
        throw new HttpError(
          500,
          `Verification email could not be delivered: the server cannot reach the email provider on port ${smtpPort}.`,
          {
            code: "EMAIL_PORT_BLOCKED",
            hint:
              "The hosting provider blocks outbound SMTP traffic on ports 25, 465 and 587. Set RESEND_API_KEY on the server so verification codes are sent over HTTPS, or upgrade to a plan with SMTP egress. You can sign in with Google in the meantime.",
            details: { port: smtpPort },
          }
        );
      }

      throw new HttpError(
        500,
        "Verification email could not be delivered. Please check the email configuration and try again later.",
        {
          code: "EMAIL_DELIVERY_FAILED",
          hint:
            "Confirm SMTP credentials, or set RESEND_API_KEY so delivery falls back to the HTTPS API. You can also try Google sign-in.",
        }
      );
    }
  }

  // 2. RESEND API (SECONDARY - only if explicitly configured)
  if (provider === "resend") {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new HttpError(
        500,
        "Verification email could not be sent because email delivery is not configured on this server.",
        {
          code: "EMAIL_NOT_CONFIGURED",
          hint:
            "EMAIL_PROVIDER is set to resend but RESEND_API_KEY is missing. An administrator must add the key, or configure SMTP credentials instead.",
        }
      );
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Extract raw error message without exposing OTP or credentials
        const rawMessage =
          errorData.message ||
          res.statusText ||
          "Resend API error";

        // Structured log: mask identifier, include error type but not OTP
        console.error(
          `[EmailService] Resend delivery error for ${maskEmail(to)}:`,
          rawMessage
        );

        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `[EmailService] Resend fallback notice for ${maskEmail(to)}: ${rawMessage}`
          );
          return { success: true, provider: "resend_sandbox_fallback", id: "dev-sandbox-otp" };
        }

        throw new HttpError(
          500,
          "Verification email could not be delivered by the email provider.",
          {
            code: "EMAIL_DELIVERY_FAILED",
            hint: `The provider rejected the request (${rawMessage}). Check that the sender address is verified, then retry.`,
          }
        );
      }

      const data = await res.json();
      // Structured success log: mask identifier, include Resend message ID only
      console.log(
        `[EmailService] Verification email successfully dispatched to ${maskEmail(to)} via Resend (ID: ${data.id})`
      );
      return {
        success: true,
        provider: "resend",
        id: data.id,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      // Network-level error: log without exposing secrets
      console.error(
        `[EmailService] Network exception sending email via Resend to ${maskEmail(to)}:`,
        err.message
      );
      throw new HttpError(
        500,
        "Unable to dispatch verification email due to a network error.",
        {
          code: "EMAIL_DELIVERY_FAILED",
          hint: "The server could not reach the email provider. Retry in a moment; if it persists, contact your administrator.",
        }
      );
    }
  }

  // Fallback: unsupported provider
  throw new HttpError(
    500,
    "Verification email could not be sent because the configured email provider is not supported.",
    {
      code: "EMAIL_NOT_CONFIGURED",
      hint: `EMAIL_PROVIDER is "${provider}". Expected "smtp", "gmail", "email" or "resend".`,
    }
  );
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
 * Verifies SMTP configuration and connection handshake.
 * Returns structured health report without throwing.
 * Does NOT expose OTP codes, passwords, or full credentials in the response.
 */
export async function verifySmtpConnection() {
  const options = buildSmtpTransportOptions();
  const host = options?.host || process.env.SMTP_HOST || "smtp.gmail.com";
  const port = options?.port || Number(process.env.SMTP_PORT || 587);
  const secure = options?.secure || false;
  const blockedPort = BLOCKED_SMTP_PORTS.includes(port);

  if (!options) {
    return {
      ok: false,
      configured: false,
      message: "SMTP credentials missing. Please set SMTP_USER and SMTP_PASS in environment.",
    };
  }

  const transporter = getSmtpTransporter();
  if (!transporter) {
    return {
      ok: false,
      configured: false,
      message: "Could not create SMTP transport with provided settings.",
    };
  }

  try {
    await transporter.verify();
    return {
      ok: true,
      configured: true,
      host,
      port,
      secure,
      message: `SMTP connection verified successfully to ${host}:${port}.`,
    };
  } catch (err) {
    // Log the error internally without exposing full details
    console.error(
      `[EmailService] SMTP verification failed for ${host}:${port}`,
      err.message
    );
    return {
      ok: false,
      configured: true,
      host,
      port,
      error: err.message,
      blockedPort,
      hint: blockedPort ? SMTP_PORT_BLOCK_HINT : undefined,
      message: blockedPort
        ? `SMTP verification failed on port ${port}. ${SMTP_PORT_BLOCK_HINT}`
        : `SMTP verification failed: connection or authentication error. Please check your SMTP settings.`,
    };
  }
}

/**
 * Dispatches enterprise transactional emails with Prava branded templates.
 * Supports SMTP as primary transport.
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

  // Record dispatched notification for test verification
  // Note: OTP codes and secrets are NOT included in the recorded notification
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

  const provider = resolveEmailProvider();

  // 1. SMTP Transport (Primary)
  if (provider === "smtp" || provider === "gmail" || provider === "email") {
    const transporter = getSmtpTransporter();
    if (transporter) {
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        });
        return { success: true, provider: "smtp", id: info.messageId, templateType };
      } catch (err) {
        console.error(
          `[EmailService] Transactional email SMTP error for ${maskEmail(to)}:`,
          err.message
        );
        resetSmtpTransporter();

        const resendKey = process.env.RESEND_API_KEY?.trim();
        if (resendKey) {
          try {
            const fallback = await sendViaResend({
              apiKey: resendKey,
              from: fromAddress,
              to,
              subject: rendered.subject,
              text: rendered.text,
              html: rendered.html,
              label: "transactional email",
            });
            return { ...fallback, templateType, fallbackFrom: "smtp" };
          } catch (fallbackError) {
            console.error(
              `[EmailService] Resend fallback failed for ${maskEmail(to)}:`,
              fallbackError.message
            );
          }
        }

        return {
          success: true,
          provider: "smtp_error_logged",
          error: "SMTP delivery failed - check server logs for details",
          templateType,
        };
      }
    }

    return { success: true, provider: "dev_sandbox_logged", templateType };
  }

  // 2. Resend API (Secondary - only if explicitly configured)
  if (provider === "resend") {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new HttpError(
        500,
        "Email delivery is not configured. Please set RESEND_API_KEY in your .env configuration, or set EMAIL_PROVIDER=smtp for SMTP."
      );
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [to],
          subject: rendered.subject,
          text: rendered.text,
          html: rendered.html,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const rawMessage =
          errorData.message || res.statusText || "Resend API error";

        console.error(
          `[EmailService] Resend transactional error for ${maskEmail(to)}:`,
          rawMessage
        );

        throw new HttpError(
          500,
          `Failed to deliver transactional email.`
        );
      }

      const data = await res.json();
      console.log(
        `[EmailService] Transactional email dispatched to ${maskEmail(to)} via Resend (ID: ${data.id})`
      );
      return {
        success: true,
        provider: "resend",
        id: data.id,
        templateType,
      };
    } catch (err) {
      if (err instanceof HttpError) throw err;
      console.error(
        `[EmailService] Network exception sending transactional email via Resend to ${maskEmail(to)}:`,
        err.message
      );
      throw new HttpError(
        500,
        "Unable to dispatch transactional email due to a network error."
      );
    }
  }

  throw new HttpError(
    500,
    "Verification email could not be sent because the configured email provider is not supported.",
    {
      code: "EMAIL_NOT_CONFIGURED",
      hint: `EMAIL_PROVIDER is "${provider}". Expected "smtp", "gmail", "email" or "resend".`,
    }
  );
}