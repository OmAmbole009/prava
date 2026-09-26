import { COOKIE_NAME } from "../shared/const.js";
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
import { systemRouter } from "./_core/systemRouter.js";
import { adminProcedure, caProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc.js";
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

const gstWorkbenchInputSchema = z.object({
  businessId: z.number().int().optional().default(1),
  period: z.string().optional(),
});

const gstLineItemUpdateSchema = z.object({
  businessId: z.number().int().optional().default(1),
  period: z.string().optional(),
  id: z.string(),
  taxableValue: z.number().optional(),
  rate: z.number().optional(),
  cgst: z.number().optional(),
  sgst: z.number().optional(),
  igst: z.number().optional(),
  itcEligibility: z.string().optional(),
  partyGstin: z.string().optional(),
});

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

export const appRouter = router({
  system: systemRouter,
  assistant: router({
    ask: protectedProcedure.input(askPravaInputSchema).mutation(({ ctx, input }) => askPrava(ctx.user.id, input)),
    suggestedPrompts: protectedProcedure.input(businessIdSchema).query(({ ctx, input }) => getSuggestedQuestions(ctx.user.id, input.businessId)),
    caReviews: protectedProcedure.input(businessIdSchema).query(({ ctx, input }) => getCaReviewItemsForUser(ctx.user.id, input.businessId)),
  }),
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    login: publicProcedure.input(unifiedLoginSchema).mutation(({ ctx, input }) => signInUnified(ctx, input)),
    adminLogin: publicProcedure.input(adminLoginSchema).mutation(({ ctx, input }) => signInLocalAdministrator(ctx, input)),
    caLogin: publicProcedure.input(caLoginSchema).mutation(({ ctx, input }) => signInCa(ctx, input)),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true };
    }),
  }),
  businesses: router({
    list: protectedProcedure.query(({ ctx }) => getBusinessesForUser(ctx.user.id)),
    create: protectedProcedure.input(businessInputSchema).mutation(({ ctx, input }) => createBusinessWithOwner(ctx.user.id, input)),
    updateOnboarding: protectedProcedure.input(updateOnboardingSchema).mutation(({ ctx, input }) => updateBusinessOnboarding(ctx.user.id, input)),
    updateProfile: protectedProcedure.input(updateBusinessProfileSchema).mutation(({ ctx, input }) => updateBusinessProfile(ctx.user.id, input)),
  }),
  finance: router({
    latestSummary: protectedProcedure.input(financialSummaryQuerySchema).query(({ ctx, input }) => getLatestFinancialSummaryForUser(ctx.user.id, input.businessId)),
  }),
  tasks: router({
    create: protectedProcedure.input(createTaskSchema).mutation(({ ctx, input }) => createOperationalTask(ctx.user.id, input)),
    list: protectedProcedure.input(businessIdSchema).query(({ ctx, input }) => listTasksForUser(ctx.user.id, input.businessId)),
    get: protectedProcedure.input(taskIdSchema).query(({ ctx, input }) => getTaskForUser(ctx.user.id, input.taskId)),
    prepareGst: protectedProcedure.input(taskIdSchema).mutation(({ ctx, input }) => prepareGstReturn(ctx.user.id, input.taskId)),
    prepareCashReconciliation: protectedProcedure.input(taskIdSchema).mutation(({ ctx, input }) => prepareCashReconciliation(ctx.user.id, input.taskId)),
    markSubmissionPending: protectedProcedure.input(taskIdSchema).mutation(({ ctx, input }) => markGstSubmissionPending(ctx.user.id, input.taskId)),
    requestAuthorizedSubmission: protectedProcedure.input(authorizedSubmissionRequestSchema).mutation(({ ctx, input }) => requestAuthorizedGstSubmission(ctx.user.id, input)),
    approveAuthorizedSubmission: protectedProcedure.input(authorizedSubmissionApprovalSchema).mutation(({ ctx, input }) => approveAuthorizedGstSubmission(ctx.user.id, input)),
    reconcileGst: protectedProcedure.input(taskIdSchema).mutation(({ ctx, input }) => reconcileGstTask(ctx.user.id, input.taskId)),
    resolveRequirement: protectedProcedure.input(requirementResolutionSchema).mutation(({ ctx, input }) => resolveTaskRequirement(ctx.user.id, input)),
    requestProfessionalReview: protectedProcedure.input(taskIdSchema.extend({ note: z.string().max(1000).optional() })).mutation(({ ctx, input }) => requestProfessionalReview(ctx.user.id, input.taskId, input.note)),
  }),
  documents: router({
    list: protectedProcedure.input(businessIdSchema.extend({ taskId: z.number().int().positive().optional() })).query(({ ctx, input }) => listDocumentsForUser(ctx.user.id, input.businessId, input.taskId)),
    get: protectedProcedure.input(documentIdSchema).query(({ ctx, input }) => getDocumentForUser(ctx.user.id, input.documentId)),
    upload: protectedProcedure.input(uploadDocumentSchema).mutation(({ ctx, input }) => uploadAndProcessDocument(ctx.user.id, input)),
    review: protectedProcedure.input(reviewDocumentSchema).mutation(({ ctx, input }) => reviewDocumentForUser(ctx.user.id, input)),
  }),
  actions: router({
    list: protectedProcedure.input(businessIdSchema).query(({ ctx, input }) => getActionCenter(ctx.user.id, input.businessId)),
    resolve: protectedProcedure.input(z.object({ actionId: z.number().int().positive(), resolution: z.enum(["resolved", "dismissed"]) })).mutation(({ ctx, input }) => resolveActionItem(ctx.user.id, input.actionId, input.resolution)),
  }),
  notifications: router({
    gstSubmissionDecisions: protectedProcedure.query(({ ctx }) => listMyGstSubmissionNotifications(ctx.user.id)),
  }),
  reconciliation: router({
    list: protectedProcedure.input(taskIdSchema).query(({ ctx, input }) => listReconciliationForUser(ctx.user.id, input.taskId)),
    resolve: protectedProcedure.input(reconciliationResolutionSchema).mutation(({ ctx, input }) => resolveReconciliationItem(ctx.user.id, input)),
  }),
  billing: router({
    snapshot: protectedProcedure.input(businessIdSchema).query(async ({ ctx, input }) => {
      const workspace = await getBusinessForUser(input.businessId, ctx.user.id);
      if (!workspace) throw new Error("You do not have access to this workspace.");
      return getBillingSnapshot(input.businessId);
    }),
  }),
  admin: router({
    billingOverview: adminProcedure.query(() => getAdminBillingOverview()),
    updatePlan: adminProcedure.input(planUpdateSchema).mutation(({ ctx, input }) => updatePlanFromAdmin(ctx.user.id, input)),
    updateSubscription: adminProcedure.input(subscriptionAdminSchema).mutation(({ ctx, input }) => updateSubscriptionFromAdmin(ctx.user.id, input)),
    securityOverview: adminProcedure.query(() => getAdminSecurityOverview()),
    createInvitation: adminProcedure.input(invitationSchema).mutation(({ ctx, input }) => createBusinessInvitation(ctx.user.id, input)),
    revokeInvitation: adminProcedure.input(z.object({ invitationId: z.number().int().positive() })).mutation(({ ctx, input }) => revokeBusinessInvitation(ctx.user.id, input.invitationId)),
    rotatePassword: adminProcedure.input(rotatePasswordSchema).mutation(({ ctx, input }) => rotateAdministratorPassword(ctx.user, input)),
    auditLog: adminProcedure.input(auditLogSchema).query(({ input }) => searchAdminAuditLog(input)),
    gstSubmissions: adminProcedure.input(gstAdminSearchSchema).query(({ input }) => listAdminGstSubmissions(input)),
    exportGstSubmissions: adminProcedure.input(gstAdminSearchSchema).query(async ({ ctx, input }) => {
      const rows = await listAdminGstSubmissions(input);
      await auditGstSubmissionExport(ctx.user.id, input, rows.length);
      return { filename: `prava-gst-submissions-${new Date().toISOString().slice(0, 10)}.csv`, csv: csvForGstSubmissions(rows), generatedAt: new Date() };
    }),
    rejectGstSubmission: adminProcedure.input(gstAdminDecisionSchema).mutation(({ ctx, input }) => rejectAuthorizedGstSubmission(ctx.user.id, input)),
    integrationReadiness: adminProcedure.query(() => getIntegrationReadiness()),
    integrationSettings: adminProcedure.query(() => listIntegrationSettings()),
    updateIntegrationSettings: adminProcedure.input(integrationSettingsSchema).mutation(({ ctx, input }) => saveIntegrationSettings(ctx.user.id, input)),
    // CA Management (Admin only)
    listCas: adminProcedure.query(() => listAllCas()),
    grantCaAccess: adminProcedure.input(grantCaAccessSchema).mutation(({ ctx, input }) => grantCaAccess(ctx.user.id, input)),
    updateCaStatus: adminProcedure.input(updateCaStatusSchema).mutation(({ ctx, input }) => updateCaStatus(ctx.user.id, input)),
    resetCaPassword: adminProcedure.input(resetCaPasswordSchema).mutation(({ ctx, input }) => resetCaPassword(ctx.user.id, input)),
    assignCaToBusiness: adminProcedure.input(caAssignmentSchema).mutation(({ ctx, input }) => assignCaToBusiness(ctx.user.id, input)),
    unassignCaFromBusiness: adminProcedure.input(z.object({ caUserId: z.number().int().positive(), businessId: z.number().int().positive() })).mutation(({ ctx, input }) => unassignCaFromBusiness(ctx.user.id, input.caUserId, input.businessId)),
  }),
  ca: router({
    dashboard: caProcedure.query(({ ctx }) => getCaDashboardStats(ctx.user.id)),
    profile: caProcedure.query(({ ctx }) => getCaProfileForUser(ctx.user.id)),
    workspaces: caProcedure.query(({ ctx }) => getAssignedWorkspacesForCa(ctx.user.id)),
    reviewQueue: caProcedure.query(({ ctx }) => listCaReviewQueue(ctx.user.id)),
    submitDecision: caProcedure.input(caDecisionSchema).mutation(({ ctx, input }) => submitCaDecision(ctx.user.id, input)),
  }),
  gst: router({
    workbench: protectedProcedure.input(gstWorkbenchInputSchema).query(({ ctx, input }) => getGstFilingWorkbench(ctx.user.id, input.businessId, input.period)),
    runRag: protectedProcedure.input(gstWorkbenchInputSchema).mutation(({ ctx, input }) => runGstInvoiceRag(ctx.user.id, input.businessId, input.period)),
    updateLineItem: protectedProcedure.input(gstLineItemUpdateSchema).mutation(({ ctx, input }) => updateGstLineItem(ctx.user.id, input.businessId, input.period, input)),
    exportPortalJson: protectedProcedure.input(gstWorkbenchInputSchema).mutation(({ ctx, input }) => generateGstnPortalJson(ctx.user.id, input.businessId, input.period)),
    exportSpreadsheet: protectedProcedure.input(gstWorkbenchInputSchema).mutation(({ ctx, input }) => generateGstSpreadsheet(ctx.user.id, input.businessId, input.period)),
    exportComplianceCert: protectedProcedure.input(gstWorkbenchInputSchema).mutation(({ ctx, input }) => generateCaComplianceCertificate(ctx.user.id, input.businessId, input.period)),
  }),
  invitations: router({
    accept: protectedProcedure.input(z.object({ token: z.string().min(20).max(256) })).mutation(({ ctx, input }) => acceptBusinessInvitation(ctx.user, input.token)),
  }),
  storage: router({
    status: publicProcedure.query(() => getStorageHealth()),
  }),
  caEngine: router({
    advanceTax: protectedProcedure
      .input(
        z.object({
          businessId: z.number().optional(),
          grossRevenue: z.number().optional(),
          operatingExpenses: z.number().optional(),
          depreciation: z.number().optional(),
          otherIncome: z.number().optional(),
          deductions80C: z.number().optional(),
          deductions80D: z.number().optional(),
          tdsAlreadyDeducted: z.number().optional(),
          entityType: z.enum(["company", "individual_business", "llp"]).optional(),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
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
      }),
    msmeAudit: protectedProcedure
      .input(z.object({ businessId: z.number().optional(), invoices: z.array(z.any()).optional() }).optional())
      .query(async ({ ctx, input }) => {
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
      }),
    gstr2bReconcile: protectedProcedure
      .input(z.object({ businessId: z.number().optional(), period: z.string().optional() }).optional())
      .query(async ({ ctx, input }) => {
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
      }),
    tdsCompliance: protectedProcedure
      .query(() => getTdsComplianceOverview()),
    cashAudit: protectedProcedure
      .query(() => auditCashTransactions()),
    draftNoticeDefense: protectedProcedure
      .input(
        z.object({
          noticeType: z.enum(["gst_asmt_10", "it_143_1", "it_139_9", "gst_drc_01"]).default("gst_asmt_10"),
          taxpayerName: z.string().optional(),
          gstinOrPan: z.string().optional(),
          noticeRef: z.string().optional(),
          disputedAmount: z.number().optional(),
          assessmentYear: z.string().optional(),
        })
      )
      .mutation(({ input }) => draftTaxNoticeDefense(input)),
    complianceCalendar: publicProcedure
      .query(() => getStatutoryComplianceCalendar()),
    gstnFilingJson: protectedProcedure
      .input(z.object({ businessId: z.number().optional(), returnPeriod: z.string().nullable().optional(), gstin: z.string().nullable().optional() }).optional())
      .query(async ({ ctx, input }) => {
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
      }),
    auditInvoice: protectedProcedure
      .input(
        z.object({
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
        })
      )
      .mutation(({ input }) => auditVendorInvoice(input)),
    schedule3Financials: protectedProcedure
      .input(z.object({ businessId: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
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
      }),
    form3CdTaxAudit: protectedProcedure
      .query(() => generateForm3CDTaxAudit()),
    askCopilot: protectedProcedure
      .input(z.object({ query: z.string() }))
      .mutation(({ input }) => askCaCopilotRag(input.query)),
  }),
});
