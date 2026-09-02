import { describe, expect, it } from "vitest";
import { storageCachePolicy } from "./_core/storageProxy";
import { shouldServeSpaDocument } from "./_core/vite";

describe("route and asset reliability", () => {
  it("preserves SPA navigation for canonical and trailing-slash workspace paths", () => {
    expect(shouldServeSpaDocument("GET", true, "/dashboard")).toBe(true);
    expect(shouldServeSpaDocument("GET", true, "/dashboard/")).toBe(true);
    expect(shouldServeSpaDocument("GET", true, "/tasks/42")).toBe(true);
  });

  it("returns missing asset and API requests to their real handlers rather than HTML fallback", () => {
    expect(shouldServeSpaDocument("GET", true, "/favicon.ico")).toBe(false);
    expect(shouldServeSpaDocument("GET", true, "/missing-image.png")).toBe(false);
    expect(shouldServeSpaDocument("GET", true, "/api/does-not-exist")).toBe(false);
    expect(shouldServeSpaDocument("POST", true, "/dashboard")).toBe(false);
  });

  it("caches only top-level public storage assets and never tenant documents", () => {
    expect(storageCachePolicy("prava-finance-hero_c72f0eb8.jpg")).toContain("public");
    expect(storageCachePolicy("businesses/7/documents/statement.pdf")).toBe("private, no-store");
  });
});
