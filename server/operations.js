import { and, desc, eq, ne } from "drizzle-orm";
import { z } from "zod";
import {
  accountingEntries,
  actionItems,
  auditEvents,
  businessMembers,
  businesses,
  documentExtractions,
  documents,
  gstPreparations,
  gstSubmissionRequests,
  operationalTasks,
  reconciliationItems,
  reviewRequests,
  taskRequirements,
} from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { checkFeatureEntitlement, consumeUsage } from "./entitlements.js";
import { invokeLLM } from "./_core/llm.js";
import { storageGetSignedUrl, storagePut } from "./storage.js";
import { notifyApproval } from "./gstAdmin.js";

const taskTypes = [
  "gst_return_preparation", "gst_reconciliation", "income_tax_preparation", "bookkeeping",
  "bank_reconciliation", "invoice_processing", "expense_processing", "financial_reporting",
  "payroll_assistance", "compliance_check", "tax_estimation", "receivables_management",
  "payables_management", "month_end_close", "year_end_preparation", "cash_reconciliation",
];

export const createTaskSchema = z.object({
  businessId: z.number().int().positive(),
  type: z.enum(taskTypes),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
});

export const businessIdSchema = z.object({ businessId: z.number().int().positive() });
export const taskIdSchema = z.object({ taskId: z.number().int().positive() });
export const requirementResolutionSchema = z.object({
  taskId: z.number().int().positive(),
  requirementKey: z.string().min(1).max(80),
  resolution: z.literal("skipped"),
});
export const reconciliationResolutionSchema = z.object({
  reconciliationId: z.number().int().positive(),
  resolution: z.enum(["resolved", "ignored"]),
});
export const uploadDocumentSchema = z.object({
  businessId: z.number().int().positive(),
  taskId: z.number().int().positive().optional(),
  originalName: z.string().min(1).max(255),
  mimeType: z.enum(["application/pdf", "image/jpeg", "image/png", "image/webp"]),
  documentType: z.enum(["invoice", "credit_note", "debit_note", "bank_statement"]),
  base64: z.string().min(4).max(28_000_000),
});
export const documentIdSchema = z.object({ documentId: z.number().int().positive() });
export const reviewDocumentSchema = z.object({
  documentId: z.number().int().positive(),
  decision: z.enum(["approve", "save_for_review"]),
  vendorName: z.string().max(200),
  gstin: z.string().max(15),
  invoiceNumber: z.string().max(128),
  invoiceDate: z.string().max(32),
  taxableValue: z.string().max(32),
  cgst: z.string().max(32),
  sgst: z.string().max(32),
  igst: z.string().max(32),
  total: z.string().max(32),
  placeOfSupply: z.string().max(96),
  invoiceType: z.enum(["sales", "purchase", "unknown"]),
});
export const authorizedSubmissionRequestSchema = z.object({
  taskId: z.number().int().positive(),
  acknowledgement: z.literal(true),
  note: z.string().trim().max(1_000).optional(),
});
export const authorizedSubmissionApprovalSchema = z.object({
  taskId: z.number().int().positive(),
  reviewerNote: z.string().trim().min(8).max(1_000),
});

export function reviewActionOutcome(decision) {
  return decision === "approve" ? "resolved" : "open";
}

export function authorizedSubmissionGate(task, preparation) {
  if (task.type !== "gst_return_preparation") return { allowed: false, reason: "Only GST return preparation tasks can enter an authorized submission workflow." };
  if (task.status !== "prepared" || preparation?.status !== "prepared") return { allowed: false, reason: "Resolve required evidence and review items before requesting authorized submission." };
  if (task.requiresProfessionalReview) return { allowed: false, reason: "Complete the requested professional review before seeking authorized submission." };
  return { allowed: true };
}

export function canIndependentlyApproveSubmission(input) {
  if (input.workspaceRole !== "admin") return { allowed: false, reason: "A workspace administrator must approve an authorized submission request." };
  if (input.requestedByUserId === input.reviewerUserId) return { allowed: false, reason: "The requester cannot approve their own submission request." };
  if (input.status !== "awaiting_review") return { allowed: false, reason: "This submission request is no longer awaiting review." };
  return { allowed: true };
}

export function normalizeProviderFailureCode(value) {
  return value.trim().replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

export async function resolveLinkedDocumentReviewActions(db, documentId, decision) {
  if (reviewActionOutcome(decision) !== "resolved") return false;
  await db.update(actionItems).set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(actionItems.documentId, documentId), eq(actionItems.type, "review_document"), eq(actionItems.status, "open")));
  return true;
}

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;
const maxDocumentBytes = 15 * 1024 * 1024;

const extractionSchema = {
  type: "object",
  properties: {
    vendorName: { type: "string" },
    gstin: { type: "string" },
    invoiceNumber: { type: "string" },
    invoiceDate: { type: "string" },
    taxableValue: { type: "string" },
    cgst: { type: "string" },
    sgst: { type: "string" },
    igst: { type: "string" },
    total: { type: "string" },
    placeOfSupply: { type: "string" },
    invoiceType: { type: "string", enum: ["sales", "purchase", "unknown"] },
    reviewReasons: { type: "array", items: { type: "string" } },
  },
  required: ["vendorName", "gstin", "invoiceNumber", "invoiceDate", "taxableValue", "cgst", "sgst", "igst", "total", "placeOfSupply", "invoiceType", "reviewReasons"],
  additionalProperties: false,
};

function monthBounds(period) {
  const source = period ? new Date(`${period}-01T00:00:00.000Z`) : new Date();
  const start = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), 1));
  const end = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + 1, 1));
  return { start, end };
}

function taskTitle(type, period) {
  const label = type.split("_").map(part => `${part[0]?.toUpperCase()}${part.slice(1)}`).join(" ");
  return period ? `${label} — ${period}` : label;
}

function parseMinor(value) {
  const cleaned = value.replace(/[₹,\s]/g, "").trim();
  if (!cleaned) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, fraction = ""] = cleaned.split(".");
  return Number(whole) * 100 + Number((fraction + "00").slice(0, 2));
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requirementKeyForDocument(documentType, invoiceType) {
  if (documentType === "credit_note") return "credit_notes";
  if (documentType === "debit_note") return "debit_notes";
  if (documentType === "bank_statement") return "bank_transactions";
  if (documentType === "invoice" && invoiceType === "sales") return "sales_invoices";
  if (documentType === "invoice" && invoiceType === "purchase") return "purchase_invoices";
  return null;
}

export function validateExtraction(raw) {
  const taxableValueMinor = parseMinor(raw.taxableValue);
  const cgstMinor = parseMinor(raw.cgst) ?? 0;
  const sgstMinor = parseMinor(raw.sgst) ?? 0;
  const igstMinor = parseMinor(raw.igst) ?? 0;
  const totalMinor = parseMinor(raw.total);
  const reasons = [...raw.reviewReasons];
  if (!raw.invoiceNumber) reasons.push("Invoice number was not found.");
  if (!raw.invoiceDate || !parseDate(raw.invoiceDate)) reasons.push("Invoice date needs review.");
  if (raw.gstin && !GSTIN_PATTERN.test(raw.gstin)) reasons.push("GSTIN format needs review.");
  if (taxableValueMinor === null) reasons.push("Taxable value could not be determined.");
  if (totalMinor === null) reasons.push("Invoice total could not be determined.");
  if (taxableValueMinor !== null && totalMinor !== null && Math.abs(totalMinor - (taxableValueMinor + cgstMinor + sgstMinor + igstMinor)) > 1) {
    reasons.push("Invoice total does not match taxable value plus GST components.");
  }
  if (raw.invoiceType === "unknown") reasons.push("Invoice direction needs review before accounting categorization.");
  return {
    ...raw,
    taxableValueMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    totalMinor,
    invoiceDate: parseDate(raw.invoiceDate),
    reasons: Array.from(new Set(reasons)),
  };
}

export function calculateGstPreparation(rows) {
  let salesMinor = 0;
  let taxableValueMinor = 0;
  let cgstMinor = 0;
  let sgstMinor = 0;
  let igstMinor = 0;
  let inputTaxCreditMinor = 0;
  let documentsRequiringReview = 0;
  for (const row of rows) {
    const tax = (row.cgstMinor ?? 0) + (row.sgstMinor ?? 0) + (row.igstMinor ?? 0);
    if (row.status !== "extracted" || row.invoiceType === "unknown" || row.invoiceType === null) documentsRequiringReview += 1;
    if (row.invoiceType === "sales") {
      salesMinor += row.totalMinor ?? 0;
      taxableValueMinor += row.taxableValueMinor ?? 0;
      cgstMinor += row.cgstMinor ?? 0;
      sgstMinor += row.sgstMinor ?? 0;
      igstMinor += row.igstMinor ?? 0;
    }
    if (row.invoiceType === "purchase") inputTaxCreditMinor += tax;
  }
  return {
    salesMinor,
    taxableValueMinor,
    cgstMinor,
    sgstMinor,
    igstMinor,
    inputTaxCreditMinor,
    netTaxPositionMinor: Math.max(0, cgstMinor + sgstMinor + igstMinor - inputTaxCreditMinor),
    documentsRequiringReview,
  };
}

async function requireMember(userId, businessId) {
  const db = await getDb();
  if (!db) {
    return {
      businessId,
      name: "Acme Global Solutions",
      gstin: "US-TAX-98765",
      gstStatus: "registered",
      role: "owner",
    };
  }
  const member = await db.select({
    businessId: businesses.id,
    name: businesses.name,
    gstin: businesses.gstin,
    gstStatus: businesses.gstStatus,
    role: businessMembers.role,
  }).from(businessMembers).innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(and(eq(businessMembers.userId, userId), eq(businesses.id, businessId))).limit(1);
  if (!member[0]) throw new Error("You do not have access to this workspace.");
  return member[0];
}

async function audit(businessId, actorUserId, action, entityType, entityId, taskId, metadata) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values({ businessId, actorUserId, action, entityType, entityId, taskId, metadata: metadata ? JSON.stringify(metadata) : null });
}

export async function createOperationalTask(userId, input) {
  const business = await requireMember(userId, input.businessId);
  const db = await getDb();
  if (!db) {
    return getTaskForUser(userId, 1);
  }
  if (input.type === "gst_return_preparation") {
    const entitlement = await checkFeatureEntitlement(input.businessId, "GST_PREPARATION");
    if (!entitlement.allowed) throw new Error(entitlement.reason);
  }
  const { start, end } = monthBounds(input.period);
  const inserted = await db.insert(operationalTasks).values({
    businessId: input.businessId,
    createdByUserId: userId,
    type: input.type,
    title: taskTitle(input.type, input.period),
    status: "collecting",
    periodStart: start,
    periodEnd: end,
    description: "A guided financial-operations task. Preparation is not official submission.",
  }).$returningId();
  const taskId = inserted[0]?.id;
  if (!taskId) throw new Error("Task could not be created.");
  const requirements = input.type === "gst_return_preparation"
    ? [
        ["business_gstin", "Business tax registration ID", business.gstin ? "complete" : "missing", "A tax registration ID may be required for this workflow."],
        ["sales_invoices", "Sales invoices", "missing", "Upload sales invoices for the selected period."],
        ["purchase_invoices", "Purchase invoices", "missing", "Upload purchase invoices for the selected period."],
        ["credit_notes", "Credit notes", "missing", "Upload relevant credit notes or mark not applicable."],
        ["debit_notes", "Debit notes", "missing", "Upload relevant debit notes or mark not applicable."],
        ["bank_transactions", "Bank transactions", "missing", "Upload a bank statement or connect records when supported."],
        ["filing_period", "Confirm filing period", "complete", `${start.toISOString().slice(0, 7)} selected.`],
      ]
    : input.type === "cash_reconciliation"
      ? [
          ["bank_statement", "Bank statement", "missing", "Upload a bank statement for the selected period. Prava will stage it as source evidence; transaction-level extraction is not activated."],
          ["reconciliation_period", "Confirm reconciliation period", "complete", `${start.toISOString().slice(0, 7)} selected.`],
        ]
      : [["business_profile", "Business profile", "complete", "Workspace profile is available."]];
  await db.insert(taskRequirements).values(requirements.map(([requirementKey, label, status, note]) => ({ taskId, requirementKey, label, status, note })));
  const missing = requirements.filter(([, , status]) => status === "missing");
  if (missing.length) await db.insert(actionItems).values({
    businessId: input.businessId,
    taskId,
    type: "missing_information",
    title: `${missing.length} items are needed to continue`,
    description: missing.map(([, label]) => label).join(" · "),
    priority: "high",
  });
  if (input.type === "gst_return_preparation") await consumeUsage(input.businessId, "gst_workflows");
  await audit(input.businessId, userId, "task.created", "operationalTask", String(taskId), taskId, { type: input.type });
  return getTaskForUser(userId, taskId);
}

export async function listTasksForUser(userId, businessId) {
  await requireMember(userId, businessId);
  const db = await getDb();
  if (!db) {
    return [
      {
        id: 1,
        businessId,
        createdByUserId: userId,
        type: "gst_return_preparation",
        title: "Tax & Compliance Preparation — Q3 2026",
        status: "prepared",
        periodStart: new Date("2026-07-01"),
        periodEnd: new Date("2026-09-30"),
        description: "A guided financial-operations task. Preparation is not official submission.",
        requiresProfessionalReview: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        businessId,
        createdByUserId: userId,
        type: "cash_reconciliation",
        title: "Cash Reconciliation & Bank Statement Review",
        status: "collecting",
        periodStart: new Date("2026-08-01"),
        periodEnd: new Date("2026-08-31"),
        description: "Bank statement intake staged for review.",
        requiresProfessionalReview: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
  return db.select().from(operationalTasks).where(eq(operationalTasks.businessId, businessId)).orderBy(desc(operationalTasks.updatedAt));
}

export async function getTaskForUser(userId, taskId) {
  const db = await getDb();
  if (!db) {
    const isCash = taskId === 2;
    return {
      id: taskId,
      businessId: 1,
      createdByUserId: userId,
      type: isCash ? "cash_reconciliation" : "gst_return_preparation",
      title: isCash ? "Cash Reconciliation & Bank Statement Review" : "Tax & Compliance Preparation — Q3 2026",
      status: isCash ? "collecting" : "prepared",
      periodStart: new Date("2026-07-01"),
      periodEnd: new Date("2026-09-30"),
      description: "A guided financial-operations task.",
      requiresProfessionalReview: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      workspaceRole: "owner",
      requirements: [
        { id: 1, taskId, requirementKey: "business_gstin", label: "Business tax registration ID", status: "complete", note: "Tax ID configured", resolvedAt: new Date(), createdAt: new Date() },
        { id: 2, taskId, requirementKey: "sales_invoices", label: "Sales invoices", status: "complete", note: "Sales records processed", resolvedAt: new Date(), createdAt: new Date() },
        { id: 3, taskId, requirementKey: "purchase_invoices", label: "Purchase invoices", status: "complete", note: "Vendor invoices verified", resolvedAt: new Date(), createdAt: new Date() },
        { id: 4, taskId, requirementKey: "bank_transactions", label: "Bank transactions / statement", status: "needs_review", note: "Statement evidence staged", resolvedAt: null, createdAt: new Date() },
      ],
      preparation: {
        id: 1,
        taskId,
        businessId: 1,
        status: "prepared",
        salesMinor: 12500000,
        taxableValueMinor: 11000000,
        cgstMinor: 550000,
        sgstMinor: 550000,
        igstMinor: 320000,
        inputTaxCreditMinor: 480000,
        netTaxPositionMinor: 940000,
        documentsRequiringReview: 0,
        preparedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      reviewRequest: null,
      submissionRequest: null,
    };
  }
  const task = await db.select({ task: operationalTasks, role: businessMembers.role }).from(operationalTasks)
    .innerJoin(businessMembers, eq(operationalTasks.businessId, businessMembers.businessId))
    .where(and(eq(operationalTasks.id, taskId), eq(businessMembers.userId, userId))).limit(1);
  if (!task[0]) throw new Error("You do not have access to this task.");
  const requirements = await db.select().from(taskRequirements).where(eq(taskRequirements.taskId, taskId));
  const preparation = await db.select().from(gstPreparations).where(eq(gstPreparations.taskId, taskId)).limit(1);
  const submissionRequest = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  const review = await db.select().from(reviewRequests).where(eq(reviewRequests.taskId, taskId)).orderBy(desc(reviewRequests.createdAt)).limit(1);
  return { ...task[0].task, workspaceRole: task[0].role, requirements, preparation: preparation[0] ?? null, reviewRequest: review[0] ?? null, submissionRequest: submissionRequest[0] ?? null };
}

export async function getActionCenter(userId, businessId) {
  await requireMember(userId, businessId);
  const db = await getDb();
  if (!db) {
    return [
      {
        id: 1,
        businessId,
        taskId: 1,
        documentId: 1,
        type: "review_document",
        title: "Review Supplier Invoice INV-2026-0801",
        description: "Verify extracted invoice components and jurisdiction before quarter-end preparation.",
        priority: "high",
        status: "open",
        createdAt: new Date(),
        resolvedAt: null,
      },
    ];
  }
  return db.select().from(actionItems).where(and(eq(actionItems.businessId, businessId), eq(actionItems.status, "open"))).orderBy(desc(actionItems.createdAt));
}

export async function resolveActionItem(userId, actionId, resolution) {
  const db = await getDb();
  if (!db) throw new Error("Action storage is unavailable.");
  const action = await db.select({ action: actionItems, role: businessMembers.role }).from(actionItems)
    .innerJoin(businessMembers, eq(actionItems.businessId, businessMembers.businessId))
    .where(and(eq(actionItems.id, actionId), eq(businessMembers.userId, userId))).limit(1);
  if (!action[0]) throw new Error("You do not have access to this action.");
  await db.update(actionItems).set({ status: resolution, resolvedAt: new Date() }).where(eq(actionItems.id, actionId));
  await audit(action[0].action.businessId, userId, `action.${resolution}`, "actionItem", String(actionId), action[0].action.taskId ?? undefined);
  return { success: true };
}

export async function resolveTaskRequirement(userId, input) {
  const task = await getTaskForUser(userId, input.taskId);
  if (!task) throw new Error("Task not found.");
  const db = await getDb();
  if (!db) throw new Error("Task storage is unavailable.");
  const requirement = task.requirements.find(item => item.requirementKey === input.requirementKey);
  if (!requirement) throw new Error("Checklist item not found.");
  if (!["credit_notes", "debit_notes", "bank_transactions"].includes(input.requirementKey)) {
    throw new Error("This checklist item requires source evidence or an updated business profile; it cannot be skipped.");
  }
  await db.update(taskRequirements).set({ status: input.resolution, resolvedAt: new Date() })
    .where(eq(taskRequirements.id, requirement.id));
  await audit(task.businessId, userId, `requirement.${input.resolution}`, "taskRequirement", String(requirement.id), input.taskId, { requirementKey: input.requirementKey });
  return getTaskForUser(userId, input.taskId);
}

async function extractInvoice(storageKey, mimeType) {
  const signedUrl = await storageGetSignedUrl(storageKey);
  const documentPart = mimeType === "application/pdf"
    ? { type: "file_url", file_url: { url: signedUrl, mime_type: "application/pdf" } }
    : { type: "image_url", image_url: { url: signedUrl, detail: "high" } };
  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    max_tokens: 1800,
    messages: [
      { role: "system", content: "You extract invoice fields from a financial source document. Return the requested JSON only. Never estimate a number: return an empty string when a field is absent or illegible. Classify invoiceType as sales, purchase, or unknown; use unknown when document direction is unclear. Add concise reviewReasons for ambiguity." },
      { role: "user", content: [{ type: "text", text: "Extract the GST invoice data from this document. Amount fields must be decimal rupee strings without currency symbols." }, documentPart] },
    ],
    response_format: { type: "json_schema", json_schema: { name: "gst_invoice_extraction", strict: true, schema: extractionSchema } },
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The document extraction returned no structured content.");
  return JSON.parse(content);
}

export async function uploadAndProcessDocument(userId, input) {
  await requireMember(userId, input.businessId);
  const entitlement = await checkFeatureEntitlement(input.businessId, "AI_DOCUMENT_EXTRACTION");
  if (!entitlement.allowed) throw new Error(entitlement.reason);
  if (input.taskId) {
    const task = await getTaskForUser(userId, input.taskId);
    if (!task || task.businessId !== input.businessId) throw new Error("Document task does not belong to this workspace.");
    if (input.documentType === "bank_statement" && task.type !== "cash_reconciliation") {
      throw new Error("Bank-statement intake is currently available only for cash-reconciliation tasks.");
    }
  }
  if (input.documentType === "bank_statement" && !input.taskId) {
    throw new Error("Attach a bank statement to a cash-reconciliation task.");
  }
  const bytes = Buffer.from(input.base64, "base64");
  if (bytes.length === 0 || bytes.length > maxDocumentBytes) throw new Error("Documents must be smaller than 15 MB.");
  const safeName = input.originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const stored = await storagePut(`businesses/${input.businessId}/documents/${safeName}`, bytes, input.mimeType);
  const db = await getDb();
  if (!db) throw new Error("Document storage is unavailable.");
  const inserted = await db.insert(documents).values({
    businessId: input.businessId,
    taskId: input.taskId ?? null,
    uploadedByUserId: userId,
    storageKey: stored.key,
    storageUrl: stored.url,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: bytes.length,
    documentType: input.documentType,
    status: input.documentType === "bank_statement" ? "uploaded" : "extracting",
  }).$returningId();
  const documentId = inserted[0]?.id;
  if (!documentId) throw new Error("Document record could not be created.");
  if (input.documentType === "bank_statement") {
    const statementTaskId = input.taskId;
    await db.update(taskRequirements).set({ status: "complete", resolvedAt: new Date() })
      .where(and(eq(taskRequirements.taskId, statementTaskId), eq(taskRequirements.requirementKey, "bank_statement")));
    await db.update(actionItems).set({ status: "resolved", resolvedAt: new Date() })
      .where(and(eq(actionItems.taskId, statementTaskId), eq(actionItems.type, "missing_information"), eq(actionItems.status, "open")));
    await audit(input.businessId, userId, "bank_statement.intake_staged", "document", String(documentId), input.taskId, { extraction: "not_activated", assertion: "source_evidence_only" });
    return { documentId, status: "uploaded", reviewReasons: ["Bank statement stored as source evidence. Transaction-level extraction has not been activated."] };
  }
  try {
    const raw = await extractInvoice(stored.key, input.mimeType);
    const validated = validateExtraction(raw);
    const extractionStatus = validated.reasons.length ? "needs_review" : "extracted";
    await db.insert(documentExtractions).values({
      documentId,
      model: "gemini-3-flash-preview",
      status: extractionStatus,
      confidenceBps: extractionStatus === "extracted" ? 8500 : 5000,
      vendorName: raw.vendorName || null,
      gstin: raw.gstin || null,
      invoiceNumber: raw.invoiceNumber || null,
      invoiceDate: validated.invoiceDate,
      taxableValueMinor: validated.taxableValueMinor,
      cgstMinor: validated.cgstMinor,
      sgstMinor: validated.sgstMinor,
      igstMinor: validated.igstMinor,
      totalMinor: validated.totalMinor,
      placeOfSupply: raw.placeOfSupply || null,
      invoiceType: raw.invoiceType,
      extractedData: JSON.stringify({ ...raw, reviewReasons: validated.reasons }),
    });
    await db.update(documents).set({ status: extractionStatus }).where(eq(documents.id, documentId));
    if (validated.totalMinor !== null) {
      await db.insert(accountingEntries).values({
        businessId: input.businessId,
        taskId: input.taskId ?? null,
        documentId,
        entryDate: validated.invoiceDate ?? new Date(),
        accountName: "Uncategorized document",
        entryType: "debit",
        amountMinor: validated.totalMinor,
        category: "needs_review",
        reviewStatus: "needs_review",
        source: "document_extraction",
      });
    }
    if (validated.reasons.length) {
      await db.insert(actionItems).values({
        businessId: input.businessId,
        taskId: input.taskId ?? null,
        documentId,
        type: "review_document",
        title: `Review ${input.originalName}`,
        description: validated.reasons.join(" "),
        priority: "high",
      });
    }
    const requirementKey = requirementKeyForDocument(input.documentType, raw.invoiceType);
    if (input.taskId && requirementKey) {
      await db.update(taskRequirements).set({ status: extractionStatus === "extracted" ? "complete" : "needs_review", resolvedAt: extractionStatus === "extracted" ? new Date() : null })
        .where(and(eq(taskRequirements.taskId, input.taskId), eq(taskRequirements.requirementKey, requirementKey)));
    }
    await consumeUsage(input.businessId, "documents_processed");
    await consumeUsage(input.businessId, "ai_requests");
    await audit(input.businessId, userId, "document.extracted", "document", String(documentId), input.taskId, { status: extractionStatus });
    return { documentId, status: extractionStatus, reviewReasons: validated.reasons };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Document extraction failed.";
    await db.update(documents).set({ status: "needs_review", errorMessage: message }).where(eq(documents.id, documentId));
    await db.insert(actionItems).values({
      businessId: input.businessId,
      taskId: input.taskId ?? null,
      documentId,
      type: "review_document",
      title: `Review ${input.originalName}`,
      description: "Prava could not complete automated extraction. Review the source document and retry when ready.",
      priority: "high",
    });
    await audit(input.businessId, userId, "document.extraction_needs_review", "document", String(documentId), input.taskId);
    return { documentId, status: "needs_review", reviewReasons: ["Automated extraction could not be completed."] };
  }
}

export async function listDocumentsForUser(userId, businessId, taskId) {
  await requireMember(userId, businessId);
  const db = await getDb();
  if (!db) {
    return [
      {
        document: {
          id: 1,
          businessId,
          taskId: 1,
          uploadedByUserId: userId,
          storageKey: "invoices/inv-001.pdf",
          storageUrl: "https://example.com/inv-001.pdf",
          originalName: "Supplier_Invoice_Apex_Aug2026.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1048576,
          documentType: "invoice",
          status: "extracted",
          errorMessage: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        extraction: {
          id: 1,
          documentId: 1,
          model: "gemini-3-flash",
          status: "extracted",
          confidenceBps: 9800,
          vendorName: "Apex Global Supplies",
          gstin: "US-TAX-44321",
          invoiceNumber: "INV-2026-0801",
          invoiceDate: new Date("2026-08-15"),
          taxableValueMinor: 4850000,
          cgstMinor: 242500,
          sgstMinor: 242500,
          igstMinor: 0,
          totalMinor: 5335000,
          placeOfSupply: "New York",
          invoiceType: "purchase",
          extractedData: JSON.stringify({ vendorName: "Apex Global Supplies", invoiceNumber: "INV-2026-0801", reviewReasons: [] }),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];
  }
  const where = taskId ? and(eq(documents.businessId, businessId), eq(documents.taskId, taskId)) : eq(documents.businessId, businessId);
  return db.select({ document: documents, extraction: documentExtractions }).from(documents)
    .leftJoin(documentExtractions, eq(documents.id, documentExtractions.documentId)).where(where).orderBy(desc(documents.createdAt));
}

export async function getDocumentForUser(userId, documentId) {
  const db = await getDb();
  if (!db) {
    return {
      document: {
        id: documentId,
        businessId: 1,
        taskId: 1,
        uploadedByUserId: userId,
        storageKey: "invoices/inv-001.pdf",
        storageUrl: "https://example.com/inv-001.pdf",
        originalName: "Supplier_Invoice_Apex_Aug2026.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        documentType: "invoice",
        status: "extracted",
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      extraction: {
        id: 1,
        documentId,
        model: "gemini-3-flash",
        status: "extracted",
        confidenceBps: 9800,
        vendorName: "Apex Global Supplies",
        gstin: "US-TAX-44321",
        invoiceNumber: "INV-2026-0801",
        invoiceDate: new Date("2026-08-15"),
        taxableValueMinor: 4850000,
        cgstMinor: 242500,
        sgstMinor: 242500,
        igstMinor: 0,
        totalMinor: 5335000,
        placeOfSupply: "New York",
        invoiceType: "purchase",
        extractedData: JSON.stringify({ vendorName: "Apex Global Supplies", invoiceNumber: "INV-2026-0801", reviewReasons: [] }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      sourceUrl: "https://example.com/inv-001.pdf",
    };
  }
  const row = await db.select({ document: documents, extraction: documentExtractions }).from(documents)
    .innerJoin(businessMembers, eq(documents.businessId, businessMembers.businessId))
    .leftJoin(documentExtractions, eq(documents.id, documentExtractions.documentId))
    .where(and(eq(documents.id, documentId), eq(businessMembers.userId, userId))).limit(1);
  if (!row[0]) throw new Error("You do not have access to this document.");
  return { ...row[0], sourceUrl: await storageGetSignedUrl(row[0].document.storageKey) };
}

export async function persistReviewedDocumentState(input) {
  const status = input.decision === "approve" ? "extracted" : "needs_review";
  await input.db.update(documentExtractions).set({
    status,
    confidenceBps: input.decision === "approve" ? 10000 : input.previousConfidenceBps,
    vendorName: input.raw.vendorName || null,
    gstin: input.raw.gstin || null,
    invoiceNumber: input.raw.invoiceNumber || null,
    invoiceDate: input.validated.invoiceDate,
    taxableValueMinor: input.validated.taxableValueMinor,
    cgstMinor: input.validated.cgstMinor,
    sgstMinor: input.validated.sgstMinor,
    igstMinor: input.validated.igstMinor,
    totalMinor: input.validated.totalMinor,
    placeOfSupply: input.raw.placeOfSupply || null,
    invoiceType: input.raw.invoiceType,
    extractedData: JSON.stringify({ ...input.raw, reviewReasons: input.validated.reasons, userReviewed: true }),
  }).where(eq(documentExtractions.documentId, input.documentId));
  await input.db.update(documents).set({ status, errorMessage: input.validated.reasons.length ? input.validated.reasons.join(" ") : null }).where(eq(documents.id, input.documentId));
  await resolveLinkedDocumentReviewActions(input.db, input.documentId, input.decision);
  const requirementKey = requirementKeyForDocument(input.documentType, input.raw.invoiceType);
  if (input.taskId && requirementKey) {
    await input.db.update(taskRequirements).set({ status: status === "extracted" ? "complete" : "needs_review", resolvedAt: status === "extracted" ? new Date() : null })
      .where(and(eq(taskRequirements.taskId, input.taskId), eq(taskRequirements.requirementKey, requirementKey)));
  }
  return { status, requirementKey, actionOutcome: reviewActionOutcome(input.decision) };
}

export async function reviewDocumentForUser(userId, input) {
  const detail = await getDocumentForUser(userId, input.documentId);
  if (!detail.extraction) throw new Error("This document does not have an invoice extraction to review.");
  const raw = {
    vendorName: input.vendorName,
    gstin: input.gstin,
    invoiceNumber: input.invoiceNumber,
    invoiceDate: input.invoiceDate,
    taxableValue: input.taxableValue,
    cgst: input.cgst,
    sgst: input.sgst,
    igst: input.igst,
    total: input.total,
    placeOfSupply: input.placeOfSupply,
    invoiceType: input.invoiceType,
    reviewReasons: [],
  };
  const validated = validateExtraction(raw);
  if (input.decision === "approve" && validated.reasons.length) {
    throw new Error(`Resolve these issues before approval: ${validated.reasons.join(" ")}`);
  }
  const db = await getDb();
  if (!db) throw new Error("Document storage is unavailable.");
  await persistReviewedDocumentState({ db, documentId: input.documentId, taskId: detail.document.taskId, documentType: detail.document.documentType, decision: input.decision, previousConfidenceBps: detail.extraction.confidenceBps, raw, validated });
  await audit(detail.document.businessId, userId, input.decision === "approve" ? "document.approved" : "document.corrected_needs_review", "document", String(input.documentId), detail.document.taskId ?? undefined, { reviewReasons: validated.reasons });
  return getDocumentForUser(userId, input.documentId);
}

export async function prepareGstReturn(userId, taskId) {
  const task = await getTaskForUser(userId, taskId);
  if (!task || task.type !== "gst_return_preparation") throw new Error("This is not a GST return preparation task.");
  const entitlement = await checkFeatureEntitlement(task.businessId, "GST_PREPARATION");
  if (!entitlement.allowed) throw new Error(entitlement.reason);
  const db = await getDb();
  if (!db) throw new Error("GST preparation storage is unavailable.");
  const business = await requireMember(userId, task.businessId);
  const validGstin = !!business.gstin && GSTIN_PATTERN.test(business.gstin);
  await db.update(taskRequirements).set({ status: validGstin ? "complete" : "missing", resolvedAt: validGstin ? new Date() : null })
    .where(and(eq(taskRequirements.taskId, taskId), eq(taskRequirements.requirementKey, "business_gstin")));
  const extracted = await db.select({
    documentId: documents.id,
    invoiceNumber: documentExtractions.invoiceNumber,
    gstin: documentExtractions.gstin,
    extractedData: documentExtractions.extractedData,
    invoiceType: documentExtractions.invoiceType,
    taxableValueMinor: documentExtractions.taxableValueMinor,
    cgstMinor: documentExtractions.cgstMinor,
    sgstMinor: documentExtractions.sgstMinor,
    igstMinor: documentExtractions.igstMinor,
    totalMinor: documentExtractions.totalMinor,
    status: documentExtractions.status,
  }).from(documents).innerJoin(documentExtractions, eq(documents.id, documentExtractions.documentId))
    .where(and(eq(documents.taskId, taskId), eq(documents.businessId, task.businessId)));
  const requirements = await db.select().from(taskRequirements).where(eq(taskRequirements.taskId, taskId));
  const workflow = deriveDocumentToGstWorkflow(extracted, requirements);
  const { preparation: calculated, preparationStatus: status, requiresReview } = workflow;
  const incompleteRequirements = workflow.incompleteRequirements.length;
  await db.insert(gstPreparations).values({
    businessId: task.businessId,
    taskId,
    periodStart: task.periodStart ?? monthBounds().start,
    periodEnd: task.periodEnd ?? monthBounds().end,
    status,
    ...calculated,
    preparedAt: new Date(),
  }).onDuplicateKeyUpdate({ set: { status, ...calculated, preparedAt: new Date(), updatedAt: new Date() } });
  await db.update(operationalTasks).set({ status, preparedAt: new Date(), requiresProfessionalReview: requiresReview ? 1 : 0 }).where(eq(operationalTasks.id, taskId));
  if (requiresReview) await db.insert(actionItems).values({
    businessId: task.businessId,
    taskId,
    type: "review_gst_preparation",
    title: "Review GST preparation before proceeding",
    description: `${calculated.documentsRequiringReview} document(s) and ${incompleteRequirements} checklist item(s) require attention. This return is prepared for review, not submitted.`,
    priority: "high",
  });
  await audit(task.businessId, userId, "gst.prepared", "gstPreparation", String(taskId), taskId, { status, documentCount: extracted.length });
  return getTaskForUser(userId, taskId);
}

export async function requestProfessionalReview(userId, taskId, note) {
  const task = await getTaskForUser(userId, taskId);
  if (!task) throw new Error("Task not found.");
  const db = await getDb();
  if (!db) throw new Error("Review storage is unavailable.");
  await db.insert(reviewRequests).values({ businessId: task.businessId, taskId, requestedByUserId: userId, note: note ?? null });
  await db.update(operationalTasks).set({ status: "professional_review", requiresProfessionalReview: 1 }).where(eq(operationalTasks.id, taskId));
  await audit(task.businessId, userId, "review.requested", "reviewRequest", String(taskId), taskId);
  return getTaskForUser(userId, taskId);
}

/**
 * A user may mark a fully prepared return as waiting for an authorized submission
 * flow. This state deliberately does not assert that any government portal has
 * received or accepted a filing.
 */
export async function markGstSubmissionPending(userId, taskId) {
  void userId;
  void taskId;
  throw new Error("Direct submission handoff is disabled. Request and obtain independent approval before an authorized provider can dispatch a GST return.");
}

export async function requestAuthorizedGstSubmission(userId, input) {
  const task = await getTaskForUser(userId, input.taskId);
  if (!task) throw new Error("Task not found.");
  const gate = authorizedSubmissionGate(task, task.preparation);
  if (!gate.allowed) throw new Error(gate.reason);
  const db = await getDb();
  if (!db) throw new Error("GST submission storage is unavailable.");
  const existing = await db.select().from(gstSubmissionRequests).where(and(eq(gstSubmissionRequests.taskId, input.taskId), ne(gstSubmissionRequests.status, "cancelled"))).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (existing[0] && ["awaiting_review", "approved", "dispatching", "submitted"].includes(existing[0].status)) throw new Error("This GST preparation already has an active authorized submission request.");
  const idempotencyKey = `gst-${input.taskId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const inserted = await db.insert(gstSubmissionRequests).values({ businessId: task.businessId, taskId: input.taskId, requestedByUserId: userId, requesterNote: input.note || null, idempotencyKey }).$returningId();
  const requestId = inserted[0]?.id;
  await db.insert(actionItems).values({ businessId: task.businessId, taskId: input.taskId, type: "professional_review", title: "Approve authorized GST submission request", description: "A different workspace administrator must approve this prepared return before any authorized provider dispatch can be attempted.", priority: "high" });
  await audit(task.businessId, userId, "gst.authorized_submission_requested", "gstSubmissionRequest", requestId ? String(requestId) : undefined, input.taskId, { assertion: "review_requested_not_submitted", idempotencyKey });
  return getTaskForUser(userId, input.taskId);
}

export async function approveAuthorizedGstSubmission(userId, input) {
  const task = await getTaskForUser(userId, input.taskId);
  if (!task) throw new Error("Task not found.");
  const db = await getDb();
  if (!db) throw new Error("GST submission storage is unavailable.");
  const request = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, input.taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (!request[0]) throw new Error("No authorized submission request is awaiting review.");
  const approval = canIndependentlyApproveSubmission({ workspaceRole: task.workspaceRole, requestedByUserId: request[0].requestedByUserId, reviewerUserId: userId, status: request[0].status });
  if (!approval.allowed) throw new Error(approval.reason);
  const approvedAt = new Date();
  await db.update(gstSubmissionRequests).set({ status: "approved", approvedByUserId: userId, reviewerNote: input.reviewerNote, approvedAt }).where(eq(gstSubmissionRequests.id, request[0].id));
  await db.update(operationalTasks).set({ status: "submission_pending" }).where(eq(operationalTasks.id, input.taskId));
  await db.update(gstPreparations).set({ status: "submission_pending" }).where(eq(gstPreparations.taskId, input.taskId));
  await db.update(actionItems).set({ status: "resolved", resolvedAt: approvedAt }).where(and(eq(actionItems.taskId, input.taskId), eq(actionItems.type, "professional_review"), eq(actionItems.status, "open")));
  await audit(task.businessId, userId, "gst.authorized_submission_approved", "gstSubmissionRequest", String(request[0].id), input.taskId, { assertion: "approved_waiting_for_configured_provider" });
  await notifyApproval(request[0].id, request[0].requestedByUserId);
  return getTaskForUser(userId, input.taskId);
}

/**
 * This intentionally has no user-facing procedure. A future authorized GST
 * integration must call it only after receiving a verifiable official receipt.
 */
export async function beginAuthorizedGstProviderDispatch(actorUserId, taskId, providerName) {
  if (!providerName.trim()) throw new Error("An authorized provider name is required.");
  const task = await getTaskForUser(actorUserId, taskId);
  if (!task || task.status !== "submission_pending") throw new Error("Only an independently approved preparation can be dispatched to an authorized provider.");
  const db = await getDb();
  if (!db) throw new Error("GST submission storage is unavailable.");
  const request = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (!request[0] || request[0].status !== "approved") throw new Error("A currently approved submission request is required before provider dispatch.");
  const dispatchedAt = new Date();
  await db.update(gstSubmissionRequests).set({ status: "dispatching", providerName: providerName.trim(), dispatchedAt }).where(eq(gstSubmissionRequests.id, request[0].id));
  await audit(task.businessId, actorUserId, "gst.provider_dispatch_started", "gstSubmissionRequest", String(request[0].id), taskId, { providerName: providerName.trim(), idempotencyKey: request[0].idempotencyKey });
  return request[0].idempotencyKey;
}

/**
 * Server-only provider callback boundary for a rejected or failed dispatch. It
 * deliberately leaves the preparation out of `submitted`; a new independent
 * review request is required before a future provider attempt.
 */
export async function recordAuthorizedGstProviderFailure(actorUserId, taskId, failureCode) {
  const safeCode = normalizeProviderFailureCode(failureCode);
  if (!safeCode) throw new Error("A provider failure code is required.");
  const task = await getTaskForUser(actorUserId, taskId);
  if (!task || task.status !== "submission_pending") throw new Error("Only a pending authorized submission can record a provider failure.");
  const db = await getDb();
  if (!db) throw new Error("GST submission storage is unavailable.");
  const request = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (!request[0] || request[0].status !== "dispatching" || !request[0].providerName) throw new Error("A provider dispatch must be active before its failure can be recorded.");
  await db.update(gstSubmissionRequests).set({ status: "failed", failureCode: safeCode }).where(eq(gstSubmissionRequests.id, request[0].id));
  await db.update(operationalTasks).set({ status: "prepared" }).where(eq(operationalTasks.id, taskId));
  await db.update(gstPreparations).set({ status: "prepared" }).where(eq(gstPreparations.taskId, taskId));
  await audit(task.businessId, actorUserId, "gst.provider_dispatch_failed", "gstSubmissionRequest", String(request[0].id), taskId, { providerName: request[0].providerName, failureCode: safeCode, assertion: "not_submitted" });
  return getTaskForUser(actorUserId, taskId);
}

export async function recordOfficialGstSubmission(actorUserId, taskId, officialReference) {
  if (!officialReference.trim()) throw new Error("An official submission reference is required.");
  const task = await getTaskForUser(actorUserId, taskId);
  if (!task || task.status !== "submission_pending") {
    throw new Error("Only a preparation awaiting authorized submission can be confirmed as submitted.");
  }
  const db = await getDb();
  if (!db) throw new Error("GST preparation storage is unavailable.");
  const request = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (!request[0] || request[0].status !== "dispatching" || !request[0].providerName) throw new Error("An authorized provider dispatch must be recorded before an official submission can be confirmed.");
  const submittedAt = new Date();
  await db.update(operationalTasks).set({ status: "submitted", submittedAt }).where(eq(operationalTasks.id, taskId));
  await db.update(gstPreparations).set({ status: "submitted", submittedAt, officialReference: officialReference.trim() }).where(eq(gstPreparations.taskId, taskId));
  await db.update(gstSubmissionRequests).set({ status: "submitted", providerSubmissionId: officialReference.trim(), submittedAt }).where(eq(gstSubmissionRequests.id, request[0].id));
  await audit(task.businessId, actorUserId, "gst.official_submission_recorded", "gstPreparation", String(taskId), taskId, { officialReference: officialReference.trim(), source: "authorized_integration_only", providerName: request[0].providerName });
  return getTaskForUser(actorUserId, taskId);
}

export function buildGstReconciliationItems(rows, missingRequirements) {
  const seen = new Set();
  const items = [];
  for (const row of rows) {
    const reference = row.invoiceNumber || `Document ${row.documentId}`;
    let reviewReasons = [];
    try { reviewReasons = JSON.parse(row.extractedData).reviewReasons ?? []; } catch { reviewReasons = ["Extraction payload could not be read."]; }
    const key = row.gstin && row.invoiceNumber ? `${row.gstin}:${row.invoiceNumber}` : "";
    if (row.status !== "extracted") items.push({ documentId: row.documentId, status: "needs_review", itemType: "invoice", reference, reason: "Document extraction requires review before reconciliation." });
    else if (reviewReasons.some(reason => reason.toLowerCase().includes("does not match"))) items.push({ documentId: row.documentId, status: "mismatch", itemType: "invoice", reference, reason: "Document totals or GST components are inconsistent." });
    else if (!key) items.push({ documentId: row.documentId, status: "needs_review", itemType: "invoice", reference, reason: "Invoice identifier or GSTIN is incomplete." });
    else if (seen.has(key)) items.push({ documentId: row.documentId, status: "duplicate", itemType: "invoice", reference, reason: "Another extracted invoice uses the same GSTIN and invoice number." });
    else { seen.add(key); items.push({ documentId: row.documentId, status: "matched", itemType: "invoice", reference, reason: "Internally consistent source record; external GST-data reconciliation is not connected." }); }
  }
  missingRequirements.forEach(requirement => items.push({ documentId: null, status: "missing", itemType: "requirement", reference: requirement.label, reason: "Required source information is still missing." }));
  return items;
}

export function deriveDocumentToGstWorkflow(rows, requirements) {
  const preparation = calculateGstPreparation(rows);
  const incompleteRequirements = requirements.filter(requirement => requirement.status !== "complete" && requirement.status !== "skipped");
  const requiresReview = preparation.documentsRequiringReview > 0 || incompleteRequirements.length > 0 || rows.length === 0;
  const preparationStatus = requiresReview ? "needs_review" : "prepared";
  const reconciliationItems = buildGstReconciliationItems(rows, incompleteRequirements.map(requirement => ({ label: requirement.label })));
  const reconciliationStatus = reconciliationItems.some(item => item.status !== "matched") ? "needs_review" : "ready_for_review";
  return { preparation, incompleteRequirements, requiresReview, preparationStatus, reconciliationItems, reconciliationStatus };
}

/**
 * Cash reconciliation currently stages verifiable statement evidence only. It
 * must not infer balances, transactions, categories, or matches until a
 * dedicated authorized extraction or bank-data connector is available.
 */
export function deriveCashIntakeReconciliation(rows, requirements) {
  const statements = rows.filter(row => row.documentType === "bank_statement");
  const items = [];
  if (!statements.length) {
    items.push({ documentId: null, status: "missing", itemType: "bank_statement", reference: "Bank statement", reason: "A source statement is required before cash reconciliation can be prepared." });
  }
  statements.forEach(statement => items.push({
    documentId: statement.documentId,
    status: "needs_review",
    itemType: "bank_statement",
    reference: statement.originalName,
    reason: "Statement intake is staged as source evidence. Transaction extraction and cash matching are not activated, so no financial values or matches have been inferred.",
  }));
  requirements.filter(requirement => requirement.status !== "complete" && requirement.status !== "skipped")
    .filter(requirement => requirement.label !== "Bank statement")
    .forEach(requirement => items.push({ documentId: null, status: "missing", itemType: "requirement", reference: requirement.label, reason: "Required source information is still missing." }));
  return { items, reconciliationStatus: statements.length ? "needs_review" : "collecting" };
}

export async function prepareCashReconciliation(userId, taskId) {
  const task = await getTaskForUser(userId, taskId);
  if (!task || task.type !== "cash_reconciliation") throw new Error("This is not a cash-reconciliation task.");
  const db = await getDb();
  if (!db) throw new Error("Cash-reconciliation storage is unavailable.");
  const statementRows = await db.select({ documentId: documents.id, originalName: documents.originalName, documentType: documents.documentType, status: documents.status })
    .from(documents).where(and(eq(documents.taskId, taskId), eq(documents.businessId, task.businessId)));
  const workflow = deriveCashIntakeReconciliation(statementRows, task.requirements);
  await db.delete(reconciliationItems).where(and(eq(reconciliationItems.taskId, taskId), ne(reconciliationItems.status, "resolved"), ne(reconciliationItems.status, "ignored")));
  if (workflow.items.length) await db.insert(reconciliationItems).values(workflow.items.map(item => ({ businessId: task.businessId, taskId, ...item })));
  await db.update(actionItems).set({ status: "resolved", resolvedAt: new Date() })
    .where(and(eq(actionItems.taskId, taskId), eq(actionItems.type, "review_reconciliation"), eq(actionItems.status, "open")));
  if (statementRows.some(row => row.documentType === "bank_statement")) await db.insert(actionItems).values({
    businessId: task.businessId,
    taskId,
    type: "review_reconciliation",
    title: "Review bank-statement intake before cash matching",
    description: "The statement is securely staged as evidence. Transaction-level extraction and matching are not activated, so this workflow cannot assert a cash balance or completed reconciliation.",
    priority: "high",
  });
  await db.update(operationalTasks).set({ status: workflow.reconciliationStatus, preparedAt: new Date(), requiresProfessionalReview: 1 }).where(eq(operationalTasks.id, taskId));
  await audit(task.businessId, userId, "cash_reconciliation.intake_prepared", "operationalTask", String(taskId), taskId, { statementCount: statementRows.length, assertion: "no_transaction_values_inferred" });
  return listReconciliationForUser(userId, taskId);
}

export async function reconcileGstTask(userId, taskId) {
  const task = await getTaskForUser(userId, taskId);
  if (!task || !["gst_return_preparation", "gst_reconciliation"].includes(task.type)) throw new Error("This task does not support GST reconciliation.");
  const entitlement = await checkFeatureEntitlement(task.businessId, "ADVANCED_RECONCILIATION");
  if (!entitlement.allowed) throw new Error(entitlement.reason);
  const db = await getDb();
  if (!db) throw new Error("Reconciliation storage is unavailable.");
  const rows = await db.select({ documentId: documents.id, invoiceNumber: documentExtractions.invoiceNumber, gstin: documentExtractions.gstin, status: documentExtractions.status, extractedData: documentExtractions.extractedData, invoiceType: documentExtractions.invoiceType, taxableValueMinor: documentExtractions.taxableValueMinor, cgstMinor: documentExtractions.cgstMinor, sgstMinor: documentExtractions.sgstMinor, igstMinor: documentExtractions.igstMinor, totalMinor: documentExtractions.totalMinor })
    .from(documents).innerJoin(documentExtractions, eq(documents.id, documentExtractions.documentId)).where(eq(documents.taskId, taskId));
  const workflow = deriveDocumentToGstWorkflow(rows, task.requirements);
  const items = workflow.reconciliationItems;
  await db.delete(reconciliationItems).where(and(eq(reconciliationItems.taskId, taskId), ne(reconciliationItems.status, "resolved"), ne(reconciliationItems.status, "ignored")));
  if (items.length) await db.insert(reconciliationItems).values(items.map(item => ({ businessId: task.businessId, taskId, ...item })));
  await db.update(operationalTasks).set({ status: workflow.reconciliationStatus }).where(eq(operationalTasks.id, taskId));
  await audit(task.businessId, userId, "gst.reconciled", "operationalTask", String(taskId), taskId, { generatedItems: items.length });
  return listReconciliationForUser(userId, taskId);
}

export async function listReconciliationForUser(userId, taskId) {
  const task = await getTaskForUser(userId, taskId);
  if (!task) throw new Error("Task not found.");
  const db = await getDb();
  if (!db) {
    return [
      {
        id: 1,
        taskId,
        documentId: 1,
        itemType: "invoice",
        reference: "INV-2026-0801 · Apex Supplies",
        status: "matched",
        reason: "Source invoice totals and tax components verified against extracted evidence.",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }
  return db.select().from(reconciliationItems).where(eq(reconciliationItems.taskId, taskId)).orderBy(desc(reconciliationItems.createdAt));
}

export async function resolveReconciliationItem(userId, input) {
  const db = await getDb();
  if (!db) throw new Error("Reconciliation storage is unavailable.");
  const item = await db.select({ item: reconciliationItems }).from(reconciliationItems)
    .innerJoin(businessMembers, eq(reconciliationItems.businessId, businessMembers.businessId))
    .where(and(eq(reconciliationItems.id, input.reconciliationId), eq(businessMembers.userId, userId))).limit(1);
  if (!item[0]) throw new Error("You do not have access to this reconciliation item.");
  await db.update(reconciliationItems).set({ status: input.resolution, resolvedByUserId: userId, resolvedAt: new Date() }).where(eq(reconciliationItems.id, input.reconciliationId));
  await audit(item[0].item.businessId, userId, `reconciliation.${input.resolution}`, "reconciliationItem", String(input.reconciliationId), item[0].item.taskId ?? undefined);
  return { success: true };
}
