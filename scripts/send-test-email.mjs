/**
 * Real email delivery check.
 *
 * Sends one message through the active transport (Gmail API in production) and
 * prints what the provider actually answered. Exits non-zero on failure, so it
 * can never be mistaken for a successful delivery.
 *
 * Usage:
 *   node scripts/send-test-email.mjs recipient@example.com
 *   npm run email:test -- recipient@example.com
 *
 * Credentials are read from .env / the process environment:
 *   GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER
 */
import "dotenv/config";
import {
  GMAIL_API_SENDER_DEFAULT,
  describeEmailTransport,
  sendMessage,
} from "../server/services/emailService.js";

const to = process.argv[2] || process.env.TEST_EMAIL_TO;
const transport = describeEmailTransport();

console.log(
  `[email:test] active transport: ${transport.provider}${
    transport.sender ? ` (sender: ${transport.sender})` : ""
  }${transport.configured ? "" : " [credentials missing]"}`
);

if (!to) {
  console.error("[email:test] No recipient. Pass an address: npm run email:test -- you@example.com");
  process.exit(2);
}

if (transport.provider !== "gmail_api") {
  console.error(
    "[email:test] The active transport is SMTP, but Gmail API is required. " +
      "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN, and " +
      "do not set EMAIL_PROVIDER=smtp."
  );
  process.exit(1);
}

const subject = "Prava email delivery test";
const text = [
  "This is a delivery test from the Prava server.",
  "",
  `Transport: Gmail API`,
  `Sender: ${transport.sender || GMAIL_API_SENDER_DEFAULT}`,
  `Time: ${new Date().toISOString()}`,
].join("\n");

const html = `<p>This is a delivery test from the Prava server.</p>
<ul>
  <li>Transport: Gmail API</li>
  <li>Sender: ${transport.sender || GMAIL_API_SENDER_DEFAULT}</li>
  <li>Time: ${new Date().toISOString()}</li>
</ul>`;

try {
  const result = await sendMessage({
    from: `"Prava Security" <${transport.sender || GMAIL_API_SENDER_DEFAULT}>`,
    to,
    subject,
    text,
    html,
  });
  console.log("[email:test] accepted by the provider:", JSON.stringify(result));
  console.log(`[email:test] Check the inbox of ${to} for "${subject}".`);
} catch (error) {
  console.error(
    "[email:test] delivery failed:",
    JSON.stringify({
      code: error?.code || null,
      message: error?.message || String(error),
      hint: error?.hint || null,
    })
  );
  process.exit(1);
}
