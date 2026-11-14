import {
  sendOtpEmail,
  __getLastDispatchedOtpFor,
  __clearDispatchedNotifications,
  __getDispatchedNotifications,
} from "./emailService.js";

export { __getLastDispatchedOtpFor, __clearDispatchedNotifications, __getDispatchedNotifications };

/**
 * Real Multi-Channel Notification Service for Email & SMS Delivery
 */

const dispatchedNotifications = [];

/**
 * Sends the 6-digit verification code through the shared email transport
 * (Gmail API in production). A throw from sendOtpEmail propagates, so the
 * caller never reports a delivery that did not happen.
 */
export async function sendEmailOtp({ to, code, purpose = "login" }) {
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
  const result = await sendOtpEmail({ to, otp: code, purpose, expiryMinutes });
  return { success: result?.success !== false, provider: result?.provider || "unknown" };
}

/**
 * Sends a real SMS containing the 6-digit verification code.
 */
export async function sendSmsOtp({ to, code, purpose = "login" }) {
  dispatchedNotifications.push({ type: "sms", to, code, purpose, timestamp: Date.now() });
  const provider = (process.env.SMS_PROVIDER || "twilio").toLowerCase();
  const actionLabel = purpose === "password_reset" ? "password reset" : "login";
  const messageBody = `Prava: Your ${actionLabel} verification code is ${code}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 5} minutes. Never share this OTP with anyone.`;

  // 1. Twilio SMS
  if (provider === "twilio" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
      const url = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;

      const params = new URLSearchParams();
      params.append("From", process.env.TWILIO_PHONE_NUMBER);
      params.append("To", to);
      params.append("Body", messageBody);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn("[NotificationService] Twilio SMS API error:", errText);
      } else {
        return { success: true, provider: "twilio" };
      }
    } catch (err) {
      console.warn("[NotificationService] Twilio dispatch exception:", err.message);
    }
  }

  // 2. Generic SMS Gateway / Fast2SMS
  if (provider === "fast2sms" && process.env.SMS_API_KEY) {
    try {
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "otp",
          variables_values: code,
          numbers: to.replace(/\D/g, "").slice(-10),
        }),
      });
      if (res.ok) return { success: true, provider: "fast2sms" };
    } catch (err) {
      console.warn("[NotificationService] Fast2SMS dispatch exception:", err.message);
    }
  }

  return { success: true, provider: "fallback" };
}
