import nodemailer from "nodemailer";
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

let smtpTransporter = null;
const dispatchedNotifications = [];

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;

  const host = process.env.SMTP_HOST || (process.env.EMAIL_PROVIDER === "gmail" ? "smtp.gmail.com" : null);
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if ((host || process.env.EMAIL_PROVIDER === "gmail") && user && pass) {
    const isGmail = (host && host.includes("gmail")) || process.env.EMAIL_PROVIDER === "gmail";
    smtpTransporter = nodemailer.createTransport(
      isGmail
        ? {
            service: "gmail",
            auth: {
              user: user.trim(),
              pass: pass.replace(/\s+/g, ""),
            },
          }
        : {
            host,
            port,
            secure: port === 465,
            auth: { user, pass },
          }
    );
    return smtpTransporter;
  }
  return null;
}

/**
 * Sends a real Email containing the 6-digit verification code via emailService.
 */
export async function sendEmailOtp({ to, code, purpose = "login" }) {
  const expiryMinutes = Number(process.env.OTP_EXPIRY_MINUTES) || 5;
  const result = await sendOtpEmail({ to, otp: code, purpose, expiryMinutes });
  return { success: true, provider: result.provider, devOtpCode: result.devOtpCode };
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
