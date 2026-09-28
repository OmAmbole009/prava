import { Router } from "express";
import { z } from "zod";
import { requireAdmin, sendData, sendError } from "../_core/middleware.js";
import { notifyOwner } from "../_core/notification.js";

const router = Router();

router.get("/health", (req, res) => {
  return sendData(res, { ok: true });
});

router.post("/notify-owner", requireAdmin, async (req, res) => {
  try {
    const schema = z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required"),
    });
    const parsed = schema.parse(req.body);
    const delivered = await notifyOwner(parsed);
    return sendData(res, { success: delivered });
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
