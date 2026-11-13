import { Router } from "express";
import { requireCa, sendData, sendError } from "../_core/middleware.js";
import {
  caDecisionSchema,
  getAssignedWorkspacesForCa,
  getCaApprovalQueue,
  getCaDashboardStats,
  getCaProfileForUser,
  getTaskForCa,
  listCaReviewQueue,
  submitCaDecision,
} from "../caManagement.js";

const router = Router();

router.use(requireCa);

router.get("/dashboard", async (req, res) => {
  try {
    const stats = await getCaDashboardStats(req.user.id);
    return sendData(res, stats);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/profile", async (req, res) => {
  try {
    const profile = await getCaProfileForUser(req.user.id);
    return sendData(res, profile);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/workspaces", async (req, res) => {
  try {
    const workspaces = await getAssignedWorkspacesForCa(req.user.id);
    return sendData(res, workspaces);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/review-queue", async (req, res) => {
  try {
    const queue = await listCaReviewQueue(req.user.id);
    return sendData(res, queue);
  } catch (error) {
    return sendError(res, error);
  }
});

// Approval workload derived from the same persisted records the business sees.
router.get("/approval-queue", async (req, res) => {
  try {
    const queue = await getCaApprovalQueue(req.user.id, {
      limit: req.query.limit,
      offset: req.query.offset,
    });
    return sendData(res, queue);
  } catch (error) {
    return sendError(res, error);
  }
});

// Full evidence view for an assigned professional only.
router.get("/tasks/:taskId", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    if (!Number.isInteger(taskId) || taskId <= 0) {
      return res.status(400).json({ error: { message: "A valid task id is required." } });
    }
    const view = await getTaskForCa(req.user.id, taskId);
    return sendData(res, view);
  } catch (error) {
    return sendError(res, error, 403);
  }
});

router.post("/submit-decision", async (req, res) => {
  try {
    const parsed = caDecisionSchema.parse(req.body);
    const result = await submitCaDecision(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
