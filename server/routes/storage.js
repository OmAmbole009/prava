import { Router } from "express";
import { sendData, sendError } from "../_core/middleware.js";
import { getStorageHealth } from "../storage.js";

const router = Router();

// `?force=1` re-runs the live write probe instead of using the 60s cache.
router.get("/status", async (req, res) => {
  try {
    const health = await getStorageHealth({ force: req.query.force === "1" });
    return sendData(res, health);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
