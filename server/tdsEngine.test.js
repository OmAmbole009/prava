import { describe, it, expect } from "vitest";
import {
  calculateTdsForPayment,
  determineTdsSection,
  analyzeTdsForBusiness,
} from "./tdsEngine.js";

describe("Prava TDS Intelligence Engine", () => {
  describe("Section Determination", () => {
    it("determines 194J for legal/CA/professional fees", () => {
      const result = determineTdsSection({
        description: "Legal retainer for October",
        vendorName: "Sharma & Associates Advocates",
      });
      expect(result.section).toBe("194J");
      expect(result.rate).toBe(10);
    });

    it("determines 194J (2%) for software and technical fees", () => {
      const result = determineTdsSection({
        description: "Cloud hosting and IT maintenance services",
        vendorName: "CloudTech Solutions",
      });
      expect(result.section).toBe("194J");
      expect(result.rate).toBe(2);
    });

    it("determines 194C for transport / contractor work", () => {
      const result = determineTdsSection({
        description: "Logistics and transport freight charges",
        vendorName: "National Roadlines",
        vendorType: "company",
      });
      expect(result.section).toBe("194C");
      expect(result.rate).toBe(2);
    });

    it("determines 194C (1%) for individual contractors", () => {
      const result = determineTdsSection({
        description: "Office carpentry and electrical contractor work",
        vendorName: "Ramesh Kumar Contractor",
        vendorType: "individual",
      });
      expect(result.section).toBe("194C");
      expect(result.rate).toBe(1);
    });

    it("determines 194I for commercial rent", () => {
      const result = determineTdsSection({
        description: "Office premise monthly rent",
        vendorName: "Prestige Commercial Properties",
      });
      expect(result.section).toBe("194I");
      expect(result.rate).toBe(10);
    });
  });

  describe("TDS Calculation & Thresholds", () => {
    it("does not trigger deduction if single payment is under threshold", () => {
      const result = calculateTdsForPayment({
        amount: 25000,
        section: "194J",
        vendorName: "Expert Consultants",
        vendorPan: "ABCDE1234F",
      });
      expect(result.isApplicable).toBe(false);
      expect(result.tdsAmount).toBe(0);
      expect(result.reason.toLowerCase()).toContain("below threshold");
    });

    it("triggers deduction when single payment exceeds threshold (194J > 30k)", () => {
      const result = calculateTdsForPayment({
        amount: 50000,
        section: "194J",
        vendorName: "Expert Consultants",
        vendorPan: "ABCDE1234F",
      });
      expect(result.isApplicable).toBe(true);
      expect(result.tdsAmount).toBe(5000); // 10% of 50000
      expect(result.netPayable).toBe(45000);
      expect(result.explanation).toBeTruthy();
    });

    it("applies higher 20% rate under Section 206AA if PAN is missing", () => {
      const result = calculateTdsForPayment({
        amount: 50000,
        section: "194J",
        vendorName: "Mystery Contractor",
        vendorPan: null, // missing PAN
      });
      expect(result.isApplicable).toBe(true);
      expect(result.applicableRate).toBe(20);
      expect(result.tdsAmount).toBe(10000); // 20% penalty rate
      expect(result.panWarning).toBe(true);
    });

    it("triggers 194C deduction when cumulative FY payments exceed 1,00,000 threshold", () => {
      const result = calculateTdsForPayment({
        amount: 25000, // below single 30k threshold
        priorFyPayments: 80000, // prior total
        section: "194C",
        vendorName: "Swift Logistics LLP",
        vendorPan: "AABCS1234G",
        vendorType: "company",
      });
      // 80,000 + 25,000 = 1,05,000 -> exceeds 1,00,000 aggregate threshold!
      // TDS applies on excess over 1,00,000 = 5,000 at 2% = 100
      expect(result.isApplicable).toBe(true);
      expect(result.aggregateThresholdExceeded).toBe(true);
      expect(result.tdsAmount).toBe(100);
    });
  });
});
