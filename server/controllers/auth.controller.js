import { z } from "zod";
import { HttpError } from "../../shared/_core/errors.js";
import {
  getUserByEmail,
  getUserByIdentifier,
  getUserByOpenId,
  registerUser,
  verifyPassword,
  hashPassword,
  getBusinessesForUser,
  saveDbStateToDisk,
} from "../db.js";
import { verifyAdministratorPassword } from "../adminSecurity.js";
import { issueOtpChallenge, resendOtpChallenge, verifyOtpChallenge } from "../services/otp.service.js";
import { createAuthenticatedSession, destroyAuthenticatedSession, revokeAllUserSessions } from "../services/session.service.js";
import { SignJWT, jwtVerify } from "jose";

const LOCAL_ADMIN_EMAIL = "omambole2007@gmail.com";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function clientKey(req) {
  return req?.ip ?? req?.socket?.remoteAddress ?? "unknown";
}

function canAttempt(key) {
  const state = attempts.get(key);
  if (!state) return true;
  if (Date.now() - state.startedAt >= WINDOW_MS) {
    attempts.delete(key);
    return true;
  }
  return state.count < MAX_ATTEMPTS;
}

function recordFailure(key) {
  const current = attempts.get(key);
  if (!current || Date.now() - current.startedAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

// Validation Schemas
export const loginCredentialsSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address.").optional(),
  identifier: z.string().trim().min(1, "Email is required.").max(256).optional(),
  password: z.string().min(1, "Password is required.").max(256),
}).refine(data => Boolean(data.email || data.identifier), {
  message: "Email is required.",
});

export const loginOtpSchema = z.object({
  challengeId: z.string().trim().min(1).optional(),
  challengeToken: z.string().trim().min(1).optional(),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits.").optional(),
  code: z.string().trim().length(6, "Verification code must be exactly 6 digits.").optional(),
}).refine(data => Boolean((data.challengeId || data.challengeToken) && (data.otp || data.code)), {
  message: "Challenge ID and 6-digit OTP code are required.",
});

export const resendOtpSchema = z.object({
  challengeId: z.string().trim().min(1).optional(),
  challengeToken: z.string().trim().min(1).optional(),
}).refine(data => Boolean(data.challengeId || data.challengeToken), {
  message: "Challenge ID is required.",
});

export const registrationSchema = z.object({
  companyName: z.string().trim().min(1, "Company / Business Name is required.").max(160),
  name: z.string().trim().max(160).optional(),
  email: z.string().trim().email("Please provide a valid email address.").optional().or(z.literal("")),
  phone: z.string().trim().min(10, "Please provide a valid 10-digit mobile number.").optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters long.").max(256),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address.").optional(),
  identifier: z.string().trim().min(1, "Email is required.").max(256).optional(),
}).refine(data => Boolean(data.email || data.identifier), {
  message: "Email is required.",
});

export const forgotPasswordVerifySchema = z.object({
  challengeId: z.string().trim().min(1).optional(),
  challengeToken: z.string().trim().min(1).optional(),
  otp: z.string().trim().length(6, "Verification code must be exactly 6 digits.").optional(),
  code: z.string().trim().length(6, "Verification code must be exactly 6 digits.").optional(),
}).refine(data => Boolean((data.challengeId || data.challengeToken) && (data.otp || data.code)), {
  message: "Challenge ID and 6-digit OTP code are required.",
});

export const forgotPasswordResetSchema = z.object({
  resetToken: z.string().trim().min(1, "Reset token is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters long.").max(256),
  confirmPassword: z.string().min(8, "Confirm password is required.").max(256).optional(),
});

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "prava-local-dev-session-signing-secret-key-32chars";
  return new TextEncoder().encode(secret.padEnd(32, "0"));
}

/**
 * Step 1: Validates email and password, then generates & dispatches a secure 6-digit OTP.
 * User is NOT authenticated yet.
 */
export async function loginStep1(ctx, rawInput) {
  const key = clientKey(ctx.req);
  if (!canAttempt(key)) {
    throw new HttpError(429, "Too many failed attempts. Please wait before trying again.");
  }

  const input = loginCredentialsSchema.parse(rawInput);
  const rawEmail = (input.email || input.identifier || "").trim();
  const normalizedEmail = rawEmail.toLowerCase();

  // 1. Super Administrator Check
  if (normalizedEmail === LOCAL_ADMIN_EMAIL) {
    const user = await getUserByEmail(normalizedEmail);
    const isValid = await verifyAdministratorPassword(user?.id || 1, normalizedEmail, input.password);
    if (!isValid) {
      recordFailure(key);
      throw new HttpError(401, "Invalid email or password.");
    }

    attempts.delete(key);
    // Issue OTP Challenge for Admin
    const challenge = await issueOtpChallenge({
      identifier: normalizedEmail,
      userId: user?.id || 1,
      method: "email",
      purpose: "login",
    });

    return {
      success: true,
      requiresOtp: true,
      requireOtp: true,
      challengeId: challenge.challengeId,
      challengeToken: challenge.challengeId,
      method: "email",
      maskedTarget: challenge.maskedTarget,
      expiryMinutes: challenge.expiryMinutes,
      devOtpCode: challenge.devOtpCode,
      message: challenge.message,
    };
  }

  // 2. Business User / Client Check
  const user = await getUserByIdentifier(rawEmail);
  if (!user) {
    recordFailure(key);
    throw new HttpError(401, "Invalid email, mobile number, or password. Please verify your credentials and try again.");
  }

  // Validate Password
  if (!user.passwordHash || !user.passwordSalt) {
    recordFailure(key);
    throw new HttpError(401, "No password has been configured for this account. Please use 'Forgot password?' or register a new workspace.");
  }

  const isValid = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
  if (!isValid) {
    recordFailure(key);
    throw new HttpError(401, "Invalid email, mobile number, or password. Please verify your credentials and try again.");
  }

  attempts.delete(key);

  const targetEmail = user.email || user.phone;
  const challenge = await issueOtpChallenge({
    identifier: targetEmail,
    userId: user.id,
    method: "email",
    purpose: "login",
  });

  return {
    success: true,
    requiresOtp: true,
    requireOtp: true,
    challengeId: challenge.challengeId,
    challengeToken: challenge.challengeId,
    method: "email",
    maskedTarget: challenge.maskedTarget,
    expiryMinutes: challenge.expiryMinutes,
    devOtpCode: challenge.devOtpCode,
    message: challenge.message,
  };
}

/**
 * Step 2: Validates the 6-digit OTP code against the challenge session.
 * Only upon successful verification, creates the authenticated session and cookie.
 */
export async function loginStep2(ctx, rawInput) {
  const input = loginOtpSchema.parse(rawInput);
  const challengeId = input.challengeId || input.challengeToken;
  const otpCode = input.otp || input.code;

  const verified = await verifyOtpChallenge({
    challengeId,
    challengeToken: challengeId,
    otp: otpCode,
    code: otpCode,
    expectedPurpose: "login",
  });

  // Lookup user in DB
  let user = null;
  if (verified.userId) {
    const dbUsers = Array.from((await import("../db.js")).inMemoryUsers.values());
    user = dbUsers.find(u => u.id === verified.userId) || await getUserByIdentifier(verified.identifier);
  } else {
    user = await getUserByIdentifier(verified.identifier);
  }

  if (!user) {
    throw new HttpError(404, "User account not found.");
  }

  user.lastSignedIn = new Date();
  saveDbStateToDisk();

  // Create real JWT session token and attach HTTP-only cookie
  const token = await createAuthenticatedSession(ctx, user);

  const userBusinesses = user.id ? await getBusinessesForUser(user.id) : [];
  const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);
  const normalizedRole = user.role === "admin" ? "admin" : user.role === "ca" ? "ca" : "user";

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: normalizedRole,
    },
    role: normalizedRole,
    redirectTo: normalizedRole === "admin" ? "/admin/billing" : hasWorkspace ? "/dashboard" : "/onboarding",
    hasWorkspace,
    token,
  };
}

/**
 * Resends OTP for an active challenge session.
 * Enforces a 60-second cooldown, invalidates the previous code, and sends a fresh OTP.
 */
export async function resendLoginOtp(rawInput) {
  const input = resendOtpSchema.parse(rawInput);
  const challengeId = input.challengeId || input.challengeToken;
  return await resendOtpChallenge(challengeId);
}

/**
 * User Registration with Password & Email OTP verification.
 */
export async function registerAccount(ctx, rawInput) {
  const input = registrationSchema.parse(rawInput);
  if (!input.email && !input.phone) {
    throw new HttpError(400, "Please provide at least a work email or mobile number.");
  }

  let newUser;
  try {
    newUser = await registerUser({
      name: input.name || input.companyName,
      companyName: input.companyName,
      email: input.email || null,
      phone: input.phone || null,
      password: input.password,
      role: "owner",
    });

    if (input.companyName) {
      try {
        const { createBusinessWithOwner } = await import("../db.js");
        await createBusinessWithOwner(newUser.id, {
          name: input.companyName,
          country: "IN",
          currency: "INR",
          locale: "en-IN",
        });
      } catch (bizErr) {
        console.warn("[Auth] Workspace auto-creation notice:", bizErr.message);
      }
    }
  } catch (err) {
    throw new HttpError(409, err.message || "An account with this email address already exists.");
  }

  // Issue OTP challenge to verify newly registered account
  const target = newUser.email || newUser.phone;
  const challenge = await issueOtpChallenge({
    identifier: target,
    userId: newUser.id,
    method: "email",
    purpose: "login",
  });

  return {
    success: true,
    requiresOtp: true,
    requireOtp: true,
    challengeId: challenge.challengeId,
    challengeToken: challenge.challengeId,
    method: "email",
    maskedTarget: challenge.maskedTarget,
    expiryMinutes: challenge.expiryMinutes,
    devOtpCode: challenge.devOtpCode,
    message: challenge.message,
  };
}

/**
 * Forgot Password: Request a 6-digit OTP code sent to user's registered email.
 */
export async function forgotPasswordRequest(rawInput) {
  const input = forgotPasswordRequestSchema.parse(rawInput);
  const targetIdentifier = (input.email || input.identifier || "").trim();
  const user = await getUserByIdentifier(targetIdentifier);

  if (!user) {
    throw new HttpError(404, "No registered account found with that email address.");
  }

  const targetEmail = user.email || user.phone;
  const challenge = await issueOtpChallenge({
    identifier: targetEmail,
    userId: user.id,
    method: "email",
    purpose: "password_reset",
  });

  return {
    success: true,
    requiresOtp: true,
    requireOtp: true,
    challengeId: challenge.challengeId,
    challengeToken: challenge.challengeId,
    method: "email",
    maskedTarget: challenge.maskedTarget,
    expiryMinutes: challenge.expiryMinutes,
    devOtpCode: challenge.devOtpCode,
    message: challenge.message,
  };
}

/**
 * Forgot Password: Verify OTP and return a 15-minute temporary reset authorization token.
 */
export async function forgotPasswordVerify(rawInput) {
  const input = forgotPasswordVerifySchema.parse(rawInput);
  const challengeId = input.challengeId || input.challengeToken;
  const otpCode = input.otp || input.code;

  const verified = await verifyOtpChallenge({
    challengeId,
    challengeToken: challengeId,
    otp: otpCode,
    code: otpCode,
    expectedPurpose: "password_reset",
  });

  // Issue 15-minute signed reset token
  const secretKey = getJwtSecret();
  const resetToken = await new SignJWT({
    userId: verified.userId,
    identifier: verified.identifier,
    purpose: "password_reset_authorized",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(Math.floor(Date.now() / 1000) + 15 * 60)
    .sign(secretKey);

  return {
    success: true,
    resetToken,
    message: "Verification confirmed. Please enter your new password.",
  };
}

/**
 * Forgot Password: Set new password using the authorized reset token.
 */
export async function forgotPasswordReset(rawInput) {
  const input = forgotPasswordResetSchema.parse(rawInput);
  if (input.confirmPassword && input.newPassword !== input.confirmPassword) {
    throw new HttpError(400, "New password and confirm password do not match.");
  }

  let payload;
  try {
    const secretKey = getJwtSecret();
    const verified = await jwtVerify(input.resetToken, secretKey, { algorithms: ["HS256"] });
    payload = verified.payload;
  } catch (err) {
    throw new HttpError(400, "Password reset session has expired or is invalid. Please request a new code.");
  }

  if (payload.purpose !== "password_reset_authorized" || !payload.userId) {
    throw new HttpError(400, "Invalid reset token authorization.");
  }

  const { updateUserPassword, inMemoryUsers } = await import("../db.js");
  const updated = await updateUserPassword(payload.userId, input.newPassword);
  if (!updated) {
    const user = await getUserByIdentifier(payload.identifier);
    if (!user) throw new HttpError(404, "User account not found.");
    await updateUserPassword(user.id, input.newPassword);
  }

  // Invalidate any other active sessions for this user
  const dbUsers = Array.from(inMemoryUsers.values());
  const targetUser = dbUsers.find(u => u.id === payload.userId);
  if (targetUser?.openId) {
    revokeAllUserSessions(targetUser.openId);
  }

  return {
    success: true,
    message: "Password has been successfully reset. You can now sign in with your new password.",
  };
}

/**
 * Logout: Revokes active session token and clears cookie.
 */
export function logout(ctx) {
  destroyAuthenticatedSession(ctx);
  return { success: true, message: "Logged out successfully." };
}
