import { describe, expect, it } from "vitest";
import {
  financialSummaryQuerySchema,
  formatMinor,
  verifiedFinancialSummaryInputSchema,
} from "./finance.js";

describe("financial summary foundation", () => {
  it("only accepts a positive business identifier", () => {
    expect(() => financialSummaryQuerySchema.parse({ businessId: 0 })).toThrow();
    expect(financialSummaryQuerySchema.parse({ businessId: 12 })).toEqual({ businessId: 12 });
  });

  it("formats minor-unit values using the workspace currency and locale", () => {
    expect(formatMinor(1840000, "USD", "en-US")).toBe("$18,400.00");
    expect(formatMinor(1840000, "INR", "en-IN")).toBe("₹18,400.00");
  });

  it("accepts complete summary input only through the verified server-side contract", () => {
    const result = verifiedFinancialSummaryInputSchema.parse({
      businessId: 8,
      periodStart: new Date("2026-04-01T00:00:00.000Z"),
      periodEnd: new Date("2026-04-30T23:59:59.999Z"),
      revenueMinor: 1840000,
      expensesMinor: 1210000,
      cashMinor: 600000,
      gstPositionMinor: -8500,
      receivablesMinor: 340000,
      payablesMinor: 120000,
    });

    expect(result.currency).toBe("USD");
    expect(() => verifiedFinancialSummaryInputSchema.parse({ businessId: 8 })).toThrow();
  });
});
