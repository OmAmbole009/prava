import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { changePassword, getSecurityProfile } from "../controllers/user.controller.js";

export const userRouter = Router();

userRouter.use(requireUser);

userRouter.get("/profile", async (req, res) => {
  try {
    const profile = await getSecurityProfile(req.user);
    return sendData(res, profile);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

userRouter.post("/change-password", async (req, res) => {
  try {
    const result = await changePassword(req.user, req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

export default userRouter;
