import { COOKIE_NAME, NOT_ADMIN_ERR_MSG, NOT_CA_ERR_MSG, UNAUTHED_ERR_MSG } from "../shared/const.js";
import { z } from "zod";
import { adminLoginSchema, signInLocalAdministrator, signInUnified, unifiedLoginSchema } from "./adminLogin.js";
import { getStorageHealth } from "./storage.js";
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
import {
  acceptBusinessInvitation,
  auditLogSchema,
  createBusinessInvitation,
  getAdminSecurityOverview,
  invitationSchema,
  revokeBusinessInvitation,
  rotateAdministratorPassword,
  rotatePasswordSchema,
  searchAdminAuditLog,
} from "./adminSecurity.js";
import { caLoginSchema, signInCa } from "./caAuth.js";
import {
  assignCaToBusiness,
  caAssignmentSchema,
  caDecisionSchema,
  getAssignedWorkspacesForCa,
  getCaDashboardStats,
  getCaProfileForUser,
  grantCaAccess,
  grantCaAccessSchema,
  listAllCas,
  listCaReviewQueue,
  resetCaPassword,
  resetCaPasswordSchema,
  submitCaDecision,
  unassignCaFromBusiness,
  updateCaStatus,
  updateCaStatusSchema,
} from "./caManagement.js";
import { getSessionCookieOptions } from "./_core/cookies.js";
import { notifyOwner } from "./_core/notification.js";
import {
  createBusinessWithOwner,
  getBusinessForUser,
  getBusinessesForUser,
  getLatestFinancialSummaryForUser,
  updateBusinessOnboarding,
  updateBusinessProfile,
} from "./db.js";
import {
  getAdminBillingOverview,
  getBillingSnapshot,
  planUpdateSchema,
  subscriptionAdminSchema,
  updatePlanFromAdmin,
  updateSubscriptionFromAdmin,
} from "./entitlements.js";
import { financialSummaryQuerySchema } from "./finance.js";
import {
  auditGstSubmissionExport,
  csvForGstSubmissions,
  gstAdminDecisionSchema,
  gstAdminSearchSchema,
  listAdminGstSubmissions,
  listMyGstSubmissionNotifications,
  rejectAuthorizedGstSubmission,
} from "./gstAdmin.js";
import {
  businessIdSchema,
  createOperationalTask,
  approveAuthorizedGstSubmission,
  authorizedSubmissionApprovalSchema,
  authorizedSubmissionRequestSchema,
  createTaskSchema,
  documentIdSchema,
  getActionCenter,
  getDocumentForUser,
  getTaskForUser,
  listDocumentsForUser,
  listReconciliationForUser,
  listTasksForUser,
  markGstSubmissionPending,
  prepareCashReconciliation,
  prepareGstReturn,
  reconcileGstTask,
  reconciliationResolutionSchema,
  requirementResolutionSchema,
  requestProfessionalReview,
  requestAuthorizedGstSubmission,
  reviewDocumentForUser,
  reviewDocumentSchema,
  resolveActionItem,
  resolveReconciliationItem,
  resolveTaskRequirement,
  taskIdSchema,
  uploadAndProcessDocument,
  uploadDocumentSchema,
} from "./operations.js";
import { businessInputSchema, updateOnboardingSchema, updateBusinessProfileSchema } from "./workspace.js";
import { getIntegrationReadiness, integrationSettingsSchema, listIntegrationSettings, saveIntegrationSettings } from "./integrationReadiness.js";
import { askPrava, askPravaInputSchema, getCaReviewItemsForUser, getSuggestedQuestions } from "./assistant.js";
import {
  generateCaComplianceCertificate,
  generateGstnPortalJson,
  generateGstSpreadsheet,
  getGstFilingWorkbench,
  runGstInvoiceRag,
  updateGstLineItem,
} from "./gstFiling.js";

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

function checkUser(ctx) {
  if (!ctx.user) {
    const err = new Error(UNAUTHED_ERR_MSG);
    err.code = "UNAUTHORIZED";
    throw err;
  }
}

function checkAdmin(ctx) {
  checkUser(ctx);
  if (ctx.user.role !== "admin") {
    const err = new Error(NOT_ADMIN_ERR_MSG);
    err.code = "FORBIDDEN";
    throw err;
  }
}

function checkCa(ctx) {
  checkUser(ctx);
  if (ctx.user.role !== "ca" && ctx.user.role !== "admin") {
    const err = new Error(NOT_CA_ERR_MSG);
    err.code = "FORBIDDEN";
    throw err;
  }
}

export const appRouter = {
  createCaller(ctx) {
    return {
      system: {
        health: async (input) => {
          z.object({ timestamp: z.number().min(0) }).parse(input);
          return { ok: true };
        },
        notifyOwner: async (input) => {
          checkAdmin(ctx);
          const parsed = z.object({ title: z.string().min(1), content: z.string().min(1) }).parse(input);
          const delivered = await notifyOwner(parsed);
          return { success: delivered };
        },
      },
      assistant: {
        ask: async (input) => {
          checkUser(ctx);
          const parsed = askPravaInputSchema.parse(input);
          return askPrava(ctx.user.id, parsed);
        },
        suggestedPrompts: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.parse(input);
          return getSuggestedQuestions(ctx.user.id, parsed.businessId);
        },
        caReviews: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.parse(input);
          return getCaReviewItemsForUser(ctx.user.id, parsed.businessId);
        },
      },
      auth: {
        me: async () => ctx.user,
        login: async (input) => {
          const parsed = unifiedLoginSchema.parse(input);
          return signInUnified(ctx, parsed);
        },
        adminLogin: async (input) => {
          const parsed = adminLoginSchema.parse(input);
          return signInLocalAdministrator(ctx, parsed);
        },
        caLogin: async (input) => {
          const parsed = caLoginSchema.parse(input);
          return signInCa(ctx, parsed);
        },
        logout: async () => {
          ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
          return { success: true };
        },
      },
      businesses: {
        list: async () => {
          checkUser(ctx);
          return getBusinessesForUser(ctx.user.id);
        },
        create: async (input) => {
          checkUser(ctx);
          const parsed = businessInputSchema.parse(input);
          return createBusinessWithOwner(ctx.user.id, parsed);
        },
        updateOnboarding: async (input) => {
          checkUser(ctx);
          const parsed = updateOnboardingSchema.parse(input);
          return updateBusinessOnboarding(ctx.user.id, parsed);
        },
        updateProfile: async (input) => {
          checkUser(ctx);
          const parsed = updateBusinessProfileSchema.parse(input);
          return updateBusinessProfile(ctx.user.id, parsed);
        },
      },
      finance: {
        latestSummary: async (input) => {
          checkUser(ctx);
          const parsed = financialSummaryQuerySchema.parse(input);
          return getLatestFinancialSummaryForUser(ctx.user.id, parsed.businessId);
        },
      },
      tasks: {
        create: async (input) => {
          checkUser(ctx);
          const parsed = createTaskSchema.parse(input);
          return createOperationalTask(ctx.user.id, parsed);
        },
        list: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.parse(input);
          return listTasksForUser(ctx.user.id, parsed.businessId);
        },
        get: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return getTaskForUser(ctx.user.id, parsed.taskId);
        },
        prepareGst: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return prepareGstReturn(ctx.user.id, parsed.taskId);
        },
        prepareCashReconciliation: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return prepareCashReconciliation(ctx.user.id, parsed.taskId);
        },
        markSubmissionPending: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return markGstSubmissionPending(ctx.user.id, parsed.taskId);
        },
        requestAuthorizedSubmission: async (input) => {
          checkUser(ctx);
          const parsed = authorizedSubmissionRequestSchema.parse(input);
          return requestAuthorizedGstSubmission(ctx.user.id, parsed);
        },
        approveAuthorizedSubmission: async (input) => {
          checkUser(ctx);
          const parsed = authorizedSubmissionApprovalSchema.parse(input);
          return approveAuthorizedGstSubmission(ctx.user.id, parsed);
        },
        reconcileGst: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return reconcileGstTask(ctx.user.id, parsed.taskId);
        },
        resolveRequirement: async (input) => {
          checkUser(ctx);
          const parsed = requirementResolutionSchema.parse(input);
          return resolveTaskRequirement(ctx.user.id, parsed);
        },
        requestProfessionalReview: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.extend({ note: z.string().max(1000).optional() }).parse(input);
          return requestProfessionalReview(ctx.user.id, parsed.taskId, parsed.note);
        },
      },
      documents: {
        list: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.extend({ taskId: z.number().int().positive().optional() }).parse(input);
          return listDocumentsForUser(ctx.user.id, parsed.businessId, parsed.taskId);
        },
        get: async (input) => {
          checkUser(ctx);
          const parsed = documentIdSchema.parse(input);
          return getDocumentForUser(ctx.user.id, parsed.documentId);
        },
        upload: async (input) => {
          checkUser(ctx);
          const parsed = uploadDocumentSchema.parse(input);
          return uploadAndProcessDocument(ctx.user.id, parsed);
        },
        review: async (input) => {
          checkUser(ctx);
          const parsed = reviewDocumentSchema.parse(input);
          return reviewDocumentForUser(ctx.user.id, parsed);
        },
      },
      actions: {
        list: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.parse(input);
          return getActionCenter(ctx.user.id, parsed.businessId);
        },
        resolve: async (input) => {
          checkUser(ctx);
          const parsed = z.object({ actionId: z.number().int().positive(), resolution: z.enum(["resolved", "dismissed"]) }).parse(input);
          return resolveActionItem(ctx.user.id, parsed.actionId, parsed.resolution);
        },
      },
      notifications: {
        gstSubmissionDecisions: async () => {
          checkUser(ctx);
          return listMyGstSubmissionNotifications(ctx.user.id);
        },
      },
      reconciliation: {
        list: async (input) => {
          checkUser(ctx);
          const parsed = taskIdSchema.parse(input);
          return listReconciliationForUser(ctx.user.id, parsed.taskId);
        },
        resolve: async (input) => {
          checkUser(ctx);
          const parsed = reconciliationResolutionSchema.parse(input);
          return resolveReconciliationItem(ctx.user.id, parsed);
        },
      },
      billing: {
        snapshot: async (input) => {
          checkUser(ctx);
          const parsed = businessIdSchema.parse(input);
          const workspace = await getBusinessForUser(parsed.businessId, ctx.user.id);
          if (!workspace) throw new Error("You do not have access to this workspace.");
          return getBillingSnapshot(parsed.businessId);
        },
      },
      admin: {
        billingOverview: async () => {
          checkAdmin(ctx);
          return getAdminBillingOverview();
        },
        updatePlan: async (input) => {
          checkAdmin(ctx);
          const parsed = planUpdateSchema.parse(input);
          return updatePlanFromAdmin(ctx.user.id, parsed);
        },
        updateSubscription: async (input) => {
          checkAdmin(ctx);
          const parsed = subscriptionAdminSchema.parse(input);
          return updateSubscriptionFromAdmin(ctx.user.id, parsed);
        },
        securityOverview: async () => {
          checkAdmin(ctx);
          return getAdminSecurityOverview();
        },
        createInvitation: async (input) => {
          checkAdmin(ctx);
          const parsed = invitationSchema.parse(input);
          return createBusinessInvitation(ctx.user.id, parsed);
        },
        revokeInvitation: async (input) => {
          checkAdmin(ctx);
          const parsed = z.object({ invitationId: z.number().int().positive() }).parse(input);
          return revokeBusinessInvitation(ctx.user.id, parsed.invitationId);
        },
        rotatePassword: async (input) => {
          checkAdmin(ctx);
          const parsed = rotatePasswordSchema.parse(input);
          return rotateAdministratorPassword(ctx.user, parsed);
        },
        auditLog: async (input) => {
          checkAdmin(ctx);
          const parsed = auditLogSchema.parse(input);
          return searchAdminAuditLog(parsed);
        },
        gstSubmissions: async (input) => {
          checkAdmin(ctx);
          const parsed = gstAdminSearchSchema.parse(input);
          return listAdminGstSubmissions(parsed);
        },
        exportGstSubmissions: async (input) => {
          checkAdmin(ctx);
          const parsed = gstAdminSearchSchema.parse(input);
          const rows = await listAdminGstSubmissions(parsed);
          await auditGstSubmissionExport(ctx.user.id, parsed, rows.length);
          return { filename: `prava-gst-submissions-${new Date().toISOString().slice(0, 10)}.csv`, csv: csvForGstSubmissions(rows), generatedAt: new Date() };
        },
        rejectGstSubmission: async (input) => {
          checkAdmin(ctx);
          const parsed = gstAdminDecisionSchema.parse(input);
          return rejectAuthorizedGstSubmission(ctx.user.id, parsed);
        },
        integrationReadiness: async () => {
          checkAdmin(ctx);
          return getIntegrationReadiness();
        },
        integrationSettings: async () => {
          checkAdmin(ctx);
          return listIntegrationSettings();
        },
        updateIntegrationSettings: async (input) => {
          checkAdmin(ctx);
          const parsed = integrationSettingsSchema.parse(input);
          return saveIntegrationSettings(ctx.user.id, parsed);
        },
        listCas: async () => {
          checkAdmin(ctx);
          return listAllCas();
        },
        grantCaAccess: async (input) => {
          checkAdmin(ctx);
          const parsed = grantCaAccessSchema.parse(input);
          return grantCaAccess(ctx.user.id, parsed);
        },
        updateCaStatus: async (input) => {
          checkAdmin(ctx);
          const parsed = updateCaStatusSchema.parse(input);
          return updateCaStatus(ctx.user.id, parsed);
        },
        resetCaPassword: async (input) => {
          checkAdmin(ctx);
          const parsed = resetCaPasswordSchema.parse(input);
          return resetCaPassword(ctx.user.id, parsed);
        },
        assignCaToBusiness: async (input) => {
          checkAdmin(ctx);
          const parsed = caAssignmentSchema.parse(input);
          return assignCaToBusiness(ctx.user.id, parsed);
        },
        unassignCaFromBusiness: async (input) => {
          checkAdmin(ctx);
          const parsed = z.object({ caUserId: z.number().int().positive(), businessId: z.number().int().positive() }).parse(input);
          return unassignCaFromBusiness(ctx.user.id, parsed.caUserId, parsed.businessId);
        },
      },
      ca: {
        dashboard: async () => {
          checkCa(ctx);
          return getCaDashboardStats(ctx.user.id);
        },
        profile: async () => {
          checkCa(ctx);
          return getCaProfileForUser(ctx.user.id);
        },
        workspaces: async () => {
          checkCa(ctx);
          return getAssignedWorkspacesForCa(ctx.user.id);
        },
        reviewQueue: async () => {
          checkCa(ctx);
          return listCaReviewQueue(ctx.user.id);
        },
        submitDecision: async (input) => {
          checkCa(ctx);
          const parsed = caDecisionSchema.parse(input);
          return submitCaDecision(ctx.user.id, parsed);
        },
      },
      gst: {
        workbench: async (input) => {
          checkUser(ctx);
          return getGstFilingWorkbench(ctx.user.id, input?.businessId ?? 1, input?.period);
        },
        runRag: async (input) => {
          checkUser(ctx);
          return runGstInvoiceRag(ctx.user.id, input?.businessId ?? 1, input?.period);
        },
        updateLineItem: async (input) => {
          checkUser(ctx);
          return updateGstLineItem(ctx.user.id, input.businessId ?? 1, input.period, input);
        },
        exportPortalJson: async (input) => {
          checkUser(ctx);
          return generateGstnPortalJson(ctx.user.id, input?.businessId ?? 1, input?.period);
        },
        exportSpreadsheet: async (input) => {
          checkUser(ctx);
          return generateGstSpreadsheet(ctx.user.id, input?.businessId ?? 1, input?.period);
        },
        exportComplianceCert: async (input) => {
          checkUser(ctx);
          return generateCaComplianceCertificate(ctx.user.id, input?.businessId ?? 1, input?.period);
        },
      },
      invitations: {
        accept: async (input) => {
          checkUser(ctx);
          const parsed = z.object({ token: z.string().min(20).max(256) }).parse(input);
          return acceptBusinessInvitation(ctx.user, parsed.token);
        },
      },
      storage: {
        status: async () => {
          return getStorageHealth();
        },
      },
      caEngine: {
        advanceTax: async (input) => {
          checkUser(ctx);
          let grossRevenue = input?.grossRevenue;
          let operatingExpenses = input?.operatingExpenses;
          const businessId = await resolveBusinessId(ctx.user.id, input?.businessId);

          if (businessId && (grossRevenue === undefined || operatingExpenses === undefined)) {
            const totals = await getDocFinancialTotals(ctx.user.id, businessId);
            if (grossRevenue === undefined) grossRevenue = totals.revenue;
            if (operatingExpenses === undefined) operatingExpenses = totals.expenses;
          }

          return calculateAdvanceTax({
            ...input,
            grossRevenue: grossRevenue ?? 0,
            operatingExpenses: operatingExpenses ?? 0,
          });
        },
        msmeAudit: async (input) => {
          checkUser(ctx);
          if (input?.invoices) return auditMsme43BhCompliance(input.invoices);
          const businessId = await resolveBusinessId(ctx.user.id, input?.businessId);
          if (businessId) {
            const docs = await listDocumentsForUser(ctx.user.id, businessId);
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
            return auditMsme43BhCompliance(purchaseInvoices);
          }
          return auditMsme43BhCompliance();
        },
        gstr2bReconcile: async (input) => {
          checkUser(ctx);
          const businessId = await resolveBusinessId(ctx.user.id, input?.businessId);
          if (businessId) {
            const docs = await listDocumentsForUser(ctx.user.id, businessId);
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
            return reconcileGstr2B(purchaseInvoices);
          }
          return reconcileGstr2B();
        },
        tdsCompliance: async () => {
          checkUser(ctx);
          return getTdsComplianceOverview();
        },
        cashAudit: async () => {
          checkUser(ctx);
          return auditCashTransactions();
        },
        draftNoticeDefense: async (input) => {
          checkUser(ctx);
          return draftTaxNoticeDefense(input);
        },
        complianceCalendar: async () => {
          return getStatutoryComplianceCalendar();
        },
        gstnFilingJson: async (input) => {
          checkUser(ctx);
          const businessId = await resolveBusinessId(ctx.user.id, input?.businessId);
          if (!businessId) {
            return generateGstnReturnSchema(input || {});
          }
          const biz = await getBusinessForUser(businessId, ctx.user.id);
          const docs = await listDocumentsForUser(ctx.user.id, businessId);
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

          return generateGstnReturnSchema({
            legalName: biz?.name,
            gstin: input?.gstin || biz?.gstin || (invoices[0]?.gstin ?? ""),
            returnPeriod: input?.returnPeriod || "092024",
            invoices,
            isDynamic: true,
          });
        },
        auditInvoice: async (input) => {
          checkUser(ctx);
          return auditVendorInvoice(input);
        },
        schedule3Financials: async (input) => {
          checkUser(ctx);
          const businessId = await resolveBusinessId(ctx.user.id, input?.businessId);
          if (businessId) {
            const biz = await getBusinessForUser(businessId, ctx.user.id);
            const { revenue, expenses } = await getDocFinancialTotals(ctx.user.id, businessId);
            return generateSchedule3Financials({
              entityName: biz?.name,
              cin: biz?.registrationNumber || "U72900MH2024PTC000000",
              revenue,
              expenses,
              isDynamic: true,
            });
          }
          return generateSchedule3Financials();
        },
        form3CdTaxAudit: async () => {
          checkUser(ctx);
          return generateForm3CDTaxAudit();
        },
        askCopilot: async (input) => {
          checkUser(ctx);
          return askCaCopilotRag(input.query);
        },
      },
    };
  },
};
