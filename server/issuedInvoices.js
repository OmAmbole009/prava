import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError } from "../shared/_core/errors.js";
import { auditEvents, businesses, issuedInvoices } from "../drizzle/schema.js";
import { getDb, getBusinessForUser, inMemoryBusinesses } from "./db.js";
import { consumeUsage } from "./entitlements.js";
import { renderInvoicePdf } from "./invoiceRenderer.js";
import {
  buildInvoiceNumber,
  computeInvoiceTotals,
  normalizeInvoiceDate,
  parseInvoiceSequence,
} from "./invoiceBuilder.js";

import fs from "node:fs";
import path from "node:path";

const STATE_FILE = path.resolve(process.cwd(), ".storage_cache", "issued_invoices_state.json");

/** In-memory fallback store used when no database connection is configured. */
export const inMemoryIssuedInvoices = [];

export function saveIssuedInvoiceState() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(inMemoryIssuedInvoices, null, 2), "utf-8");
  } catch (error) {
    console.warn("[IssuedInvoices] Could not persist state:", error.message);
  }
}

function loadIssuedInvoiceState() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  try {
    if (!fs.existsSync(STATE_FILE)) return;
    const raw = fs.readFileSync(STATE_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && inMemoryIssuedInvoices.length === 0) {
      inMemoryIssuedInvoices.push(...parsed);
    }
  } catch (error) {
    console.warn("[IssuedInvoices] Could not load persisted state:", error.message);
  }
}
loadIssuedInvoiceState();

function parseLineItems(raw) {
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Sums the per-line tax components so the document can show the CGST / SGST /
 * IGST breakdown without storing a second copy of the totals.
 */
function summariseTaxBreakdown(lineItems) {
  return lineItems.reduce(
    (totals, item) => ({
      cgstMinor: totals.cgstMinor + Number(item?.cgstMinor || 0),
      sgstMinor: totals.sgstMinor + Number(item?.sgstMinor || 0),
      igstMinor: totals.igstMinor + Number(item?.igstMinor || 0),
    }),
    { cgstMinor: 0, sgstMinor: 0, igstMinor: 0 },
  );
}

function toApiShape(row) {
  const source = row?.invoice ?? row;
  if (!source) return null;
  const lineItems = parseLineItems(source.lineItems);
  const breakdown = summariseTaxBreakdown(lineItems);
  return {
    id: source.id,
    businessId: source.businessId,
    createdByUserId: source.createdByUserId ?? null,
    documentKind: source.documentKind,
    invoiceNumber: source.invoiceNumber,
    invoiceDate: source.invoiceDate,
    dueDate: source.dueDate ?? null,
    status: source.status,
    currency: source.currency,
    taxMode: source.taxMode,
    taxRate: source.taxRate,
    partyName: source.partyName,
    partyEmail: source.partyEmail,
    partyPhone: source.partyPhone,
    partyAddressLine1: source.partyAddressLine1,
    partyCity: source.partyCity,
    partyState: source.partyState,
    partyPostalCode: source.partyPostalCode,
    partyCountry: source.partyCountry,
    partyTaxId: source.partyTaxId,
    partyPlaceOfSupply: source.partyPlaceOfSupply,
    lineItems,
    subtotalMinor: source.subtotalMinor,
    discountMinor: source.discountMinor,
    discountType: source.discountType ?? "none",
    discountValue: source.discountValue ?? "0",
    taxMinor: source.taxMinor,
    cgstMinor: breakdown.cgstMinor,
    sgstMinor: breakdown.sgstMinor,
    igstMinor: breakdown.igstMinor,
    totalMinor: source.totalMinor,
    amountPaidMinor: source.amountPaidMinor,
    notes: source.notes,
    terms: source.terms,
    issuedAt: source.issuedAt ?? null,
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
  };
}

async function recordAudit(businessId, actorUserId, action, entityId, metadata) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditEvents).values({
    businessId,
    actorUserId,
    action,
    entityType: "issued_invoice",
    entityId: String(entityId),
    metadata: metadata ? JSON.stringify(metadata) : null,
  });
}

async function requireBusinessAccess(userId, businessId) {
  if (!businessId) throw new HttpError(400, "A workspace is required.");
  const membership = await getBusinessForUser(businessId, userId);
  if (!membership) throw new HttpError(403, "You do not have access to this workspace.");
  return membership;
}

async function getBusinessProfile(businessId) {
  const db = await getDb();
  if (!db) {
    const target = inMemoryBusinesses.find(item => item.id === businessId) ?? inMemoryBusinesses[0] ?? {};
    return {
      id: target.id ?? businessId,
      name: target.name ?? "Your Business",
      legalName: target.legalName ?? target.name ?? "Your Business",
      email: target.email ?? "",
      phone: target.phone ?? "",
      addressLine1: target.addressLine1 ?? "",
      city: target.city ?? "",
      state: target.state ?? "",
      postalCode: target.postalCode ?? "",
      country: target.country ?? "US",
      gstin: target.gstin ?? "",
      taxSystem: target.taxSystem ?? "Sales tax",
      currency: target.currency ?? "USD",
    };
  }
  const rows = await db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
  const profile = rows[0];
  if (!profile) throw new HttpError(404, "Workspace not found.");
  return profile;
}

/**
 * Resolves the next sequential invoice number for a workspace and document kind.
 */
async function resolveInvoiceNumber(businessId, documentKind, requested, invoiceDate) {
  if (requested && String(requested).trim()) return String(requested).trim();

  const db = await getDb();
  let existingNumbers = [];
  if (!db) {
    existingNumbers = inMemoryIssuedInvoices
      .filter(item => item.businessId === businessId && item.documentKind === documentKind)
      .map(item => item.invoiceNumber);
  } else {
    const rows = await db
      .select({ invoiceNumber: issuedInvoices.invoiceNumber })
      .from(issuedInvoices)
      .where(and(eq(issuedInvoices.businessId, businessId), eq(issuedInvoices.documentKind, documentKind)));
    existingNumbers = rows.map(row => row.invoiceNumber);
  }

  const sequences = existingNumbers
    .map(number => parseInvoiceSequence(number, documentKind))
    .filter(value => Number.isFinite(value));
  const next = sequences.length ? Math.max(...sequences) + 1 : 1;
  return buildInvoiceNumber(documentKind, next, invoiceDate);
}

function serializeLineItems(lineItems) {
  return JSON.stringify(lineItems);
}

/**
 * Creates a business-authored invoice or bill.
 */
export async function createIssuedInvoice(userId, input) {
  await requireBusinessAccess(userId, input.businessId);
  const business = await getBusinessProfile(input.businessId);

  const invoiceDate = normalizeInvoiceDate(input.invoiceDate);
  const dueDate = input.dueDate ? normalizeInvoiceDate(input.dueDate, null) : null;
  if (input.dueDate && !dueDate) throw new HttpError(400, "The due date could not be understood.");

  const totals = computeInvoiceTotals(input, {
    supplierState: business.state || "",
  });

  const invoiceNumber = await resolveInvoiceNumber(
    input.businessId,
    input.documentKind,
    input.invoiceNumber,
    invoiceDate,
  );

  const db = await getDb();
  if (!db) {
    const duplicate = inMemoryIssuedInvoices.find(
      item => item.businessId === input.businessId
        && item.documentKind === input.documentKind
        && item.invoiceNumber === invoiceNumber,
    );
    if (duplicate) throw new HttpError(409, `Document number ${invoiceNumber} already exists in this workspace.`);

    const nextId = inMemoryIssuedInvoices.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
    const record = {
      id: nextId,
      businessId: input.businessId,
      createdByUserId: userId,
      documentKind: input.documentKind,
      invoiceNumber,
      invoiceDate,
      dueDate,
      status: input.status,
      currency: input.currency,
      taxMode: input.taxMode,
      taxRate: input.taxRatePercent,
      partyName: input.party.name,
      partyEmail: input.party.email || null,
      partyPhone: input.party.phone || null,
      partyAddressLine1: input.party.addressLine1 || null,
      partyCity: input.party.city || null,
      partyState: input.party.state || null,
      partyPostalCode: input.party.postalCode || null,
      partyCountry: input.party.country || null,
      partyTaxId: input.party.taxId || null,
      partyPlaceOfSupply: input.party.placeOfSupply || null,
      lineItems: serializeLineItems(totals.lineItems),
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      discountType: input.discount?.type ?? "none",
      discountValue: String(input.discount?.value ?? 0),
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
      amountPaidMinor: 0,
      notes: input.notes || null,
      terms: input.terms || null,
      issuedAt: input.status === "issued" || input.status === "paid" ? new Date() : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    inMemoryIssuedInvoices.push(record);
    saveIssuedInvoiceState();
    await consumeUsage(input.businessId, "invoices_created", 1);
    return toApiShape(record);
  }

  try {
    const inserted = await db
      .insert(issuedInvoices)
      .values({
        businessId: input.businessId,
        createdByUserId: userId,
        documentKind: input.documentKind,
        invoiceNumber,
        invoiceDate,
        dueDate,
        status: input.status,
        currency: input.currency,
        taxMode: input.taxMode,
        taxRate: input.taxRatePercent,
        partyName: input.party.name,
        partyEmail: input.party.email || null,
        partyPhone: input.party.phone || null,
        partyAddressLine1: input.party.addressLine1 || null,
        partyCity: input.party.city || null,
        partyState: input.party.state || null,
        partyPostalCode: input.party.postalCode || null,
        partyCountry: input.party.country || null,
        partyTaxId: input.party.taxId || null,
        partyPlaceOfSupply: input.party.placeOfSupply || null,
        lineItems: serializeLineItems(totals.lineItems),
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        discountType: input.discount?.type ?? "none",
        discountValue: String(input.discount?.value ?? 0),
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        amountPaidMinor: 0,
        notes: input.notes || null,
        terms: input.terms || null,
        issuedAt: input.status === "issued" || input.status === "paid" ? new Date() : null,
      })
      .$returningId();
    const createdId = inserted[0]?.id;
    if (!createdId) throw new HttpError(500, "The invoice could not be created.");
    await recordAudit(input.businessId, userId, "issued_invoice.created", createdId, {
      invoiceNumber,
      totalMinor: totals.totalMinor,
    });
    await consumeUsage(input.businessId, "invoices_created", 1);
    return getIssuedInvoice(userId, createdId);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY" || /duplicate/i.test(error?.message ?? "")) {
      throw new HttpError(409, `Document number ${invoiceNumber} already exists in this workspace.`);
    }
    throw error;
  }
}

/**
 * Lists every invoice or bill a workspace has created.
 */
export async function listIssuedInvoices(userId, businessId, filters = {}) {
  await requireBusinessAccess(userId, businessId);
  const db = await getDb();

  if (!db) {
    return inMemoryIssuedInvoices
      .filter(item => item.businessId === businessId)
      .filter(item => (filters.documentKind ? item.documentKind === filters.documentKind : true))
      .filter(item => (filters.status ? item.status === filters.status : true))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(toApiShape);
  }

  const conditions = [eq(issuedInvoices.businessId, businessId)];
  if (filters.documentKind) conditions.push(eq(issuedInvoices.documentKind, filters.documentKind));
  if (filters.status) conditions.push(eq(issuedInvoices.status, filters.status));

  const rows = await db
    .select()
    .from(issuedInvoices)
    .where(and(...conditions))
    .orderBy(desc(issuedInvoices.createdAt));
  return rows.map(toApiShape);
}

/**
 * Loads a single invoice or bill owned by the caller's workspace.
 */
export async function getIssuedInvoice(userId, invoiceId) {
  const numericId = Number(invoiceId);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    throw new HttpError(400, "Invalid invoice reference.");
  }
  const db = await getDb();

  if (!db) {
    const record = inMemoryIssuedInvoices.find(item => item.id === numericId);
    if (!record) throw new HttpError(404, "Invoice not found.");
    await requireBusinessAccess(userId, record.businessId);
    return toApiShape(record);
  }

  const rows = await db.select().from(issuedInvoices).where(eq(issuedInvoices.id, numericId)).limit(1);
  const record = rows[0];
  if (!record) throw new HttpError(404, "Invoice not found.");
  await requireBusinessAccess(userId, record.businessId);
  return toApiShape(record);
}

/**
 * Updates an invoice or bill, recomputing every monetary value.
 */
export async function updateIssuedInvoice(userId, invoiceId, input) {
  const existing = await getIssuedInvoice(userId, invoiceId);
  const business = await getBusinessProfile(existing.businessId);

  const merged = {
    businessId: existing.businessId,
    documentKind: input.documentKind ?? existing.documentKind,
    invoiceNumber: input.invoiceNumber ?? existing.invoiceNumber,
    invoiceDate: input.invoiceDate ?? existing.invoiceDate,
    dueDate: input.dueDate === undefined ? existing.dueDate : input.dueDate,
    status: input.status ?? existing.status,
    currency: input.currency ?? existing.currency,
    taxMode: input.taxMode ?? existing.taxMode,
    taxRatePercent: input.taxRatePercent ?? existing.taxRate,
    party: {
      name: input.party?.name ?? existing.partyName,
      email: input.party?.email ?? existing.partyEmail ?? "",
      phone: input.party?.phone ?? existing.partyPhone ?? "",
      addressLine1: input.party?.addressLine1 ?? existing.partyAddressLine1 ?? "",
      city: input.party?.city ?? existing.partyCity ?? "",
      state: input.party?.state ?? existing.partyState ?? "",
      postalCode: input.party?.postalCode ?? existing.partyPostalCode ?? "",
      country: input.party?.country ?? existing.partyCountry ?? "",
      taxId: input.party?.taxId ?? existing.partyTaxId ?? "",
      placeOfSupply: input.party?.placeOfSupply ?? existing.partyPlaceOfSupply ?? "",
    },
    lineItems: input.lineItems ?? existing.lineItems,
    discount: input.discount ?? {
      type: existing.discountType ?? "none",
      value: Number(existing.discountValue ?? 0),
    },
    notes: input.notes === undefined ? existing.notes ?? "" : input.notes,
    terms: input.terms === undefined ? existing.terms ?? "" : input.terms,
  };

  const totals = computeInvoiceTotals(merged, { supplierState: business.state || "" });
  const invoiceDate = normalizeInvoiceDate(merged.invoiceDate);
  const dueDate = merged.dueDate ? normalizeInvoiceDate(merged.dueDate, null) : null;

  const db = await getDb();
  if (!db) {
    const index = inMemoryIssuedInvoices.findIndex(item => item.id === existing.id);
    if (index === -1) throw new HttpError(404, "Invoice not found.");
    const record = inMemoryIssuedInvoices[index];
    Object.assign(record, {
      documentKind: merged.documentKind,
      invoiceNumber: merged.invoiceNumber,
      invoiceDate,
      dueDate,
      status: merged.status,
      currency: merged.currency,
      taxMode: merged.taxMode,
      taxRate: merged.taxRatePercent,
      partyName: merged.party.name,
      partyEmail: merged.party.email || null,
      partyPhone: merged.party.phone || null,
      partyAddressLine1: merged.party.addressLine1 || null,
      partyCity: merged.party.city || null,
      partyState: merged.party.state || null,
      partyPostalCode: merged.party.postalCode || null,
      partyCountry: merged.party.country || null,
      partyTaxId: merged.party.taxId || null,
      partyPlaceOfSupply: merged.party.placeOfSupply || null,
      lineItems: serializeLineItems(totals.lineItems),
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      discountType: merged.discount.type ?? "none",
      discountValue: String(merged.discount.value ?? 0),
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
      notes: merged.notes || null,
      terms: merged.terms || null,
      issuedAt: merged.status === "issued" || merged.status === "paid" ? (record.issuedAt ?? new Date()) : record.issuedAt,
      updatedAt: new Date(),
    });
    inMemoryIssuedInvoices[index] = record;
    saveIssuedInvoiceState();
    return toApiShape(record);
  }

  await db
    .update(issuedInvoices)
    .set({
      documentKind: merged.documentKind,
      invoiceNumber: merged.invoiceNumber,
      invoiceDate,
      dueDate,
      status: merged.status,
      currency: merged.currency,
      taxMode: merged.taxMode,
      taxRate: merged.taxRatePercent,
      partyName: merged.party.name,
      partyEmail: merged.party.email || null,
      partyPhone: merged.party.phone || null,
      partyAddressLine1: merged.party.addressLine1 || null,
      partyCity: merged.party.city || null,
      partyState: merged.party.state || null,
      partyPostalCode: merged.party.postalCode || null,
      partyCountry: merged.party.country || null,
      partyTaxId: merged.party.taxId || null,
      partyPlaceOfSupply: merged.party.placeOfSupply || null,
      lineItems: serializeLineItems(totals.lineItems),
      subtotalMinor: totals.subtotalMinor,
      discountMinor: totals.discountMinor,
      discountType: merged.discount.type ?? "none",
      discountValue: String(merged.discount.value ?? 0),
      taxMinor: totals.taxMinor,
      totalMinor: totals.totalMinor,
      notes: merged.notes || null,
      terms: merged.terms || null,
      issuedAt: merged.status === "issued" || merged.status === "paid" ? (existing.issuedAt ?? new Date()) : existing.issuedAt,
    })
    .where(eq(issuedInvoices.id, existing.id));

  await recordAudit(existing.businessId, userId, "issued_invoice.updated", existing.id, {
    invoiceNumber: merged.invoiceNumber,
    totalMinor: totals.totalMinor,
  });
  return getIssuedInvoice(userId, existing.id);
}

/**
 * Deletes an invoice or bill.
 */
export async function deleteIssuedInvoice(userId, invoiceId) {
  const existing = await getIssuedInvoice(userId, invoiceId);
  const db = await getDb();

  if (!db) {
    const index = inMemoryIssuedInvoices.findIndex(item => item.id === existing.id);
    if (index === -1) throw new HttpError(404, "Invoice not found.");
    inMemoryIssuedInvoices.splice(index, 1);
    saveIssuedInvoiceState();
  } else {
    await db.delete(issuedInvoices).where(eq(issuedInvoices.id, existing.id));
    await recordAudit(existing.businessId, userId, "issued_invoice.deleted", existing.id, {
      invoiceNumber: existing.invoiceNumber,
    });
  }

  return { success: true, message: "Invoice deleted successfully.", invoiceId: existing.id };
}

/**
 * Renders an invoice or bill into a downloadable PDF.
 */
export async function renderIssuedInvoicePdf(userId, invoiceId) {
  const invoice = await getIssuedInvoice(userId, invoiceId);
  const business = await getBusinessProfile(invoice.businessId);
  const buffer = renderInvoicePdf({
    invoice,
    business,
    generatedAt: new Date(),
  });
  const filename = `${invoice.documentKind === "bill" ? "Bill" : "Invoice"}_${invoice.invoiceNumber}.pdf`;
  return {
    filename,
    mimeType: "application/pdf",
    content: buffer.toString("base64"),
  };
}

export const issuedInvoiceQuerySchema = z.object({
  businessId: z.number().int().positive(),
  documentKind: z.enum(["invoice", "bill"]).optional(),
  status: z.enum(["draft", "issued", "paid", "void"]).optional(),
});
