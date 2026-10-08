import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { getBusinessesForUser } from "../db.js";
import { listDocumentsForUser, inMemoryDocuments } from "../operations.js";
import { runBusinessIntelligence, getDashboardIntelligence } from "../intelligenceEngine.js";
import { analyzeTdsForBusiness, calculateTdsForPayment, getTdsDashboardSummary } from "../tdsEngine.js";
import { buildAccountsReceivable, buildAccountsPayable, getArApDashboardSummary } from "../arApEngine.js";
import { calculateBusinessHealthScore } from "../healthScore.js";

const router = Router();

router.use(requireUser);

async function resolveBusinessId(userId, inputBusinessId) {
  if (inputBusinessId) return parseInt(inputBusinessId, 10);
  const bizList = await getBusinessesForUser(userId);
  return bizList?.[0]?.id;
}

// GET /api/intelligence/overview — lightweight for dashboard
router.get("/overview", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    if (!businessId) {
      return sendData(res, {
        healthScore: 75,
        healthGrade: "B",
        healthGradeLabel: "Good Standing",
        healthColor: "green",
        criticalCount: 0,
        warningCount: 0,
        topFindings: [],
        todayActions: [],
        gstEstimateMinor: 0,
        tdsEstimateMinor: 0,
        arOutstandingMinor: 0,
        arOverdueMinor: 0,
        apDueThisMonthMinor: 0,
        revenueMinor: 0,
        expensesMinor: 0,
      });
    }
    const overview = await getDashboardIntelligence(businessId);
    return sendData(res, overview);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/full — deep analysis
router.get("/full", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    if (!businessId) {
      return sendError(res, new Error("Business not found"), 404);
    }
    const report = await runBusinessIntelligence(businessId);
    return sendData(res, report);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/tds — comprehensive TDS status
router.get("/tds", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    const analysis = analyzeTdsForBusiness(businessId);
    const summary = getTdsDashboardSummary(businessId);
    return sendData(res, { analysis, summary });
  } catch (error) {
    return sendError(res, error);
  }
});

// POST /api/intelligence/tds/calculate — check a specific payment
router.post("/tds/calculate", async (req, res) => {
  try {
    const { amount, vendorName, vendorPan, vendorType, section, description } = req.body;
    const result = calculateTdsForPayment({
      amount: parseFloat(amount) || 0,
      vendorName,
      vendorPan,
      vendorType,
      section,
      description,
    });
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/ar — accounts receivable (money owed to you)
router.get("/ar", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    const docs = inMemoryDocuments.filter(d => !businessId || d.document.businessId === businessId);
    const extractions = docs.filter(d => d.extraction);
    const ar = buildAccountsReceivable(extractions);
    return sendData(res, ar);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/ap — accounts payable (bills to pay)
router.get("/ap", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    const docs = inMemoryDocuments.filter(d => !businessId || d.document.businessId === businessId);
    const extractions = docs.filter(d => d.extraction);
    const ap = buildAccountsPayable(extractions);
    return sendData(res, ap);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/health-score — verifiable 0-100 business health score
router.get("/health-score", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    const health = calculateBusinessHealthScore(businessId);
    return sendData(res, health);
  } catch (error) {
    return sendError(res, error);
  }
});

// GET /api/intelligence/today-actions — "What should I do today?"
router.get("/today-actions", async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user.id, req.query.businessId);
    const report = await runBusinessIntelligence(businessId);
    return sendData(res, {
      actions: report.todayActions,
      count: report.todayActions.length,
      criticalCount: report.criticalCount,
      warningCount: report.warningCount,
    });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
