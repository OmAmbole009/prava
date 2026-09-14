import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { adminAuditEvents } from "../drizzle/schema.js";
import { getDb, getUserByEmail } from "./db.js";
import { verifyAdministratorPassword } from "./adminSecurity.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { sdk } from "./_core/sdk.js";

const LOCAL_ADMIN_EMAIL = "omambole2007@gmail.com";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
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
  if (!canAttempt(key)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many sign-in attempts. Please wait before trying again." });

  const user = input.email === LOCAL_ADMIN_EMAIL ? await getUserByEmail(input.email) : undefined;
  const credentialsAreValid = user ? await verifyAdministratorPassword(user.id, user.email, input.password) : false;

  if (!credentialsAreValid || !user || user.role !== "admin") {
    recordFailure(key);
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid administrator email or password." });
  }

  attempts.delete(key);
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Administrator sign-in is temporarily unavailable." });
  await db.insert(adminAuditEvents).values({
    actorUserId: user.id,
    action: "ADMIN_LOCAL_LOGIN",
    entityType: "user",
    entityId: String(user.id),
    metadata: JSON.stringify({ method: "local_password" }),
  });
  const token = await sdk.createSessionToken(user.openId, { expiresInMs: 8 * 60 * 60 * 1000, name: user.name ?? "Prava administrator" });
  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req));
  return { success: true, redirectTo: "/admin/billing" };
}
