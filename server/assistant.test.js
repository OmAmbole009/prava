import { describe, expect, it } from "vitest";
import { getLiveWorkspaceContext, getSuggestedQuestions, getCaReviewItemsForUser, askPrava } from "./assistant.js";

describe("Ask Prava Assistant backend", () => {
  it("retrieves live workspace context with formatted metrics without error", async () => {
    const context = await getLiveWorkspaceContext(1, 1);
    expect(context.workspace).toBeDefined();
    expect(context.workspace.name).toBe("Prava Technologies Private Limited");
    expect(context.financials).toBeDefined();
    expect(typeof context.financials.revenueFormatted).toBe("string");
    expect(context.financials.revenueFormatted).toContain("₹");
    expect(typeof context.financials.expensesFormatted).toBe("string");
    expect(typeof context.financials.cashFormatted).toBe("string");
  }, 15000);

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
    const response = await askPrava(1, {
      businessId: 1,
      message: "What is my current sales and tax situation?",
    });
    expect(response).toBeDefined();
    expect(typeof response.answer).toBe("string");
    expect(response.answer.length).toBeGreaterThan(10);
    expect(Array.isArray(response.actions)).toBe(true);
  });

  it("handles missing invoice query accurately by noting data is not in records without hallucinating", async () => {
    const response = await askPrava(1, {
      businessId: 1,
      message: "Do we have any invoice from NonExistentGalacticSupplies Ltd?",
    });
    expect(response).toBeDefined();
    expect(typeof response.answer).toBe("string");
    expect(response.answer.toLowerCase()).toMatch(/don't have record|do not have record|not have record|no record|no invoice/i);
    expect(Array.isArray(response.actions)).toBe(true);
  });

  it("handles redirection and task request with isRedirect flag and correct path", async () => {
    const response = await askPrava(1, {
      businessId: 1,
      message: "Please redirect me to invoices and documents",
    });
    expect(response).toBeDefined();
    expect(Array.isArray(response.actions)).toBe(true);
    const redirectAction = response.actions.find((a) => a.path === "/documents");
    expect(redirectAction).toBeDefined();
    expect(redirectAction.isRedirect).toBe(true);
  });

  it("accurately answers statutory finance & CA question 'what is itc' with Section 16 & GSTR-2B details", async () => {
    const response = await askPrava(1, {
      businessId: 1,
      message: "what is itc",
    });
    expect(response).toBeDefined();
    expect(typeof response.answer).toBe("string");
    expect(response.answer).toMatch(/Input Tax Credit/i);
    expect(response.answer).toMatch(/Section 16/i);
    expect(response.answer).toMatch(/GSTR-2B/i);
    expect(response.isOutOfScope).toBe(false);
  });

  it("accurately answers statutory finance & CA question about TDS and Section 194Q", async () => {
    const response = await askPrava(1, {
      businessId: 1,
      message: "Explain TDS on purchase of goods under 194Q and how it works",
    });
    expect(response).toBeDefined();
    expect(typeof response.answer).toBe("string");
    expect(response.answer).toMatch(/194Q/i);
    expect(response.answer).toMatch(/TDS/i);
    expect(response.isOutOfScope).toBe(false);
  });
});
