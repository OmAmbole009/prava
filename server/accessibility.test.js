import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesheet = readFileSync(resolve(import.meta.dirname, "../client/src/index.css"), "utf8");

describe("Prava accessibility styling", () => {
  it("keeps decorative product motion behind the reduced-motion preference", () => {
    expect(stylesheet).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(stylesheet).toContain(".prava-float-a");
    expect(stylesheet).toContain(".prava-float-b");
  });

  it("defines a visible focus treatment for keyboard-operable controls", () => {
    expect(stylesheet).toContain("outline-ring/50");
    expect(stylesheet).toContain(":focus-visible");
  });
});
