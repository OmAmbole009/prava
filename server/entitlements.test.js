import { describe, expect, it } from "vitest";
import {
  checkFeatureEntitlement,
  currentUsagePeriod,
  evaluateEntitlementEnforcement,
  getBillingSnapshot,
  planUpdateSchema,
  redeemGiftCode,
  selectFreePlan,
} from "./entitlements.js";
import { inMemoryBusinesses } from "./db.js";
import { createHmac } from "node:crypto";
import { verifyRazorpayPaymentSignature, verifyRazorpayWebhookSignature } from "./billingPayments.js";

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

  it("requires a new workspace to select a plan before protected features are available", async () => {
    const businessId = 991;
    const workspace = { id: businessId, ownerUserId: 22, planSelected: false };
    inMemoryBusinesses.push(workspace);
    try {
      const initial = await getBillingSnapshot(businessId);
      expect(initial.subscription.planSelected).toBe(0);
      expect(await checkFeatureEntitlement(businessId, "AI_DOCUMENT_EXTRACTION")).toMatchObject({
        allowed: false,
        reason: "Choose a plan to activate this workspace.",
      });

      await selectFreePlan(businessId);
      expect((await getBillingSnapshot(businessId)).subscription.planSelected).toBe(1);
      expect((await checkFeatureEntitlement(businessId, "AI_DOCUMENT_EXTRACTION")).allowed).toBe(true);
    } finally {
      inMemoryBusinesses.splice(inMemoryBusinesses.indexOf(workspace), 1);
    }
  });

  it("redeems the gift code for one paid plan once per workspace", async () => {
    const businessId = 992;
    const workspace = { id: businessId, ownerUserId: 22, planSelected: false };
    inMemoryBusinesses.push(workspace);
    try {
      const result = await redeemGiftCode(22, { businessId, planId: 2, code: " ganpatibappa " });
      expect(result).toMatchObject({ planId: 2, planName: "Starter", planSelected: true });
      expect((await getBillingSnapshot(businessId)).giftCodeRedeemed).toBe(true);
      await expect(redeemGiftCode(22, { businessId, planId: 3, code: "GANPATIBAPPA" })).rejects.toThrow("already been redeemed");
      await expect(redeemGiftCode(22, { businessId, planId: 3, code: "wrong" })).rejects.toThrow("not valid");
    } finally {
      inMemoryBusinesses.splice(inMemoryBusinesses.indexOf(workspace), 1);
    }
  });

  it("verifies Razorpay checkout and webhook HMAC signatures", () => {
    const secret = "test-secret";
    const orderId = "order_test";
    const paymentId = "pay_test";
    const paymentSignature = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const rawBody = Buffer.from('{"event":"payment.captured"}');
    const webhookSignature = createHmac("sha256", secret).update(rawBody).digest("hex");

    expect(verifyRazorpayPaymentSignature(orderId, paymentId, paymentSignature, secret)).toBe(true);
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, "0".repeat(64), secret)).toBe(false);
    expect(verifyRazorpayWebhookSignature(rawBody, webhookSignature, secret)).toBe(true);
    expect(verifyRazorpayWebhookSignature(Buffer.from("{}"), webhookSignature, secret)).toBe(false);
  });
});
