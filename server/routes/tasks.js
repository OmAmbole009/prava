import { Router } from "express";
import { z } from "zod";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import {
  createOperationalTask,
  approveAuthorizedGstSubmission,
  authorizedSubmissionApprovalSchema,
  authorizedSubmissionRequestSchema,
  createTaskSchema,
  getTaskForUser,
  listTasksForUser,
  markGstSubmissionPending,
  prepareCashReconciliation,
  prepareGstReturn,
  reconcileGstTask,
  requirementResolutionSchema,
  requestProfessionalReview,
  requestAuthorizedGstSubmission,
  resolveTaskRequirement,
} from "../operations.js";

export const tasksRouter = Router();

tasksRouter.use(requireUser);

tasksRouter.get("/", async (req, res) => {
  try {
    const businessId = Number(req.query.businessId);
    const tasks = await listTasksForUser(req.user.id, businessId);
    return sendData(res, tasks);
  } catch (error) {
    return sendError(res, error);
  }
});

tasksRouter.get("/:taskId", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const task = await getTaskForUser(req.user.id, taskId);
    return sendData(res, task);
  } catch (error) {
    return sendError(res, error, 404);
  }
});

tasksRouter.post("/", async (req, res) => {
  try {
    const input = createTaskSchema.parse(req.body);
    const task = await createOperationalTask(req.user.id, input);
    return sendData(res, task, 201);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

tasksRouter.post("/:taskId/prepare-gst", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const result = await prepareGstReturn(req.user.id, taskId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

tasksRouter.post("/:taskId/prepare-cash-reconciliation", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const result = await prepareCashReconciliation(req.user.id, taskId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

tasksRouter.post("/:taskId/mark-submission-pending", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const result = await markGstSubmissionPending(req.user.id, taskId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

tasksRouter.post("/:taskId/request-authorized-submission", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const input = authorizedSubmissionRequestSchema.parse({ ...req.body, taskId });
    const result = await requestAuthorizedGstSubmission(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

tasksRouter.post("/:taskId/approve-authorized-submission", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const input = authorizedSubmissionApprovalSchema.parse({ ...req.body, taskId });
    const result = await approveAuthorizedGstSubmission(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

tasksRouter.post("/:taskId/reconcile-gst", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const result = await reconcileGstTask(req.user.id, taskId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

tasksRouter.post("/requirements/resolve", async (req, res) => {
  try {
    const input = requirementResolutionSchema.parse(req.body);
    const result = await resolveTaskRequirement(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

tasksRouter.post("/:taskId/request-professional-review", async (req, res) => {
  try {
    const taskId = Number(req.params.taskId);
    const note = req.body?.note ? z.string().max(1000).parse(req.body.note) : undefined;
    const result = await requestProfessionalReview(req.user.id, taskId, note);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default tasksRouter;

