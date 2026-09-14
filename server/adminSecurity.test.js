import { describe, expect, it } from "vitest";
import { auditLogSchema, invitationSchema, rotatePasswordSchema } from "./adminSecurity.js";
import { appRouter } from "./routers.js";

describe("administrator security input boundaries", () => {
  it("accepts bounded, role-scoped workspace invitations and rejects unsupported privileged roles", () => {
    expect(invitationSchema.safeParse({ businessId: 3, email: "member@example.com", role: "member", expiresInDays: 7 }).success).toBe(true);
    expect(invitationSchema.safeParse({ businessId: 3, email: "member@example.com", role: "owner", expiresInDays: 7 }).success).toBe(false);
    expect(invitationSchema.safeParse({ businessId: 3, email: "not-an-email", role: "viewer", expiresInDays: 7 }).success).toBe(false);
    expect(invitationSchema.safeParse({ businessId: 3, email: "member@example.com", role: "viewer", expiresInDays: 31 }).success).toBe(false);
  });

  it("requires current-password confirmation and a 12-character minimum for rotation", () => {
    expect(rotatePasswordSchema.safeParse({ currentPassword: "current-secret", newPassword: "longer-new-secret" }).success).toBe(true);
    expect(rotatePasswordSchema.safeParse({ currentPassword: "", newPassword: "longer-new-secret" }).success).toBe(false);
    expect(rotatePasswordSchema.safeParse({ currentPassword: "current-secret", newPassword: "too-short" }).success).toBe(false);
  });

  it("bounds audit-history filtering so searches cannot become unbounded queries", () => {
    expect(auditLogSchema.parse({}).limit).toBe(50);
    expect(auditLogSchema.safeParse({ search: "plan", action: "plan.updated", limit: 100 }).success).toBe(true);
    expect(auditLogSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it("keeps all enhanced administration operations behind the server-side admin role guard", async () => {
    const ctx = {
      user: { id: 404, openId: "ordinary-member", name: "Member", email: "member@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} },
      res: {},
    };
    await expect(appRouter.createCaller(ctx).admin.securityOverview()).rejects.toThrow("required permission");
  });
});
