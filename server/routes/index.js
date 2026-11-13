import { Router } from "express";
import { authenticate } from "../_core/middleware.js";
import { getBusinessesForUser } from "../db.js";
import { getBusinessEntitlement } from "../entitlements.js";

import authRouter from "./auth.js";
import businessesRouter from "./businesses.js";
import financeRouter from "./finance.js";
import tasksRouter from "./tasks.js";
import documentsRouter from "./documents.js";
import actionsRouter from "./actions.js";
import notificationsRouter from "./notifications.js";
import reconciliationRouter from "./reconciliation.js";
import billingRouter from "./billing.js";
import assistantRouter from "./assistant.js";
import gstRouter from "./gst.js";
import invitationsRouter from "./invitations.js";
import storageRouter from "./storage.js";
import caEngineRouter from "./caEngine.js";
import caRouter from "./ca.js";
import adminRouter from "./admin.js";
import systemRouter from "./system.js";
import userRouter from "./user.js";
import invoicesRouter from "./invoices.js";
import intelligenceRouter from "./intelligence.js";
import remindersRouter from "./reminders.js";

const apiRouter = Router();

// Apply auth middleware to all /api routes to populate req.user if token is present
apiRouter.use(authenticate);

const planProtectedPrefixes = [
  "/actions",
  "/assistant",
  "/ca-engine",
  "/caEngine",
  "/documents",
  "/finance",
  "/gst",
  "/intelligence",
  "/invoices",
  "/reconciliation",
  "/reminders",
  "/tasks",
];

apiRouter.use(async (req, res, next) => {
  if (!req.user || !planProtectedPrefixes.some(prefix => req.path === prefix || req.path.startsWith(`${prefix}/`))) {
    return next();
  }
  try {
    const workspaces = await getBusinessesForUser(req.user.id);
    const requestedBusinessId = Number(req.query.businessId ?? req.body?.businessId);
    const workspace = requestedBusinessId
      ? workspaces.find(item => item.id === requestedBusinessId)
      : workspaces[0];
    if (!workspace) return next();
    const entitlement = await getBusinessEntitlement(workspace.id);
    if (!entitlement.subscription.planSelected) {
      return res.status(403).json({ error: { message: "Choose a plan to activate this workspace before using business modules." } });
    }
    return next();
  } catch (error) {
    return next(error);
  }
});

apiRouter.use("/auth", authRouter);
apiRouter.use("/user", userRouter);
apiRouter.use("/invoices", invoicesRouter);
apiRouter.use("/businesses", businessesRouter);
apiRouter.use("/finance", financeRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/documents", documentsRouter);
apiRouter.use("/actions", actionsRouter);
apiRouter.use("/notifications", notificationsRouter);
apiRouter.use("/reconciliation", reconciliationRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/assistant", assistantRouter);
apiRouter.use("/gst", gstRouter);
apiRouter.use("/invitations", invitationsRouter);
apiRouter.use("/storage", storageRouter);
apiRouter.use("/ca-engine", caEngineRouter);
apiRouter.use("/caEngine", caEngineRouter);
apiRouter.use("/ca", caRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/system", systemRouter);
apiRouter.use("/intelligence", intelligenceRouter);
apiRouter.use("/reminders", remindersRouter);

export default apiRouter;
