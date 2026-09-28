import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { listReconciliationForUser, reconciliationResolutionSchema, resolveReconciliationItem } from "../operations.js";

const router = Router();

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const taskId = req.query.taskId ? parseInt(req.query.taskId, 10) : undefined;
    if (!taskId) {
      return res.status(400).json({ error: { message: "taskId query parameter is required" } });
    }
    const items = await listReconciliationForUser(req.user.id, taskId);
    return sendData(res, items);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/resolve", async (req, res) => {
  try {
    const parsed = reconciliationResolutionSchema.parse(req.body);
    const result = await resolveReconciliationItem(req.user.id, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
