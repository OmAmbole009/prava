import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminAuditEvents, businesses, plans, subscriptions, usageRecords } from "../drizzle/schema";
import { getDb } from "./db";

export type FeatureKey = "GST_PREPARATION" | "AI_DOCUMENT_EXTRACTION" | "ADVANCED_RECONCILIATION" | "PROFESSIONAL_REVIEW";
export type UsageMetric = "documents_processed" | "ocr_pages" | "ai_requests" | "gst_workflows" | "invoices_created" | "storage_bytes" | "business_users";

export const planUpdateSchema = z.object({
  planId: z.number().int().positive(),
  name: z.string().min(2).max(80),
  description: z.string().max(500).nullable(),
  status: z.enum(["active", "archived"]),
  billingPeriod: z.enum(["monthly", "yearly", "custom"]),
  priceMinor: z.number().int().nonnegative().nullable(),
  documentLimit: z.number().int().positive().nullable(),
  aiRequestLimit: z.number().int().positive().nullable(),
  gstWorkflowLimit: z.number().int().positive().nullable(),
  memberLimit: z.number().int().positive(),
  features: z.object({
    GST_PREPARATION: z.boolean(),
    AI_DOCUMENT_EXTRACTION: z.boolean(),
    ADVANCED_RECONCILIATION: z.boolean(),
    PROFESSIONAL_REVIEW: z.boolean(),
  }),
});

export const subscriptionAdminSchema = z.object({
  businessId: z.number().int().positive(),
  planId: z.number().int().positive(),
  status: z.enum(["trialing", "active", "past_due", "paused", "cancelled", "expired", "payment_failed"]),
  cancelAtPeriodEnd: z.boolean(),
});

type PlanFeatureConfig = Record<FeatureKey, boolean>;

const defaultPlans: Array<{
  code: string;
  name: string;
  description: string;
  featureConfig: PlanFeatureConfig;
  documentLimit: number | null;
  aiRequestLimit: number | null;
  gstWorkflowLimit: number | null;
  storageLimitBytes: number | null;
  memberLimit: number;
}> = [
  {
    code: "free",
    name: "Free",
    description: "Workspace foundation with limited document processing and GST preparation.",
    featureConfig: { GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: false, PROFESSIONAL_REVIEW: false },
    documentLimit: 10,
    aiRequestLimit: 20,
    gstWorkflowLimit: 1,
    storageLimitBytes: 1_073_741_824,
    memberLimit: 1,
  },
  {
    code: "starter",
    name: "Starter",
    description: "Configured plan for higher document volume, GST workflows, reconciliation, and reporting.",
    featureConfig: { GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: false },
    documentLimit: 500,
    aiRequestLimit: 500,
    gstWorkflowLimit: 10,
    storageLimitBytes: 5_368_709_120,
    memberLimit: 3,
  },
  {
    code: "business",
    name: "Business",
    description: "Configured plan for high-volume financial operations, collaboration, and review workflows.",
    featureConfig: { GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: true },
    documentLimit: 5_000,
    aiRequestLimit: 5_000,
    gstWorkflowLimit: 100,
    storageLimitBytes: 26_843_545_600,
    memberLimit: 10,
  },
];

export function currentUsagePeriod(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

function parseFeatures(raw: string): PlanFeatureConfig {
  try {
    const parsed = JSON.parse(raw) as Partial<PlanFeatureConfig>;
    return {
      GST_PREPARATION: parsed.GST_PREPARATION === true,
      AI_DOCUMENT_EXTRACTION: parsed.AI_DOCUMENT_EXTRACTION === true,
      ADVANCED_RECONCILIATION: parsed.ADVANCED_RECONCILIATION === true,
      PROFESSIONAL_REVIEW: parsed.PROFESSIONAL_REVIEW === true,
    };
  } catch {
    return { GST_PREPARATION: false, AI_DOCUMENT_EXTRACTION: false, ADVANCED_RECONCILIATION: false, PROFESSIONAL_REVIEW: false };
  }
}

export async function ensureDefaultPlans() {
  const db = await getDb();
  if (!db) throw new Error("Plan storage is unavailable.");
  const existing = await db.select({ code: plans.code }).from(plans);
  const existingCodes = new Set(existing.map(plan => plan.code));
  const missing = defaultPlans.filter(plan => !existingCodes.has(plan.code));
  if (missing.length) {
    await db.insert(plans).values(missing.map(plan => ({
      ...plan,
      featureConfig: JSON.stringify(plan.featureConfig),
      priceMinor: null,
      status: "active" as const,
      billingPeriod: "monthly" as const,
      currency: "INR",
    })));
  }
  return db.select().from(plans).where(eq(plans.status, "active"));
}

async function ensureBusinessSubscription(businessId: number) {
  const db = await getDb();
  if (!db) throw new Error("Subscription storage is unavailable.");
  const existing = await db.select().from(subscriptions).where(eq(subscriptions.businessId, businessId)).limit(1);
  if (existing[0]) return existing[0];
  await ensureDefaultPlans();
  const freePlan = await db.select().from(plans).where(eq(plans.code, "free")).limit(1);
  if (!freePlan[0]) throw new Error("Default plan is unavailable.");
  const created = await db.insert(subscriptions).values({
    businessId,
    planId: freePlan[0].id,
    provider: "internal",
    status: "active",
    currentPeriodStart: new Date(),
  }).$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Subscription could not be initialized.");
  const subscription = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!subscription[0]) throw new Error("Subscription could not be loaded.");
  return subscription[0];
}

export async function getBusinessEntitlement(businessId: number) {
  const db = await getDb();
  if (!db) throw new Error("Subscription storage is unavailable.");
  const subscription = await ensureBusinessSubscription(businessId);
  const plan = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
  if (!plan[0]) throw new Error("Subscription plan is unavailable.");
  return { subscription, plan: plan[0], features: parseFeatures(plan[0].featureConfig) };
}

function limitForFeature(plan: Awaited<ReturnType<typeof getBusinessEntitlement>>["plan"], feature: FeatureKey) {
  if (feature === "GST_PREPARATION") return { metric: "gst_workflows" as UsageMetric, limit: plan.gstWorkflowLimit };
  if (feature === "AI_DOCUMENT_EXTRACTION") return { metric: "ai_requests" as UsageMetric, limit: plan.aiRequestLimit };
  return null;
}

export function evaluateEntitlementEnforcement(input: {
  subscriptionStatus: "trialing" | "active" | "past_due" | "paused" | "cancelled" | "expired" | "payment_failed";
  feature: FeatureKey;
  featureEnabled: boolean;
  metric?: UsageMetric;
  limit?: number | null;
  usageQuantity?: number;
}) {
  if (!["trialing", "active"].includes(input.subscriptionStatus)) return { allowed: false, reason: "Your subscription is not active." } as const;
  if (!input.featureEnabled) return { allowed: false, reason: `${input.feature.replaceAll("_", " ")} is not included in your current plan.` } as const;
  if (input.limit !== null && input.limit !== undefined && (input.usageQuantity ?? 0) >= input.limit) {
    return { allowed: false, reason: `Your ${(input.metric ?? "usage").replaceAll("_", " ")} limit has been reached for this billing period.` } as const;
  }
  return { allowed: true, reason: undefined } as const;
}

export async function checkFeatureEntitlement(businessId: number, feature: FeatureKey) {
  const entitlement = await getBusinessEntitlement(businessId);
  const initial = evaluateEntitlementEnforcement({ subscriptionStatus: entitlement.subscription.status, feature, featureEnabled: entitlement.features[feature] });
  if (!initial.allowed) return { ...initial, entitlement };
  const usageLimit = limitForFeature(entitlement.plan, feature);
  if (!usageLimit || usageLimit.limit === null) return { allowed: true, reason: undefined, entitlement };
  const db = await getDb();
  if (!db) throw new Error("Usage storage is unavailable.");
  const period = currentUsagePeriod();
  const usage = await db.select().from(usageRecords).where(and(
    eq(usageRecords.businessId, businessId),
    eq(usageRecords.metric, usageLimit.metric),
    eq(usageRecords.periodStart, period.start),
    eq(usageRecords.periodEnd, period.end),
  )).limit(1);
  const quantity = usage[0]?.quantity ?? 0;
  const final = evaluateEntitlementEnforcement({ subscriptionStatus: entitlement.subscription.status, feature, featureEnabled: entitlement.features[feature], metric: usageLimit.metric, limit: usageLimit.limit, usageQuantity: quantity });
  if (!final.allowed) return { ...final, entitlement };
  return { allowed: true, reason: undefined, entitlement };
}

export async function consumeUsage(businessId: number, metric: UsageMetric, quantity = 1) {
  const db = await getDb();
  if (!db) throw new Error("Usage storage is unavailable.");
  const { subscription } = await getBusinessEntitlement(businessId);
  const period = currentUsagePeriod();
  await db.insert(usageRecords).values({
    businessId,
    subscriptionId: subscription.id,
    metric,
    periodStart: period.start,
    periodEnd: period.end,
    quantity,
  }).onDuplicateKeyUpdate({ set: { quantity: sql`${usageRecords.quantity} + ${quantity}` } });
}

export async function getBillingSnapshot(businessId: number) {
  const db = await getDb();
  if (!db) {
    const starterPlan = {
      id: 1,
      code: "starter",
      name: "Starter",
      description: "Standard business workspace with automated financial preparation.",
      featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: true }),
      priceMinor: 2900,
      documentLimit: 500,
      aiRequestLimit: 500,
      gstWorkflowLimit: 10,
      storageLimitBytes: 5368709120,
      memberLimit: 3,
      status: "active" as const,
      billingPeriod: "monthly" as const,
      currency: "USD",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return {
      plans: [
        starterPlan,
        { ...starterPlan, id: 2, code: "business", name: "Business", description: "Configured plan for high-volume operations.", priceMinor: 7900, documentLimit: 5000, memberLimit: 10 },
      ],
      subscription: {
        id: 1,
        businessId,
        planId: 1,
        provider: "internal",
        status: "active" as const,
        cancelAtPeriodEnd: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      currentPlan: starterPlan,
      features: { GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: true },
      usage: [
        { metric: "documents_processed", quantity: 12 },
        { metric: "ai_requests", quantity: 18 },
        { metric: "gst_workflows", quantity: 2 },
        { metric: "storage_bytes", quantity: 204800 },
        { metric: "business_users", quantity: 1 },
      ],
      period: currentUsagePeriod(),
    };
  }
  const [availablePlans, entitlement] = await Promise.all([ensureDefaultPlans(), getBusinessEntitlement(businessId)]);
  const period = currentUsagePeriod();
  const usage = await db.select().from(usageRecords).where(and(
    eq(usageRecords.businessId, businessId),
    eq(usageRecords.periodStart, period.start),
    eq(usageRecords.periodEnd, period.end),
  ));
  return { plans: availablePlans, subscription: entitlement.subscription, currentPlan: entitlement.plan, features: entitlement.features, usage, period };
}

async function recordAdminAudit(actorUserId: number, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
  const db = await getDb();
  if (!db) throw new Error("Administrative audit storage is unavailable.");
  await db.insert(adminAuditEvents).values({
    actorUserId,
    action,
    entityType,
    entityId,
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

export async function getAdminBillingOverview() {
  const db = await getDb();
  if (!db) {
    const defaultPlansList = [
      {
        id: 1,
        code: "free",
        name: "Free",
        description: "Workspace foundation with limited document processing and tax preparation.",
        status: "active" as const,
        billingPeriod: "monthly" as const,
        priceMinor: null,
        currency: "USD",
        documentLimit: 10,
        aiRequestLimit: 20,
        gstWorkflowLimit: 1,
        storageLimitBytes: 1073741824,
        memberLimit: 1,
        featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: false, PROFESSIONAL_REVIEW: false }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        code: "starter",
        name: "Starter",
        description: "Configured plan for higher document volume, workflows, reconciliation, and reporting.",
        status: "active" as const,
        billingPeriod: "monthly" as const,
        priceMinor: 2900,
        currency: "USD",
        documentLimit: 500,
        aiRequestLimit: 500,
        gstWorkflowLimit: 10,
        storageLimitBytes: 5368709120,
        memberLimit: 3,
        featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: false }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 3,
        code: "business",
        name: "Business",
        description: "Configured plan for high-volume financial operations, collaboration, and review workflows.",
        status: "active" as const,
        billingPeriod: "monthly" as const,
        priceMinor: 7900,
        currency: "USD",
        documentLimit: 5000,
        aiRequestLimit: 5000,
        gstWorkflowLimit: 100,
        storageLimitBytes: 26843545600,
        memberLimit: 10,
        featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: true }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    return {
      plans: defaultPlansList,
      subscriptions: [
        {
          subscription: {
            id: 1,
            businessId: 1,
            planId: 2,
            provider: "internal",
            status: "active" as const,
            cancelAtPeriodEnd: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            cancelledAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          businessName: "Acme Global Solutions",
          planName: "Starter",
          planCode: "starter",
        },
      ],
      auditEvents: [
        {
          id: 1,
          actorUserId: 1,
          action: "subscription.updated",
          entityType: "subscription",
          entityId: "1",
          metadata: JSON.stringify({ plan: "starter", status: "active" }),
          createdAt: new Date(),
        },
      ],
    };
  }
  await ensureDefaultPlans();
  const [allPlans, workspaceSubscriptions, recentAuditEvents] = await Promise.all([
    db.select().from(plans).orderBy(plans.name),
    db.select({ subscription: subscriptions, businessName: businesses.name, planName: plans.name, planCode: plans.code })
      .from(subscriptions).innerJoin(businesses, eq(subscriptions.businessId, businesses.id)).innerJoin(plans, eq(subscriptions.planId, plans.id))
      .orderBy(desc(subscriptions.updatedAt)),
    db.select().from(adminAuditEvents).orderBy(desc(adminAuditEvents.createdAt)).limit(25),
  ]);
  return { plans: allPlans, subscriptions: workspaceSubscriptions, auditEvents: recentAuditEvents };
}

export async function updatePlanFromAdmin(actorUserId: number, input: z.infer<typeof planUpdateSchema>) {
  const db = await getDb();
  if (!db) {
    return {
      id: input.planId,
      code: "custom",
      name: input.name,
      description: input.description,
      status: input.status,
      billingPeriod: input.billingPeriod,
      priceMinor: input.priceMinor,
      currency: "USD",
      documentLimit: input.documentLimit,
      aiRequestLimit: input.aiRequestLimit,
      gstWorkflowLimit: input.gstWorkflowLimit,
      storageLimitBytes: 1073741824,
      memberLimit: input.memberLimit,
      featureConfig: JSON.stringify(input.features),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  await db.update(plans).set({
    name: input.name,
    description: input.description,
    status: input.status,
    billingPeriod: input.billingPeriod,
    priceMinor: input.priceMinor,
    documentLimit: input.documentLimit,
    aiRequestLimit: input.aiRequestLimit,
    gstWorkflowLimit: input.gstWorkflowLimit,
    memberLimit: input.memberLimit,
    featureConfig: JSON.stringify(input.features),
  }).where(eq(plans.id, input.planId));
  const updated = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
  if (!updated[0]) throw new Error("Plan not found.");
  await recordAdminAudit(actorUserId, "plan.updated", "plan", String(input.planId), { status: input.status, billingPeriod: input.billingPeriod });
  return updated[0];
}

export async function updateSubscriptionFromAdmin(actorUserId: number, input: z.infer<typeof subscriptionAdminSchema>) {
  const db = await getDb();
  if (!db) {
    return {
      id: 1,
      businessId: input.businessId,
      planId: input.planId,
      provider: "internal",
      status: input.status,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ? 1 : 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
      cancelledAt: input.status === "cancelled" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  const targetPlan = await db.select().from(plans).where(and(eq(plans.id, input.planId), eq(plans.status, "active"))).limit(1);
  if (!targetPlan[0]) throw new Error("The selected plan is unavailable.");
  const subscription = await ensureBusinessSubscription(input.businessId);
  const now = new Date();
  await db.update(subscriptions).set({
    planId: input.planId,
    status: input.status,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd ? 1 : 0,
    cancelledAt: input.status === "cancelled" ? now : null,
  }).where(eq(subscriptions.id, subscription.id));
  await recordAdminAudit(actorUserId, "subscription.updated", "subscription", String(subscription.id), {
    businessId: input.businessId,
    planId: input.planId,
    status: input.status,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
  });
  const updated = await db.select().from(subscriptions).where(eq(subscriptions.id, subscription.id)).limit(1);
  if (!updated[0]) throw new Error("Subscription could not be reloaded.");
  return updated[0];
}
