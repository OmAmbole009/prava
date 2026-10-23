import { Router } from "express";
import { z } from "zod";
import { requireAdmin, sendData, sendError } from "../_core/middleware.js";
import {
  auditLogSchema,
  createBusinessInvitation,
  getAdminSecurityOverview,
  invitationSchema,
  revokeBusinessInvitation,
  rotateAdministratorPassword,
  rotatePasswordSchema,
  searchAdminAuditLog,
} from "../adminSecurity.js";
import {
  assignCaToBusiness,
  caAssignmentSchema,
  grantCaAccess,
  grantCaAccessSchema,
  listAllCas,
  resetCaPassword,
  resetCaPasswordSchema,
  unassignCaFromBusiness,
  updateCaStatus,
  updateCaStatusSchema,
} from "../caManagement.js";
import {
  getAdminBillingOverview,
  planUpdateSchema,
  subscriptionAdminSchema,
  updatePlanFromAdmin,
  updateSubscriptionFromAdmin,
} from "../entitlements.js";
import {
  auditGstSubmissionExport,
  csvForGstSubmissions,
  gstAdminDecisionSchema,
  gstAdminSearchSchema,
  listAdminGstSubmissions,
  rejectAuthorizedGstSubmission,
} from "../gstAdmin.js";
import {
  getIntegrationReadiness,
  integrationSettingsSchema,
  listIntegrationSettings,
  saveIntegrationSettings,
} from "../integrationReadiness.js";

const router = Router();

router.use(requireAdmin);

// Billing
router.get("/billing-overview", async (_req, res) => {
  try {
    const overview = await getAdminBillingOverview();
    return sendData(res, overview);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/update-plan", async (req, res) => {
  try {
    const parsed = planUpdateSchema.parse(req.body);
    const result = await updatePlanFromAdmin(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/update-subscription", async (req, res) => {
  try {
    const parsed = subscriptionAdminSchema.parse(req.body);
    const result = await updateSubscriptionFromAdmin(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Security & Audit
router.get("/security-overview", async (_req, res) => {
  try {
    const overview = await getAdminSecurityOverview();
    return sendData(res, overview);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/create-invitation", async (req, res) => {
  try {
    const parsed = invitationSchema.parse(req.body);
    const result = await createBusinessInvitation(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/revoke-invitation", async (req, res) => {
  try {
    const schema = z.object({ invitationId: z.number().int().positive() });
    const parsed = schema.parse(req.body);
    const result = await revokeBusinessInvitation(req.user.id, parsed.invitationId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/rotate-password", async (req, res) => {
  try {
    const parsed = rotatePasswordSchema.parse(req.body);
    const result = await rotateAdministratorPassword(req.user, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

const auditLogHandler = async (req, res) => {
  try {
    const input = req.method === "POST" ? req.body : req.query;
    const parsed = auditLogSchema.parse(input);
    const result = await searchAdminAuditLog(parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/audit-log", auditLogHandler);
router.post("/audit-log", auditLogHandler);

// GST Submissions
const gstSubmissionsHandler = async (req, res) => {
  try {
    const input = req.method === "POST" ? req.body : req.query;
    const parsed = gstAdminSearchSchema.parse(input);
    const result = await listAdminGstSubmissions(parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/gst-submissions", gstSubmissionsHandler);
router.post("/gst-submissions", gstSubmissionsHandler);

const exportGstSubmissionsHandler = async (req, res) => {
  try {
    const input = req.method === "POST" ? req.body : req.query;
    const parsed = gstAdminSearchSchema.parse(input);
    const rows = await listAdminGstSubmissions(parsed);
    await auditGstSubmissionExport(req.user.id, parsed, rows.length);
    const filename = `prava-gst-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    const csv = csvForGstSubmissions(rows);
    return sendData(res, { filename, csv, generatedAt: new Date() });
  } catch (error) {
    return sendError(res, error);
  }
};
router.get("/export-gst-submissions", exportGstSubmissionsHandler);
router.post("/export-gst-submissions", exportGstSubmissionsHandler);

router.post("/reject-gst-submission", async (req, res) => {
  try {
    const parsed = gstAdminDecisionSchema.parse(req.body);
    const result = await rejectAuthorizedGstSubmission(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Integration Readiness & Settings
router.get("/integration-readiness", async (_req, res) => {
  try {
    const result = await getIntegrationReadiness();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/integration-settings", async (_req, res) => {
  try {
    const result = await listIntegrationSettings();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/update-integration-settings", async (req, res) => {
  try {
    const parsed = integrationSettingsSchema.parse(req.body);
    const result = await saveIntegrationSettings(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// CA Management (Admin)
router.get("/cas", async (_req, res) => {
  try {
    const result = await listAllCas();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cas/grant", async (req, res) => {
  try {
    const parsed = grantCaAccessSchema.parse(req.body);
    const result = await grantCaAccess(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cas/status", async (req, res) => {
  try {
    const parsed = updateCaStatusSchema.parse(req.body);
    const result = await updateCaStatus(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cas/reset-password", async (req, res) => {
  try {
    const parsed = resetCaPasswordSchema.parse(req.body);
    const result = await resetCaPassword(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cas/assign", async (req, res) => {
  try {
    const parsed = caAssignmentSchema.parse(req.body);
    const result = await assignCaToBusiness(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/cas/unassign", async (req, res) => {
  try {
    const schema = z.object({
      caUserId: z.number().int().positive(),
      businessId: z.number().int().positive(),
    });
    const parsed = schema.parse(req.body);
    const result = await unassignCaFromBusiness(req.user.id, parsed.caUserId, parsed.businessId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// Platform Administration & Telemetry
router.get("/overview", async (_req, res) => {
  try {
    const { getPlatformOverview } = await import("../services/adminPlatformService.js");
    const overview = await getPlatformOverview();
    return sendData(res, overview);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/businesses", async (req, res) => {
  try {
    const { getAdminBusinessesList } = await import("../services/adminPlatformService.js");
    const list = await getAdminBusinessesList({
      search: req.query.search || "",
      status: req.query.status || "all",
      country: req.query.country || "all",
    });
    return sendData(res, list);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/businesses/:id", async (req, res) => {
  try {
    const { getAdminBusinessDetail } = await import("../services/adminPlatformService.js");
    const detail = await getAdminBusinessDetail(Number(req.params.id));
    return sendData(res, detail);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/businesses/:id/status", async (req, res) => {
  try {
    const { setBusinessAccountStatus } = await import("../services/adminPlatformService.js");
    const result = await setBusinessAccountStatus(
      req.user.id,
      Number(req.params.id),
      req.body.status,
      req.body.reason || ""
    );
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/ocr/queue", async (req, res) => {
  try {
    const { getAdminOcrQueue } = await import("../services/adminPlatformService.js");
    const queue = await getAdminOcrQueue({
      status: req.query.status || "all",
      limit: Number(req.query.limit) || 50,
    });
    return sendData(res, queue);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/ocr/retry/:id", async (req, res) => {
  try {
    const { retryOcrExtraction } = await import("../services/adminPlatformService.js");
    const result = await retryOcrExtraction(req.user.id, Number(req.params.id));
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/analytics", async (_req, res) => {
  try {
    const { getAdminAnalytics } = await import("../services/adminPlatformService.js");
    const analytics = await getAdminAnalytics();
    return sendData(res, analytics);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
