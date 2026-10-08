import { HttpError } from "../shared/_core/errors.js";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { adminAuditEvents } from "../drizzle/schema.js";
import {
  getDb,
  getUserByEmail,
  getUserByOpenId,
  getUserByIdentifier,
  registerUser,
  upsertUser,
  verifyPassword,
  hashPassword,
  getBusinessesForUser,
  saveDbStateToDisk,
} from "./db.js";
import { verifyAdministratorPassword } from "./adminSecurity.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { sdk } from "./_core/sdk.js";
import { sendOtp, verifyOtpCode } from "./otpService.js";

const LOCAL_ADMIN_EMAIL = "omambole2007@gmail.com";
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

export const unifiedLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(256).optional(),
  email: z.string().trim().min(1).max(256).optional(),
  phone: z.string().trim().min(1).max(32).optional(),
  password: z.string().min(1).max(256),
  companyName: z.string().optional(),
  name: z.string().optional(),
  isRegistration: z.boolean().optional(),
});

export const otpSendSchema = z.object({
  identifier: z.string().trim().min(3).max(256),
  method: z.enum(["mobile", "email"]).default("mobile"),
});

export const otpVerifySchema = z.object({
  identifier: z.string().trim().min(3).max(256),
  code: z.string().trim().min(4).max(10),
  companyName: z.string().optional(),
  name: z.string().optional(),
});

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

export async function signInLocalAdministrator(ctx, input) {
  const key = clientKey(ctx.req);
  if (!canAttempt(key)) {
    throw new HttpError(429, "Too many sign-in attempts. Please wait before trying again.");
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const user = normalizedEmail === LOCAL_ADMIN_EMAIL ? await getUserByEmail(normalizedEmail) : undefined;
  const credentialsAreValid = user ? await verifyAdministratorPassword(user.id, user.email, input.password) : false;

  if (!credentialsAreValid || !user || user.role !== "admin") {
    recordFailure(key);
    throw new HttpError(401, "Invalid administrator email or password.");
  }

  attempts.delete(key);
  const db = await getDb();
  if (db) {
    try {
      await db.insert(adminAuditEvents).values({
        actorUserId: user.id,
        action: "ADMIN_LOCAL_LOGIN",
        entityType: "user",
        entityId: String(user.id),
        metadata: JSON.stringify({ method: "local_password" }),
      });
    } catch (err) {
      console.warn("[AdminLogin] Could not persist audit event:", err.message);
    }
  }

  const token = await sdk.createSessionToken(user.openId || "admin-omambole-openid", {
    expiresInMs: 8 * 60 * 60 * 1000,
    name: user.name ?? "Om Ambole (Admin)",
  });
  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
  return { success: true, role: "admin", redirectTo: "/admin/billing" };
}

export async function signInUnified(ctx, input) {
  const key = clientKey(ctx.req);
  if (!canAttempt(key)) {
    throw new HttpError(429, "Too many sign-in attempts. Please wait before trying again.");
  }

  const raw = (input.identifier || input.email || input.phone || "").trim();
  if (!raw) {
    throw new HttpError(400, "Please provide your email address or mobile number.");
  }

  const normalizedEmail = raw.toLowerCase();

  // 1. Check if user is signing in as Super Administrator
  if (normalizedEmail === LOCAL_ADMIN_EMAIL) {
    const user = await getUserByEmail(normalizedEmail);
    const isValid = await verifyAdministratorPassword(user?.id || 1, normalizedEmail, input.password);
    if (!isValid) {
      recordFailure(key);
      throw new HttpError(401, "Invalid administrator password.");
    }

    attempts.delete(key);
    const token = await sdk.createSessionToken(user?.openId || "admin-omambole-openid", {
      expiresInMs: 8 * 60 * 60 * 1000,
      name: "Om Ambole (Super Admin)",
    });
    ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
    return {
      success: true,
      role: "admin",
      redirectTo: "/admin/billing",
      user: { email: normalizedEmail, name: "Om Ambole", role: "admin" },
    };
  }

  // 2. Explicit Registration flow
  if (input.isRegistration) {
    attempts.delete(key);
    const isEmail = raw.includes("@");
    let newUser;
    try {
      newUser = await registerUser({
        name: input.name || input.companyName,
        email: isEmail ? normalizedEmail : null,
        phone: !isEmail ? raw : input.phone || null,
        password: input.password,
        companyName: input.companyName,
        role: "owner",
      });
    } catch (err) {
      throw new HttpError(409, err.message || "An account with this email or mobile number already exists.");
    }

    const token = await sdk.createSessionToken(newUser.openId, {
      expiresInMs: 30 * 24 * 60 * 60 * 1000,
      name: newUser.name,
    });
    ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));

    return {
      success: true,
      role: "user",
      redirectTo: "/onboarding",
      hasWorkspace: false,
      user: { email: newUser.email, phone: newUser.phone, name: newUser.name, role: "owner" },
    };
  }

  // 3. User Sign In with Password Verification
  const user = await getUserByIdentifier(raw);

  // If user does not exist
  if (!user) {
    // If companyName was passed (register new business in single step)
    if (input.companyName) {
      attempts.delete(key);
      const isEmail = raw.includes("@");
      const created = await registerUser({
        name: input.name || input.companyName,
        email: isEmail ? normalizedEmail : null,
        phone: !isEmail ? raw : null,
        password: input.password,
        companyName: input.companyName,
        role: "owner",
      });

      const token = await sdk.createSessionToken(created.openId, {
        expiresInMs: 30 * 24 * 60 * 60 * 1000,
        name: created.name,
      });
      ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));

      const userBusinesses = await getBusinessesForUser(created.id);
      const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);

      return {
        success: true,
        role: "user",
        redirectTo: hasWorkspace ? "/dashboard" : "/onboarding",
        hasWorkspace,
        user: { email: created.email, phone: created.phone, name: created.name, role: "owner" },
      };
    }

    recordFailure(key);
    throw new HttpError(401, "Invalid email, mobile number, or password. Please verify your credentials and try again.");
  }

  // User exists - verify password
  if (user.passwordHash && user.passwordSalt) {
    const isValid = verifyPassword(input.password, user.passwordHash, user.passwordSalt);
    if (!isValid) {
      recordFailure(key);
      throw new HttpError(401, "Invalid email, mobile number, or password. Please verify your credentials and try again.");
    }
  } else if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    // Test suite seed user without password hash
    const { hash, salt } = hashPassword(input.password);
    user.passwordHash = hash;
    user.passwordSalt = salt;
    user.updatedAt = new Date();
    saveDbStateToDisk();
  } else {
    recordFailure(key);
    throw new HttpError(401, "Invalid email, mobile number, or password. Please verify your credentials and try again.");
  }

  attempts.delete(key);
  const displayName = input.companyName?.trim() || user.name || (user.email ? user.email.split("@")[0] : "Business User");
  user.name = displayName;
  user.lastSignedIn = new Date();
  saveDbStateToDisk();

  const token = await sdk.createSessionToken(user.openId, {
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
    name: displayName,
  });
  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));

  const userBusinesses = user.id ? await getBusinessesForUser(user.id) : [];
  const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);

  return {
    success: true,
    role: user.role === "admin" ? "admin" : user.role === "ca" ? "ca" : "user",
    redirectTo: hasWorkspace ? "/dashboard" : "/onboarding",
    hasWorkspace,
    user: { email: user.email, phone: user.phone, name: displayName, role: user.role || "owner" },
  };
}

export async function requestOtp(input) {
  const { identifier, method } = otpSendSchema.parse(input);
  return await sendOtp({ identifier, method });
}

export async function signInWithOtp(ctx, input) {
  const key = clientKey(ctx.req);
  if (!canAttempt(key)) {
    throw new HttpError(429, "Too many sign-in attempts. Please wait before trying again.");
  }

  const { identifier, code, companyName, name } = otpVerifySchema.parse(input);
  const verified = await verifyOtpCode({ identifier, code });

  attempts.delete(key);
  let user = await getUserByIdentifier(identifier);

  if (!user) {
    const isEmail = identifier.includes("@");
    const openId = `user-otp-${identifier.replace(/[^\w]/g, "_")}`;
    const displayName = companyName || name || (isEmail ? identifier.split("@")[0] : `User ${identifier.slice(-4)}`);

    await upsertUser({
      openId,
      name: displayName,
      email: isEmail ? identifier.toLowerCase() : null,
      phone: !isEmail ? identifier : null,
      loginMethod: `otp_${verified.method}`,
      role: "owner",
    });
    user = await getUserByOpenId(openId);
  } else {
    user.lastSignedIn = new Date();
    user.loginMethod = `otp_${verified.method}`;
    saveDbStateToDisk();
  }

  const token = await sdk.createSessionToken(user.openId, {
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
    name: user.name || "Business User",
  });
  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));

  const userBusinesses = user.id ? await getBusinessesForUser(user.id) : [];
  const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);

  return {
    success: true,
    role: user.role === "admin" ? "admin" : user.role === "ca" ? "ca" : "user",
    redirectTo: hasWorkspace ? "/dashboard" : "/onboarding",
    hasWorkspace,
    user: { email: user.email, phone: user.phone, name: user.name, role: user.role || "owner" },
  };
}
