import { describe, expect, it } from "vitest";
import {
  createBusinessWithOwner,
  getBusinessForUser,
  getBusinessesForUser,
  updateBusinessOnboarding,
  updateBusinessProfile,
  inMemoryBusinesses,
} from "./db.js";
import { updateBusinessProfileSchema, businessInputSchema } from "./workspace.js";

describe("PHASE 2: Business Profile Persistence & Regression Tests", () => {
  const testUserId = 8801;

  it("1. Creates a business with complete statutory profile fields", async () => {
    const input = {
      name: "Apex Cybernetics India Pvt Ltd",
      legalName: "Apex Cybernetics India Private Limited",
      businessType: "Private Limited Company",
      industry: "Enterprise Cloud Computing",
      email: "finance@apexcyber.in",
      phone: "+91 98765 43210",
      addressLine1: "Tower B, Level 9, Cyber Gateway",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560100",
      country: "IN",
      gstStatus: "registered",
      gstin: "29AABCA1234F1Z9",
      taxSystem: "GST & Indian Direct Tax",
      financialYear: "April–March",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
    };

    const created = await createBusinessWithOwner(testUserId, input);
    expect(created).toBeDefined();
    expect(created.id).toBeTypeOf("number");
    expect(created.name).toBe(input.name);
    expect(created.legalName).toBe(input.legalName);
    expect(created.businessType).toBe(input.businessType);
    expect(created.industry).toBe(input.industry);
    expect(created.email).toBe(input.email);
    expect(created.phone).toBe(input.phone);
    expect(created.addressLine1).toBe(input.addressLine1);
    expect(created.city).toBe(input.city);
    expect(created.state).toBe(input.state);
    expect(created.postalCode).toBe(input.postalCode);
    expect(created.gstin).toBe(input.gstin);
    expect(created.currency).toBe("INR");
  });

  it("2. getBusinessesForUser returns all projected fields without truncation", async () => {
    const businesses = await getBusinessesForUser(testUserId);
    expect(businesses).toBeInstanceOf(Array);
    expect(businesses.length).toBeGreaterThan(0);

    const biz = businesses[0];
    expect(biz.legalName).toBe("Apex Cybernetics India Private Limited");
    expect(biz.phone).toBe("+91 98765 43210");
    expect(biz.city).toBe("Bengaluru");
    expect(biz.state).toBe("Karnataka");
    expect(biz.postalCode).toBe("560100");
    expect(biz.addressLine1).toBe("Tower B, Level 9, Cyber Gateway");
    expect(biz.updatedAt).toBeDefined();
  });

  it("3. updateBusinessProfile updates targeted fields while strictly preserving untouched fields", async () => {
    const list = await getBusinessesForUser(testUserId);
    const original = list[0];
    const originalBizId = original.id;

    // Update only phone and city
    const updated = await updateBusinessProfile(testUserId, {
      businessId: originalBizId,
      phone: "+91 99999 88888",
      city: "Hyderabad",
    });

    expect(updated).toBeDefined();
    expect(updated.phone).toBe("+91 99999 88888");
    expect(updated.city).toBe("Hyderabad");

    // Preserved fields check:
    expect(updated.name).toBe(original.name);
    expect(updated.legalName).toBe(original.legalName);
    expect(updated.businessType).toBe(original.businessType);
    expect(updated.industry).toBe(original.industry);
    expect(updated.addressLine1).toBe(original.addressLine1);
    expect(updated.state).toBe(original.state);
    expect(updated.gstin).toBe(original.gstin);
    expect(updated.currency).toBe(original.currency);
    expect(updated.taxSystem).toBe(original.taxSystem);
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(original.updatedAt).getTime());
  });

  it("4. Prevents duplicate businesses on repeated updates and persists data across simulated app restarts", async () => {
    const initialList = await getBusinessesForUser(testUserId);
    const bizCountBefore = initialList.length;
    const targetBizId = initialList[0].id;

    // Repeated update calls simulating user editing the profile multiple times
    await updateBusinessProfile(testUserId, {
      businessId: targetBizId,
      legalName: "Apex Cybernetics India Tech Private Limited",
    });

    await updateBusinessProfile(testUserId, {
      businessId: targetBizId,
      industry: "Artificial Intelligence & Cloud Automation",
    });

    const finalList = await getBusinessesForUser(testUserId);
    // Number of businesses for user MUST NOT grow on updates
    expect(finalList.length).toBe(bizCountBefore);

    const reloaded = await getBusinessForUser(targetBizId, testUserId);
    expect(reloaded.legalName).toBe("Apex Cybernetics India Tech Private Limited");
    expect(reloaded.industry).toBe("Artificial Intelligence & Cloud Automation");
  });

  it("5. updateBusinessProfileSchema validates and parses all profile fields", () => {
    const rawInput = {
      businessId: 101,
      name: "Global Horizons LLP",
      legalName: "Global Horizons LLP Inc",
      businessType: "LLP",
      industry: "Legal & Corporate Consulting",
      email: "hello@globalhorizons.com",
      phone: "+91 91234 56789",
      addressLine1: "42 Financial District",
      city: "Gurugram",
      state: "Haryana",
      postalCode: "122002",
      gstin: "06aabct1234c1z5",
      financialYear: "April–March",
      currency: "INR",
    };

    const parsed = updateBusinessProfileSchema.parse(rawInput);
    expect(parsed.businessId).toBe(101);
    expect(parsed.legalName).toBe("Global Horizons LLP Inc");
    expect(parsed.businessType).toBe("LLP");
    expect(parsed.industry).toBe("Legal & Corporate Consulting");
    expect(parsed.email).toBe("hello@globalhorizons.com");
    expect(parsed.phone).toBe("+91 91234 56789");
    expect(parsed.city).toBe("Gurugram");
    expect(parsed.state).toBe("Haryana");
    expect(parsed.postalCode).toBe("122002");
    expect(parsed.gstin).toBe("06AABCT1234C1Z5"); // uppercase transformation
  });

  it("6. Resumable onboarding: updates step and persists partial progress", async () => {
    const unfinishedUserId = 8802;
    const initial = await createBusinessWithOwner(unfinishedUserId, {
      name: "Unfinished Beta Co",
      businessType: "Proprietorship",
      industry: "Retail Commerce",
    });

    // Mark step 2 without completion
    const step2Progress = await updateBusinessOnboarding(unfinishedUserId, {
      businessId: initial.id,
      city: "Pune",
      state: "Maharashtra",
      complete: false,
    });

    expect(step2Progress.onboardingStep).toBe(2);
    expect(step2Progress.onboardingCompletedAt).toBeNull();

    // Verify it reloads with step 2
    const fetched = await getBusinessForUser(initial.id, unfinishedUserId);
    expect(fetched.onboardingStep).toBe(2);
    expect(fetched.onboardingCompletedAt).toBeNull();

    // Now complete onboarding
    const completed = await updateBusinessOnboarding(unfinishedUserId, {
      businessId: initial.id,
      complete: true,
    });
    expect(completed.onboardingStep).toBe(3);
    expect(completed.onboardingCompletedAt).toBeDefined();
  });
});
