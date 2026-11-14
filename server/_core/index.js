import "dotenv/config";

if (!process.env.NODE_ENV) {
  const currentPath = (process.argv[1] || import.meta.url || "").replace(/\\/g, "/");
  if (currentPath.includes("/dist/")) {
    process.env.NODE_ENV = "production";
  }
}

import express from "express";
import { createServer } from "http";
import net from "net";
// Prava Core Server Runtime - Environment Synced
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import apiRouter from "../routes/index.js";
import { serveStatic, setupVite } from "./vite.js";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { productionRuntimeMiddleware, publicServerError } from "./productionRuntime.js";
import {
  assertProductionEnvironment,
  createOriginGuard,
  createRateLimiter,
  resolveTrustedOrigins,
  securityHeadersMiddleware,
} from "./security.js";

function isPortAvailable(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // Refuse to serve traffic with an incomplete production configuration.
  assertProductionEnvironment();

  const app = express();
  const server = createServer(app);
  const startedAt = Date.now();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(productionRuntimeMiddleware);
  app.use(securityHeadersMiddleware());
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  });
  app.get("/api/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) {
        // Production refuses to start without a database, so reaching here means
        // the development store is serving deliberately.
        return process.env.NODE_ENV === "production"
          ? res.status(503).json({ status: "unavailable" })
          : res.status(200).json({ status: "ready", storage: "in-memory (development)" });
      }
      await db.execute(sql`select 1`);
      return res.status(200).json({ status: "ready", storage: "mysql" });
    } catch {
      return res.status(503).json({ status: "unavailable" });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({
    limit: "50mb",
    verify: (req, _res, buffer) => {
      if (req.originalUrl === "/api/billing/webhooks/razorpay") {
        req.rawBody = Buffer.from(buffer);
      }
    },
  }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);

  // Abuse protection: tight limits on credential endpoints, a broad ceiling on
  // the rest of the API. Payment webhooks are exempt because providers retry.
  const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 30, prefix: "auth" });
  const writeLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 120, prefix: "write" });
  const apiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 600, prefix: "api" });
  app.use([
    "/api/auth/login",
    "/api/auth/verify-otp",
    "/api/auth/resend-otp",
    "/api/auth/register",
    "/api/auth/forgot-password",
    "/api/auth/admin-login",
    "/api/auth/ca-login",
    "/api/auth/google",
  ], authLimiter);
  app.use("/api", apiLimiter);
  app.use("/api/documents", writeLimiter);
  app.use("/api/invoices", writeLimiter);

  // Cookie-authenticated mutations must originate from a trusted origin.
  app.use("/api", createOriginGuard({
    allowedOrigins: resolveTrustedOrigins(),
    exemptPrefixes: ["/billing/webhooks"],
  }));

  // REST API
  app.use("/api", apiRouter);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV !== "production") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  app.use((error, req, res, _next) => {
    const requestId = typeof res.locals.requestId === "string" ? res.locals.requestId : "unknown";
    console.error(`[${requestId}] Unhandled request error`, error);
    if (res.headersSent) return;
    if (req.accepts("html")) {
      return res.status(500).type("html").send("<!doctype html><html><head><title>Prava is temporarily unavailable</title></head><body><main><h1>We could not complete that request.</h1><p>Please refresh and try again. Reference: " + requestId + "</p></main></body></html>");
    }
    return res.status(500).json(publicServerError(requestId));
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize Weaviate Vector Database & RAG Knowledge Base in background
  import("../weaviateVectorDb.js")
    .then((m) => m.initVectorDatabase())
    .then((ok) => {
      if (ok) console.log("[Weaviate] Vector DB & RAG Knowledge Base ready.");
    })
    .catch((err) => {
      console.warn("[Weaviate] Background Vector DB initialization:", err.message);
    });

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
  });

  // Drain in-flight requests, then close the database pool. A second signal or a
  // 15s deadline forces exit so orchestration restarts cannot hang.
  let shuttingDown = false;
  let dbPool = null;
  try {
    const db = await getDb();
    if (db) {
      dbPool = db;
      console.log("[Server] Database connection pool initialized");
    }
  } catch (error) {
    console.error("[Server] Database initialization error:", error.message);
  }

  // Clear OTP challenges that expired before this restart. Best-effort: a
  // maintenance failure must never prevent the server from serving traffic.
  if (dbPool) {
    try {
      const { runPersistentCleanupNow } = await import("../services/otp.service.js");
      await runPersistentCleanupNow();
    } catch (error) {
      console.error("[Server] Startup OTP cleanup failed:", error.message);
    }

    // Restore administrator access for allow-listed, already-existing accounts.
    try {
      const { runAdminBootstrap } = await import("./adminBootstrap.js");
      await runAdminBootstrap(dbPool);
    } catch (error) {
      console.error("[Server] Administrator bootstrap failed:", error.message);
    }
  }

  // Surface the active email transport, and any misconfiguration, in the deploy
  // log rather than on first login. Deliberately not awaited: a slow mail host
  // must never delay startup.
  if (process.env.NODE_ENV === "production") {
    import("../services/emailService.js")
      .then(({ describeEmailTransport, verifyEmailDelivery }) => {
        const transport = describeEmailTransport();
        console.log(
          `[EmailService] Active email transport: ${transport.provider}` +
            (transport.sender ? ` (sender: ${transport.sender})` : "") +
            (transport.configured ? "" : " [credentials missing]")
        );
        return verifyEmailDelivery();
      })
      .then((report) => {
        if (report.ok) {
          console.log(`[EmailService] ${report.message}`);
        } else {
          console.error(
            `[EmailService] Startup email check failed: ${report.message}`,
            report.hint ? `| ${report.hint}` : ""
          );
        }
      })
      .catch((error) => {
        console.error("[EmailService] Startup email check error:", error.message);
      });
  }

  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Server] ${signal} received; closing listener.`);
    const deadline = setTimeout(() => {
      console.error("[Server] Graceful shutdown timed out; exiting.");
      process.exit(1);
    }, 15_000);
    deadline.unref();
    server.close(async () => {
      try {
        if (dbPool && typeof dbPool.end === "function") await dbPool.end();
        console.log("[Server] Database pool closed during shutdown");
      } catch (error) {
        console.error("[Server] Error closing the database pool:", error.message);
      }
      clearTimeout(deadline);
      console.log("[Server] Shutdown complete.");
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  // Protect against unhandled promise rejections that could crash the process
  process.on("unhandledRejection", (reason) => {
    console.error("[Server] Unhandled promise rejection:", reason);
    // Application-specific logging, could also emit metrics
  });
  process.on("uncaughtException", (error) => {
    console.error("[Server] Uncaught exception:", error);
    // Exit non-zero for unforeseen fatal errors
    process.exit(1);
  });
}

startServer().catch(console.error);
