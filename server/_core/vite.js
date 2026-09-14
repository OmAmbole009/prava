import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config.js";

export function shouldServeSpaDocument(method, acceptsHtml, originalUrl) {
  const pathname = new URL(originalUrl, "http://localhost").pathname;
  return method === "GET" && acceptsHtml && !path.extname(pathname) && !pathname.startsWith("/api/");
}

export async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    const isDocumentRequest = shouldServeSpaDocument(req.method, Boolean(req.accepts("html")), url);
    if (!isDocumentRequest) return next();

    try {
      const clientTemplate = path.resolve(
        process.cwd(),
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}

export function serveStatic(app) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // Only document requests should use client-side routing. Missing assets and
  // API-like paths must return a real 404 instead of an HTML page with a 200.
  app.use("*", (req, res, next) => {
    const isDocumentRequest = shouldServeSpaDocument(req.method, Boolean(req.accepts("html")), req.originalUrl);
    if (!isDocumentRequest) return next();
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
