import { describe, it, expect } from "vitest";
import {
  runBusinessIntelligence,
  getDashboardIntelligence,
} from "./intelligenceEngine.js";

describe("Prava Business Intelligence Orchestrator", () => {
  it("runs business intelligence and returns structured proactive findings", async () => {
    const report = await runBusinessIntelligence(1);
    expect(report).toBeDefined();
    expect(report.healthScore).toBeDefined();
    expect(Array.isArray(report.findings)).toBe(true);
    expect(Array.isArray(report.todayActions)).toBe(true);
    expect(report.financials).toBeDefined();
  });

  it("produces findings with plain English explanations and recommended actions", async () => {
    const report = await runBusinessIntelligence(1);
    for (const finding of report.findings) {
      expect(finding.title).toBeTruthy();
      expect(finding.plainEnglish).toBeTruthy();
      expect(finding.recommendedAction).toBeTruthy();
      expect(["critical", "warning", "info", "positive"]).toContain(finding.severity);
    }
  });

  it("returns dashboard intelligence summary efficiently", async () => {
    const dash = await getDashboardIntelligence(1);
    expect(dash.healthScore).toBeDefined();
    expect(dash.healthGrade).toBeDefined();
    expect(Array.isArray(dash.topFindings)).toBe(true);
    expect(Array.isArray(dash.todayActions)).toBe(true);
  });
});
