import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import {
  dismissReminder,
  dispatchPendingReminders,
  getReminderPreferences,
  getRemindersForBusiness,
  markReminderRead,
  scanAndScheduleReminders,
  updateReminderPreferences,
} from "../services/reminderService.js";
import { getBusinessesForUser } from "../db.js";

export const remindersRouter = Router();

remindersRouter.use(requireUser);

remindersRouter.get("/", async (req, res) => {
  try {
    const businessId = req.query.businessId ? Number(req.query.businessId) : null;
    const userBusinesses = await getBusinessesForUser(req.user.id);
    const activeBizId = businessId || userBusinesses[0]?.id || 1;

    // Scan and sync latest obligations
    await scanAndScheduleReminders(activeBizId, req.user.email);

    const data = getRemindersForBusiness(activeBizId, {
      unreadOnly: req.query.unread === "true",
    });
    return sendData(res, data);
  } catch (error) {
    return sendError(res, error);
  }
});

remindersRouter.post("/:id/read", (req, res) => {
  try {
    const success = markReminderRead(req.params.id);
    return sendData(res, { success });
  } catch (error) {
    return sendError(res, error);
  }
});

remindersRouter.post("/:id/dismiss", (req, res) => {
  try {
    const success = dismissReminder(req.params.id);
    return sendData(res, { success });
  } catch (error) {
    return sendError(res, error);
  }
});

remindersRouter.get("/preferences", async (req, res) => {
  try {
    const businessId = req.query.businessId ? Number(req.query.businessId) : 1;
    const prefs = getReminderPreferences(businessId);
    return sendData(res, prefs);
  } catch (error) {
    return sendError(res, error);
  }
});

remindersRouter.put("/preferences", async (req, res) => {
  try {
    const businessId = req.body.businessId ? Number(req.body.businessId) : 1;
    const updated = updateReminderPreferences(businessId, req.body);
    return sendData(res, updated);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

remindersRouter.post("/trigger-check", async (req, res) => {
  try {
    const result = await dispatchPendingReminders();
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default remindersRouter;
