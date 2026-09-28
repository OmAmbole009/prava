import { Router } from "express";
import { sendData, sendError } from "../_core/middleware.js";
import { getStorageHealth } from "../storage.js";

const router = Router();

router.get("/status", async (_req, res) => {
  try {
    const health = await getStorageHealth();
    return sendData(res, health);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
