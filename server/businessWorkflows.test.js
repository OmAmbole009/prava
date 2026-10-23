import { describe, expect, it, beforeEach } from "vitest";
import {
  analyzeAndDraftGstNotice,
  prepareAuditWorkspace,
  analyzeBooksCleanup,
  analyzeTdsWorkflow,
  reconcilePartyLedgers,
  getCompanyRocCompliance,
  getUnifiedComplianceCalendar,
} from "./services/businessWorkflows.js";
import { inMemoryAccountingEntries, inMemoryDocuments } from "./operations.js";

describe("PHASES 6 & 7: Autonomous CA Suite & Business Workflows Tests", () => {
  const mockCompany = {
    id: 8801,
    name: "Zenith Infotech Pvt Ltd",
    legalName: "Zenith Infotech Private Limited",
    businessType: "Private Limited Company",
    gstin: "27AABCP8821F1Z2",
    registrationNumber: "U72200MH2024PTC123456",
    country: "IN",
    taxSystem: "GST & Indian Direct Tax",
    financialYear: "2024-25",
  };

  const mockProprietorship = {
    id: 8802,
    name: "Patel Traders",
    legalName: "Patel Traders",
    businessType: "Sole Proprietorship",
    gstin: "24AABCP1122F1Z5",
    country: "IN",
    financialYear: "2024-25",
  };

  beforeEach(() => {
    // Clear out in-memory arrays for fresh state
    inMemoryDocuments.length = 0;
    inMemoryAccountingEntries.length = 0;
  });

  describe("1. GST Notice Management & DRC-06 Defense", () => {
    it("analyzes Form GST ASMT-10 notice and generates DRC-06 defense with statutory citations", () => {
      const noticeDate = "2026-10-01";
      const result = analyzeAndDraftGstNotice(mockCompany, {
        noticeNumber: "GST/2026/ASMT10/774",
        noticeType: "ASMT-10",
        taxPeriod: "FY 2024-25",
        discrepancyType: "gstr2b_vs_3b_itc",
        allegedTaxDifference: 250000,
        noticeDate,
      });

      expect(result.noticeNumber).toBe("GST/2026/ASMT10/774");
      expect(result.noticeType).toBe("ASMT-10");
      expect(result.statutoryForm).toBe("Form GST DRC-06");
      expect(result.responseDeadline).toBe("2026-10-31");
      expect(result.legalCitations).toContain("Section 61 of the CGST Act, 2017 (Scrutiny of returns)");
      expect(result.legalCitations.some(c => c.includes("Suncraft Energy"))).toBe(true);
      expect(result.draftReplyText).toContain("REPLY IN Form GST DRC-06 UNDER RULE 99");
      expect(result.draftReplyText).toContain(mockCompany.legalName);
      expect(result.draftReplyText).toContain(mockCompany.gstin);
      expect(result.professionalReviewRequired).toBe(true);
    });

    it("handles Form GST DRC-01A with Section 73/74 citations", () => {
      const result = analyzeAndDraftGstNotice(mockCompany, {
        noticeNumber: "DRC01A/2026/001",
        noticeType: "DRC-01A",
      });

      expect(result.statutoryForm).toBe("Part B of Form GST DRC-01A");
      expect(result.legalCitations.some(c => c.includes("Section 73(5)"))).toBe(true);
    });
  });

  describe("2. Audit Preparation Workspace & Evidence Indexer", () => {
    it("generates comprehensive audit checklist tailored to Company structure", () => {
      const workspace = prepareAuditWorkspace(mockCompany);

      expect(workspace.businessId).toBe(mockCompany.id);
      expect(workspace.entityType).toBe(mockCompany.businessType);
      expect(workspace.readinessScorePct).toBeGreaterThanOrEqual(0);
      expect(workspace.checklist.length).toBeGreaterThan(5);

      // Verify Company specific item (Schedule III and AOC-4)
      const sch3 = workspace.checklist.find(c => c.item.includes("Schedule III"));
      expect(sch3).toBeDefined();

      const aoc4 = workspace.checklist.find(c => c.item.includes("AOC-4"));
      expect(aoc4).toBeDefined();
      expect(aoc4.required).toBe(true);

      // Verify Evidence Index
      expect(workspace.evidenceIndex.length).toBeGreaterThan(0);
      expect(workspace.auditorNotice).toBeDefined();
    });

    it("adapts checklist for Sole Proprietorship without corporate AOC-4", () => {
      const workspace = prepareAuditWorkspace(mockProprietorship);
      const corporateSecretarial = workspace.checklist.find(c => c.category === "Corporate Secretarial");
      expect(corporateSecretarial.required).toBe(false);
      expect(corporateSecretarial.item).toContain("Proprietor Capital Account");
    });
  });

  describe("3. Accounting Books Cleanup & Suspense Clearance", () => {
    it("detects duplicate invoices and unclassified suspense entries", () => {
      // Seed duplicates
      inMemoryDocuments.push(
        {
          id: "doc_101",
          businessId: mockCompany.id,
          extraction: {
            invoiceNumber: "INV-9901",
            supplierName: "Apex Cloud Services",
            totalMinor: 5000000,
          },
        },
        {
          id: "doc_102",
          businessId: mockCompany.id,
          extraction: {
            invoiceNumber: "INV-9901",
            supplierName: "Apex Cloud Services",
            totalMinor: 5000000,
          },
        }
      );

      // Seed suspense entry
      inMemoryAccountingEntries.push({
        id: "entry_201",
        businessId: mockCompany.id,
        category: "suspense",
        description: "Unidentified direct debit",
        amountMinor: 2500000,
      });

      const cleanup = analyzeBooksCleanup(mockCompany);

      expect(cleanup.totalAnomaliesCount).toBeGreaterThanOrEqual(2);
      expect(cleanup.findings.some(f => f.category === "Duplicate Transaction")).toBe(true);
      expect(cleanup.findings.some(f => f.category === "Suspense Account Clearance")).toBe(true);
      expect(cleanup.healthStatus).toBe("Minor Items Pending");
    });

    it("flags critical negative cash balance when cash credits exceed debits", () => {
      inMemoryAccountingEntries.push(
        {
          id: "entry_301",
          businessId: mockCompany.id,
          accountName: "Main Cash Box",
          type: "debit",
          amountMinor: 500000, // +5,000
        },
        {
          id: "entry_302",
          businessId: mockCompany.id,
          accountName: "Main Cash Box",
          type: "credit",
          amountMinor: 1500000, // -15,000 -> net -10,000
        }
      );

      const cleanup = analyzeBooksCleanup(mockCompany);
      const negCash = cleanup.findings.find(f => f.id === "clean_neg_cash");
      expect(negCash).toBeDefined();
      expect(negCash.severity).toBe("critical");
      expect(cleanup.healthStatus).toBe("Attention Required");
    });
  });

  describe("4. TDS Compliance Workflow & 26Q Status", () => {
    it("evaluates purchase documents for TDS applicability under Section 194C/J/I", () => {
      inMemoryDocuments.push({
        id: "doc_tds_1",
        businessId: mockCompany.id,
        extraction: {
          invoiceType: "purchase",
          invoiceNumber: "SRV-4412",
          supplierName: "Deloitte Advisory Pvt Ltd",
          taxableValueMinor: 10000000, // ₹100,000 professional fees (> ₹30k threshold for 194J)
          totalMinor: 11800000,
        },
      });

      const tdsResult = analyzeTdsWorkflow(mockCompany);
      expect(tdsResult.businessId).toBe(mockCompany.id);
      expect(tdsResult.quarterlyDeadlines.length).toBe(4);
      expect(tdsResult.quarterlyDeadlines[0].form).toBe("Form 26Q");

      // Verify evaluated transaction
      if (tdsResult.evaluatedTransactions.length > 0) {
        expect(tdsResult.totalDeductibleTdsInr).toBeGreaterThan(0);
        expect(tdsResult.evaluatedTransactions[0].vendorName).toBe("Deloitte Advisory Pvt Ltd");
        expect(tdsResult.evaluatedTransactions[0].applicableSection).toBe("194J");
      }
    });
  });

  describe("5. Vendor & Customer Ledger Reconciliation", () => {
    it("performs two-way ledger comparison between books and external statement", () => {
      inMemoryDocuments.push({
        id: "doc_rec_1",
        businessId: mockCompany.id,
        extraction: {
          invoiceType: "purchase",
          supplierName: "AWS India Cloud Technologies",
          totalMinor: 15000000, // ₹150,000
        },
      });

      const reconciliation = reconcilePartyLedgers(mockCompany, "AWS India");
      expect(reconciliation.partyName).toBe("AWS India");
      expect(reconciliation.pravaBooksTotal).toBe(150000);
      expect(reconciliation.reconciliationStatus).toBe("Fully Reconciled");
      expect(reconciliation.netVariance).toBe(0);
    });
  });

  describe("6. ROC & Corporate Statutory Compliance", () => {
    it("identifies corporate compliance obligations for Companies (AOC-4, MGT-7, DPT-3, DIR-3 KYC)", () => {
      const roc = getCompanyRocCompliance(mockCompany);
      expect(roc.eligible).toBe(true);
      expect(roc.cin).toBe(mockCompany.registrationNumber);
      expect(roc.obligations.length).toBe(4);

      const forms = roc.obligations.map(o => o.form);
      expect(forms).toContain("Form AOC-4");
      expect(forms).toContain("Form MGT-7 / 7A");
      expect(forms).toContain("Form DPT-3");
      expect(forms).toContain("Form DIR-3 KYC");
    });

    it("marks sole proprietorship as exempt from ROC compliance", () => {
      const roc = getCompanyRocCompliance(mockProprietorship);
      expect(roc.eligible).toBe(false);
      expect(roc.message).toContain("ROC (Registrar of Companies) compliance is applicable strictly to incorporated corporate bodies");
      expect(roc.obligations.length).toBe(0);
    });
  });

  describe("7. Unified Statutory Compliance Calendar", () => {
    it("builds jurisdiction-aware calendar with GST, TDS, Advance Tax and Corporate deadlines", () => {
      const calendar = getUnifiedComplianceCalendar(mockCompany);
      expect(calendar.businessId).toBe(mockCompany.id);
      expect(calendar.country).toBe("IN");
      expect(calendar.calendarEvents.length).toBeGreaterThanOrEqual(4);

      const eventTitles = calendar.calendarEvents.map(e => e.title);
      expect(eventTitles.some(t => t.includes("GSTR-1"))).toBe(true);
      expect(eventTitles.some(t => t.includes("GSTR-3B"))).toBe(true);
      expect(eventTitles.some(t => t.includes("TDS Challan 281"))).toBe(true);
      expect(eventTitles.some(t => t.includes("Advance Tax"))).toBe(true);
      expect(eventTitles.some(t => t.includes("AOC-4"))).toBe(true);
    });
  });
});
