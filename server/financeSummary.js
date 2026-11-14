/**
 * Prava financial summary engine.
 *
 * Single source of truth for the money that appears in the Command Center,
 * Money In & Out, Taxes & Compliance and the CA suite.
 *
 * It is derived from persisted records only:
 *   documents + documentExtractions  -> uploaded invoices/bills (Qwen OCR output)
 *   issuedInvoices                   -> invoices raised in Invoice Studio
 *
 * Two clearly separated buckets are produced:
 *   finalized -> documents the user has reviewed and approved (status "extracted")
 *   pending   -> documents still in the upload/extraction/review queue
 *
 * An ingested document is therefore never invisible: it lands in `pending`
 * immediately and moves to `finalized` on approval, without double counting.
 */

import { and, eq } from "drizzle-orm";
import {
  accountingEntries,
  businesses,
  documents,
  documentExtractions,
  financialSummaries,
  issuedInvoices,
} from "../drizzle/schema.js";

const PENDING_DOCUMENT_STATUSES = new Set(["uploaded", "extracting", "needs_review"]);
const FINALIZED_DOCUMENT_STATUSES = new Set(["extracted"]);
const REJECTED_DOCUMENT_STATUSES = new Set(["rejected"]);
const STUDIO_COUNTED_STATUSES = new Set(["issued", "paid"]);

const HOURS_MS = 60 * 60 * 1000;

function emptyBucket() {
  return {
    revenueMinor: 0,
    expensesMinor: 0,
    cashMinor: 0,
    gstPositionMinor: 0,
    receivablesMinor: 0,
    payablesMinor: 0,
    taxableSalesMinor: 0,
    taxablePurchasesMinor: 0,
    outputGstMinor: 0,
    inputGstMinor: 0,
    cgstMinor: 0,
    sgstMinor: 0,
    igstMinor: 0,
    invoicedMinor: 0,
    b2bOutputGstMinor: 0,
    b2bInputGstMinor: 0,
    overdueReceivablesMinor: 0,
    overduePayablesMinor: 0,
    salesCount: 0,
    purchaseCount: 0,
  };
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Indian financial year (1 April – 31 March) containing `now`. */
export function financialYearStart(now = new Date()) {
  const year = now.getUTCMonth() >= 3 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
  return new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0));
}

function isOverdue(invoiceDate) {
  if (!invoiceDate) return false;
  const issued = new Date(invoiceDate).getTime();
  if (!Number.isFinite(issued)) return false;
  return Date.now() - issued > 30 * 24 * HOURS_MS;
}

function classifyInvoiceType(row) {
  const explicit = String(row.invoiceType || "").toLowerCase();
  if (explicit === "sales" || explicit === "sale" || explicit === "outward") return "sales";
  if (explicit === "purchase" || explicit === "bill" || explicit === "inward") return "purchase";
  // Fall back to the document classification when OCR did not state a direction.
  if (row.documentType === "credit_note" || row.documentType === "debit_note") return "purchase";
  return "purchase";
}

function applyExtraction(bucket, row, { creditNote = false } = {}) {
  const total = num(row.totalMinor);
  const taxable = num(row.taxableValueMinor);
  const cgst = num(row.cgstMinor);
  const sgst = num(row.sgstMinor);
  const igst = num(row.igstMinor);
  const gst = cgst + sgst + igst;
  const sign = creditNote ? -1 : 1;
  const direction = classifyInvoiceType(row);

  bucket.cgstMinor += cgst * sign;
  bucket.sgstMinor += sgst * sign;
  bucket.igstMinor += igst * sign;

  if (direction === "sales") {
    bucket.salesCount += 1;
    bucket.taxableSalesMinor += taxable * sign;
    bucket.outputGstMinor += gst * sign;
    bucket.b2bOutputGstMinor += gst * sign;
    // A credit note reduces what was billed rather than adding revenue.
    bucket.revenueMinor += taxable * sign;
    bucket.invoicedMinor += total * sign;
    bucket.receivablesMinor += total * sign;
    if (!creditNote && isOverdue(row.invoiceDate)) bucket.overdueReceivablesMinor += total;
  } else {
    bucket.purchaseCount += 1;
    bucket.taxablePurchasesMinor += taxable * sign;
    bucket.inputGstMinor += gst * sign;
    bucket.b2bInputGstMinor += gst * sign;
    bucket.expensesMinor += taxable * sign;
    bucket.invoicedMinor += total * sign;
    bucket.payablesMinor += total * sign;
    if (!creditNote && isOverdue(row.invoiceDate)) bucket.overduePayablesMinor += total;
  }

  bucket.gstPositionMinor = bucket.outputGstMinor - bucket.inputGstMinor;
}

function applyStudioInvoice(bucket, row) {
  const subtotal = num(row.subtotalMinor);
  const discount = num(row.discountMinor);
  const tax = num(row.taxMinor);
  const total = num(row.totalMinor) || subtotal - discount + tax;
  const paid = num(row.amountPaidMinor);
  const direction = row.documentKind === "bill" ? "purchase" : "sales";

  if (direction === "sales") {
    bucket.salesCount += 1;
    bucket.revenueMinor += subtotal - discount;
    bucket.invoicedMinor += total;
    bucket.outputGstMinor += tax;
    bucket.taxableSalesMinor += subtotal - discount;
    bucket.receivablesMinor += Math.max(0, total - paid);
    if (isOverdue(row.dueDate || row.invoiceDate) && total - paid > 0) {
      bucket.overdueReceivablesMinor += total - paid;
    }
  } else {
    bucket.purchaseCount += 1;
    bucket.expensesMinor += subtotal - discount;
    bucket.invoicedMinor += total;
    bucket.inputGstMinor += tax;
    bucket.taxablePurchasesMinor += subtotal - discount;
    bucket.payablesMinor += Math.max(0, total - paid);
    if (isOverdue(row.dueDate || row.invoiceDate) && total - paid > 0) {
      bucket.overduePayablesMinor += total - paid;
    }
  }

  // Only money actually recorded as received/paid counts as cash movement.
  bucket.cashMinor += direction === "sales" ? paid : -paid;
  bucket.gstPositionMinor = bucket.outputGstMinor - bucket.inputGstMinor;
}

/**
 * Computes finalized and pending financials for one business from persisted rows.
 * Returns null when no database is available so callers can fall back safely.
 */
export async function computeBusinessFinancials(db, businessId) {
  if (!db || !businessId || typeof db.select !== "function") return null;

  const businessRow = await db
    .select({ currency: businesses.currency, name: businesses.name })
    .from(businesses)
    .where(eq(businesses.id, businessId))
    .limit(1);

  const extractionRows = await db
    .select({
      documentId: documents.id,
      documentStatus: documents.status,
      documentType: documents.documentType,
      createdAt: documents.createdAt,
      invoiceType: documentExtractions.invoiceType,
      invoiceDate: documentExtractions.invoiceDate,
      taxableValueMinor: documentExtractions.taxableValueMinor,
      cgstMinor: documentExtractions.cgstMinor,
      sgstMinor: documentExtractions.sgstMinor,
      igstMinor: documentExtractions.igstMinor,
      totalMinor: documentExtractions.totalMinor,
    })
    .from(documents)
    .innerJoin(documentExtractions, eq(documents.id, documentExtractions.documentId))
    .where(eq(documents.businessId, businessId));

  // A document only counts as finalized once its ledger entry is approved by a
  // human. Extraction succeeding on its own is not approval.
  const entryRows = await db
    .select({
      documentId: accountingEntries.documentId,
      reviewStatus: accountingEntries.reviewStatus,
    })
    .from(accountingEntries)
    .where(eq(accountingEntries.businessId, businessId));
  const approvedDocumentIds = new Set(
    entryRows
      .filter((entry) => entry.reviewStatus === "approved" && entry.documentId != null)
      .map((entry) => entry.documentId)
  );

  const studioRows = await db
    .select({
      documentKind: issuedInvoices.documentKind,
      status: issuedInvoices.status,
      invoiceDate: issuedInvoices.invoiceDate,
      dueDate: issuedInvoices.dueDate,
      subtotalMinor: issuedInvoices.subtotalMinor,
      discountMinor: issuedInvoices.discountMinor,
      taxMinor: issuedInvoices.taxMinor,
      totalMinor: issuedInvoices.totalMinor,
      amountPaidMinor: issuedInvoices.amountPaidMinor,
    })
    .from(issuedInvoices)
    .where(eq(issuedInvoices.businessId, businessId));

  const finalized = emptyBucket();
  const pending = emptyBucket();
  const counts = {
    documents: 0,
    pendingDocuments: 0,
    approvedDocuments: 0,
    rejectedDocuments: 0,
    salesDocuments: 0,
    purchaseDocuments: 0,
    studioInvoices: 0,
  };

  for (const row of extractionRows) {
    const status = String(row.documentStatus || "");
    if (REJECTED_DOCUMENT_STATUSES.has(status)) {
      counts.rejectedDocuments += 1;
      continue;
    }
    counts.documents += 1;
    const creditNote = row.documentType === "credit_note";

    const isApproved =
      approvedDocumentIds.has(row.documentId) && FINALIZED_DOCUMENT_STATUSES.has(status);
    if (isApproved) {
      counts.approvedDocuments += 1;
      applyExtraction(finalized, row, { creditNote });
    } else {
      // Anything uploaded, extracting or awaiting approval stays financially
      // visible as pending — it never disappears from the dashboard.
      counts.pendingDocuments += 1;
      applyExtraction(pending, row, { creditNote });
    }
    if (classifyInvoiceType(row) === "sales") counts.salesDocuments += 1;
    else counts.purchaseDocuments += 1;
  }

  for (const row of studioRows) {
    if (!STUDIO_COUNTED_STATUSES.has(String(row.status || ""))) continue;
    counts.studioInvoices += 1;
    applyStudioInvoice(finalized, row);
  }

  const now = new Date();
  return {
    businessId,
    currency: businessRow[0]?.currency || "INR",
    periodStart: financialYearStart(now),
    periodEnd: now,
    finalized,
    pending,
    counts,
    hasPending: counts.pendingDocuments > 0,
    hasActivity: counts.documents > 0 || counts.studioInvoices > 0,
  };
}

function summaryColumns(financials) {
  return {
    businessId: financials.businessId,
    periodStart: financials.periodStart,
    periodEnd: financials.periodEnd,
    currency: financials.currency,
    revenueMinor: Math.round(financials.finalized.revenueMinor),
    expensesMinor: Math.round(financials.finalized.expensesMinor),
    cashMinor: Math.round(financials.finalized.cashMinor),
    // Always derived, never trusted from a stale stored value.
    gstPositionMinor: Math.round(
      financials.finalized.outputGstMinor - financials.finalized.inputGstMinor
    ),
    receivablesMinor: Math.round(financials.finalized.receivablesMinor),
    payablesMinor: Math.round(financials.finalized.payablesMinor),
    calculationStatus: "verified",
    calculatedAt: new Date(),
  };
}

/**
 * Persists the current summary for a business. Upserts the row for the current
 * financial year so repeated mutations do not grow the table without bound.
 */
export async function refreshFinancialSummary(db, businessId) {
  if (!db || !businessId) return null;
  const financials = await computeBusinessFinancials(db, businessId);
  if (!financials) return null;
  const columns = summaryColumns(financials);

  const existing = await db
    .select({ id: financialSummaries.id })
    .from(financialSummaries)
    .where(
      and(
        eq(financialSummaries.businessId, businessId),
        eq(financialSummaries.periodStart, columns.periodStart)
      )
    )
    .limit(1);

  if (existing[0]) {
    await db
      .update(financialSummaries)
      .set({ ...columns, periodStart: undefined })
      .where(eq(financialSummaries.id, existing[0].id));
  } else {
    await db.insert(financialSummaries).values(columns);
  }

  return financials;
}

/** Best-effort refresh used from mutation paths: never fails the mutation. */
export async function refreshFinancialSummarySafely(db, businessId, context = "mutation") {
  try {
    await refreshFinancialSummary(db, businessId);
  } catch (error) {
    console.error(
      `[Finance] Summary refresh failed during ${context}:`,
      error.message,
      error.cause?.message ? `(cause: ${error.cause.message})` : ""
    );
  }
}

/**
 * Flattens financials into the shape the API and dashboard consume: finalized
 * values at the top level (existing contract) plus explicit pending/breakdown
 * blocks so the UI can distinguish reviewed figures from queued ones.
 */
export function buildSummaryResponse(financials, persisted = null) {
  const { finalized, pending, counts } = financials;
  return {
    // Existing contract — finalized, approved figures.
    businessId: financials.businessId,
    currency: financials.currency,
    periodStart: financials.periodStart,
    periodEnd: financials.periodEnd,
    revenueMinor: Math.round(finalized.revenueMinor),
    expensesMinor: Math.round(finalized.expensesMinor),
    cashMinor: Math.round(finalized.cashMinor),
    gstPositionMinor: Math.round(finalized.outputGstMinor - finalized.inputGstMinor),
    receivablesMinor: Math.round(finalized.receivablesMinor),
    payablesMinor: Math.round(finalized.payablesMinor),
    calculationStatus: "verified",
    calculatedAt: persisted?.calculatedAt ?? new Date(),
    // Additional, additive detail.
    finalized: { ...finalized },
    pending: { ...pending },
    counts,
    hasPending: financials.hasPending,
    hasActivity: financials.hasActivity,
    breakdown: {
      outputGstMinor: Math.round(finalized.outputGstMinor),
      inputGstMinor: Math.round(finalized.inputGstMinor),
      netGstMinor: Math.round(finalized.outputGstMinor - finalized.inputGstMinor),
      cgstMinor: Math.round(finalized.cgstMinor),
      sgstMinor: Math.round(finalized.sgstMinor),
      igstMinor: Math.round(finalized.igstMinor),
      taxableSalesMinor: Math.round(finalized.taxableSalesMinor),
      taxablePurchasesMinor: Math.round(finalized.taxablePurchasesMinor),
    },
    pendingBreakdown: {
      outputGstMinor: Math.round(pending.outputGstMinor),
      inputGstMinor: Math.round(pending.inputGstMinor),
      cgstMinor: Math.round(pending.cgstMinor),
      sgstMinor: Math.round(pending.sgstMinor),
      igstMinor: Math.round(pending.igstMinor),
      taxableSalesMinor: Math.round(pending.taxableSalesMinor),
      taxablePurchasesMinor: Math.round(pending.taxablePurchasesMinor),
    },
  };
}
