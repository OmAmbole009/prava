import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";
import { adminAuditEvents, adminCredentials, businesses, businessInvitations, businessMembers, users } from "../drizzle/schema";
import { getDb } from "./db";

const scryptAsync = promisify(scrypt);
const BOOTSTRAP_ADMIN_EMAIL = "omambole2007@gmail.com";

export const invitationSchema = z.object({
  businessId: z.number().int().positive(),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(["admin", "member", "viewer"]),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const rotatePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(12).max(256),
});

export const auditLogSchema = z.object({
  search: z.string().trim().max(120).optional(),
  action: z.string().trim().max(128).optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

function constantTimeMatches(supplied: string, expected: string) {
  return timingSafeEqual(digest(supplied), digest(expected));
}

async function hashPassword(password: string, salt: string) {
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return derived.toString("hex");
}

async function recordAudit(actorUserId: number, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Administrative audit storage is unavailable.");
  await db.insert(adminAuditEvents).values({ actorUserId, action, entityType, entityId, metadata: metadata ? JSON.stringify(metadata) : null });
}

export async function verifyAdministratorPassword(userId: number, email: string | null, supplied: string) {
  const db = await getDb();
  if (!db) return false;
  const credential = await db.select().from(adminCredentials).where(eq(adminCredentials.userId, userId)).limit(1);
  if (credential[0]) {
    const derived = await hashPassword(supplied, credential[0].passwordSalt);
    return timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(credential[0].passwordHash, "hex"));
  }
  const bootstrapPassword = process.env.ADMIN_LOGIN_PASSWORD;
  if (!bootstrapPassword) return false;
  return email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL && constantTimeMatches(supplied, bootstrapPassword);
}

export async function rotateAdministratorPassword(actorUser: { id: number; email: string | null }, input: z.infer<typeof rotatePasswordSchema>) {
  const valid = await verifyAdministratorPassword(actorUser.id, actorUser.email, input.currentPassword);
  if (!valid) throw new Error("Your current administrator password was not accepted.");
  const db = await getDb();
  if (!db) throw new Error("Administrator credential storage is unavailable.");
  const salt = randomBytes(16).toString("hex");
  const passwordHash = await hashPassword(input.newPassword, salt);
  await db.insert(adminCredentials).values({ userId: actorUser.id, passwordHash, passwordSalt: salt, rotatedByUserId: actorUser.id, rotatedAt: new Date() }).onDuplicateKeyUpdate({
    set: { passwordHash, passwordSalt: salt, rotatedByUserId: actorUser.id, rotatedAt: new Date() },
  });
  await recordAudit(actorUser.id, "admin.password_rotated", "admin_credential", String(actorUser.id), { method: "local_password" });
  return { rotated: true as const };
}

export async function createBusinessInvitation(actorUserId: number, input: z.infer<typeof invitationSchema>) {
  const db = await getDb();
  if (!db) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
    return { id: 2, token, businessName: "Acme Global Solutions", expiresAt };
  }
  const business = await db.select({ id: businesses.id, name: businesses.name }).from(businesses).where(eq(businesses.id, input.businessId)).limit(1);
  if (!business[0]) throw new Error("The selected workspace does not exist.");
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + input.expiresInDays * 86_400_000);
  const inserted = await db.insert(businessInvitations).values({
    businessId: input.businessId,
    email: input.email,
    role: input.role,
    tokenHash,
    invitedByUserId: actorUserId,
    expiresAt,
  }).$returningId();
  const invitationId = inserted[0]?.id;
  if (!invitationId) throw new Error("The invitation could not be created.");
  await recordAudit(actorUserId, "invitation.created", "business_invitation", String(invitationId), { businessId: input.businessId, role: input.role, expiresAt: expiresAt.toISOString() });
  return { id: invitationId, token, businessName: business[0].name, expiresAt };
}

export async function revokeBusinessInvitation(actorUserId: number, invitationId: number) {
  const db = await getDb();
  if (!db) return { revoked: true as const };
  const invitation = await db.select().from(businessInvitations).where(eq(businessInvitations.id, invitationId)).limit(1);
  if (!invitation[0]) throw new Error("Invitation not found.");
  if (invitation[0].status !== "pending") throw new Error("Only pending invitations can be revoked.");
  await db.update(businessInvitations).set({ status: "revoked" }).where(eq(businessInvitations.id, invitationId));
  await recordAudit(actorUserId, "invitation.revoked", "business_invitation", String(invitationId), { businessId: invitation[0].businessId });
  return { revoked: true as const };
}

export async function acceptBusinessInvitation(user: { id: number; email: string | null }, token: string) {
  const db = await getDb();
  if (!db) return { accepted: true as const, businessId: 1 };
  if (!user.email) throw new Error("Your signed-in account does not have a verified email address.");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const invitation = await db.select().from(businessInvitations).where(eq(businessInvitations.tokenHash, tokenHash)).limit(1);
  const current = invitation[0];
  if (!current || current.status !== "pending") throw new Error("This invitation is no longer available.");
  if (current.expiresAt.getTime() < Date.now()) {
    await db.update(businessInvitations).set({ status: "expired" }).where(eq(businessInvitations.id, current.id));
    throw new Error("This invitation has expired.");
  }
  if (current.email.toLowerCase() !== user.email.toLowerCase()) throw new Error("Sign in with the email address that received this invitation.");
  await db.transaction(async tx => {
    await tx.insert(businessMembers).values({ businessId: current.businessId, userId: user.id, role: current.role }).onDuplicateKeyUpdate({ set: { role: current.role } });
    await tx.update(businessInvitations).set({ status: "accepted", acceptedByUserId: user.id, acceptedAt: new Date() }).where(eq(businessInvitations.id, current.id));
  });
  await recordAudit(current.invitedByUserId, "invitation.accepted", "business_invitation", String(current.id), { businessId: current.businessId, acceptedByUserId: user.id, role: current.role });
  return { accepted: true as const, businessId: current.businessId };
}

export async function getAdminSecurityOverview() {
  const db = await getDb();
  if (!db) {
    return {
      workspaces: [{ id: 1, name: "Acme Global Solutions" }],
      invitations: [
        {
          invitation: {
            id: 1,
            businessId: 1,
            email: "finance.director@acme-global.com",
            role: "admin" as const,
            status: "pending" as const,
            tokenHash: "mock-hash",
            invitedByUserId: 1,
            expiresAt: new Date(Date.now() + 7 * 86400000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          businessName: "Acme Global Solutions",
        },
      ],
    };
  }
  const [workspaces, invitations] = await Promise.all([
    db.select({ id: businesses.id, name: businesses.name }).from(businesses).orderBy(businesses.name),
    db.select({ invitation: businessInvitations, businessName: businesses.name }).from(businessInvitations).innerJoin(businesses, eq(businessInvitations.businessId, businesses.id)).orderBy(desc(businessInvitations.createdAt)).limit(50),
  ]);
  return { workspaces, invitations };
}

export async function searchAdminAuditLog(input: z.infer<typeof auditLogSchema>) {
  const db = await getDb();
  if (!db) {
    return [
      {
        event: {
          id: 1,
          actorUserId: 1,
          action: "WORKSPACE_PROFILE_INITIALIZED",
          entityType: "business",
          entityId: "1",
          metadata: JSON.stringify({ jurisdiction: "US", currency: "USD" }),
          createdAt: new Date(),
        },
        actorName: "Demo Business Owner",
        actorEmail: "owner@acme-global.com",
      },
      {
        event: {
          id: 2,
          actorUserId: 1,
          action: "INVITATION_PREPARED",
          entityType: "business_invitation",
          entityId: "1",
          metadata: JSON.stringify({ role: "admin" }),
          createdAt: new Date(Date.now() - 3600000),
        },
        actorName: "Demo Business Owner",
        actorEmail: "owner@acme-global.com",
      },
    ];
  }
  const clauses = [];
  if (input.action) clauses.push(eq(adminAuditEvents.action, input.action));
  if (input.search) {
    const term = `%${input.search}%`;
    clauses.push(or(like(adminAuditEvents.action, term), like(adminAuditEvents.entityType, term), like(adminAuditEvents.entityId, term))!);
  }
  return db.select({ event: adminAuditEvents, actorName: users.name, actorEmail: users.email }).from(adminAuditEvents).innerJoin(users, eq(adminAuditEvents.actorUserId, users.id)).where(clauses.length ? and(...clauses) : undefined).orderBy(desc(adminAuditEvents.createdAt)).limit(input.limit);
}
