import { describe, expect, it } from "vitest";
import { currentUsagePeriod, evaluateEntitlementEnforcement, planUpdateSchema } from "./entitlements";

describe("subscription entitlement contracts", () => {
  it("uses a stable UTC calendar-month usage period", () => {
    const period = currentUsagePeriod(new Date("2026-08-19T18:42:00.000Z"));
    expect(period.start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(period.end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("rejects an invalid administrator plan configuration before persistence", () => {
    const parsed = planUpdateSchema.safeParse({
      planId: 1,
      name: "Business",
      description: null,
      status: "active",
      billingPeriod: "monthly",
      priceMinor: 99900,
      documentLimit: 100,
      aiRequestLimit: 100,
      gstWorkflowLimit: 10,
      memberLimit: 0,
      features: { GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: false },
    });
    expect(parsed.success).toBe(false);
  });

  it("allows an active workspace with the enabled extraction entitlement and remaining usage", () => {
    expect(evaluateEntitlementEnforcement({ subscriptionStatus: "active", feature: "AI_DOCUMENT_EXTRACTION", featureEnabled: true, metric: "ai_requests", limit: 10, usageQuantity: 9 })).toEqual({ allowed: true });
  });

  it("denies disabled features and exhausted usage before a premium operation runs", () => {
    expect(evaluateEntitlementEnforcement({ subscriptionStatus: "active", feature: "GST_PREPARATION", featureEnabled: false })).toMatchObject({ allowed: false, reason: expect.stringContaining("not included") });
    expect(evaluateEntitlementEnforcement({ subscriptionStatus: "trialing", feature: "AI_DOCUMENT_EXTRACTION", featureEnabled: true, metric: "ai_requests", limit: 10, usageQuantity: 10 })).toMatchObject({ allowed: false, reason: expect.stringContaining("limit has been reached") });
  });
});
