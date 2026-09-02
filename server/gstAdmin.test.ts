import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { csvForGstSubmissions, gstAdminDecisionSchema, gstAdminSearchSchema } from "./gstAdmin";
import type { TrpcContext } from "./_core/context";

describe("GST administration safeguards", () => {
  it("bounds searchable administration filters and requires a meaningful rejection note", () => {
    expect(gstAdminSearchSchema.parse({}).status).toBe("all");
    expect(gstAdminSearchSchema.safeParse({ search: "x".repeat(121) }).success).toBe(false);
    expect(gstAdminSearchSchema.safeParse({ status: "not-a-state" }).success).toBe(false);
    expect(gstAdminDecisionSchema.safeParse({ taskId: 2, reviewerNote: "Explain evidence gaps" }).success).toBe(true);
    expect(gstAdminDecisionSchema.safeParse({ taskId: 2, reviewerNote: "short" }).success).toBe(false);
  });

  it("escapes CSV values and exports only safe workflow register fields", () => {
    const csv = csvForGstSubmissions([{
      request: { id: 7, status: "rejected", providerName: null, failureCode: null, createdAt: new Date("2026-08-01T00:00:00.000Z"), approvedAt: null, submittedAt: null },
      businessName: "A \"quoted\" workspace", taskTitle: "GST return", requesterName: "Requester", requesterEmail: "requester@example.com", preparation: null,
    }] as never);
    expect(csv).toContain('"A ""quoted"" workspace"');
    expect(csv).toContain("official_reference");
    expect(csv).not.toContain("documentUrl");
  });

  it("keeps GST register and export procedures behind the server-side global administrator guard", async () => {
    const ctx = {
      user: { id: 505, openId: "ordinary-member", name: "Member", email: "member@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} }, res: {},
    } as unknown as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.gstSubmissions({})).rejects.toThrow("required permission");
    await expect(caller.admin.exportGstSubmissions({})).rejects.toThrow("required permission");
  });
});
