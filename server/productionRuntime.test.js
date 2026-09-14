import { describe, expect, it } from "vitest";
import { productionResponseHeaders, publicServerError, safeRequestId } from "./_core/productionRuntime.js";

describe("production runtime safeguards", () => {
  it("uses trusted request identifiers and replaces malformed values", () => {
    expect(safeRequestId("request_1-validated")).toBe("request_1-validated");
    expect(safeRequestId("bad value with spaces")).not.toBe("bad value with spaces");
    expect(safeRequestId("x".repeat(97))).not.toBe("x".repeat(97));
  });

  it("applies non-breaking security headers and enables HSTS only for secure requests", () => {
    const insecure = productionResponseHeaders({ protocol: "http", headers: {} });
    const secure = productionResponseHeaders({ protocol: "http", headers: { "x-forwarded-proto": "https" } });
    expect(insecure["X-Content-Type-Options"]).toBe("nosniff");
    expect(insecure["Strict-Transport-Security"]).toBeUndefined();
    expect(secure["Strict-Transport-Security"]).toContain("max-age=31536000");
  });

  it("keeps unexpected server responses safe for end users while retaining a correlation identifier", () => {
    expect(publicServerError("req-42")).toEqual({ error: "An unexpected server error occurred.", requestId: "req-42" });
  });

  it("does not reflect hostile request-identifiers into client-visible responses", () => {
    const identifier = safeRequestId("<script>alert(1)</script>");
    expect(identifier).not.toContain("<");
    expect(identifier).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
