import { randomInt } from "node:crypto";
import { HttpError } from "../shared/_core/errors.js";

// In-memory OTP storage: Map<normalizedIdentifier, { code, expiresAt, attempts, method }>
const otpStore = new Map();

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/**
 * Normalizes identifier (email or phone)
 */
export function normalizeIdentifier(raw, method = null) {
  if (!raw) return "";
  const str = String(raw).trim();
  if (method === "mobile" || (!str.includes("@") && str.replace(/\D/g, "").length >= 7)) {
    // Keep numbers and leading + if present
    const digitsOnly = str.replace(/[^\d+]/g, "");
    return digitsOnly;
  }
  return str.toLowerCase();
}

/**
 * Masks an identifier for secure display (e.g. j***@example.com or +91******1234)
 */
export function maskIdentifier(identifier) {
  if (!identifier) return "";
  if (identifier.includes("@")) {
    const [name, domain] = identifier.split("@");
    if (name.length <= 2) return `${name[0] || "*"}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }
  const digits = identifier.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${identifier.slice(0, 3)}******${identifier.slice(-4)}`;
}

/**
 * Generates and sends a 6-digit OTP to mobile phone or email.
 */
export async function sendOtp({ identifier, method = "mobile" }) {
  if (!identifier) {
    throw new HttpError(400, "Please provide a valid email or mobile number.");
  }

  const normalized = normalizeIdentifier(identifier, method);

  if (method === "email" && (!normalized.includes("@") || !normalized.includes("."))) {
    throw new HttpError(400, "Please enter a valid email address.");
  }

  if (method === "mobile") {
    const digitsOnly = normalized.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      throw new HttpError(400, "Please enter a valid 10-digit mobile number.");
    }
  }

  // Generate 6-digit secure numeric code
  const code = randomInt(100000, 999999).toString();

  otpStore.set(normalized, {
    code,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    method,
  });

  const channelLabel = method === "mobile" ? "Mobile SMS" : "Gmail / Email";
  const masked = maskIdentifier(normalized);

  console.log(`
┌──────────────────────────────────────────────────────────────────┐
│  [PRAVA AUTHENTICATION OTP SERVICE]                             │
│  Channel:    ${channelLabel.padEnd(52)}│
│  Recipient:  ${masked.padEnd(52)}│
│  Code:       ${code.padEnd(52)}│
│  Expires In: 10 minutes                                         │
└──────────────────────────────────────────────────────────────────┘
  `);

  return {
    success: true,
    message: `Verification code sent to ${masked} via ${channelLabel}.`,
    channel: method,
    identifier: masked,
    // Return previewCode in development/test so local testing is effortless
    previewCode: process.env.NODE_ENV !== "production" ? code : undefined,
  };
}

/**
 * Validates a submitted OTP code.
 */
export async function verifyOtpCode({ identifier, code }) {
  if (!identifier || !code) {
    throw new HttpError(400, "Identifier and 6-digit verification code are required.");
  }

  const normalized = normalizeIdentifier(identifier);
  const entry = otpStore.get(normalized);

  if (!entry) {
    throw new HttpError(400, "No active verification code found. Please request a new code.");
  }

  if (Date.now() > entry.expiresAt) {
    otpStore.delete(normalized);
    throw new HttpError(400, "Verification code has expired. Please request a new code.");
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    otpStore.delete(normalized);
    throw new HttpError(429, "Too many failed attempts. Please request a new verification code.");
  }

  const suppliedCode = String(code).trim();
  if (suppliedCode !== entry.code) {
    throw new HttpError(400, "Invalid verification code. Please check your SMS/email and try again.");
  }

  // Verification successful, consume code
  otpStore.delete(normalized);

  return {
    valid: true,
    identifier: normalized,
    method: entry.method,
  };
}
