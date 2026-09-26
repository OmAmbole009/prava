import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { adminAuditEvents } from "../drizzle/schema.js";
import { getDb, getUserByEmail, getBusinessesForUser } from "./db.js";
import { verifyAdministratorPassword } from "./adminSecurity.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { sdk } from "./_core/sdk.js";

const LOCAL_ADMIN_EMAIL = "omambole2007@gmail.com";
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

export const unifiedLoginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(256),
  password: z.string().min(1).max(256),
  companyName: z.string().optional(),
});

function clientKey(req) {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
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
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait before trying again." });
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const user = normalizedEmail === LOCAL_ADMIN_EMAIL ? await getUserByEmail(normalizedEmail) : undefined;
  const credentialsAreValid = user ? await verifyAdministratorPassword(user.id, user.email, input.password) : false;

  if (!credentialsAreValid || !user || user.role !== "admin") {
    recordFailure(key);
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid administrator email or password." });
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
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait before trying again." });
  }

  let normalizedEmail = input.email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    normalizedEmail = `${normalizedEmail}@prava.internal`;
  }

  // 1. Check if user is signing in as Super Administrator
  if (normalizedEmail === LOCAL_ADMIN_EMAIL) {
    const user = await getUserByEmail(normalizedEmail);
    const isValid = await verifyAdministratorPassword(user?.id || 1, normalizedEmail, input.password);
    if (!isValid) {
      recordFailure(key);
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid administrator password." });
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

  // 2. Business User / Client sign in or registration
  attempts.delete(key);
  const user = await getUserByEmail(normalizedEmail);
  const displayName = input.companyName?.trim() || user?.name || normalizedEmail.split("@")[0];

  if (user) {
    user.name = displayName;
  }

  const token = await sdk.createSessionToken(user?.openId || `user-${normalizedEmail}`, {
    expiresInMs: 30 * 24 * 60 * 60 * 1000,
    name: displayName,
  });
  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));

  // Determine if this business user has already set up their workspace
  const userBusinesses = user?.id ? await getBusinessesForUser(user.id) : [];
  const hasWorkspace = Boolean(userBusinesses && userBusinesses.length > 0);

  return {
    success: true,
    role: "user",
    redirectTo: hasWorkspace ? "/dashboard" : "/onboarding",
    hasWorkspace,
    user: { email: normalizedEmail, name: displayName, role: "owner" },
  };
}
