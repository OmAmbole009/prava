import { describe, expect, it } from "vitest";
import { integrationSettingsSchema } from "./integrationReadiness.js";
import { appRouter } from "./routers.js";
import { getIntegrationReadiness } from "./integrationReadiness.js";

describe("integration readiness safeguards", () => {
  it("reports missing configuration without exposing values", () => {
    const snapshot = getIntegrationReadiness();
    expect(snapshot.email.status).toBe("not_configured");
    expect(snapshot.razorpay.status).toBe("not_configured");
    expect(JSON.stringify(snapshot)).not.toContain("API_KEY");
    expect(snapshot.upi.boundary).toContain("server-verifiable");
  });

  it("validates non-secret settings and rejects URLs containing embedded credentials", () => {
    expect(integrationSettingsSchema.safeParse({ integrationType: "gst_provider", displayName: "Authorized GSP", publicIdentifier: "provider-account", apiBaseUrl: "https://provider.example" }).success).toBe(true);
    expect(integrationSettingsSchema.safeParse({ integrationType: "gst_provider", displayName: "Authorized GSP", apiBaseUrl: "https://user:secret@provider.example" }).success).toBe(false);
  });

  it("keeps readiness details behind the global administrator guard", async () => {
    const ctx = {
      user: { id: 606, openId: "ordinary-member", name: "Member", email: "member@example.com", loginMethod: "email", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
      req: { protocol: "https", headers: {} }, res: {},
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.integrationReadiness()).rejects.toThrow("required permission");
    await expect(caller.admin.integrationSettings()).rejects.toThrow("required permission");
  });
});
