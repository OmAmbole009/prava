import { Router } from "express";
import { z } from "zod";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { getActionCenter, resolveActionItem } from "../operations.js";

const router = Router();

router.use(requireUser);

router.get("/", async (req, res) => {
  try {
    const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : undefined;
    const actions = await getActionCenter(req.user.id, businessId);
    return sendData(res, actions);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/:actionId/resolve", async (req, res) => {
  try {
    const actionId = parseInt(req.params.actionId, 10);
    const schema = z.object({
      resolution: z.enum(["resolved", "dismissed"]),
    });
    const parsed = schema.parse(req.body);
    const result = await resolveActionItem(req.user.id, actionId, parsed.resolution);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
