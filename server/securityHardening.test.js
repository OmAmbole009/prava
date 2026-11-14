import { describe, expect, it, beforeEach } from "vitest";
import {
  buildContentSecurityPolicy,
  createOriginGuard,
  createRateLimiter,
  ephemeralPersistenceAllowed,
  securityHeadersMiddleware,
  validateProductionEnvironment,
} from "./_core/security.js";

function mockRes() {
  const headers = {};
  return {
    headers,
    statusCode: 200,
    body: null,
    setHeader: (name, value) => { headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

function mockReq({ method = "POST", origin, host = "prava.example", path = "/api/tasks", protocol = "https", ip = "203.0.113.5", headers = {} } = {}) {
  return { method, protocol, path, ip, headers: { host, ...(origin ? { origin } : {}), ...headers } };
}

describe("Production environment validation", () => {
  it("passes in development without production secrets", () => {
    expect(validateProductionEnvironment({ NODE_ENV: "development" })).toEqual({ ok: true, errors: [] });
  });

  it("fails production without a database, strong session secret and app origin", () => {
    const result = validateProductionEnvironment({ NODE_ENV: "production" });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/DATABASE_URL/);
    expect(result.errors.join(" ")).toMatch(/JWT_SECRET/);
    expect(result.errors.join(" ")).toMatch(/APP_ORIGIN/);
  });

  it("rejects non-MySQL production database URLs", () => {
    const result = validateProductionEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://placeholder:placeholder@database.invalid/prava",
      JWT_SECRET: "a".repeat(48),
      APP_ORIGIN: "https://prava.example",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/MySQL connection URI/);
  });

  it("rejects a short session secret and ephemeral storage in production", () => {
    const result = validateProductionEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "mysql://user:pass@db:3306/prava",
      JWT_SECRET: "too-short",
      APP_ORIGIN: "https://prava.example",
      ALLOW_EPHEMERAL_STORAGE: "true",
    });
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/JWT_SECRET/);
    expect(result.errors.join(" ")).toMatch(/ALLOW_EPHEMERAL_STORAGE/);
  });

  it("accepts a complete production configuration", () => {
    const result = validateProductionEnvironment({
      NODE_ENV: "production",
      DATABASE_URL: "mysql://user:pass@db:3306/prava",
      JWT_SECRET: "a".repeat(48),
      APP_ORIGIN: "https://prava.example",
    });
    expect(result).toEqual({ ok: true, errors: [] });
  });

  it("forbids ephemeral persistence only in production", () => {
    expect(ephemeralPersistenceAllowed({ NODE_ENV: "production" })).toBe(false);
    expect(ephemeralPersistenceAllowed({ NODE_ENV: "development" })).toBe(true);
  });
});

describe("Security headers", () => {
  it("sets a restrictive CSP and clickjacking protections", () => {
    const res = mockRes();
    securityHeadersMiddleware({ isProduction: true })(mockReq(), res, () => {});
    const csp = res.headers["content-security-policy"];
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
  });

  it("allows Vite HMR evaluation in development but not in production", () => {
    expect(buildContentSecurityPolicy({ isProduction: false })).toContain("'unsafe-eval'");
    expect(buildContentSecurityPolicy({ isProduction: false })).toContain("connect-src 'self' https: wss:");
    expect(buildContentSecurityPolicy({ isProduction: true })).not.toContain("'unsafe-eval'");
  });

  it("allows the required Google Identity Services resources in production", () => {
    const res = mockRes();
    securityHeadersMiddleware({ isProduction: true })(mockReq(), res, () => {});
    const directives = Object.fromEntries(
      res.headers["content-security-policy"]
        .split("; ")
        .map((directive) => {
          const [name, ...sources] = directive.split(" ");
          return [name, sources.join(" ")];
        }),
    );

    expect(directives["style-src"]).toContain("https://accounts.google.com/gsi/style");
    expect(directives["style-src-elem"]).toContain("https://accounts.google.com/gsi/style");
    expect(directives["style-src"]).toContain("https://fonts.googleapis.com");
    expect(directives["font-src"]).toContain("https://fonts.gstatic.com");
    expect(directives["script-src"]).toContain("https://accounts.google.com");
    // Document previews render in a same-origin/blob iframe or the configured
    // signed-storage origin; Google GSI must remain allowed for sign-in.
    expect(directives["frame-src"]).toContain("https://accounts.google.com/gsi/");
    expect(directives["frame-src"]).toContain("'self'");
    expect(directives["frame-src"]).toContain("blob:");
    expect(directives["connect-src"]).toContain("https://accounts.google.com/gsi/");
    expect(directives["connect-src"].split(" ")).not.toContain("https:");
    expect(directives["connect-src"].split(" ")).not.toContain("wss:");
    expect(directives["connect-src"].split(" ")).not.toContain("*");
    expect(directives["object-src"]).toBe("'none'");
    expect(directives["frame-ancestors"]).toBe("'none'");
    expect(directives["connect-src"]).toContain("'self'");
    expect(directives["connect-src"]).toContain("https://open.er-api.com");
    expect(directives["connect-src"]).toContain("https://forge.butterfly-effect.dev");
    // Google Identity Services needs the popup to retain a window-opener
    // relationship; "same-origin" breaks the postMessage channel and Google
    // aborts to accounts.google.com/gsi/transform.
    expect(res.headers["cross-origin-opener-policy"]).toBe("same-origin-allow-popups");
  });

  it("allows only the configured Supabase project origin for document previews", () => {
    const previous = process.env.SUPABASE_URL;
    try {
      process.env.SUPABASE_URL = "https://prava-test.supabase.co";
      const csp = buildContentSecurityPolicy({ isProduction: true });
      expect(csp).toContain("https://prava-test.supabase.co");
      expect(csp).not.toContain("https://*.supabase.co");
    } finally {
      if (previous === undefined) delete process.env.SUPABASE_URL;
      else process.env.SUPABASE_URL = previous;
    }
  });
});

describe("Rate limiting", () => {
  let limiter;
  beforeEach(() => { limiter = createRateLimiter({ windowMs: 60_000, max: 3, prefix: "test" }); });

  it("allows requests up to the limit and rejects the next one", () => {
    const req = mockReq();
    for (let i = 0; i < 3; i++) {
      const res = mockRes();
      let called = false;
      limiter(req, res, () => { called = true; });
      expect(called).toBe(true);
      expect(res.statusCode).toBe(200);
    }
    const res = mockRes();
    let called = false;
    limiter(req, res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(429);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(res.body.error.message).toMatch(/too many requests/i);
  });

  it("tracks clients by forwarded IP independently", () => {
    const a = mockReq({ headers: { "x-forwarded-for": "198.51.100.1" } });
    const b = mockReq({ headers: { "x-forwarded-for": "198.51.100.2" } });
    for (let i = 0; i < 3; i++) limiter(a, mockRes(), () => {});
    const resB = mockRes();
    let called = false;
    limiter(b, resB, () => { called = true; });
    expect(called).toBe(true);
  });
});

describe("Origin guard (CSRF defence in depth)", () => {
  const guard = createOriginGuard({
    allowedOrigins: ["https://app.prava.example"],
    exemptPrefixes: ["/billing/webhooks"],
  });

  it("allows same-origin mutations", () => {
    const res = mockRes();
    let called = false;
    guard(mockReq({ origin: "https://prava.example" }), res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("allows configured trusted origins", () => {
    const res = mockRes();
    let called = false;
    guard(mockReq({ origin: "https://app.prava.example" }), res, () => { called = true; });
    expect(called).toBe(true);
  });

  it("blocks a foreign origin", () => {
    const res = mockRes();
    let called = false;
    guard(mockReq({ origin: "https://evil.example" }), res, () => { called = true; });
    expect(called).toBe(false);
    expect(res.statusCode).toBe(403);
  });

  it("exempts payment webhooks and safe methods", () => {
    const webhook = mockRes();
    let called = false;
    guard(mockReq({ origin: "https://evil.example", path: "/billing/webhooks/razorpay" }), webhook, () => { called = true; });
    expect(called).toBe(true);

    const get = mockRes();
    let getCalled = false;
    guard(mockReq({ method: "GET", origin: "https://evil.example" }), get, () => { getCalled = true; });
    expect(getCalled).toBe(true);
  });

  it("allows non-browser clients that send no Origin header", () => {
    const res = mockRes();
    let called = false;
    guard(mockReq(), res, () => { called = true; });
    expect(called).toBe(true);
  });
});
