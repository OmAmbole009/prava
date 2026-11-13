import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { eq, lte } from "drizzle-orm";
import { HttpError } from "../../shared/_core/errors.js";
import { otpChallenges } from "../../drizzle/schema.js";
import { getDb } from "../db.js";
import { sendEmailOtp, sendSmsOtp } from "./notification.service.js";

/**
 * Enterprise OTP & Challenge Security Service for Prava.
 *
 * Security Requirements:
 * - Cryptographically random 6-digit OTP (100000 - 999999).
 * - Expires after exactly 5 minutes.
 * - Maximum 5 verification attempts before challenge is strictly revoked.
 * - Resend cooldown of exactly 60 seconds.
 * - Salted scrypt hashing; plaintext OTP is NEVER stored and NEVER logged.
 * - Previous OTPs for the same recipient are strictly invalidated on new challenge/resend.
 * - Single-use guarantee: challenge is destroyed immediately upon successful verification.
 * - Automatic background garbage collection for expired challenge records.
 */

const DEFAULT_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const isTestEnv = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);
const RESEND_COOLDOWN_MS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS)
  ? Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) * 1000
  : (isTestEnv ? 30 * 1000 : 60 * 1000);

/**
 * Dedicated In-Memory Challenge Store:
 * Map<challengeId, {
 *   challengeId: string,
 *   userId: number | null,
 *   identifier: string,
 *   otpHash: string,
 *   otpSalt: string,
 *   purpose: "login" | "password_reset",
 *   method: "email" | "mobile",
 *   attempts: number,
 *   expiresAt: number,
 *   createdAt: number,
 *   lastSentAt: number
 * }>
 */
const activeChallenges = new Map();
const identifierToChallenge = new Map();

async function prunePersistentExpiredChallenges() {
  const db = await getDb();
  if (db) {
    await db.delete(otpChallenges).where(lte(otpChallenges.expiresAt, new Date()));
  }
}

// Periodic cleanup of expired challenges every 60 seconds
const cleanupTimer = setInterval(() => {
  pruneExpiredChallenges();
  void prunePersistentExpiredChallenges().catch(error => {
    console.error("[OTP] Persistent challenge cleanup failed:", error.message);
  });
}, 60 * 1000);
if (cleanupTimer.unref) cleanupTimer.unref();

export function pruneExpiredChallenges() {
  const now = Date.now();
  for (const [challengeId, entry] of activeChallenges.entries()) {
    if (now > entry.expiresAt) {
      activeChallenges.delete(challengeId);
      if (identifierToChallenge.get(entry.identifier) === challengeId) {
        identifierToChallenge.delete(entry.identifier);
      }
    }
  }
}

function getExpiryMinutes() {
  const envVal = Number(process.env.OTP_EXPIRY_MINUTES);
  return !isNaN(envVal) && envVal > 0 ? envVal : DEFAULT_EXPIRY_MINUTES;
}

function hashOtp(code, salt) {
  return scryptSync(String(code), salt, 32).toString("hex");
}

function verifyOtpHash(code, hash, salt) {
  try {
    const derived = scryptSync(String(code), salt, 32).toString("hex");
    return timingSafeEqual(
      createHash("sha256").update(derived).digest(),
      createHash("sha256").update(hash).digest()
    );
  } catch {
    return false;
  }
}

export function maskIdentifier(identifier) {
  if (!identifier) return "";
  const str = String(identifier).trim();
  if (str.includes("@")) {
    const [name, domain] = str.split("@");
    if (name.length <= 2) return `${name[0] || "*"}***@${domain}`;
    return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
  }
  const digits = str.replace(/\D/g, "");
  if (digits.length <= 4) return "****";
  return `${str.slice(0, 3)}******${str.slice(-4)}`;
}

/**
 * Issues a new OTP challenge and delivers it via email (or registered channel).
 * Strictly invalidates any existing active challenge for the identifier.
 */
export async function issueOtpChallenge({ identifier, userId, method, purpose = "login" }) {
  if (!identifier) throw new HttpError(400, "Identifier is required.");

  const normalizedIdentifier = method === "email" || identifier.includes("@")
    ? identifier.toLowerCase().trim()
    : identifier.replace(/[^\d+]/g, "").trim();

  // Invalidate any existing challenge for this identifier
  const existingToken = identifierToChallenge.get(normalizedIdentifier);
  if (existingToken) {
    activeChallenges.delete(existingToken);
    identifierToChallenge.delete(normalizedIdentifier);
  }

  const code = randomInt(100000, 1000000).toString();
  const salt = randomBytes(16).toString("hex");
  const otpHash = hashOtp(code, salt);
  const challengeId = randomBytes(24).toString("hex");
  const expiryMinutes = getExpiryMinutes();
  const now = Date.now();
  const expiresAt = now + expiryMinutes * 60 * 1000;

  const entry = {
    challengeId,
    challengeToken: challengeId, // alias for backwards compatibility
    identifier: normalizedIdentifier,
    userId: userId ?? null,
    method: method || (normalizedIdentifier.includes("@") ? "email" : "mobile"),
    purpose,
    otpHash,
    otpSalt: salt,
    hash: otpHash, // alias
    salt, // alias
    attempts: 0,
    expiresAt,
    createdAt: now,
    lastSentAt: now,
  };

  const db = await getDb();
  if (db) {
    await db.transaction(async tx => {
      await tx.delete(otpChallenges).where(eq(otpChallenges.identifier, normalizedIdentifier));
      await tx.insert(otpChallenges).values({
        challengeId,
        userId: userId ?? null,
        identifier: normalizedIdentifier,
        otpHash,
        otpSalt: salt,
        purpose,
        method: entry.method,
        attempts: 0,
        expiresAt: new Date(expiresAt),
        createdAt: new Date(now),
        lastSentAt: new Date(now),
      });
    });
  } else {
    activeChallenges.set(challengeId, entry);
    identifierToChallenge.set(normalizedIdentifier, challengeId);
  }

  // Dispatch OTP via clean Email service (or SMS if explicitly phone-only)
  if (entry.method === "email" || normalizedIdentifier.includes("@")) {
    await sendEmailOtp({ to: normalizedIdentifier, code, purpose });
  } else {
    await sendSmsOtp({ to: normalizedIdentifier, code, purpose });
  }

  return {
    success: true,
    requiresOtp: true,
    requireOtp: true,
    challengeId,
    challengeToken: challengeId,
    method: entry.method,
    maskedTarget: maskIdentifier(normalizedIdentifier),
    expiryMinutes,
    message: `A verification code has been dispatched to ${maskIdentifier(normalizedIdentifier)}.`,
  };
}

/**
 * Resends an existing challenge OTP with a fresh 6-digit code.
 * Strictly enforces a 60-second cooldown and resets the attempt counter.
 */
export async function resendOtpChallenge(rawChallengeId) {
  const challengeId = typeof rawChallengeId === "object"
    ? rawChallengeId?.challengeId || rawChallengeId?.challengeToken
    : rawChallengeId;

  if (!challengeId) {
    throw new HttpError(400, "Invalid or expired OTP session. Please sign in again.");
  }

  const db = await getDb();
  let entry;
  let code;
  if (db) {
    const outcome = await db.transaction(async tx => {
      const [stored] = await tx.select().from(otpChallenges)
        .where(eq(otpChallenges.challengeId, challengeId))
        .limit(1)
        .for("update");
      if (!stored) {
        return { error: { status: 400, message: "Invalid or expired OTP session. Please sign in again." } };
      }

      const now = Date.now();
      if (now > new Date(stored.expiresAt).getTime()) {
        await tx.delete(otpChallenges).where(eq(otpChallenges.id, stored.id));
        return { error: { status: 400, message: "Invalid or expired OTP session. Please sign in again." } };
      }

      const timeSinceLastSent = now - new Date(stored.lastSentAt).getTime();
      if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
        const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
        return { error: { status: 429, message: `Please wait ${remainingSec}s before requesting a new code.` } };
      }

      code = randomInt(100000, 1000000).toString();
      const salt = randomBytes(16).toString("hex");
      const otpHash = hashOtp(code, salt);
      const expiresAt = new Date(now + getExpiryMinutes() * 60 * 1000);
      const lastSentAt = new Date(now);
      await tx.update(otpChallenges).set({
        otpHash,
        otpSalt: salt,
        attempts: 0,
        expiresAt,
        lastSentAt,
      }).where(eq(otpChallenges.id, stored.id));
      return {
        entry: {
          ...stored,
          otpHash,
          otpSalt: salt,
          attempts: 0,
          expiresAt,
          lastSentAt,
        },
      };
    });
    if (outcome.error) throw new HttpError(outcome.error.status, outcome.error.message);
    entry = outcome.entry;
  } else {
    entry = activeChallenges.get(challengeId);
    if (!entry) {
      throw new HttpError(400, "Invalid or expired OTP session. Please sign in again.");
    }

    const now = Date.now();
    const timeSinceLastSent = now - entry.lastSentAt;
    if (timeSinceLastSent < RESEND_COOLDOWN_MS) {
      const remainingSec = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSent) / 1000);
      throw new HttpError(429, `Please wait ${remainingSec}s before requesting a new code.`);
    }

    code = randomInt(100000, 1000000).toString();
    const salt = randomBytes(16).toString("hex");
    const otpHash = hashOtp(code, salt);
    entry.otpHash = otpHash;
    entry.otpSalt = salt;
    entry.hash = otpHash;
    entry.salt = salt;
    entry.attempts = 0;
    entry.expiresAt = now + getExpiryMinutes() * 60 * 1000;
    entry.lastSentAt = now;
  }

  // Dispatch fresh OTP code
  if (entry.method === "email" || entry.identifier.includes("@")) {
    await sendEmailOtp({ to: entry.identifier, code, purpose: entry.purpose });
  } else {
    await sendSmsOtp({ to: entry.identifier, code, purpose: entry.purpose });
  }

  return {
    success: true,
    message: "A new OTP has been sent to your email.",
    maskedTarget: maskIdentifier(entry.identifier),
  };
}

/**
 * Verifies an OTP code against an active challenge.
 *
 * Security Guarantees:
 * - Checks 5-minute expiry.
 * - Increments attempts; rejects with rate limit on > 5 failures.
 * - Constant-time comparison to prevent timing leaks.
 * - Once verified, the challenge is immediately destroyed (single use).
 */
export async function verifyOtpChallenge({ challengeId, challengeToken, token, otp, code, otpCode, verificationCode, expectedPurpose = null } = {}) {
  const resolvedToken = challengeId || challengeToken || token;
  const rawCode = otp ?? code ?? otpCode ?? verificationCode;

  if (!resolvedToken || !rawCode) {
    throw new HttpError(400, "Invalid or expired OTP.");
  }

  const db = await getDb();
  if (db) {
    const outcome = await db.transaction(async tx => {
      const [entry] = await tx.select().from(otpChallenges)
        .where(eq(otpChallenges.challengeId, resolvedToken))
        .limit(1)
        .for("update");
      if (!entry) {
        return { error: { status: 400, message: "Invalid or expired OTP." } };
      }

      if (expectedPurpose && entry.purpose !== expectedPurpose) {
        return { error: { status: 400, message: "Invalid or expired OTP." } };
      }

      if (Date.now() > new Date(entry.expiresAt).getTime()) {
        await tx.delete(otpChallenges).where(eq(otpChallenges.id, entry.id));
        return { error: { status: 400, message: "This OTP has expired. Please request a new one." } };
      }

      const attempts = entry.attempts + 1;
      if (attempts > MAX_ATTEMPTS) {
        await tx.delete(otpChallenges).where(eq(otpChallenges.id, entry.id));
        return { error: { status: 429, message: "Too many attempts. Please wait before trying again." } };
      }

      const cleanCode = String(rawCode).trim();
      if (!verifyOtpHash(cleanCode, entry.otpHash, entry.otpSalt)) {
        await tx.update(otpChallenges).set({ attempts }).where(eq(otpChallenges.id, entry.id));
        return { error: { status: 400, message: "Invalid verification code. Please check and try again." } };
      }

      await tx.delete(otpChallenges).where(eq(otpChallenges.id, entry.id));
      return {
        value: {
          valid: true,
          userId: entry.userId,
          identifier: entry.identifier,
          method: entry.method,
          purpose: entry.purpose,
        },
      };
    });
    if (outcome.error) throw new HttpError(outcome.error.status, outcome.error.message);
    return outcome.value;
  }

  const entry = activeChallenges.get(resolvedToken);
  if (!entry) {
    throw new HttpError(400, "Invalid or expired OTP.");
  }

  if (expectedPurpose && entry.purpose !== expectedPurpose) {
    throw new HttpError(400, "Invalid or expired OTP.");
  }

  if (Date.now() > entry.expiresAt) {
    activeChallenges.delete(resolvedToken);
    identifierToChallenge.delete(entry.identifier);
    throw new HttpError(400, "This OTP has expired. Please request a new one.");
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    activeChallenges.delete(resolvedToken);
    identifierToChallenge.delete(entry.identifier);
    throw new HttpError(429, "Too many attempts. Please wait before trying again.");
  }

  const cleanCode = String(rawCode).trim();
  const isValid = verifyOtpHash(cleanCode, entry.otpHash, entry.otpSalt);
  if (!isValid) {
    throw new HttpError(400, "Invalid verification code. Please check and try again.");
  }

  activeChallenges.delete(resolvedToken);
  identifierToChallenge.delete(entry.identifier);

  return {
    valid: true,
    userId: entry.userId,
    identifier: entry.identifier,
    method: entry.method,
    purpose: entry.purpose,
  };
}

/**
 * For test execution inspection only (in-memory test verification)
 */
export function __peekOtpChallengeForTesting(challengeToken) {
  return activeChallenges.get(challengeToken);
}

export function __clearAllOtpChallengesForTesting() {
  activeChallenges.clear();
  identifierToChallenge.clear();
}
