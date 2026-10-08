import { Router } from "express";
import {
  loginStep1,
  loginStep2,
  resendLoginOtp,
  registerAccount,
  forgotPasswordRequest,
  forgotPasswordVerify,
  forgotPasswordReset,
  logout,
} from "../controllers/auth.controller.js";
import { signInLocalAdministrator, adminLoginSchema } from "../adminLogin.js";
import { signInCa, caLoginSchema } from "../caAuth.js";
import { sendData, sendError } from "../_core/middleware.js";

export const authRouter = Router();

// Current User Session
authRouter.get("/me", (req, res) => {
  return sendData(res, req.user || null);
});

// Step 1: Login with Email/Mobile + Password -> Dispatches OTP
authRouter.post("/login", async (req, res) => {
  try {
    const result = await loginStep1({ req, res }, req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 401);
  }
});

// Step 2: Verify Login OTP -> Issues JWT Session Token & Cookie
authRouter.post("/verify-otp", async (req, res) => {
  try {
    const result = await loginStep2({ req, res }, req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

// Resend Login OTP
authRouter.post("/resend-otp", async (req, res) => {
  try {
    const result = await resendLoginOtp(req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

// Register New Business Account -> Dispatches Verification OTP
authRouter.post("/register", async (req, res) => {
  try {
    const result = await registerAccount({ req, res }, req.body);
    return sendData(res, result, 201);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

// Forgot Password Flow
authRouter.post("/forgot-password/request", async (req, res) => {
  try {
    const result = await forgotPasswordRequest(req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

authRouter.post("/forgot-password/verify", async (req, res) => {
  try {
    const result = await forgotPasswordVerify(req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

authRouter.post("/forgot-password/reset", async (req, res) => {
  try {
    const result = await forgotPasswordReset(req.body);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 400);
  }
});

// Admin Dedicated Login
authRouter.post("/admin-login", async (req, res) => {
  try {
    const input = adminLoginSchema.parse(req.body);
    const result = await signInLocalAdministrator({ req, res }, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 401);
  }
});

// CA Portal Dedicated Login
authRouter.post("/ca-login", async (req, res) => {
  try {
    const input = caLoginSchema.parse(req.body);
    const result = await signInCa({ req, res }, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, error.statusCode || 401);
  }
});

// Logout: Revokes session token & clears cookie
authRouter.post("/logout", (req, res) => {
  try {
    const result = logout({ req, res });
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error, 500);
  }
});

export default authRouter;
