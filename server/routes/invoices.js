import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { deleteInvoice, getInvoice, listInvoices } from "../controllers/invoice.controller.js";
import {
  createIssuedInvoice,
  deleteIssuedInvoice,
  getIssuedInvoice,
  listIssuedInvoices,
  renderIssuedInvoicePdf,
  updateIssuedInvoice,
} from "../issuedInvoices.js";
import { issuedInvoiceInputSchema, issuedInvoiceUpdateSchema } from "../invoiceBuilder.js";

export const invoicesRouter = Router();

invoicesRouter.use(requireUser);

/**
 * Invoices and bills the business authored itself.
 * Registered before the `/:id` document routes so that "issued" is never
 * mistaken for a document identifier.
 */
invoicesRouter.get("/issued", async (req, res) => {
  try {
    const businessId = Number(req.query.businessId);
    if (!businessId) {
      return sendData(res, []);
    }
    const items = await listIssuedInvoices(req.user.id, businessId, {
      documentKind: req.query.documentKind || undefined,
      status: req.query.status || undefined,
    });
    return sendData(res, items);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

invoicesRouter.post("/issued", async (req, res) => {
  try {
    const input = issuedInvoiceInputSchema.parse(req.body);
    const result = await createIssuedInvoice(req.user.id, input);
    return sendData(res, result, 201);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

invoicesRouter.get("/issued/:id", async (req, res) => {
  try {
    const item = await getIssuedInvoice(req.user.id, req.params.id);
    return sendData(res, item);
  } catch (error) {
    return sendError(res, error, error.statusCode || 404);
  }
});

invoicesRouter.put("/issued/:id", async (req, res) => {
  try {
    const input = issuedInvoiceUpdateSchema.parse(req.body);
    const result = await updateIssuedInvoice(req.user.id, req.params.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

invoicesRouter.delete("/issued/:id", async (req, res) => {
  try {
    const result = await deleteIssuedInvoice(req.user.id, req.params.id);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

invoicesRouter.get("/issued/:id/pdf", async (req, res) => {
  try {
    const result = await renderIssuedInvoicePdf(req.user.id, req.params.id);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

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
