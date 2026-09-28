import { Router } from "express";
import { requireCa, sendData, sendError } from "../_core/middleware.js";
import {
  caDecisionSchema,
  getAssignedWorkspacesForCa,
  getCaDashboardStats,
  getCaProfileForUser,
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
