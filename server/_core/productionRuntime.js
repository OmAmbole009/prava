import { randomUUID } from "node:crypto";

const MAX_REQUEST_ID_LENGTH = 96;

function secureRequest(req) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  const protocols = Array.isArray(forwarded) ? forwarded : forwarded?.split(",") ?? [];
  return protocols.some(value => value.trim().toLowerCase() === "https");
}

export function safeRequestId(value) {
  if (typeof value !== "string") return randomUUID();
  const normalized = value.trim();
  return /^[a-zA-Z0-9_-]+$/.test(normalized) && normalized.length <= MAX_REQUEST_ID_LENGTH ? normalized : randomUUID();
}

export function productionResponseHeaders(req) {
  const headers = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=()",
    "X-DNS-Prefetch-Control": "off",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
  if (secureRequest(req)) headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
  return headers;
}

export function productionRuntimeMiddleware(req, res, next) {
  const requestId = safeRequestId(req.headers["x-request-id"]);
  res.setHeader("X-Request-Id", requestId);
  for (const [key, value] of Object.entries(productionResponseHeaders(req))) res.setHeader(key, value);
  if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  res.locals.requestId = requestId;
  next();
}

export function publicServerError(requestId) {
  return { error: "An unexpected server error occurred.", requestId };
}
