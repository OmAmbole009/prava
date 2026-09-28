import { Router } from "express";
import { z } from "zod";
import { requireUser, sendData, sendError } from "../_core/middleware.js";
import { acceptBusinessInvitation } from "../adminSecurity.js";

const router = Router();

router.use(requireUser);

router.post("/accept", async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(20).max(256),
    });
    const parsed = schema.parse(req.body);
    const result = await acceptBusinessInvitation(req.user, parsed.token);
    return sendData(res, result);
  } catch (error) {
    return sendError(res, error);
  }
});

export default router;
