import { describe, expect, it } from "vitest";
import {
  calculateAdvanceTax,
  auditMsme43BhCompliance,
  reconcileGstr2B,
  getTdsComplianceOverview,
  auditCashTransactions,
  draftTaxNoticeDefense,
  getStatutoryComplianceCalendar,
  generateGstnReturnSchema,
  auditVendorInvoice,
  generateSchedule3Financials,
  generateForm3CDTaxAudit,
  askCaCopilotRag,
} from "./caEngine.js";

describe("Autonomous CA Engine", () => {
  it("computes advance tax and regime optimization correctly", () => {
    const result = calculateAdvanceTax({
      grossRevenue: 10000000,
      operatingExpenses: 4000000,
      depreciation: 500000,
      otherIncome: 200000,
      entityType: "company",
      tdsAlreadyDeducted: 100000,
    });

    expect(result.netTaxableIncome).toBe(5700000);
    expect(result.isAdvanceTaxApplicable).toBe(true);
    expect(result.installments.length).toBe(4);
    expect(result.installments[0].quarter).toBe("Q1");
    expect(result.installments[3].quarter).toBe("Q4");
  });

  it("detects overdue MSME invoices subject to Section 43B(h) disallowance", () => {
    const testInvoices = [
      {
        invoiceNumber: "INV-001",
        vendorName: "Test Small Vendor",
        invoiceAmount: 500000,
        enterpriseCategory: "small",
        hasWrittenAgreement: false,
        daysOutstanding: 20,
        paymentDate: null,
      },
      {
        invoiceNumber: "INV-002",
        vendorName: "Compliant Micro Vendor",
        invoiceAmount: 200000,
        enterpriseCategory: "micro",
        hasWrittenAgreement: true,
        daysOutstanding: 10,
        paymentDate: null,
      },
    ];
    const audit = auditMsme43BhCompliance(testInvoices);
    expect(audit.totalPayablesChecked).toBe(700000);
    expect(audit.overdueInvoicesCount).toBe(1);
    expect(audit.totalDisallowanceAmount).toBe(500000);
    expect(audit.estimatedTaxPenalty).toBeGreaterThan(0);
    expect(audit.invoices.some(inv => inv.isDisallowedUnder43Bh)).toBe(true);
  });

  it("reconciles GSTR-2B against books and identifies ITC at risk", () => {
    const testBooks = [
      {
        invoiceNumber: "INV-B1",
        vendorName: "Amazon Web Services",
        taxableValue: 500000,
        igst: 90000,
        isIn2B: true,
      },
      {
        invoiceNumber: "INV-B2",
        vendorName: "Unregistered Consultant",
        taxableValue: 100000,
        igst: 18000,
        isIn2B: false,
      },
    ];
    const rec = reconcileGstr2B(testBooks, "August 2024");
    expect(rec.period).toBe("August 2024");
    expect(rec.totalBooksItc).toBe(108000);
    expect(rec.total2BItc).toBe(90000);
    expect(rec.itcAtRisk).toBe(18000);
    expect(rec.reconciliationRows.some(r => r.matchStatus === "missing_in_2b")).toBe(true);
  });

  it("provides comprehensive TDS compliance overview", () => {
    const tds = getTdsComplianceOverview();
    expect(tds.sections.length).toBeGreaterThanOrEqual(4);
    expect(tds.sections.some(s => s.section === "194C")).toBe(true);
    expect(tds.sections.some(s => s.section === "194J")).toBe(true);
    expect(tds.totalTdsDue).toBeGreaterThanOrEqual(0);
  });

  it("flags Section 40A(3) cash transactions exceeding ₹10,000", () => {
    const testTx = [
      { id: 1, partyName: "Local Vendor", amount: 25000, mode: "cash", date: "2024-09-01" },
      { id: 2, partyName: "Digital Vendor", amount: 50000, mode: "neft", date: "2024-09-02" },
      { id: 3, partyName: "Small Cash", amount: 5000, mode: "cash", date: "2024-09-03" },
    ];
    const cashAudit = auditCashTransactions(testTx);
    expect(cashAudit.disallowedCount).toBe(1);
    expect(cashAudit.totalDisallowedAmount).toBe(25000);
    expect(cashAudit.taxRisk).toBe(6250);
  });

  it("drafts legal defense for GST ASMT-10 notice", () => {
    const defense = draftTaxNoticeDefense({
      noticeType: "gst_asmt_10",
      disputedAmount: 57600,
    });
    expect(defense.citations.length).toBeGreaterThan(0);
    expect(defense.legalGrounds.length).toBeGreaterThan(0);
    expect(defense.prayerText).toContain("dropped in full");
  });

  it("generates GST Portal compliant GSTR-3B filing JSON", () => {
    const testInvoices = [
      {
        direction: "outward",
        taxableValue: 1000000,
        cgst: 90000,
        sgst: 90000,
        igst: 0,
      },
      {
        direction: "inward",
        taxableValue: 400000,
        cgst: 36000,
        sgst: 36000,
        igst: 0,
      },
    ];
    const res = generateGstnReturnSchema({
      gstin: "27AABCP8821F1Z2",
      legalName: "Prava Enterprise",
      invoices: testInvoices,
    });
    expect(res.gstin).toBe("27AABCP8821F1Z2");
    expect(res.gstnPortalJson.version).toBe("GSTR3B_v1.0");
    expect(res.outwardSupplies.taxableSupplies).toBe(1000000);
    expect(res.netCashPayable.totalCashPayable).toBeGreaterThan(0);
    expect(res.jsonString).toContain("GSTR3B_v1.0");
  });

  it("audits vendor invoices for Section 17(5) blocked ITC and MSME rules", () => {
    const auditClean = auditVendorInvoice({
      expenseCategory: "Cloud Server Hosting",
      taxableAmount: 100000,
      msmeStatus: "micro",
      hasWrittenContract: true,
    });
    expect(auditClean.itcEligible).toBe(true);
    expect(auditClean.msmeAudit.daysAllowed).toBe(45);

    const auditBlocked = auditVendorInvoice({
      expenseCategory: "Executive Lunch and Catering Services",
      taxableAmount: 25000,
      msmeStatus: "non_msme",
    });
    expect(auditBlocked.itcEligible).toBe(false);
    expect(auditBlocked.auditStatus).toBe("REJECT_ITC");
    expect(auditBlocked.blockedReason).toContain("17(5)");
  });

  it("generates balanced Schedule III Balance Sheet and Profit & Loss statement", () => {
    const financials = generateSchedule3Financials({ revenue: 10000000, expenses: 6000000 });
    expect(financials.balanceSheet.equityAndLiabilities.totalEquityAndLiabilities).toBe(
      financials.balanceSheet.assets.totalAssets
    );
    expect(financials.ratios.length).toBeGreaterThanOrEqual(5);
    expect(financials.profitAndLoss.profitAfterTax).toBeGreaterThan(0);
  });

  it("generates Form 3CD Tax Audit statutory clauses", () => {
    const report = generateForm3CDTaxAudit();
    expect(report.assessmentYear).toBe("2025-26");
    expect(report.clauses.length).toBeGreaterThanOrEqual(7);
    expect(report.clauses.some(c => c.clause === "Clause 17")).toBe(true);
    expect(report.clauses.some(c => c.clause === "Clause 22")).toBe(true);
  });

  it("answers CA consultation questions using RAG engine", () => {
    const copilotAnswer = askCaCopilotRag("Can I claim ITC on MacBooks purchased for developers?");
    expect(copilotAnswer.answer).toContain("100% entitled");
    expect(copilotAnswer.legalCitations.some(c => c.includes("16(1)"))).toBe(true);
    expect(copilotAnswer.riskAssessment).toContain("ZERO RISK");
  });

  it("returns statutory compliance calendar with penalty provisions", () => {
    const cal = getStatutoryComplianceCalendar();
    expect(cal.length).toBeGreaterThan(0);
    expect(cal.some(c => c.category === "GST")).toBe(true);
    expect(cal.some(c => c.category === "Direct Tax")).toBe(true);
  });
});
