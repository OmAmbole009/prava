import { describe, expect, it } from "vitest";
import {
  createBusinessWithOwner,
  getBusinessesForUser,
  getLatestFinancialSummaryForUser,
} from "./db.js";
import {
  getActionCenter,
  getDocumentForUser,
  listDocumentsForUser,
  listTasksForUser,
  uploadAndProcessDocument,
} from "./operations.js";
import { listCaReviewQueue } from "./caManagement.js";

describe("Clean New Business Onboarding & Document Storage", () => {
  it("initializes a brand new business with zero demo data", async () => {
    const userId = 1;
    const newBiz = await createBusinessWithOwner(userId, {
      name: "Acme Industrial Logistics Ltd",
      businessType: "Private Limited Company",
      industry: "Supply Chain & Warehousing",
      gstin: "27AAACA9999F1Z1",
      country: "IN",
      currency: "INR",
      taxSystem: "GST & Indian Direct Tax",
      financialYear: "2024-25",
    });

    expect(newBiz).toBeDefined();
    expect(newBiz.name).toBe("Acme Industrial Logistics Ltd");
    expect(newBiz.country).toBe("IN");
    expect(newBiz.currency).toBe("INR");

    // 1. Documents list must be completely empty (no mock AWS invoices)
    const docs = await listDocumentsForUser(userId, newBiz.id);
    expect(docs).toEqual([]);

    // 2. Tasks list must be completely empty (no mock Q3 2026 tasks)
    const tasks = await listTasksForUser(userId, newBiz.id);
    expect(tasks).toEqual([]);

    // 3. Action Center must have 0 open actions (no mock INV-2026-0801 review)
    const actions = await getActionCenter(userId, newBiz.id);
    expect(actions).toEqual([]);

    // 4. Financial summary must be exactly 0 across all figures (not ₹18.5 Cr)
    const summary = await getLatestFinancialSummaryForUser(userId, newBiz.id);
    expect(summary.revenueMinor).toBe(0);
    expect(summary.expensesMinor).toBe(0);
    expect(summary.cashMinor).toBe(0);
    expect(summary.gstPositionMinor).toBe(0);
    expect(summary.receivablesMinor).toBe(0);
    expect(summary.payablesMinor).toBe(0);

    // 5. CA review queue must be empty
    const caQueue = await listCaReviewQueue(201);
    expect(caQueue.reviewRequests).toEqual([]);
    expect(caQueue.gstSubmissions).toEqual([]);
  });

  it("allows uploading and processing documents for the new business without error", async () => {
    const userId = 1;
    const businesses = await getBusinessesForUser(userId);
    const targetBiz = businesses.find((b) => b.name === "Acme Industrial Logistics Ltd") || businesses[0];

    // Upload a sample invoice base64
    const sampleInvoiceBytes = Buffer.from(
      "%PDF-1.4\n" +
      "TAX INVOICE\n" +
      "Bill From: Acme Industrial Supplies Ltd\n" +
      "GSTIN: 27AAACA9999F1Z1\n" +
      "Bill No: INV-2024-001\n" +
      "Bill Date: 19-09-2026\n" +
      "Taxable Value: 10,000.00\n" +
      "CGST 9%: 900.00\n" +
      "SGST 9%: 900.00\n" +
      "Total Bill Amount: 11,800.00\n" +
      "%%EOF"
    );
    const base64 = sampleInvoiceBytes.toString("base64");

    const result = await uploadAndProcessDocument(userId, {
      businessId: targetBiz.id,
      originalName: "Acme_Industrial_Warehouse_Lease_Invoice.pdf",
      mimeType: "application/pdf",
      documentType: "invoice",
      base64,
    });

    expect(result).toBeDefined();
    expect(result.documentId).toBeGreaterThan(0);
    expect(["extracted", "needs_review"]).toContain(result.status);

    // Verify document shows up in the user's document vault
    const docs = await listDocumentsForUser(userId, targetBiz.id);
    expect(docs.length).toBe(1);
    expect(docs[0].document.originalName).toBe("Acme_Industrial_Warehouse_Lease_Invoice.pdf");
    expect(docs[0].document.businessId).toBe(targetBiz.id);

    // Verify getDocumentForUser retrieves the uploaded document without falling back to Apex Supplies
    const retrieved = await getDocumentForUser(userId, result.documentId);
    expect(retrieved.document.originalName).toBe("Acme_Industrial_Warehouse_Lease_Invoice.pdf");
    expect(retrieved.document.originalName).not.toContain("Apex");
    expect(retrieved.document.originalName).not.toContain("AWS_India");

    // Verify financial summary dynamically updates
    const updatedSummary = await getLatestFinancialSummaryForUser(userId, targetBiz.id);
    expect(updatedSummary.expensesMinor).toBeGreaterThan(0);
  });

  it("ensures CA Suite endpoints return clean zero state for empty workspace", async () => {
    const userId = 2; // Non-admin user
    const emptyBiz = await createBusinessWithOwner(userId, {
      name: "Solitary Enterprise LLP",
      businessType: "Limited Liability Partnership",
      industry: "Consulting",
      gstin: "27AABCS1234F1Z0",
      country: "IN",
      currency: "INR",
      taxSystem: "GST & Indian Direct Tax",
      financialYear: "2024-25",
    });

    const { appRouter } = await import("./routers.js");
    const caller = appRouter.createCaller({
      user: { id: userId, role: "owner", email: "partner@solitary.com" },
    });

    const gstn = await caller.caEngine.gstnFilingJson({ businessId: emptyBiz.id });
    expect(gstn.legalName).toBe("Solitary Enterprise LLP");
    expect(gstn.gstin).toBe("27AABCS1234F1Z0");
    expect(gstn.outwardSupplies.taxableSupplies).toBe(0);
    expect(gstn.outwardSupplies.totalTax).toBe(0);
    expect(gstn.netCashPayable.totalCashPayable).toBe(0);

    const msme = await caller.caEngine.msmeAudit({ businessId: emptyBiz.id });
    expect(msme.totalPayablesChecked).toBe(0);
    expect(msme.totalDisallowanceAmount).toBe(0);
    expect(msme.overdueInvoicesCount).toBe(0);
    expect(msme.invoices).toEqual([]);

    const financials = await caller.caEngine.schedule3Financials({ businessId: emptyBiz.id });
    expect(financials.entityName).toBe("Solitary Enterprise LLP");
    expect(financials.balanceSheet.equityAndLiabilities.totalEquityAndLiabilities).toBe(0);
    expect(financials.profitAndLoss.revenue.revenueFromOperations).toBe(0);
  });
});

