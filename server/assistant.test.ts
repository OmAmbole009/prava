import { describe, expect, it } from "vitest";
import { getLiveWorkspaceContext, getSuggestedQuestions, getCaReviewItemsForUser } from "./assistant";

describe("Ask Prava Assistant backend", () => {
  it("retrieves live workspace context with formatted metrics without error", async () => {
    const context = await getLiveWorkspaceContext(1, 1);
    expect(context.workspace).toBeDefined();
    expect(context.workspace.name).toBe("Acme Global Solutions");
    expect(context.financials).toBeDefined();
    expect(typeof context.financials.revenueFormatted).toBe("string");
    expect(context.financials.revenueFormatted).toContain("$");
    expect(typeof context.financials.expensesFormatted).toBe("string");
    expect(typeof context.financials.cashFormatted).toBe("string");
  });

  it("generates context-aware suggested questions for the business", async () => {
    const questions = await getSuggestedQuestions(1, 1);
    expect(Array.isArray(questions)).toBe(true);
    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions[0]).toBeTypeOf("string");
  });

  it("retrieves CA review items structure properly", async () => {
    const caItems = await getCaReviewItemsForUser(1, 1);
    expect(caItems).toBeDefined();
    expect(Array.isArray(caItems.professionalReviews)).toBe(true);
    expect(Array.isArray(caItems.submissionAuthorizations)).toBe(true);
  });

  it("successfully processes chatbot conversation via askPrava using Gemini API", async () => {
    const { askPrava } = await import("./assistant");
    const response = await askPrava(1, {
      businessId: 1,
      message: "What is my current sales and tax situation?",
    });
    expect(response).toBeDefined();
    expect(typeof response.answer).toBe("string");
    expect(response.answer.length).toBeGreaterThan(10);
    expect(Array.isArray(response.actions)).toBe(true);
  });
});
