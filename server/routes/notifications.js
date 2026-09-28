import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { listMyGstSubmissionNotifications } from "../gstAdmin.js";

const router = Router();

router.use(requireUser);

router.get("/gst-submission-decisions", async (req, res) => {
  try {
    const notifications = await listMyGstSubmissionNotifications(req.user.id);
    return sendData(res, notifications);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
