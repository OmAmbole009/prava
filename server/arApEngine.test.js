import { describe, it, expect } from "vitest";
import {
  buildAccountsReceivable,
  buildAccountsPayable,
  getArApDashboardSummary,
} from "./arApEngine.js";

describe("Prava AR/AP Engine", () => {
  const mockExtractions = [
    {
      document: { id: 1, businessId: 10, status: "extracted" },
      extraction: {
        invoiceType: "sales",
        vendorName: "Client Alpha Corp",
        invoiceNumber: "INV-2024-001",
        invoiceDate: "2024-01-10",
        totalMinor: 11800000, // 1,18,000 INR
        taxableValueMinor: 10000000,
        cgstMinor: 900000,
        sgstMinor: 900000,
      },
    },
    {
      document: { id: 2, businessId: 10, status: "extracted" },
      extraction: {
        invoiceType: "sales",
        vendorName: "Beta Solutions Ltd",
        invoiceNumber: "INV-2024-002",
        invoiceDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10), // 5 days ago (current)
        totalMinor: 5900000, // 59,000 INR
        taxableValueMinor: 5000000,
        cgstMinor: 450000,
        sgstMinor: 450000,
      },
    },
    {
      document: { id: 3, businessId: 10, status: "extracted" },
      extraction: {
        invoiceType: "purchase",
        vendorName: "Legal Edge Advisors",
        invoiceNumber: "BILL-2024-88",
        invoiceDate: "2024-02-01",
        totalMinor: 5000000, // 50,000 INR
        taxableValueMinor: 5000000,
      },
    },
  ];

  it("builds Accounts Receivable with aging buckets", () => {
    const ar = buildAccountsReceivable(mockExtractions);
    expect(ar.totalOutstandingMinor).toBe(17700000); // 1,18,000 + 59,000 = 1,77,000
    expect(ar.customers.length).toBe(2);
    expect(ar.agingBuckets).toBeDefined();
    // INV-2024-001 from Jan 2024 is overdue (>90 days)
    expect(ar.agingBuckets.over_90).toBeGreaterThan(0);
    // INV-2024-002 is within 30 days terms
    expect(ar.agingBuckets.current).toBeGreaterThan(0);
  });

  it("builds Accounts Payable and identifies TDS applicability", () => {
    const ap = buildAccountsPayable(mockExtractions);
    expect(ap.totalOutstandingMinor).toBe(5000000);
    expect(ap.vendors.length).toBe(1);
    const vendor = ap.vendors[0];
    expect(vendor.vendorName).toBe("Legal Edge Advisors");
    // Legal advisory triggers 194J TDS flag
    expect(vendor.tdsApplicable).toBe(true);
  });

  it("produces combined dashboard summary with plain labels", () => {
    const summary = getArApDashboardSummary(mockExtractions);
    expect(summary.receivables.totalMinor).toBe(17700000);
    expect(summary.payables.totalMinor).toBe(5000000);
    expect(summary.receivables.overdueCount).toBeGreaterThan(0);
  });
});
