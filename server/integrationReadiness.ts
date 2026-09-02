import { eq } from "drizzle-orm";
import { z } from "zod";
import { adminAuditEvents, integrationSettings } from "../drizzle/schema";
import { getDb } from "./db";

export type ReadinessState = "ready" | "not_configured";

function state(required: string[]) {
  const configured = required.filter(value => Boolean(process.env[value]));
  return {
    status: configured.length === required.length ? "ready" as const : "not_configured" as const,
    configuredCount: configured.length,
    requiredCount: required.length,
  };
}

export const integrationSettingsSchema = z.object({
  integrationType: z.enum(["email", "gst_provider", "razorpay", "upi"]),
  displayName: z.string().trim().min(2).max(120),
  publicIdentifier: z.string().trim().max(320).optional(),
  apiBaseUrl: z.string().trim().url().max(500).optional(),
  webhookUrl: z.string().trim().url().max(500).optional(),
  readinessNote: z.string().trim().max(1000).optional(),
}).superRefine((value, context) => {
  for (const field of ["apiBaseUrl", "webhookUrl"] as const) {
    const candidate = value[field];
    if (!candidate) continue;
    const parsed = new URL(candidate);
    if (parsed.username || parsed.password) context.addIssue({ code: "custom", path: [field], message: "URLs cannot contain embedded credentials." });
  }
});

export const integrationTypes = ["email", "gst_provider", "razorpay", "upi"] as const;

export function getIntegrationReadiness() {
  return {
    email: {
      name: "Decision email delivery",
      ...state(["EMAIL_FROM", "RESEND_API_KEY"]),
      boundary: "In-app notices remain active. Email rows stay suppressed until an authenticated sender is configured.",
      requirements: ["Verified sender address", "Authenticated email provider key", "Delivery and bounce monitoring"],
    },
    gstProvider: {
      name: "Authorized GST provider",
      ...state(["GST_PROVIDER_NAME", "GST_PROVIDER_API_URL", "GST_PROVIDER_API_KEY"]),
      boundary: "Preparation and review are available now. Government filing is never claimed without an authorized provider response and official reference.",
      requirements: ["Selected authorized provider/GSP", "Provider endpoint and credentials", "Server-side idempotency and response verification"],
    },
    razorpay: {
      name: "Razorpay payments",
      ...state(["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET"]),
      boundary: "No checkout, order, payment, refund, or subscription status is activated while credentials and verified webhook handling are absent.",
      requirements: ["Live Razorpay account", "Server-only API credentials", "Verified webhook endpoint and signature checks"],
    },
    upi: {
      name: "Merchant UPI / Google Pay",
      ...state(["MERCHANT_UPI_ID", "MERCHANT_LEGAL_PAYEE_NAME", "UPI_PAYMENT_STATUS_API_URL"]),
      boundary: "No QR is rendered and no scan or redirect is treated as payment confirmation without a merchant-controlled, server-verifiable status source.",
      requirements: ["Merchant-controlled UPI ID", "Verified legal payee name", "Unique reference and server-verifiable payment status"],
    },
  };
}

export async function listIntegrationSettings() {
  const db = await getDb();
  const rows = db ? await db.select().from(integrationSettings) : [];
  const readiness = getIntegrationReadiness();
  return integrationTypes.map(type => {
    const row = rows.find(candidate => candidate.integrationType === type);
    const key = type === "gst_provider" ? "gstProvider" : type;
    const base = readiness[key as keyof typeof readiness];
    const metadataComplete = type === "email" ? Boolean(row?.publicIdentifier) : type === "gst_provider" ? Boolean(row?.publicIdentifier && row?.apiBaseUrl) : type === "razorpay" ? Boolean(row?.webhookUrl) : Boolean(row?.publicIdentifier);
    return { type, ...base, metadataComplete, settings: row ? { id: row.id, displayName: row.displayName, publicIdentifier: row.publicIdentifier, apiBaseUrl: row.apiBaseUrl, webhookUrl: row.webhookUrl, readinessNote: row.readinessNote, updatedAt: row.updatedAt } : null };
  });
}

export async function saveIntegrationSettings(actorUserId: number, input: z.infer<typeof integrationSettingsSchema>) {
  const db = await getDb();
  if (!db) {
    return (await listIntegrationSettings()).find(item => item.type === input.integrationType);
  }
  const values = { ...input, publicIdentifier: input.publicIdentifier || null, apiBaseUrl: input.apiBaseUrl || null, webhookUrl: input.webhookUrl || null, readinessNote: input.readinessNote || null, updatedByUserId: actorUserId };
  await db.transaction(async tx => {
    const existing = await tx.select({ id: integrationSettings.id }).from(integrationSettings).where(eq(integrationSettings.integrationType, input.integrationType)).limit(1);
    if (existing[0]) await tx.update(integrationSettings).set(values).where(eq(integrationSettings.id, existing[0].id));
    else await tx.insert(integrationSettings).values(values);
    await tx.insert(adminAuditEvents).values({ actorUserId, action: "INTEGRATION_SETTINGS_UPDATED", entityType: "integrationSettings", entityId: input.integrationType, metadata: JSON.stringify({ displayName: input.displayName, hasPublicIdentifier: Boolean(input.publicIdentifier), hasApiBaseUrl: Boolean(input.apiBaseUrl), hasWebhookUrl: Boolean(input.webhookUrl) }) });
  });
  return (await listIntegrationSettings()).find(item => item.type === input.integrationType);
}

export type IntegrationReadiness = ReturnType<typeof getIntegrationReadiness>;
