import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { payments, plans, subscriptions } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { getBusinessEntitlement } from "./entitlements.js";

const RAZORPAY_API = "https://api.razorpay.com/v1";

export function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const webhookEnabled = Boolean(process.env.RAZORPAY_WEBHOOK_SECRET);
  return {
    enabled: Boolean(keyId && keySecret && webhookEnabled),
    keyId: keyId && keySecret && webhookEnabled ? keyId : null,
    webhookEnabled,
  };
}

function requireRazorpayCredentials() {
  const { keyId, keySecret } = {
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  };
  if (!keyId || !keySecret || !process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay credentials and webhook verification must be configured before checkout.");
  }
  return { keyId, keySecret };
}

function signaturesMatch(expected, received) {
  if (typeof received !== "string" || !/^[a-f\d]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function verifyRazorpayPaymentSignature(orderId, paymentId, signature, secret) {
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return signaturesMatch(expected, signature);
}

export function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return signaturesMatch(expected, signature);
}

async function razorpayRequest(path, { method = "GET", body } = {}) {
  const { keyId, keySecret } = requireRazorpayCredentials();
  const response = await fetch(`${RAZORPAY_API}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.error?.description || payload?.error?.reason || "Razorpay could not complete the request.";
    throw new Error(message);
  }
  return payload;
}

export async function createRazorpayPlanOrder(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("Payment checkout requires persistent database storage.");
  const entitlement = await getBusinessEntitlement(input.businessId);
  const selectedPlan = await db.select().from(plans).where(and(
    eq(plans.id, input.planId),
    eq(plans.status, "active"),
  )).limit(1);
  const plan = selectedPlan[0];
  if (!plan || plan.code === "free") throw new Error("Choose an available paid plan.");
  const activePeriod = ["active", "trialing"].includes(entitlement.subscription.status) &&
    (!entitlement.subscription.currentPeriodEnd || entitlement.subscription.currentPeriodEnd > new Date());
  if (plan.id === entitlement.plan.id && entitlement.subscription.planSelected && activePeriod) {
    throw new Error("This is already the active plan.");
  }
  if (!Number.isSafeInteger(plan.priceMinor) || plan.priceMinor <= 0) {
    throw new Error("This plan has no valid price yet. Please contact Prava support.");
  }
  if (plan.billingPeriod === "custom") {
    throw new Error("Custom plans require a Prava administrator to configure checkout.");
  }
  const { keyId } = requireRazorpayCredentials();
  const receipt = `prava-${randomUUID().replaceAll("-", "").slice(0, 32)}`;
  const order = await razorpayRequest("/orders", {
    method: "POST",
    body: {
      amount: plan.priceMinor,
      currency: plan.currency,
      receipt,
      notes: {
        businessId: String(input.businessId),
        planId: String(plan.id),
        requestedByUserId: String(userId),
      },
    },
  });
  if (!order?.id || order.amount !== plan.priceMinor || order.currency !== plan.currency) {
    throw new Error("Razorpay returned an order that did not match the selected plan.");
  }
  await db.insert(payments).values({
    businessId: input.businessId,
    subscriptionId: entitlement.subscription.id,
    provider: "razorpay",
    providerOrderId: order.id,
    status: "pending",
    amountMinor: plan.priceMinor,
    currency: plan.currency,
    providerPayload: JSON.stringify({ planId: plan.id, createdByUserId: userId, receipt }),
  });
  return {
    keyId,
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    planName: plan.name,
    description: `${plan.name} ${plan.billingPeriod} plan`,
  };
}

async function settleCapturedPayment(paymentEntity, expectedBusinessId) {
  const db = await getDb();
  if (!db) throw new Error("Payment storage is unavailable.");
  if (!paymentEntity?.id || !paymentEntity?.order_id || paymentEntity.status !== "captured") {
    throw new Error("Razorpay has not captured this payment yet.");
  }
  let activatedPlanName;
  await db.transaction(async tx => {
    const orderRows = await tx.select().from(payments).where(and(
      eq(payments.provider, "razorpay"),
      eq(payments.providerOrderId, paymentEntity.order_id),
    )).limit(1);
    const order = orderRows[0];
    if (!order || order.businessId !== expectedBusinessId) throw new Error("The payment order was not found for this workspace.");
    if (order.status === "captured") {
      if (order.providerPaymentId !== paymentEntity.id) throw new Error("This order was already settled with another payment.");
      return;
    }
    if (paymentEntity.amount !== order.amountMinor || paymentEntity.currency !== order.currency) {
      throw new Error("The captured payment amount does not match the selected plan.");
    }
    const details = JSON.parse(order.providerPayload || "{}");
    const planRows = await tx.select().from(plans).where(eq(plans.id, Number(details.planId))).limit(1);
    const plan = planRows[0];
    if (!plan) throw new Error("The paid plan could not be loaded.");
    const subscriptionRows = await tx.select().from(subscriptions).where(eq(subscriptions.businessId, order.businessId)).limit(1);
    const subscription = subscriptionRows[0];
    if (!subscription) throw new Error("The workspace subscription could not be loaded.");
    const now = new Date();
    const periodEnd = plan.billingPeriod === "yearly"
      ? new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await tx.update(payments).set({
      providerPaymentId: paymentEntity.id,
      status: "captured",
      paidAt: now,
      providerPayload: JSON.stringify({
        ...details,
        orderId: paymentEntity.order_id,
        paymentId: paymentEntity.id,
        status: "captured",
      }),
    }).where(eq(payments.id, order.id));
    await tx.update(subscriptions).set({
      planId: plan.id,
      provider: "razorpay",
      providerSubscriptionId: null,
      status: "active",
      planSelected: 1,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: 0,
      cancelledAt: null,
    }).where(eq(subscriptions.id, subscription.id));
    activatedPlanName = plan.name;
  });
  return { businessId: expectedBusinessId, planName: activatedPlanName, status: "captured" };
}

export async function verifyAndCaptureRazorpayPayment(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("Payment storage is unavailable.");
  const orderRows = await db.select().from(payments).where(and(
    eq(payments.provider, "razorpay"),
    eq(payments.providerOrderId, input.orderId),
    eq(payments.businessId, input.businessId),
  )).limit(1);
  const order = orderRows[0];
  if (!order) throw new Error("The payment order was not found for this workspace.");
  const details = JSON.parse(order.providerPayload || "{}");
  if (details.createdByUserId !== userId) throw new Error("Only the user who started checkout can verify this payment.");
  if (!verifyRazorpayPaymentSignature(input.orderId, input.paymentId, input.signature, requireRazorpayCredentials().keySecret)) {
    throw new Error("The payment signature could not be verified.");
  }
  const paymentEntity = await razorpayRequest(`/payments/${encodeURIComponent(input.paymentId)}`);
  if (paymentEntity.order_id !== input.orderId) throw new Error("The payment does not belong to this order.");
  return settleCapturedPayment(paymentEntity, input.businessId);
}

export async function handleRazorpayWebhook(rawBody, signature) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error("Razorpay webhook verification is not configured.");
  if (!Buffer.isBuffer(rawBody) || !verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
    throw new Error("The webhook signature could not be verified.");
  }
  const event = JSON.parse(rawBody.toString("utf8"));
  if (event.event !== "payment.captured") return { ignored: true };
  const paymentEntity = event.payload?.payment?.entity;
  const db = await getDb();
  if (!db) throw new Error("Payment storage is unavailable.");
  const orderRows = await db.select({ businessId: payments.businessId }).from(payments).where(and(
    eq(payments.provider, "razorpay"),
    eq(payments.providerOrderId, paymentEntity?.order_id),
  )).limit(1);
  if (!orderRows[0]) return { ignored: true };
  return settleCapturedPayment(paymentEntity, orderRows[0].businessId);
}
