import { randomUUID } from "node:crypto";

/**
 * Application security controls for the Prava API.
 *
 * These are deliberately dependency-free so they run identically in local
 * development, CI and production containers.
 */

const GOOGLE_ACCOUNTS = "https://accounts.google.com";
const GOOGLE_FONTS_CSS = "https://fonts.googleapis.com";
const GOOGLE_FONTS_FILES = "https://fonts.gstatic.com";

export function buildContentSecurityPolicy({ isProduction = true } = {}) {
  const scriptSrc = isProduction
    ? `'self' ${GOOGLE_ACCOUNTS}`
    : `'self' 'unsafe-inline' 'unsafe-eval' ${GOOGLE_ACCOUNTS}`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' " + GOOGLE_FONTS_CSS,
    `font-src 'self' data: ${GOOGLE_FONTS_FILES}`,
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    `frame-src ${GOOGLE_ACCOUNTS}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function securityHeadersMiddleware({ isProduction = process.env.NODE_ENV === "production" } = {}) {
  const csp = buildContentSecurityPolicy({ isProduction });
  return function securityHeaders(req, res, next) {
    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=(), usb=()");
    next();
  };
}

function requestIdFor(res) {
  return (res && res.locals && res.locals.requestId) || randomUUID();
}

function rateLimitKey(req, prefix) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim()
    || req.ip
    || req.socket?.remoteAddress
    || "unknown";
  return `${prefix}:${ip}`;
}

/**
 * Fixed-window in-process rate limiter. Sufficient for a single-instance
 * deployment; a multi-instance deployment must back this with shared storage
 * (see SECURITY.md).
 */
export function createRateLimiter({ windowMs = 60_000, max = 120, prefix = "rl", message } = {}) {
  const hits = new Map();

  const middleware = function rateLimiter(req, res, next) {
    const key = rateLimitKey(req, prefix);
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.startedAt >= windowMs) {
      entry = { count: 0, startedAt: now };
      hits.set(key, entry);
    }
    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    res.setHeader("RateLimit-Limit", String(max));
    res.setHeader("RateLimit-Remaining", String(remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil((entry.startedAt + windowMs - now) / 1000)));
    if (entry.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((entry.startedAt + windowMs - now) / 1000)));
      return res.status(429).json({
        error: { message: message || "Too many requests. Please slow down and try again shortly.", requestId: requestIdFor(res) },
      });
    }
    return next();
  };

  middleware.__store = hits;
  middleware.reset = () => hits.clear();
  middleware.cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of hits) if (now - entry.startedAt >= windowMs) hits.delete(key);
  };
  return middleware;
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value));
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Defence-in-depth against cross-site request forgery for cookie-authenticated
 * JSON mutations. Requests without an Origin header (server-to-server, curl,
 * mobile) are allowed; browsers always send Origin for cross-site writes.
 */
export function createOriginGuard({ allowedOrigins = [], exemptPrefixes = [] } = {}) {
  const trusted = new Set(allowedOrigins.map(normalizeOrigin).filter(Boolean));
  return function originGuard(req, res, next) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (exemptPrefixes.some(prefix => req.path.startsWith(prefix))) return next();
    const origin = req.headers.origin;
    if (!origin) return next();
    const normalized = normalizeOrigin(origin);
    const requestOrigin = normalizeOrigin(`${req.protocol}://${req.headers.host}`);
    if (normalized && (normalized === requestOrigin || trusted.has(normalized))) return next();
    return res.status(403).json({
      error: { message: "Request origin is not permitted for this operation.", requestId: requestIdFor(res) },
    });
  };
}

const MIN_SECRET_LENGTH = 32;

/**
 * Validates the production environment before the server accepts traffic.
 * Returns a structured result so callers can log every problem at once instead
 * of failing on the first missing value.
 */
export function validateProductionEnvironment(env = process.env) {
  const errors = [];
  if (env.NODE_ENV !== "production") return { ok: true, errors };

  if (!env.DATABASE_URL) {
    errors.push("DATABASE_URL is required: production must not use the ephemeral JSON fallback store.");
  }
  if (!env.JWT_SECRET || env.JWT_SECRET.length < MIN_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters.`);
  }
  if (!env.APP_ORIGIN && !env.PUBLIC_APP_URL && !env.APP_URL) {
    errors.push("APP_ORIGIN (or APP_URL / PUBLIC_APP_URL) is required so cross-origin requests can be validated.");
  }
  if (env.ALLOW_EPHEMERAL_STORAGE === "true") {
    errors.push("ALLOW_EPHEMERAL_STORAGE must not be enabled in production.");
  }
  return { ok: errors.length === 0, errors };
}

export function assertProductionEnvironment(env = process.env, { logger = console } = {}) {
  const result = validateProductionEnvironment(env);
  if (!result.ok) {
    for (const message of result.errors) logger.error(`[config] ${message}`);
    const error = new Error(`Refusing to start with an incomplete production configuration: ${result.errors.join(" ")}`);
    error.code = "INVALID_PRODUCTION_CONFIG";
    throw error;
  }
  return result;
}

/** Ephemeral JSON persistence is allowed only for local development and tests. */
export function ephemeralPersistenceAllowed(env = process.env) {
  if (env.NODE_ENV === "production" && env.ALLOW_EPHEMERAL_STORAGE !== "true") return false;
  return true;
}

export function resolveTrustedOrigins(env = process.env) {
  return [env.APP_ORIGIN, env.PUBLIC_APP_URL, env.APP_URL]
    .filter(Boolean)
    .flatMap(value => String(value).split(","))
    .map(value => value.trim())
    .filter(Boolean);
}
