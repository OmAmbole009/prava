import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import {
  createBusinessWithOwner,
  getBusinessesForUser,
  updateBusinessOnboarding,
  updateBusinessProfile,
} from "../db.js";
import {
  businessInputSchema,
  updateOnboardingSchema,
  updateBusinessProfileSchema,
} from "../workspace.js";

export const businessesRouter = Router();

businessesRouter.use(requireUser);

businessesRouter.get("/", async (req, res) => {
  try {
    const list = await getBusinessesForUser(req.user.id);
    return sendData(res, list);
  } catch (error) {
    return sendError(res, error);
  }
});

businessesRouter.post("/", async (req, res) => {
  try {
    const input = businessInputSchema.parse(req.body);
    const result = await createBusinessWithOwner(req.user.id, input);
    return sendData(res, result, 201);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

businessesRouter.put("/onboarding", async (req, res) => {
  try {
    const input = updateOnboardingSchema.parse(req.body);
    const result = await updateBusinessOnboarding(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

businessesRouter.put("/profile", async (req, res) => {
  try {
    const input = updateBusinessProfileSchema.parse(req.body);
    const result = await updateBusinessProfile(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

export default businessesRouter;

