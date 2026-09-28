import { Router } from "express";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { getBusinessForUser } from "../db.js";
import { getBillingSnapshot } from "../entitlements.js";

const router = Router();

router.use(requireUser);

router.get("/snapshot", async (req, res) => {
  try {
    const businessId = req.query.businessId ? parseInt(req.query.businessId, 10) : undefined;
    if (!businessId) {
      return res.status(400).json({ error: { message: "businessId query parameter is required" } });
    }
    const workspace = await getBusinessForUser(businessId, req.user.id);
    if (!workspace) {
      return res.status(403).json({ error: { message: "You do not have access to this workspace." } });
    }
    const snapshot = await getBillingSnapshot(businessId);
    return sendData(res, snapshot);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
