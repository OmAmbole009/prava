import { describe, expect, it } from "vitest";
import { businessInputSchema } from "./workspace.js";

describe("business workspace input", () => {
  it("supplies global defaults for a minimal valid business", () => {
    const result = businessInputSchema.parse({
      name: "Verma Electricals",
      businessType: "Proprietorship",
      industry: "Electrical supplies",
    });

    expect(result).toMatchObject({
      country: "US",
      currency: "USD",
      locale: "en-US",
      timezone: "America/New_York",
      taxSystem: "Sales tax",
      gstStatus: "not_registered",
      financialYear: "January–December",
    });
  });

  it("accepts an international workspace profile", () => {
    const result = businessInputSchema.parse({ name: "Northstar Studio", businessType: "Company", industry: "Design", country: "GB", currency: "GBP", locale: "en-GB", timezone: "Europe/London", taxSystem: "VAT", financialYear: "April–March" });
    expect(result).toMatchObject({ country: "GB", currency: "GBP", locale: "en-GB", taxSystem: "VAT" });
  });

  it("normalizes the optional tax registration ID", () => {
    const result = businessInputSchema.parse({
      name: "Verma Electricals",
      businessType: "Proprietorship",
      industry: "Electrical supplies",
      gstin: " 27aabcu9603r1zm ",
    });

    expect(result.gstin).toBe("27AABCU9603R1ZM");
  });
});
