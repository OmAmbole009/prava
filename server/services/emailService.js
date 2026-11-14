import net from "node:net";
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
 * Environment values are often stored with surrounding quotes, which turns a
 * correct host into an unresolvable one. Normalise before building the
 * transport instead of failing with a misleading connection timeout.
 */
export function envValue(value) {
  if (value === undefined || value === null) return "";
  return String(value)
    .trim()
    .replace(/^["']+/, "")
    .replace(/["']+$/, "")
    .trim();
}

const SMTP_DNS_HINT =
  "SMTP_HOST could not be resolved. Check for typos and for stray quotes around " +
  "the value in the Render environment; for Gmail it must be exactly smtp.gmail.com.";

/**
 * The Gmail account that sends every OTP and verification email. It is the
 * sending identity only: the Prava administrator account is unrelated and is
 * never used to send mail.
 */
export const GMAIL_API_SENDER_DEFAULT = "ambole.rajesh@gmail.com";

const GMAIL_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_SEND_URL =
  "https://gmail.googleapis.com/gmail/v1/users/me/messages/send";

const GMAIL_SCOPE_HINT =
  `Re-authorise ${GMAIL_API_SENDER_DEFAULT} with the https://www.googleapis.com/auth/gmail.send ` +
  "scope, then store the refresh token in GMAIL_REFRESH_TOKEN. The Gmail API only " +
  "sends as the account that granted the token, so a token from another account " +
  "cannot deliver this mail.";

/** Reads GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN, or null. */
export function gmailApiConfig(env = process.env) {
  const clientId = envValue(env.GMAIL_CLIENT_ID);
  const clientSecret = envValue(env.GMAIL_CLIENT_SECRET);
  const refreshToken = envValue(env.GMAIL_REFRESH_TOKEN);
  if (!clientId || !clientSecret || !refreshToken) return null;
  return { clientId, clientSecret, refreshToken, sender: gmailSenderAddress(env) };
}

export function gmailSenderAddress(env = process.env) {
  return envValue(env.GMAIL_SENDER) || GMAIL_API_SENDER_DEFAULT;
}

/**
 * Gmail API over HTTPS is the preferred transport: Render Free blocks outbound
 * SMTP ports, but 443 is always open. SMTP stays available when explicitly
 * selected or when no Gmail OAuth credentials are present.
 */
export function resolveEmailProvider(env = process.env) {
  const explicit = envValue(env.EMAIL_PROVIDER).toLowerCase();
  if (explicit === "smtp") return "smtp";
  if (explicit === "gmail_api" || explicit === "gmail") return "gmail_api";
  return gmailApiConfig(env) ? "gmail_api" : "smtp";
}

/** Splits `"Name" <address>` into its parts. */
export function parseAddress(value) {
  const text = envValue(value);
  const angle = text.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : text).trim();
  const name = text
    .replace(/<[^>]*>/, "")
    .replace(/[",]/g, "")
    .trim();
  return { email, name };
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
  const primary = Number(envValue(env.SMTP_PORT) || 587) || 587;
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
  const user = envValue(env.SMTP_USER);
  // App passwords are often pasted with spaces in groups of four, or quoted.
  const pass = envValue(env.SMTP_PASS).replace(/\s+/g, "");
  if (!user || !pass) return null;

  const isGmailUser = user.toLowerCase().endsWith("@gmail.com");
  const host =
    envValue(env.SMTP_HOST) ||
    (isGmailUser || env.EMAIL_PROVIDER === "gmail" ? "smtp.gmail.com" : "");
  if (!host) return null;

  const primaryPort = Number(envValue(env.SMTP_PORT) || 587) || 587;
  const port = portOverride || primaryPort;
  // 465 is implicit TLS; 587 and 2525 upgrade with STARTTLS.
  const secure = port === 465 || envValue(env.SMTP_SECURE).toLowerCase() === "true";
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
  // Bounded retries: only for a socket that dropped, never for a timeout, so a
  // blocked port cannot multiply the delay.
  const attemptsPerPort = Math.min(
    3,
    Math.max(1, Number(envValue(process.env.SMTP_RETRY_ATTEMPTS) || 1) || 1)
  );
  const attempted = [];
  let lastError = null;

  for (const port of ports) {
    if (!attempted.includes(port)) attempted.push(port);

    for (let attempt = 1; attempt <= attemptsPerPort; attempt += 1) {
      const transporter = getSmtpTransporter(port);
      if (!transporter) {
        throw new Error("SMTP transport could not be created from the configured settings.");
      }
      try {
        const info = await transporter.sendMail(message);
        return { info, port, attempted };
      } catch (error) {
        lastError = error;
        resetSmtpTransporter();

        if (isSmtpAuthError(error) || !isSmtpConnectionError(error)) {
          error.attemptedPorts = attempted;
          throw error;
        }

        const transientSocket = ["ESOCKET", "ECONNECTION"].includes(
          String(error.code || "")
        );
        if (transientSocket && attempt < attemptsPerPort) {
          console.warn(
            `[EmailService] SMTP socket dropped on port ${port} (attempt ${attempt}/${attemptsPerPort}); retrying.`
          );
          await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
          continue;
        }

        console.warn(
          `[EmailService] SMTP port ${port} unreachable (${error.code || error.message}); trying the next port.`
        );
        break;
      }
    }
  }

  lastError = lastError || new Error("SMTP delivery failed.");
  lastError.attemptedPorts = attempted;
  throw lastError;
}

/* ─── Gmail API (HTTPS) ──────────────────────────────────────────────────── */

let gmailTokenCache = null;

/** Drops the cached access token (called on 401 so the next send refreshes). */
export function resetGmailToken() {
  gmailTokenCache = null;
}

/**
 * Exchanges the stored refresh token for a short-lived access token.
 * Cached until a minute before expiry so a burst of OTPs costs one token call.
 */
export async function getGmailAccessToken(env = process.env, fetchImpl = fetch) {
  const config = gmailApiConfig(env);
  if (!config) {
    throw new HttpError(
      500,
      "Verification email could not be sent because the Gmail API is not configured on this server.",
      {
        code: "EMAIL_NOT_CONFIGURED",
        hint:
          "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, then redeploy. " +
          GMAIL_SCOPE_HINT,
      }
    );
  }

  if (gmailTokenCache && gmailTokenCache.expiresAt > Date.now() + 60_000) {
    return gmailTokenCache.accessToken;
  }

  const response = await fetchImpl(GMAIL_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: config.refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.access_token) {
    const reason =
      data?.error_description || data?.error || `HTTP ${response.status}`;
    throw new HttpError(
      500,
      "Verification email could not be delivered: Google refused the Gmail API authorisation.",
      {
        code: "EMAIL_GMAIL_AUTH_FAILED",
        hint: `${reason}. ${GMAIL_SCOPE_HINT}`,
        details: { status: response.status },
      }
    );
  }

  gmailTokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (Number(data.expires_in) || 3600) * 1000,
  };
  return gmailTokenCache.accessToken;
}

function encodeHeader(value) {
  const text = String(value ?? "");
  // RFC 2047 keeps non-ASCII subjects and names intact in transit.
  return /^[\x20-\x7E]*$/.test(text)
    ? text
    : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

function wrapBase64(value) {
  return value.replace(/(.{76})/g, "$1\r\n");
}

/**
 * Builds the RFC 822 message the Gmail API accepts in `raw`.
 * Kept pure so the wire format can be asserted in tests.
 */
export function buildGmailRawMessage({ from, to, subject, text, html }) {
  const boundary = `prava_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");

  const part = (type, body) =>
    [
      `--${boundary}`,
      `Content-Type: ${type}; charset="UTF-8"`,
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(Buffer.from(String(body ?? ""), "utf8").toString("base64")),
    ].join("\r\n");

  const body = [
    part("text/plain", text),
    part("text/html", html),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return `${headers}\r\n\r\n${body}`;
}

/** From header pinned to the authorised Gmail account. */
function gmailFromHeader(configuredFrom, sender) {
  const { email, name } = parseAddress(configuredFrom);
  if (email && email.toLowerCase() !== sender.toLowerCase()) {
    console.warn(
      "[EmailService] The configured From address differs from GMAIL_SENDER; " +
        "sending as the authorised Gmail account instead."
    );
  }
  const displayName = (name || "Prava Security").replace(/"/g, "").trim();
  return `"${displayName}" <${sender}>`;
}

/**
 * Sends one message through the Gmail API. Resolves only when Google accepted
 * it, so callers cannot report success for an undelivered OTP.
 */
export async function sendViaGmailApi(message, env = process.env, fetchImpl = fetch) {
  const config = gmailApiConfig(env);
  if (!config) {
    throw new HttpError(
      500,
      "Verification email could not be sent because the Gmail API is not configured on this server.",
      {
        code: "EMAIL_NOT_CONFIGURED",
        hint:
          "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, then redeploy. " +
          GMAIL_SCOPE_HINT,
      }
    );
  }

  const accessToken = await getGmailAccessToken(env, fetchImpl);
  const raw = buildGmailRawMessage({
    from: gmailFromHeader(message.from, config.sender),
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });

  const response = await fetchImpl(GMAIL_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: Buffer.from(raw, "utf8").toString("base64url") }),
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    if (response.status === 401) resetGmailToken();
    const reason =
      detail?.error?.message || detail?.error_description || response.statusText;
    throw new HttpError(
      500,
      `The Gmail API rejected the message (HTTP ${response.status}).`,
      {
        code:
          response.status === 403
            ? "EMAIL_GMAIL_AUTH_FAILED"
            : "EMAIL_PROVIDER_REJECTED",
        hint:
          response.status === 403
            ? `${reason}. ${GMAIL_SCOPE_HINT}`
            : `${reason}. Confirm GMAIL_REFRESH_TOKEN belongs to ${config.sender} and has not been revoked, then retry.`,
        details: { status: response.status },
      }
    );
  }

  const data = await response.json().catch(() => ({}));
  return { id: data?.id, threadId: data?.threadId, sender: config.sender };
}

/** Delivers through the resolved provider and returns a provider-neutral result. */
export async function sendMessage(message, env = process.env, fetchImpl = fetch) {
  const provider = resolveEmailProvider(env);
  if (provider === "gmail_api") {
    const result = await sendViaGmailApi(message, env, fetchImpl);
    return { provider, id: result.id, sender: result.sender };
  }
  const result = await sendViaSmtp(message);
  return { provider: "smtp", port: result.port, id: result.info?.messageId };
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
  const attempted = Array.isArray(error?.attemptedPorts) ? error.attemptedPorts : [port];

  if (isSmtpAuthError(error)) {
    return new HttpError(
      500,
      "Verification email could not be sent because the mail server rejected the login.",
      { code: "EMAIL_SMTP_AUTH_FAILED", hint: SMTP_AUTH_HINT, details: { port } }
    );
  }

  const errorCode = String(error?.code || "");
  if (errorCode === "ENOTFOUND" || errorCode === "EDNS") {
    return new HttpError(
      500,
      "Verification email could not be delivered: the SMTP host could not be resolved.",
      {
        code: "EMAIL_SMTP_UNREACHABLE",
        hint: SMTP_DNS_HINT,
        details: { attemptedPorts: attempted },
      }
    );
  }

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

  const provider = resolveEmailProvider();

  if (provider === "gmail_api" && !gmailApiConfig()) {
    throw new HttpError(
      500,
      "Verification email could not be sent because the Gmail API is not configured on this server.",
      {
        code: "EMAIL_NOT_CONFIGURED",
        hint:
          "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, then redeploy. " +
          GMAIL_SCOPE_HINT,
      }
    );
  }

  if (provider === "smtp" && !getSmtpTransporter()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[EmailService] No email transport configured in .env. Dispatched mock OTP challenge to: ${maskEmail(to)}`
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

  try {
    const result = await sendMessage({
      from: fromAddress,
      to,
      subject,
      text: textBody,
      html: htmlBody,
    });
    console.log(
      `[EmailService] Verification email accepted by ${result.provider}${
        result.sender ? ` as ${result.sender}` : ""
      }${result.port ? ` (port ${result.port})` : ""} for ${maskEmail(to)}${
        result.id ? ` (id ${result.id})` : ""
      }`
    );
    return {
      success: true,
      provider: result.provider,
      port: result.port,
      id: result.id,
      sender: result.sender,
    };
  } catch (err) {
    resetSmtpTransporter();
    const failure =
      err instanceof HttpError
        ? err
        : deliveryErrorFor(err, Number(envValue(process.env.SMTP_PORT) || 587) || 587);
    console.error(
      `[EmailService] Delivery failure via ${provider} for ${maskEmail(to)}:`,
      failure.message,
      failure.hint ? `| ${failure.hint}` : ""
    );
    throw failure;
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
 * Raw TCP reachability probe. This separates "the network drops this port"
 * from "the SMTP handshake or credentials failed", which look identical in a
 * nodemailer timeout.
 */
export function tcpProbe(host, port, timeoutMs = 5000) {
  return new Promise((resolve) => {
    if (!host || !port) {
      resolve({ port, ok: false, code: "EINVAL", message: "Missing host or port" });
      return;
    }
    const socket = new net.Socket();
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish({ port, ok: true }));
    socket.once("timeout", () =>
      finish({ port, ok: false, code: "ETIMEDOUT", message: "TCP connect timed out" })
    );
    socket.once("error", (error) =>
      finish({ port, ok: false, code: error.code, message: error.message })
    );
    socket.connect(port, host);
  });
}

/**
 * Provider-aware readiness check used by the startup log and the admin route:
 * validates the Gmail API authorisation, or the SMTP handshake for SMTP.
 */
export async function verifyEmailDelivery() {
  const provider = resolveEmailProvider();

  if (provider === "gmail_api") {
    const config = gmailApiConfig();
    if (!config) {
      return {
        ok: false,
        provider,
        configured: false,
        message: "Gmail API credentials missing.",
        hint:
          "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, then redeploy. " +
          GMAIL_SCOPE_HINT,
      };
    }
    try {
      await getGmailAccessToken();
      return {
        ok: true,
        provider,
        configured: true,
        sender: config.sender,
        message: `Gmail API authorisation verified; email will be sent as ${config.sender}.`,
      };
    } catch (error) {
      return {
        ok: false,
        provider,
        configured: true,
        sender: config.sender,
        message: error.message,
        hint: error.hint,
      };
    }
  }

  return verifySmtpConnection();
}

/**
 * Verifies SMTP reachability and handshake across every candidate port.
 * Runs a TCP probe first so a blocked port is reported as such.
 * Returns a structured report and never throws.
 */
export async function verifySmtpConnection() {
  const options = buildSmtpTransportOptions();
  const ports = smtpPortCandidates();
  const host = options?.host || "smtp.gmail.com";

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

  // Phase 1: can we even open a TCP socket?
  const tcp = [];
  for (const port of ports) {
    const probe = await tcpProbe(host, port, 5000);
    tcp.push(probe);
    if (probe.ok) break;
  }
  const reachable = tcp.find((probe) => probe.ok);

  if (!reachable) {
    const dnsFailure = tcp.some((probe) => probe.code === "ENOTFOUND");
    return {
      ok: false,
      configured: true,
      provider: "smtp",
      host,
      ports,
      tcp,
      blockedPort: true,
      hint: dnsFailure ? SMTP_DNS_HINT : SMTP_PORT_BLOCK_HINT,
      message: dnsFailure
        ? `SMTP host ${host} could not be resolved.`
        : `No TCP connection to ${host} on ports ${ports.join(", ")}. The network is blocking SMTP egress.`,
    };
  }

  // Phase 2: SMTP handshake and authentication on the reachable port.
  const attempts = [];
  for (const port of [reachable.port]) {
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
      // A rejected login fails identically on every port; stop early.
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

  const provider = resolveEmailProvider();

  try {
    const result = await sendMessage({
      from: fromAddress,
      to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    return {
      success: true,
      provider: result.provider,
      port: result.port,
      id: result.id,
      sender: result.sender,
      templateType,
    };
  } catch (err) {
    resetSmtpTransporter();
    const failure =
      err instanceof HttpError
        ? err
        : deliveryErrorFor(err, Number(envValue(process.env.SMTP_PORT) || 587) || 587);
    console.error(
      `[EmailService] Transactional email failure via ${provider} for ${maskEmail(to)}:`,
      failure.message,
      failure.hint ? `| ${failure.hint}` : ""
    );
    return {
      success: false,
      provider,
      templateType,
      error: failure.message,
      hint: failure.hint,
      code: failure.code,
    };
  }
}

export { maskEmail, maskPhone, BLOCKED_SMTP_PORTS };
