import { Router } from "express";
import { COOKIE_NAME } from "../../shared/const.js";
import { getSessionCookieOptions } from "../_core/cookies.js";
import { signInLocalAdministrator, signInUnified, adminLoginSchema, unifiedLoginSchema } from "../adminLogin.js";
import { signInCa, caLoginSchema } from "../caAuth.js";
import { sendData, sendError } from "../_core/middleware.js";

export const authRouter = Router();

authRouter.get("/me", (req, res) => {
  return sendData(res, req.user || null);
});

authRouter.post("/login", async (req, res) => {
  try {
    const input = unifiedLoginSchema.parse(req.body);
    const result = await signInUnified({ req, res }, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 400);
  }
});

authRouter.post("/admin-login", async (req, res) => {
  try {
    const input = adminLoginSchema.parse(req.body);
    const result = await signInLocalAdministrator({ req, res }, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 401);
  }
});

authRouter.post("/ca-login", async (req, res) => {
  try {
    const input = caLoginSchema.parse(req.body);
    const result = await signInCa({ req, res }, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 401);
  }
});

authRouter.post("/logout", (req, res) => {
  try {
    res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
    return sendData(res, { success: true });
  } catch (error) {
    return sendError(res, error, 500);
  }
});

export default authRouter;
