import { Router } from "express";
import { authenticate } from "../_core/middleware.js";

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

const apiRouter = Router();

// Apply auth middleware to all /api routes to populate req.user if token is present
apiRouter.use(authenticate);

apiRouter.use("/auth", authRouter);
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

export default apiRouter;
