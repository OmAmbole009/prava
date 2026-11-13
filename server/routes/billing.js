import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { getBusinessForUser } from "../db.js";
import { getBillingSnapshot, redeemGiftCode, selectFreePlan } from "../entitlements.js";
import {
  createRazorpayPlanOrder,
  getRazorpayConfig,
  handleRazorpayWebhook,
  verifyAndCaptureRazorpayPayment,
} from "../billingPayments.js";
import { z } from "zod";

const router = Router();

router.get("/gateway-config", (_req, res) => sendData(res, getRazorpayConfig()));

router.post("/webhooks/razorpay", async (req, res) => {
  try {
    const result = await handleRazorpayWebhook(req.rawBody, req.get("x-razorpay-signature"));
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.use(requireUser);

async function requireBillingManager(businessId, user) {
  const workspace = await getBusinessForUser(businessId, user.id);
  if (!workspace) throw new Error("You do not have access to this workspace.");
  if (user.role !== "admin" && !["owner", "admin"].includes(workspace.membershipRole)) {
    throw new Error("Only a workspace owner or administrator can change its plan.");
  }
  return workspace;
}

router.get("/snapshot", async (req, res) => {
  try {
    const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : undefined;
    if (!businessId) {
      return res.status(400).json({ error: { message: "businessId query parameter is required" } });
    }
    await requireBillingManager(businessId, req.user);
    const snapshot = await getBillingSnapshot(businessId);
    return sendData(res, snapshot);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/select-free-plan", async (req, res) => {
  try {
    const input = z.object({
      businessId: z.number().int().positive(),
    }).parse(req.body);
    await requireBillingManager(input.businessId, req.user);
    const selection = await selectFreePlan(input.businessId);
    return sendData(res, selection);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/create-order", async (req, res) => {
  try {
    const input = z.object({
      businessId: z.number().int().positive(),
      planId: z.number().int().positive(),
    }).parse(req.body);
    await requireBillingManager(input.businessId, req.user);
    const order = await createRazorpayPlanOrder(req.user.id, input);
    return sendData(res, order);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/verify-payment", async (req, res) => {
  try {
    const input = z.object({
      businessId: z.number().int().positive(),
      orderId: z.string().min(1).max(128),
      paymentId: z.string().min(1).max(128),
      signature: z.string().min(1).max(128),
    }).parse(req.body);
    await requireBillingManager(input.businessId, req.user);
    const result = await verifyAndCaptureRazorpayPayment(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

router.post("/redeem-gift-code", async (req, res) => {
  try {
    const input = z.object({
      businessId: z.number().int().positive(),
      planId: z.number().int().positive(),
      code: z.string().min(1).max(64),
    }).parse(req.body);
    await requireBillingManager(input.businessId, req.user);
    const result = await redeemGiftCode(req.user.id, input);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
