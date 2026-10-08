import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { deleteInvoice, getInvoice, listInvoices } from "../controllers/invoice.controller.js";

export const invoicesRouter = Router();

invoicesRouter.use(requireUser);

invoicesRouter.get("/", async (req, res) => {
  try {
    const businessId = Number(req.query.businessId);
    const taskId = req.query.taskId ? Number(req.query.taskId) : undefined;
    const items = await listInvoices(req.user.id, businessId, taskId);
    return sendData(res, items);
  } catch (error) {
    return sendError(res, error);
  }
});

invoicesRouter.get("/:id", async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const item = await getInvoice(req.user.id, invoiceId);
    return sendData(res, item);
  } catch (error) {
    return sendError(res, error, error.statusCode || 404);
  }
});

invoicesRouter.delete("/:id", async (req, res) => {
  try {
    const invoiceId = Number(req.params.id);
    const result = await deleteInvoice(req.user.id, invoiceId);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

export default invoicesRouter;
