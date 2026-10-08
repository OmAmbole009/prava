import { describe, it, expect } from "vitest";
import { calculateBusinessHealthScore } from "./healthScore.js";

describe("Prava Business Health Score Engine", () => {
  it("calculates a score between 0 and 100", () => {
    const health = calculateBusinessHealthScore(1);
    expect(health.overall).toBeGreaterThanOrEqual(0);
    expect(health.overall).toBeLessThanOrEqual(100);
    expect(["A+", "A", "B", "C", "D"]).toContain(health.grade);
    expect(health.components).toBeDefined();
    expect(health.summaryText).toBeTruthy();
  });

  it("provides explainable component breakdown with positive/negative points", () => {
    const health = calculateBusinessHealthScore(1);
    expect(Array.isArray(health.components)).toBe(true);
    for (const comp of health.components) {
      expect(comp.name).toBeTruthy();
      expect(comp.score).toBeGreaterThanOrEqual(0);
      expect(comp.maxScore).toBeGreaterThan(0);
      expect(comp.description).toBeTruthy();
    }
  });
});
