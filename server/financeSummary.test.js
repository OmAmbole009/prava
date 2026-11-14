import { describe, expect, it } from "vitest";
import {
  buildSummaryResponse,
  computeBusinessFinancials,
  financialYearStart,
} from "./financeSummary.js";
import { configuredAdminEmails, maskEmail } from "./_core/adminBootstrap.js";
import { validateExtraction } from "./operations.js";

/**
 * These cover the pure parts of the financial pipeline: period derivation,
 * response shaping (finalized vs pending separation) and the accounting
 * arithmetic used when a database is present.
 */

function bucket(overrides = {}) {
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
    overdueReceivablesMinor: 0,
    overduePayablesMinor: 0,
    salesCount: 0,
    purchaseCount: 0,
    ...overrides,
  };
}

describe("Financial summary engine", () => {
  it("derives the Indian financial year start (1 April)", () => {
    expect(financialYearStart(new Date("2026-06-15T00:00:00Z")).toISOString()).toBe(
      "2026-04-01T00:00:00.000Z"
    );
    // January still belongs to the previous financial year.
    expect(financialYearStart(new Date("2026-01-15T00:00:00Z")).toISOString()).toBe(
      "2025-04-01T00:00:00.000Z"
    );
  });

  it("returns null without a database so callers can fall back", async () => {
    expect(await computeBusinessFinancials(null, 1)).toBeNull();
    expect(await computeBusinessFinancials({}, 1)).toBeNull();
  });

  it("keeps pending documents out of finalized totals", () => {
    const financials = {
      businessId: 7,
      currency: "INR",
      periodStart: financialYearStart(new Date("2026-06-15T00:00:00Z")),
      periodEnd: new Date("2026-06-15T00:00:00Z"),
      // The example production invoice: an approved purchase bill.
      finalized: bucket({
        expensesMinor: 84150_00,
        payablesMinor: 99297_00,
        taxablePurchasesMinor: 84150_00,
        inputGstMinor: 15147_00,
        cgstMinor: 7573_50,
        sgstMinor: 7573_50,
        invoicedMinor: 99297_00,
        purchaseCount: 1,
      }),
      pending: bucket({
        revenueMinor: 50000_00,
        receivablesMinor: 59000_00,
        outputGstMinor: 9000_00,
        cgstMinor: 4500_00,
        sgstMinor: 4500_00,
        taxableSalesMinor: 50000_00,
        salesCount: 1,
      }),
      counts: {
        documents: 2,
        pendingDocuments: 1,
        approvedDocuments: 1,
        rejectedDocuments: 0,
        salesDocuments: 1,
        purchaseDocuments: 1,
        studioInvoices: 0,
      },
      hasPending: true,
      hasActivity: true,
    };

    const response = buildSummaryResponse(financials);

    // Finalized contract fields exclude the queued invoice entirely.
    expect(response.expensesMinor).toBe(84150_00);
    expect(response.payablesMinor).toBe(99297_00);
    expect(response.revenueMinor).toBe(0);
    expect(response.receivablesMinor).toBe(0);
    expect(response.gstPositionMinor).toBe(-15147_00);

    // But the pending invoice is visible and clearly marked.
    expect(response.pending.revenueMinor).toBe(50000_00);
    expect(response.pending.receivablesMinor).toBe(59000_00);
    expect(response.hasPending).toBe(true);
    expect(response.counts.pendingDocuments).toBe(1);

    // GST breakdown matches the invoice arithmetic (7573.50 + 7573.50 = 15147).
    expect(response.breakdown.cgstMinor + response.breakdown.sgstMinor).toBe(15147_00);
    expect(response.breakdown.taxablePurchasesMinor).toBe(84150_00);
  });

  it("reports a zero GST position when output and input cancel out", () => {
    const response = buildSummaryResponse({
      businessId: 1,
      currency: "INR",
      periodStart: financialYearStart(),
      periodEnd: new Date(),
      finalized: bucket({ outputGstMinor: 9000_00, inputGstMinor: 9000_00 }),
      pending: bucket(),
      counts: { documents: 0, pendingDocuments: 0, approvedDocuments: 0, rejectedDocuments: 0, salesDocuments: 0, purchaseDocuments: 0, studioInvoices: 0 },
      hasPending: false,
      hasActivity: false,
    });
    expect(response.gstPositionMinor).toBe(0);
    expect(response.breakdown.netGstMinor).toBe(0);
  });

  it("subtracts credit-note taxable and GST amounts from finalized sales", async () => {
    const queryRows = [
      [{ currency: "INR", name: "Prava" }],
      [{
        documentId: 42,
        documentStatus: "extracted",
        documentType: "credit_note",
        createdAt: new Date("2026-06-10T00:00:00Z"),
        invoiceType: "sales",
        invoiceDate: new Date("2026-06-10T00:00:00Z"),
        taxableValueMinor: 10000,
        cgstMinor: 900,
        sgstMinor: 900,
        igstMinor: 100,
        totalMinor: 11900,
      }],
      [{ documentId: 42, reviewStatus: "approved" }],
      [],
    ];
    let queryIndex = 0;
    const db = {
      select() {
        const rows = queryRows[queryIndex++];
        const builder = {
          from() { return this; },
          innerJoin() { return this; },
          where() { return this; },
          limit() { return Promise.resolve(rows); },
          then(resolve, reject) { return Promise.resolve(rows).then(resolve, reject); },
        };
        return builder;
      },
    };

    const financials = await computeBusinessFinancials(db, 7);
    expect(financials.finalized.revenueMinor).toBe(-10000);
    expect(financials.finalized.taxableSalesMinor).toBe(-10000);
    expect(financials.finalized.outputGstMinor).toBe(-1900);
    expect(financials.finalized.cgstMinor).toBe(-900);
    expect(financials.finalized.b2bOutputGstMinor).toBe(-1900);
    expect(financials.finalized.receivablesMinor).toBe(-11900);
  });
});

describe("Invoice arithmetic (production regression)", () => {
  // The exact bill reported in production: OM TELE SERVICES / OTS/2026/06.
  const productionInvoice = {
    vendorName: "OM TELE SERVICES",
    gstin: "27ABCDE1234F1Z5",
    invoiceNumber: "OTS/2026/06",
    invoiceDate: "2026-06-10",
    taxableValue: "84150.00",
    cgst: "7573.50",
    sgst: "7573.50",
    igst: "0",
    total: "99297.00",
    invoiceType: "purchase",
    reviewReasons: [],
  };

  it("accepts ₹84,150 + ₹7,573.50 + ₹7,573.50 = ₹99,297 with no review reasons", () => {
    const validated = validateExtraction(productionInvoice);
    expect(validated.taxableValueMinor).toBe(8415000);
    expect(validated.cgstMinor).toBe(757350);
    expect(validated.sgstMinor).toBe(757350);
    expect(validated.igstMinor).toBe(0);
    expect(validated.totalMinor).toBe(9929700);
    expect(validated.reasons).toEqual([]);
  });

  it("rejects arithmetic where the total does not match the GST components", () => {
    const validated = validateExtraction({
      ...productionInvoice,
      cgst: "7000.00",
      sgst: "7000.00",
    });
    expect(validated.reasons).toContain(
      "Invoice total does not match taxable value plus GST components."
    );
  });

  it("flags a missing invoice number and date instead of inventing values", () => {
    const validated = validateExtraction({
      ...productionInvoice,
      invoiceNumber: "",
      invoiceDate: "",
    });
    expect(validated.reasons).toContain("Invoice number was not found.");
    expect(validated.reasons).toContain("Invoice date needs review.");
  });
});

describe("Administrator bootstrap", () => {
  it("defaults to the existing administrator only when ADMIN_EMAILS is unset", () => {
    const previous = process.env.ADMIN_EMAILS;
    try {
      delete process.env.ADMIN_EMAILS;
      expect(configuredAdminEmails()).toEqual(["omambole2007@gmail.com"]);

      process.env.ADMIN_EMAILS = " Ops@Prava.in , omambole2007@gmail.com ";
      expect(configuredAdminEmails()).toEqual(["ops@prava.in", "omambole2007@gmail.com"]);
    } finally {
      if (previous === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = previous;
    }
  });

  it("masks administrator emails in logs", () => {
    expect(maskEmail("omambole2007@gmail.com")).toBe("om***07@gmail.com");
    expect(maskEmail("ab@x.com")).toBe("a***@x.com");
    expect(maskEmail("")).toBe("");
    expect(maskEmail(null)).toBe("");
  });

  it("does not promote without a database connection", async () => {
    const { ensureConfiguredAdministrators } = await import("./_core/adminBootstrap.js");
    const result = await ensureConfiguredAdministrators(null);
    expect(result.promoted).toEqual([]);
    expect(result.missing).toEqual([]);
  });
});
