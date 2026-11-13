import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminAuditEvents, businesses, giftCodeRedemptions, plans, subscriptions, usageRecords } from "../drizzle/schema.js";
import { getDb, inMemoryBusinesses } from "./db.js";

const inMemoryBusinessPlans = new Map();
const inMemoryGiftRedemptions = new Set();

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

const defaultPlans = [
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

function parseFeatures(raw) {
  try {
    const parsed = JSON.parse(raw);
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
    // Two concurrent requests can both observe the same gap; the unique code
    // constraint turns the loser into a no-op instead of a 500.
    await db.insert(plans).values(missing.map(plan => ({
      ...plan,
      featureConfig: JSON.stringify(plan.featureConfig),
      priceMinor: null,
      status: "active",
      billingPeriod: "monthly",
      currency: "INR",
    }))).onDuplicateKeyUpdate({ set: { code: plans.code } });
  }
  return db.select().from(plans).where(eq(plans.status, "active"));
}

async function ensureBusinessSubscription(businessId) {
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
    planSelected: 0,
    currentPeriodStart: new Date(),
  }).$returningId();
  const id = created[0]?.id;
  if (!id) throw new Error("Subscription could not be initialized.");
  const subscription = await db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1);
  if (!subscription[0]) throw new Error("Subscription could not be loaded.");
  return subscription[0];
}

export async function getBusinessEntitlement(businessId) {
  const db = await getDb();
  if (!db) {
    const snapshot = await getBillingSnapshot(businessId);
    return {
      subscription: snapshot.subscription,
      plan: snapshot.currentPlan,
      features: parseFeatures(snapshot.currentPlan.featureConfig),
    };
  }
  const subscription = await ensureBusinessSubscription(businessId);
  if (subscription.planSelected && subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date() && subscription.status === "active") {
    await db.update(subscriptions).set({ status: "expired" }).where(eq(subscriptions.id, subscription.id));
    subscription.status = "expired";
  }
  const plan = await db.select().from(plans).where(eq(plans.id, subscription.planId)).limit(1);
  if (!plan[0]) throw new Error("Subscription plan is unavailable.");
  return { subscription, plan: plan[0], features: parseFeatures(plan[0].featureConfig) };
}

function limitForFeature(plan, feature) {
  if (feature === "GST_PREPARATION") return { metric: "gst_workflows", limit: plan.gstWorkflowLimit };
  if (feature === "AI_DOCUMENT_EXTRACTION") return { metric: "ai_requests", limit: plan.aiRequestLimit };
  return null;
}

export function evaluateEntitlementEnforcement(input) {
  if (!["trialing", "active"].includes(input.subscriptionStatus)) return { allowed: false, reason: "Your subscription is not active." };
  if (!input.featureEnabled) return { allowed: false, reason: `${input.feature.replaceAll("_", " ")} is not included in your current plan.` };
  if (input.limit !== null && input.limit !== undefined && (input.usageQuantity ?? 0) >= input.limit) {
    return { allowed: false, reason: `Your ${(input.metric ?? "usage").replaceAll("_", " ")} limit has been reached for this billing period.` };
  }
  return { allowed: true, reason: undefined };
}

export async function checkFeatureEntitlement(businessId, feature) {
  const entitlement = await getBusinessEntitlement(businessId);
  if (!entitlement.subscription.planSelected) {
    return { allowed: false, reason: "Choose a plan to activate this workspace.", entitlement };
  }
  const initial = evaluateEntitlementEnforcement({ subscriptionStatus: entitlement.subscription.status, feature, featureEnabled: entitlement.features[feature] });
  if (!initial.allowed) return { ...initial, entitlement };
  const usageLimit = limitForFeature(entitlement.plan, feature);
  if (!usageLimit || usageLimit.limit === null) return { allowed: true, reason: undefined, entitlement };
  const db = await getDb();
  if (!db) return { allowed: true, reason: undefined, entitlement };
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

export async function consumeUsage(businessId, metric, quantity = 1) {
  const db = await getDb();
  if (!db) return;
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

export async function getBillingSnapshot(businessId) {
  const db = await getDb();
  if (!db) {
    const freePlan = {
      id: 1,
      code: "free",
      name: "Free",
      description: "Workspace foundation with limited document processing and GST preparation.",
      featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: false, PROFESSIONAL_REVIEW: false }),
      priceMinor: null,
      documentLimit: 10,
      aiRequestLimit: 20,
      gstWorkflowLimit: 1,
      storageLimitBytes: 1073741824,
      memberLimit: 1,
      status: "active",
      billingPeriod: "monthly",
      currency: "INR",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const starterPlan = {
      id: 2,
      code: "starter",
      name: "Starter",
      description: "Standard business workspace with automated financial preparation.",
      featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: false }),
      priceMinor: 2900,
      documentLimit: 500,
      aiRequestLimit: 500,
      gstWorkflowLimit: 10,
      storageLimitBytes: 5368709120,
      memberLimit: 3,
      status: "active",
      billingPeriod: "monthly",
      currency: "INR",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const businessPlan = {
      ...starterPlan,
      id: 3,
      code: "business",
      name: "Business",
      description: "Configured plan for high-volume operations.",
      featureConfig: JSON.stringify({ GST_PREPARATION: true, AI_DOCUMENT_EXTRACTION: true, ADVANCED_RECONCILIATION: true, PROFESSIONAL_REVIEW: true }),
      priceMinor: 7900,
      documentLimit: 5000,
      memberLimit: 10,
    };
    const plansList = [freePlan, starterPlan, businessPlan];
    const workspace = inMemoryBusinesses.find(item => item.id === businessId);
    const planState = inMemoryBusinessPlans.get(businessId);
    const planSelected = planState?.planSelected ?? workspace?.planSelected !== false;
    const currentPlan = planSelected
      ? plansList.find(plan => plan.id === planState?.planId) ?? businessPlan
      : freePlan;
    const currentPeriodStart = planState?.currentPeriodStart ?? new Date();
    const currentPeriodEnd = planState?.currentPeriodEnd ??
      (planSelected && currentPlan.code !== "free" ? new Date(Date.now() + 30 * 86400000) : null);
    const subscriptionStatus = currentPeriodEnd && currentPeriodEnd <= new Date()
      ? "expired"
      : planState?.status ?? "active";
    if (subscriptionStatus === "expired" && planState) planState.status = "expired";
    return {
      plans: plansList,
      subscription: {
        id: 1,
        businessId,
        planId: currentPlan.id,
        provider: "internal",
        status: subscriptionStatus,
        planSelected: planSelected ? 1 : 0,
        cancelAtPeriodEnd: 0,
        currentPeriodStart,
        currentPeriodEnd,
        cancelledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      currentPlan,
      features: parseFeatures(currentPlan.featureConfig),
      giftCodeRedeemed: inMemoryGiftRedemptions.has(businessId),
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
  const giftRedemption = await db.select({ id: giftCodeRedemptions.id }).from(giftCodeRedemptions)
      .where(eq(giftCodeRedemptions.businessId, businessId)).limit(1);
  return {
    plans: availablePlans,
    subscription: entitlement.subscription,
    currentPlan: entitlement.plan,
    features: entitlement.features,
    usage,
    period,
    giftCodeRedeemed: Boolean(giftRedemption[0]),
  };
}

export async function selectFreePlan(businessId) {
  const db = await getDb();
  if (!db) {
    const snapshot = await getBillingSnapshot(businessId);
    const freePlan = snapshot.plans.find(plan => plan.code === "free" && plan.status === "active");
    if (!freePlan) throw new Error("The free plan is unavailable.");
    if (snapshot.subscription.planSelected && snapshot.currentPlan.id !== freePlan.id) {
      throw new Error("A selected plan cannot be replaced with the free plan here.");
    }
    inMemoryBusinessPlans.set(businessId, { planId: freePlan.id, planSelected: true });
    const workspace = inMemoryBusinesses.find(item => item.id === businessId);
    if (workspace) workspace.planSelected = true;
    return { businessId, planId: freePlan.id, planSelected: true };
  }
  const entitlement = await getBusinessEntitlement(businessId);
  const freePlan = await db.select().from(plans).where(and(eq(plans.code, "free"), eq(plans.status, "active"))).limit(1);
  if (!freePlan[0]) throw new Error("The free plan is unavailable.");
  if (entitlement.subscription.planSelected && entitlement.plan.id !== freePlan[0].id) {
    throw new Error("A selected plan cannot be replaced with the free plan here.");
  }
  await db.update(subscriptions).set({
    planId: freePlan[0].id,
    provider: "internal",
    providerSubscriptionId: null,
    status: "active",
    planSelected: 1,
    currentPeriodStart: new Date(),
    currentPeriodEnd: null,
    cancelAtPeriodEnd: 0,
    cancelledAt: null,
  }).where(eq(subscriptions.id, entitlement.subscription.id));
  return { businessId, planId: freePlan[0].id, planSelected: true };
}

export async function redeemGiftCode(userId, input) {
  if (typeof input.code !== "string" || input.code.trim().toUpperCase() !== "GANPATIBAPPA") {
    throw new Error("That gift code is not valid.");
  }
  const db = await getDb();
  if (!db) {
    const snapshot = await getBillingSnapshot(input.businessId);
    const targetPlan = snapshot.plans.find(plan => plan.id === input.planId && plan.status === "active");
    if (!targetPlan || targetPlan.code === "free") throw new Error("Choose an available paid plan for this gift code.");
    if (targetPlan.billingPeriod === "custom") throw new Error("Custom plans must be activated by Prava support.");
    if (inMemoryGiftRedemptions.has(input.businessId)) throw new Error("A gift code has already been redeemed for this workspace.");
    inMemoryGiftRedemptions.add(input.businessId);
    const now = new Date();
    const periodEnd = targetPlan.billingPeriod === "yearly"
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    inMemoryBusinessPlans.set(input.businessId, {
      planId: targetPlan.id,
      planSelected: true,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });
    const workspace = inMemoryBusinesses.find(item => item.id === input.businessId);
    if (workspace) workspace.planSelected = true;
    return { businessId: input.businessId, planId: targetPlan.id, planName: targetPlan.name, planSelected: true };
  }
  const entitlement = await getBusinessEntitlement(input.businessId);
  const targetPlan = await db.select().from(plans).where(and(eq(plans.id, input.planId), eq(plans.status, "active"))).limit(1);
  if (!targetPlan[0] || targetPlan[0].code === "free") throw new Error("Choose an available paid plan for this gift code.");
  if (targetPlan[0].billingPeriod === "custom") throw new Error("Custom plans must be activated by Prava support.");
  const existing = await db.select({ id: giftCodeRedemptions.id }).from(giftCodeRedemptions)
    .where(eq(giftCodeRedemptions.businessId, input.businessId)).limit(1);
  if (existing[0]) throw new Error("A gift code has already been redeemed for this workspace.");
  const now = new Date();
  const periodEnd = targetPlan[0].billingPeriod === "yearly"
    ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  await db.transaction(async tx => {
    await tx.insert(giftCodeRedemptions).values({
      businessId: input.businessId,
      planId: targetPlan[0].id,
      redeemedByUserId: userId,
      code: "GANPATIBAPPA",
    });
    await tx.update(subscriptions).set({
      planId: targetPlan[0].id,
      provider: "internal",
      providerSubscriptionId: null,
      status: "active",
      planSelected: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: 0,
      cancelledAt: null,
    }).where(eq(subscriptions.id, entitlement.subscription.id));
  });
  return { businessId: input.businessId, planId: targetPlan[0].id, planName: targetPlan[0].name, planSelected: true };
}

async function recordAdminAudit(actorUserId, action, entityType, entityId, metadata) {
  const db = await getDb();
  if (!db) return;
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
        status: "active",
        billingPeriod: "monthly",
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
        status: "active",
        billingPeriod: "monthly",
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
        status: "active",
        billingPeriod: "monthly",
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
    const defaultSubscriptionPlanId = inMemoryBusinessPlans.get(1)?.planId ?? 3;
    const defaultSubscriptionPlan = defaultPlansList.find(plan => plan.id === defaultSubscriptionPlanId) ?? defaultPlansList[2];
    return {
      plans: defaultPlansList,
      subscriptions: [
        {
          subscription: {
            id: 1,
            businessId: 1,
            planId: defaultSubscriptionPlan.id,
            provider: "internal",
            status: "active",
            cancelAtPeriodEnd: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
            cancelledAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          businessName: "Acme Global Solutions",
          planName: defaultSubscriptionPlan.name,
          planCode: defaultSubscriptionPlan.code,
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

export async function updatePlanFromAdmin(actorUserId, input) {
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

export async function updateSubscriptionFromAdmin(actorUserId, input) {
  const db = await getDb();
  if (!db) {
    inMemoryBusinessPlans.set(input.businessId, { planId: input.planId, planSelected: true });
    return {
      id: 1,
      businessId: input.businessId,
      planId: input.planId,
      planSelected: 1,
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
    planSelected: 1,
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
