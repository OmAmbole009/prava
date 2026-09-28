import { Router } from "express";
import { z } from "zod";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
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
} from "../caEngine.js";
import { getBusinessesForUser, getBusinessForUser } from "../db.js";
import { listDocumentsForUser } from "../operations.js";

const router = Router();

async function resolveBusinessId(userId, inputBusinessId) {
  if (inputBusinessId) return inputBusinessId;
  const bizList = await getBusinessesForUser(userId);
  return bizList?.[0]?.id;
}

async function getDocFinancialTotals(userId, businessId) {
  const docs = await listDocumentsForUser(userId, businessId);
  let revenue = 0;
  let expenses = 0;
  for (const d of docs) {
    if (!d.extraction) continue;
    const amt = (d.extraction.taxableValueMinor || d.extraction.totalMinor || 0) / 100;
    if (d.extraction.invoiceType === "sales") revenue += amt;
    else if (d.extraction.invoiceType === "purchase") expenses += amt;
  }
  return { revenue, expenses, docs };
}

// Public: compliance calendar
router.get("/compliance-calendar", async (_req, res) => {
  try {
    const calendar = await getStatutoryComplianceCalendar();
    return sendData(res, calendar);
  } catch (error) {
    return sendError(res, error);
  }
});

// All remaining caEngine endpoints require authenticated user
router.use(requireUser);

// Advance tax
const advanceTaxHandler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    let businessId = params.businessId ? parseInt(params.businessId, 10) : undefined;
    let grossRevenue = params.grossRevenue !== undefined ? parseFloat(params.grossRevenue) : undefined;
    let operatingExpenses = params.operatingExpenses !== undefined ? parseFloat(params.operatingExpenses) : undefined;
    const depreciation = params.depreciation !== undefined ? parseFloat(params.depreciation) : undefined;
    const otherIncome = params.otherIncome !== undefined ? parseFloat(params.otherIncome) : undefined;
    const deductions80C = params.deductions80C !== undefined ? parseFloat(params.deductions80C) : undefined;
    const deductions80D = params.deductions80D !== undefined ? parseFloat(params.deductions80D) : undefined;
    const tdsAlreadyDeducted = params.tdsAlreadyDeducted !== undefined ? parseFloat(params.tdsAlreadyDeducted) : undefined;
    const entityType = params.entityType;

    businessId = await resolveBusinessId(req.user.id, businessId);

    if (businessId && (grossRevenue === undefined || operatingExpenses === undefined)) {
      const totals = await getDocFinancialTotals(req.user.id, businessId);
      if (grossRevenue === undefined) grossRevenue = totals.revenue;
      if (operatingExpenses === undefined) operatingExpenses = totals.expenses;
    }

    const result = calculateAdvanceTax({
      grossRevenue: grossRevenue ?? 0,
      operatingExpenses: operatingExpenses ?? 0,
      depreciation,
      otherIncome,
      deductions80C,
      deductions80D,
      tdsAlreadyDeducted,
      entityType,
    });
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/advance-tax", advanceTaxHandler);
router.post("/advance-tax", advanceTaxHandler);

// MSME 43B(h) Audit
const msmeAuditHandler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    if (params.invoices && Array.isArray(params.invoices)) {
      return sendData(res, auditMsme43BhCompliance(params.invoices));
    }
    const businessId = await resolveBusinessId(req.user.id, params.businessId ? parseInt(params.businessId, 10) : undefined);
    if (businessId) {
      const docs = await listDocumentsForUser(req.user.id, businessId);
      const purchaseInvoices = docs
        .filter(d => d.extraction && d.extraction.invoiceType === "purchase")
        .map(d => ({
          id: `INV-${d.document.id}`,
          invoiceNumber: d.extraction.invoiceNumber || `DOC-${d.document.id}`,
          vendorName: d.extraction.vendorName || "Commercial Vendor",
          udyamNumber: d.extraction.udyamNumber || "",
          enterpriseCategory: d.extraction.msmeStatus || "micro",
          hasWrittenAgreement: d.extraction.hasWrittenContract ?? true,
          invoiceDate: d.extraction.invoiceDate || new Date().toISOString().slice(0, 10),
          invoiceAmount: (d.extraction.totalMinor || 0) / 100,
          paymentDate: d.extraction.paymentDate || null,
          daysOutstanding: d.extraction.invoiceDate ? Math.max(0, Math.floor((Date.now() - new Date(d.extraction.invoiceDate).getTime()) / 86400000)) : 0,
          status: "open",
        }));
      return sendData(res, auditMsme43BhCompliance(purchaseInvoices));
    }
    return sendData(res, auditMsme43BhCompliance());
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/msme-audit", msmeAuditHandler);
router.post("/msme-audit", msmeAuditHandler);

// GSTR-2B Reconcile
const gstr2bReconcileHandler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const businessId = await resolveBusinessId(req.user.id, params.businessId ? parseInt(params.businessId, 10) : undefined);
    if (businessId) {
      const docs = await listDocumentsForUser(req.user.id, businessId);
      const purchaseInvoices = docs
        .filter(d => d.extraction && d.extraction.invoiceType === "purchase")
        .map(d => ({
          invoiceNumber: d.extraction.invoiceNumber || `DOC-${d.document.id}`,
          vendorName: d.extraction.vendorName || "Commercial Vendor",
          gstin: d.extraction.gstin,
          invoiceDate: d.extraction.invoiceDate,
          taxableValue: (d.extraction.taxableValueMinor || 0) / 100,
          cgst: (d.extraction.cgstMinor || 0) / 100,
          sgst: (d.extraction.sgstMinor || 0) / 100,
          igst: (d.extraction.igstMinor || 0) / 100,
        }));
      return sendData(res, reconcileGstr2B(purchaseInvoices));
    }
    return sendData(res, reconcileGstr2B());
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/gstr2b-reconcile", gstr2bReconcileHandler);
router.post("/gstr2b-reconcile", gstr2bReconcileHandler);

// TDS Compliance
router.get("/tds-compliance", async (_req, res) => {
  try {
    const result = getTdsComplianceOverview();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Cash Audit
router.get("/cash-audit", async (_req, res) => {
  try {
    const result = auditCashTransactions();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Draft Notice Defense
router.post("/draft-notice-defense", async (req, res) => {
  try {
    const schema = z.object({
      noticeType: z.enum(["gst_asmt_10", "it_143_1", "it_139_9", "gst_drc_01"]).default("gst_asmt_10"),
      taxpayerName: z.string().optional(),
      gstinOrPan: z.string().optional(),
      noticeRef: z.string().optional(),
      disputedAmount: z.number().optional(),
      assessmentYear: z.string().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = draftTaxNoticeDefense(parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// GSTN Filing JSON
const gstnFilingJsonHandler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const businessId = await resolveBusinessId(req.user.id, params.businessId ? parseInt(params.businessId, 10) : undefined);
    if (!businessId) {
      return sendData(res, generateGstnReturnSchema(params || {}));
    }
    const biz = await getBusinessForUser(businessId, req.user.id);
    const docs = await listDocumentsForUser(req.user.id, businessId);
    const invoices = docs
      .filter(d => d.extraction)
      .map(d => ({
        ...d.extraction,
        originalName: d.document.originalName,
        documentId: d.document.id,
        isBlocked17_5: d.extraction.isBlocked17_5,
        blockedReason: d.extraction.blockedReason,
        direction: d.extraction.invoiceType === "sales" ? "outward" : "inward",
        taxableValue: (d.extraction.taxableValueMinor || 0) / 100,
        cgst: (d.extraction.cgstMinor || 0) / 100,
        sgst: (d.extraction.sgstMinor || 0) / 100,
        igst: (d.extraction.igstMinor || 0) / 100,
        total: (d.extraction.totalMinor || 0) / 100,
      }));

    const now = new Date();
    const defReturnPeriod = `${String(now.getMonth() + 1).padStart(2, "0")}${now.getFullYear()}`;
    const result = generateGstnReturnSchema({
      legalName: biz?.name,
      gstin: params.gstin || biz?.gstin || (invoices[0]?.gstin ?? ""),
      returnPeriod: params.returnPeriod || defReturnPeriod,
      invoices,
      isDynamic: true,
    });
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/gstn-filing-json", gstnFilingJsonHandler);
router.post("/gstn-filing-json", gstnFilingJsonHandler);

// Audit Invoice
router.post("/audit-invoice", async (req, res) => {
  try {
    const schema = z.object({
      vendorName: z.string().optional(),
      vendorGstin: z.string().optional(),
      invoiceNumber: z.string().optional(),
      invoiceDate: z.string().optional(),
      taxableAmount: z.number().optional(),
      gstRate: z.number().optional(),
      sacOrHsn: z.string().optional(),
      expenseCategory: z.string().optional(),
      msmeStatus: z.enum(["micro", "small", "medium", "non_msme"]).optional(),
      hasWrittenContract: z.boolean().optional(),
    });
    const parsed = schema.parse(req.body);
    const result = auditVendorInvoice(parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Schedule 3 Financials
const schedule3Handler = async (req, res) => {
  try {
    const params = { ...req.query, ...req.body };
    const businessId = await resolveBusinessId(req.user.id, params.businessId ? parseInt(params.businessId, 10) : undefined);
    if (businessId) {
      const biz = await getBusinessForUser(businessId, req.user.id);
      const { revenue, expenses } = await getDocFinancialTotals(req.user.id, businessId);
      const result = generateSchedule3Financials({
        entityName: biz?.name,
        cin: biz?.registrationNumber || `U72900MH${new Date().getFullYear()}PTC000000`,
        revenue,
        expenses,
        isDynamic: true,
      });
      return sendData(res, result);
    }
    return sendData(res, generateSchedule3Financials());
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/schedule3-financials", schedule3Handler);
router.post("/schedule3-financials", schedule3Handler);

// Form 3CD Tax Audit
router.get("/form3cd-tax-audit", async (_req, res) => {
  try {
    const result = generateForm3CDTaxAudit();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Ask Copilot (RAG)
router.post("/ask-copilot", async (req, res) => {
  try {
    const schema = z.object({ query: z.string() });
    const parsed = schema.parse(req.body);
    const result = await askCaCopilotRag(parsed.query);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
