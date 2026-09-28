import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import {
  getDocumentForUser,
  listDocumentsForUser,
  reviewDocumentForUser,
  reviewDocumentSchema,
  uploadAndProcessDocument,
  uploadDocumentSchema,
} from "../operations.js";

export const documentsRouter = Router();

documentsRouter.use(requireUser);

documentsRouter.get("/", async (req, res) => {
  try {
    const businessId = Number(req.query.businessId);
    const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
    const docs = await listDocumentsForUser(req.user.id, businessId, taskId);
    return sendData(res, docs);
  } catch (error) {
    return sendError(res, error);
  }
});

documentsRouter.get("/:documentId", async (req, res) => {
  try {
    const documentId = Number(req.params.documentId);
    const doc = await getDocumentForUser(req.user.id, documentId);
    return sendData(res, doc);
  } catch (error) {
    return sendError(res, error, 404);
  }
});

documentsRouter.post("/upload", async (req, res) => {
  try {
    const input = uploadDocumentSchema.parse(req.body);
    const result = await uploadAndProcessDocument(req.user.id, input);
    return sendData(res, result, 201);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

documentsRouter.post("/review", async (req, res) => {
  try {
    const input = reviewDocumentSchema.parse(req.body);
    const result = await reviewDocumentForUser(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

export default documentsRouter;

