import { TRPCError } from "@trpc/server";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { COOKIE_NAME, SEED_CA_DEFAULT_PASSWORD, SEED_CA_EMAIL } from "@shared/const";
import { adminAuditEvents, caCredentials, caProfiles, users } from "../drizzle/schema";
import { getDb, getUserByEmail } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";

const scryptAsync = promisify(scrypt);

export { SEED_CA_DEFAULT_PASSWORD, SEED_CA_EMAIL };

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; startedAt: number }>();

export const caLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
});

type LoginContext = {
  req: { ip?: string; socket?: { remoteAddress?: string }; protocol?: string; headers: Record<string, unknown> };
  res: { cookie: (name: string, value: string, options: Record<string, unknown>) => void };
};

function clientKey(req: LoginContext["req"]) {
  return req.ip ?? req.socket?.remoteAddress ?? "unknown";
}

function canAttempt(key: string) {
  const state = attempts.get(key);
  if (!state) return true;
  if (Date.now() - state.startedAt >= WINDOW_MS) {
    attempts.delete(key);
    return true;
  }
  return state.count < MAX_ATTEMPTS;
}

function recordFailure(key: string) {
  const current = attempts.get(key);
  if (!current || Date.now() - current.startedAt >= WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

export async function hashCaPassword(password: string, salt: string) {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

export type InMemoryCaProfile = {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  membershipNumber: string;
  firmName: string | null;
  specialization: string;
  status: "active" | "suspended" | "revoked";
  bio: string | null;
  createdByAdminId: number;
  createdAt: Date;
  updatedAt: Date;
};

// In-memory store for local testing without database
export const inMemoryCaProfiles: InMemoryCaProfile[] = [
  {
    id: 1,
    userId: 201,
    fullName: "CA Rajesh Verma, FCA",
    email: SEED_CA_EMAIL,
    phone: "+91 98200 12345",
    membershipNumber: "ICAI #409212",
    firmName: "Verma & Associates Chartered Accountants",
    specialization: "GST Filings, Direct Tax & Corporate Audit",
    status: "active",
    bio: "Senior Fellow Chartered Accountant with 14+ years experience in enterprise GST reconciliation, tax litigation, and statutory audit compliance.",
    createdByAdminId: 1,
    createdAt: new Date("2026-01-10"),
    updatedAt: new Date("2026-01-10"),
  },
];

export const inMemoryCaCredentials = new Map<number, { passwordHash: string; passwordSalt: string }>();

// Initialize default seed password for in-memory CA
let initialized = false;
async function ensureSeedCreds() {
  if (!initialized) {
    const salt = randomBytes(16).toString("hex");
    const hash = await hashCaPassword(SEED_CA_DEFAULT_PASSWORD, salt);
    inMemoryCaCredentials.set(201, { passwordHash: hash, passwordSalt: salt });
    initialized = true;
  }
}

export async function verifyCaPassword(userId: number, email: string, supplied: string) {
  await ensureSeedCreds();
  const db = await getDb();
  if (!db) {
    const inMemProfile = inMemoryCaProfiles.find(p => p.email.toLowerCase() === email.toLowerCase());
    if (!inMemProfile || inMemProfile.status !== "active") return false;
    const cred = inMemoryCaCredentials.get(inMemProfile.userId);
    if (cred) {
      const derived = await hashCaPassword(supplied, cred.passwordSalt);
      return derived === cred.passwordHash;
    }
    if (email.toLowerCase() === SEED_CA_EMAIL.toLowerCase() && supplied === SEED_CA_DEFAULT_PASSWORD) {
      return true;
    }
    return false;
  }

  const profile = await db.select().from(caProfiles).where(eq(caProfiles.userId, userId)).limit(1);
  if (!profile[0] || profile[0].status !== "active") return false;

  const cred = await db.select().from(caCredentials).where(eq(caCredentials.userId, userId)).limit(1);
  if (cred[0]) {
    const derived = await hashCaPassword(supplied, cred[0].passwordSalt);
    return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(cred[0].passwordHash, "hex"));
  }

  if (email.toLowerCase() === SEED_CA_EMAIL.toLowerCase() && supplied === SEED_CA_DEFAULT_PASSWORD) {
    return true;
  }

  return false;
}

export async function signInCa(ctx: LoginContext, input: z.infer<typeof caLoginSchema>) {
  const key = clientKey(ctx.req);
  if (!canAttempt(key)) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many sign-in attempts. Please wait 15 minutes before trying again.",
    });
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const db = await getDb();

  let user: { id: number; openId: string; name: string | null; email: string | null; role: "user" | "admin" | "ca" } | undefined;
  let profileStatus: "active" | "suspended" | "revoked" | null = null;

  if (db) {
    const userRow = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (userRow[0]) {
      user = userRow[0];
      const caProf = await db.select().from(caProfiles).where(eq(caProfiles.userId, user.id)).limit(1);
      if (caProf[0]) profileStatus = caProf[0].status;
    }
  } else {
    // In-memory fallback
    const memProf = inMemoryCaProfiles.find(p => p.email.toLowerCase() === normalizedEmail);
    if (memProf) {
      user = {
        id: memProf.userId,
        openId: `ca-openid-${memProf.userId}`,
        name: memProf.fullName,
        email: memProf.email,
        role: "ca",
      };
      profileStatus = memProf.status;
    }
  }

  if (!user || user.role !== "ca") {
    recordFailure(key);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "No Chartered Accountant account found for this email. CA access is granted exclusively by Prava Administrators.",
    });
  }

  if (profileStatus === "suspended" || profileStatus === "revoked") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Your Chartered Accountant access has been ${profileStatus} by the administrator. Please contact Prava operations.`,
    });
  }

  const credentialsAreValid = await verifyCaPassword(user.id, normalizedEmail, input.password);
  if (!credentialsAreValid) {
    recordFailure(key);
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Invalid Chartered Accountant password.",
    });
  }

  attempts.delete(key);

  if (db) {
    await db.insert(adminAuditEvents).values({
      actorUserId: user.id,
      action: "CA_PORTAL_LOGIN",
      entityType: "ca_profile",
      entityId: String(user.id),
      metadata: JSON.stringify({ email: normalizedEmail }),
    });
  }

  const token = await sdk.createSessionToken(user.openId, {
    expiresInMs: 12 * 60 * 60 * 1000,
    name: user.name ?? "Chartered Accountant",
  });

  ctx.res.cookie(COOKIE_NAME, token, getSessionCookieOptions(ctx.req as Parameters<typeof getSessionCookieOptions>[0]));

  return { success: true as const, redirectTo: "/ca/dashboard" };
}
