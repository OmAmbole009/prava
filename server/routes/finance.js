import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { getLatestFinancialSummaryForUser } from "../db.js";
import { financialSummaryQuerySchema } from "../finance.js";

export const financeRouter = Router();

financeRouter.use(requireUser);

financeRouter.get("/summary", async (req, res) => {
  try {
    const businessId = Number(req.query.businessId);
    const input = financialSummaryQuerySchema.parse({ businessId });
    const summary = await getLatestFinancialSummaryForUser(req.user.id, input.businessId);
    return sendData(res, summary);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

export default financeRouter;

