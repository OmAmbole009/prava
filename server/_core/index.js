import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth.js";
import { registerStorageProxy } from "./storageProxy.js";
import { appRouter } from "../routers.js";
import { createContext } from "./context.js";
import { serveStatic, setupVite } from "./vite.js";
import { sql } from "drizzle-orm";
import { getDb } from "../db.js";
import { productionRuntimeMiddleware, publicServerError } from "./productionRuntime.js";

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
  const app = express();
  const server = createServer(app);
  const startedAt = Date.now();
  app.disable("x-powered-by");
  app.use(productionRuntimeMiddleware);
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000) });
  });
  app.get("/api/ready", async (_req, res) => {
    try {
      const db = await getDb();
      if (!db) return res.status(503).json({ status: "unavailable" });
      await db.execute(sql`select 1`);
      return res.status(200).json({ status: "ready" });
    } catch {
      return res.status(503).json({ status: "unavailable" });
    }
  });
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
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

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
