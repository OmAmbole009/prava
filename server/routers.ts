import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { adminLoginSchema, signInLocalAdministrator } from "./adminLogin";
import { acceptBusinessInvitation, auditLogSchema, createBusinessInvitation, getAdminSecurityOverview, invitationSchema, revokeBusinessInvitation, rotateAdministratorPassword, rotatePasswordSchema, searchAdminAuditLog } from "./adminSecurity";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createBusinessWithOwner,
  getBusinessForUser,
  getBusinessesForUser,
  getLatestFinancialSummaryForUser,
  updateBusinessOnboarding,
  updateBusinessProfile,
} from "./db";
import { getAdminBillingOverview, getBillingSnapshot, planUpdateSchema, subscriptionAdminSchema, updatePlanFromAdmin, updateSubscriptionFromAdmin } from "./entitlements";
import { financialSummaryQuerySchema } from "./finance";
import { auditGstSubmissionExport, csvForGstSubmissions, gstAdminDecisionSchema, gstAdminSearchSchema, listAdminGstSubmissions, listMyGstSubmissionNotifications, rejectAuthorizedGstSubmission } from "./gstAdmin";
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
} from "./operations";
import { businessInputSchema, updateOnboardingSchema, updateBusinessProfileSchema } from "./workspace";
import { getIntegrationReadiness, integrationSettingsSchema, listIntegrationSettings, saveIntegrationSettings } from "./integrationReadiness";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user),
    adminLogin: publicProcedure.input(adminLoginSchema).mutation(({ ctx, input }) => signInLocalAdministrator(ctx, input)),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
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
  }),
  invitations: router({
    accept: protectedProcedure.input(z.object({ token: z.string().min(20).max(256) })).mutation(({ ctx, input }) => acceptBusinessInvitation(ctx.user, input.token)),
  }),
});

export type AppRouter = typeof appRouter;
