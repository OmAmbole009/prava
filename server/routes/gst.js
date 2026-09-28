import { Router } from "express";
import { z } from "zod";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import {
  generateCaComplianceCertificate,
  generateGstnPortalJson,
  generateGstSpreadsheet,
  getGstFilingWorkbench,
  runGstInvoiceRag,
  updateGstLineItem,
} from "../gstFiling.js";

const router = Router();

router.use(requireUser);

const gstLineItemUpdateSchema = z.object({
  businessId: z.number().int().optional().default(1),
  period: z.string().optional(),
  id: z.string(),
  taxableValue: z.number().optional(),
  rate: z.number().optional(),
  cgst: z.number().optional(),
  sgst: z.number().optional(),
  igst: z.number().optional(),
  itcEligibility: z.string().optional(),
  partyGstin: z.string().optional(),
});

function parseWorkbenchParams(req) {
  const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : (req.body?.businessId ?? 1);
  const period = req.query.period || req.body?.period;
  return { businessId, period };
}

router.get("/workbench", async (req, res) => {
  try {
    const { businessId, period } = parseWorkbenchParams(req);
    const result = await getGstFilingWorkbench(req.user.id, businessId, period);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/run-rag", async (req, res) => {
  try {
    const { businessId, period } = parseWorkbenchParams(req);
    const result = await runGstInvoiceRag(req.user.id, businessId, period);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.put("/line-item", async (req, res) => {
  try {
    const parsed = gstLineItemUpdateSchema.parse(req.body);
    const result = await updateGstLineItem(req.user.id, parsed.businessId, parsed.period, parsed);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/export-portal-json", async (req, res) => {
  try {
    const { businessId, period } = parseWorkbenchParams(req);
    const result = await generateGstnPortalJson(req.user.id, businessId, period);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/export-spreadsheet", async (req, res) => {
  try {
    const { businessId, period } = parseWorkbenchParams(req);
    const result = await generateGstSpreadsheet(req.user.id, businessId, period);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/export-compliance-cert", async (req, res) => {
  try {
    const { businessId, period } = parseWorkbenchParams(req);
    const result = await generateCaComplianceCertificate(req.user.id, businessId, period);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
