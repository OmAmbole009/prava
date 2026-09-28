import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { askPrava, askPravaInputSchema, getCaReviewItemsForUser, getSuggestedQuestions } from "../assistant.js";

const router = Router();

router.use(requireUser);

router.post("/ask", async (req, res) => {
  try {
    const input = askPravaInputSchema.parse(req.body);
    const result = await askPrava(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/suggested-prompts", async (req, res) => {
  try {
    const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : undefined;
    const questions = await getSuggestedQuestions(req.user.id, businessId);
    return sendData(res, questions);
  } catch (error) {
    return sendError(res, error);
  }
});

router.get("/ca-reviews", async (req, res) => {
  try {
    const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : undefined;
    const reviews = await getCaReviewItemsForUser(req.user.id, businessId);
    return sendData(res, reviews);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
