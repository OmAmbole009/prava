import { describe, expect, it } from "vitest";
import { evaluateQueryScope, buildOutOfScopeResponse, buildGreetingResponse } from "./guardrails.js";
import { askPrava } from "./assistant.js";

describe("AI Chatbot Guardrail Engine", () => {
  describe("evaluateQueryScope unit tests", () => {
    it("flags general knowledge and trivia as out of scope", () => {
      const q1 = evaluateQueryScope("What is the capital of France?");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("general knowledge, astronomy, and trivia");

      const q2 = evaluateQueryScope("Who was the first president of the United States?");
      expect(q2.isOutOfScope).toBe(true);

      const q3 = evaluateQueryScope("What is the speed of light?");
      expect(q3.isOutOfScope).toBe(true);
    });

    it("flags sports and gaming questions as out of scope", () => {
      const q1 = evaluateQueryScope("Who won the FIFA World Cup?");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("sports and gaming");

      const q2 = evaluateQueryScope("What is the latest cricket score between India and Australia?");
      expect(q2.isOutOfScope).toBe(true);

      const q3 = evaluateQueryScope("Is Cristiano Ronaldo playing today?");
      expect(q3.isOutOfScope).toBe(true);
    });

    it("flags cooking and recipe questions as out of scope", () => {
      const q1 = evaluateQueryScope("How to bake a chocolate cake?");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("cooking, food, and recipes");

      const q2 = evaluateQueryScope("Give me a recipe for Italian pasta");
      expect(q2.isOutOfScope).toBe(true);
    });

    it("flags creative writing and joke requests as out of scope", () => {
      const q1 = evaluateQueryScope("Write a poem about rain");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("creative writing and entertainment");

      const q2 = evaluateQueryScope("Tell me a funny joke");
      expect(q2.isOutOfScope).toBe(true);

      const q3 = evaluateQueryScope("Write a poem about paying taxes");
      expect(q3.isOutOfScope).toBe(true);
    });

    it("flags non-financial programming questions as out of scope", () => {
      const q1 = evaluateQueryScope("Write a python script to reverse a string");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("general software programming and non-financial code");

      const q2 = evaluateQueryScope("Explain quicksort in javascript");
      expect(q2.isOutOfScope).toBe(true);

      const q3 = evaluateQueryScope("How to center a div with css flexbox?");
      expect(q3.isOutOfScope).toBe(true);
    });

    it("flags medical and lifestyle advice as out of scope", () => {
      const q1 = evaluateQueryScope("What medicine should I take for headache?");
      expect(q1.isOutOfScope).toBe(true);
      expect(q1.detectedDomain).toBe("health, lifestyle, and medical advice");

      const q2 = evaluateQueryScope("What is the best workout routine to lose weight?");
      expect(q2.isOutOfScope).toBe(true);
    });

    it("flags completely unrelated chit-chat as out of scope", () => {
      const q1 = evaluateQueryScope("Do you like purple apples?");
      expect(q1.isOutOfScope).toBe(true);

      const q2 = evaluateQueryScope("Can cats see in total darkness?");
      expect(q2.isOutOfScope).toBe(true);
    });

    it("identifies greetings and meta platform help as valid greetings", () => {
      const g1 = evaluateQueryScope("Hello");
      expect(g1.isGreeting).toBe(true);
      expect(g1.isOutOfScope).toBe(false);

      const g2 = evaluateQueryScope("Hi");
      expect(g2.isGreeting).toBe(true);

      const g3 = evaluateQueryScope("What can you do?");
      expect(g3.isGreeting).toBe(true);
    });

    it("correctly identifies valid in-scope financial and business queries", () => {
      expect(evaluateQueryScope("What is my total revenue this month?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("How much cash do we have in the bank?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("Are any vendor invoices overdue?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("What is our estimated GST liability?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("Explain Section 43B(h) MSME 45-day payment rule").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("What are my open action items for today?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("What is the TDS rate for contractor payments?").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("Show me accounts receivable and payable").isOutOfScope).toBe(false);
      expect(evaluateQueryScope("How is our business doing?").isOutOfScope).toBe(false);
    });

    it("allows queries with potential domain collisions if strong financial intent is present", () => {
      // "gym" normally triggers lifestyle, but "tax deductible business expense" overrides
      const q = evaluateQueryScope("Is gym equipment for employees a tax deductible business expense?");
      expect(q.isOutOfScope).toBe(false);
    });
  });

  describe("askPrava guardrail integration tests", () => {
    it("returns guardrail not-related message when asked out of concept trivia question", async () => {
      const response = await askPrava(1, {
        businessId: 1,
        message: "What is the capital of France?",
      });

      expect(response).toBeDefined();
      expect(response.isOutOfScope).toBe(true);
      expect(response.answer).toContain("Question Not Related to Business Finances");
      expect(response.answer).toContain("outside the scope of **Ask Prava**");
      expect(response.answer).toContain("Financial Health & Cashflow");
      expect(Array.isArray(response.actions)).toBe(true);
      expect(response.actions.some(a => a.path === "/money")).toBe(true);
      expect(response.actions.some(a => a.path === "/tax")).toBe(true);
      expect(response.sources).toBeUndefined();
    });

    it("returns guardrail not-related message when asked about sports", async () => {
      const response = await askPrava(1, {
        businessId: 1,
        message: "Who won the FIFA World Cup?",
      });

      expect(response).toBeDefined();
      expect(response.isOutOfScope).toBe(true);
      expect(response.answer).toContain("Question Not Related to Business Finances");
      expect(response.answer).toContain("sports and gaming");
    });

    it("returns guardrail not-related message when asked to write code", async () => {
      const response = await askPrava(1, {
        businessId: 1,
        message: "Write a python script to reverse a string",
      });

      expect(response).toBeDefined();
      expect(response.isOutOfScope).toBe(true);
      expect(response.answer).toContain("Question Not Related to Business Finances");
    });

    it("returns friendly welcome response when user greets Ask Prava", async () => {
      const response = await askPrava(1, {
        businessId: 1,
        message: "Hello",
      });

      expect(response).toBeDefined();
      expect(response.isOutOfScope).toBe(false);
      expect(response.answer).toContain("Hello! How can I assist with your finances today?");
      expect(Array.isArray(response.actions)).toBe(true);
    });

    it("processes valid financial questions normally without triggering guardrail rejection", async () => {
      const response = await askPrava(1, {
        businessId: 1,
        message: "What is our revenue and GST liability?",
      });

      expect(response).toBeDefined();
      expect(response.isOutOfScope).toBe(false);
      expect(typeof response.answer).toBe("string");
      expect(response.answer.length).toBeGreaterThan(20);
      expect(response.answer).not.toContain("Question Not Related to Business Finances");
    });
  });
});
