import { z } from "zod";
import { HttpError } from "../shared/_core/errors.js";
import {
  allocateDiscount,
  amountInWords,
  computeInvoiceTotals,
  decimalToScaledBigInt,
  fromMinor,
  resolveGstTreatment,
  toMinor,
} from "../shared/invoiceMath.js";

/**
 * Domain logic for business-created invoices and bills.
 *
 * The money and tax maths lives in shared/invoiceMath.js so the browser
 * preview and the authoritative server totals can never disagree.
 */

export {
  allocateDiscount,
  amountInWords,
  computeInvoiceTotals,
  decimalToScaledBigInt,
  fromMinor,
  resolveGstTreatment,
  toMinor,
};

export const DOCUMENT_KINDS = ["invoice", "bill"];
export const TAX_MODES = ["none", "flat", "gst"];
export const INVOICE_STATUSES = ["draft", "issued", "paid", "void"];

export const MAX_LINE_ITEMS = 100;

const decimalString = z
  .union([z.string(), z.number()])
  .transform(value => String(value ?? "").trim())
  .refine(value => value === "" || /^-?\d*(\.\d+)?$/.test(value), {
    message: "Must be a valid decimal number.",
  });

export const invoiceLineItemSchema = z.object({
  description: z.string().trim().min(1, "A line item description is required.").max(255),
  hsnSac: z.string().trim().max(32).optional().default(""),
  unit: z.string().trim().max(24).optional().default(""),
  quantity: decimalString.refine(value => value !== "", { message: "Quantity is required." }),
  unitPrice: decimalString.refine(value => value !== "", { message: "Rate is required." }),
  taxRatePercent: z
    .union([z.number(), z.string()])
    .transform(value => Number(value ?? 0))
    .refine(value => Number.isFinite(value) && value >= 0 && value <= 100, {
      message: "Tax rate must be between 0 and 100.",
    })
    .optional(),
});

export const issuedInvoiceInputSchema = z.object({
  businessId: z.number().int().positive(),
  documentKind: z.enum(DOCUMENT_KINDS).default("invoice"),
  invoiceNumber: z.string().trim().max(64).optional(),
  invoiceDate: z.string().trim().min(1).max(32),
  dueDate: z.string().trim().max(32).optional().nullable(),
  status: z.enum(INVOICE_STATUSES).default("draft"),
  currency: z.string().trim().length(3).default("USD"),
  taxMode: z.enum(TAX_MODES).default("gst"),
  taxRatePercent: z
    .union([z.number(), z.string()])
    .transform(value => Number(value ?? 0))
    .refine(value => Number.isFinite(value) && value >= 0 && value <= 100, {
      message: "Tax rate must be between 0 and 100.",
    })
    .default(0),
  party: z.object({
    name: z.string().trim().min(1, "A customer or supplier name is required.").max(200),
    email: z.string().trim().max(320).optional().default(""),
    phone: z.string().trim().max(32).optional().default(""),
    addressLine1: z.string().trim().max(200).optional().default(""),
    city: z.string().trim().max(96).optional().default(""),
    state: z.string().trim().max(96).optional().default(""),
    postalCode: z.string().trim().max(24).optional().default(""),
    country: z.string().trim().max(2).optional().default(""),
    taxId: z.string().trim().max(32).optional().default(""),
    placeOfSupply: z.string().trim().max(96).optional().default(""),
  }),
  lineItems: z.array(invoiceLineItemSchema).min(1, "At least one line item is required.").max(MAX_LINE_ITEMS),
  discount: z
    .object({
      type: z.enum(["none", "percent", "amount"]).default("none"),
      value: z.union([z.number(), z.string()]).transform(value => Number(value ?? 0)).default(0),
    })
    .default({ type: "none", value: 0 }),
  notes: z.string().trim().max(2000).optional().default(""),
  terms: z.string().trim().max(2000).optional().default(""),
});

export const issuedInvoiceUpdateSchema = issuedInvoiceInputSchema
  .omit({ businessId: true })
  .partial()
  .extend({ businessId: z.number().int().positive() });

/**
 * Builds the next invoice number for a workspace, e.g. INV-2026-0007.
 */
export function buildInvoiceNumber(kind, sequence, date = new Date()) {
  const prefix = kind === "bill" ? "BILL" : "INV";
  const year = date.getFullYear();
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Extracts the trailing sequence number from an existing invoice number so a
 * workspace can continue its own numbering scheme.
 */
export function parseInvoiceSequence(invoiceNumber, kind) {
  if (!invoiceNumber) return null;
  const prefix = kind === "bill" ? "BILL" : "INV";
  const match = String(invoiceNumber).match(new RegExp(`${prefix}-(\\d{4})-(\\d+)$`, "i"));
  if (!match) return null;
  return Number(match[2]);
}

export function normalizeInvoiceDate(value, fallback = new Date()) {
  const parsed = value ? new Date(value) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

export function assertInvoiceLineItems(lineItems) {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    throw new HttpError(400, "At least one line item is required.");
  }
  if (lineItems.length > MAX_LINE_ITEMS) {
    throw new HttpError(400, `An invoice cannot contain more than ${MAX_LINE_ITEMS} line items.`);
  }
}
