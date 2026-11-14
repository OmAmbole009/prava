import { Router } from "express";
import { z } from "zod";
import { requireAdmin, sendData, sendError } from "../_core/middleware.js";
import { notifyOwner } from "../_core/notification.js";

const router = Router();

router.get("/health", (req, res) => {
  return sendData(res, { ok: true });
});

/**
 * Email diagnostic. Reports the Gmail API authorisation (or the SMTP handshake)
 * without exposing credentials, so a deployment problem is one request away
 * instead of a guess. Admin-only (see also the startup check in the server log).
 */
router.get("/email/verify", requireAdmin, async (req, res) => {
  try {
    const { verifyEmailDelivery } = await import("../services/emailService.js");
    const report = await verifyEmailDelivery();
    return sendData(res, report, report.ok ? 200 : 503);
  } catch (error) {
    return sendError(res, error);
  }
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
