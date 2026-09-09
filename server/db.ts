import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  businessMembers,
  businesses,
  financialSummaries,
  InsertUser,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import type { VerifiedFinancialSummaryInput } from "./finance";
import type { BusinessInput } from "./workspace";

let _db: ReturnType<typeof drizzle> | null = null;

type InMemoryBusiness = {
  id: number;
  name: string;
  businessType: string;
  industry: string;
  gstStatus: "registered" | "not_registered" | "pending";
  gstin: string;
  country: string;
  taxSystem: string;
  financialYear: string;
  currency: string;
  locale: string;
  timezone: string;
  onboardingStep: number;
  onboardingCompletedAt: Date | null;
  membershipRole: "owner" | "admin" | "member" | "viewer";
  updatedAt: Date;
};

const inMemoryBusinesses: InMemoryBusiness[] = [
  {
    id: 1,
    name: "Acme Global Solutions",
    businessType: "Corporation",
    industry: "Technology & Services",
    gstStatus: "registered",
    gstin: "US-TAX-98765",
    country: "US",
    taxSystem: "Sales Tax",
    financialYear: "2026",
    currency: "USD",
    locale: "en-US",
    timezone: "America/New_York",
    onboardingStep: 3,
    onboardingCompletedAt: new Date(),
    membershipRole: "owner",
    updatedAt: new Date(),
  },
];

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  if (user.openId === ENV.ownerOpenId || user.role) {
    values.role = user.openId === ENV.ownerOpenId ? "admin" : user.role;
    updateSet.role = values.role;
  }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    return {
      id: 1,
      openId,
      name: "Demo Business Owner",
      email: "owner@acme-global.com",
      loginMethod: "local_demo",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    return {
      id: 1,
      openId: "demo-user-openid",
      name: "Demo Business Owner",
      email: email.trim().toLowerCase(),
      loginMethod: "local_demo",
      role: "admin" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
  }
  const result = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1);
  return result[0];
}

export async function getBusinessesForUser(userId: number) {
  const db = await getDb();
  if (!db) return inMemoryBusinesses;
  return db
    .select({
      id: businesses.id,
      name: businesses.name,
      businessType: businesses.businessType,
      industry: businesses.industry,
      gstStatus: businesses.gstStatus,
      country: businesses.country,
      taxSystem: businesses.taxSystem,
      financialYear: businesses.financialYear,
      currency: businesses.currency,
      locale: businesses.locale,
      timezone: businesses.timezone,
      onboardingStep: businesses.onboardingStep,
      onboardingCompletedAt: businesses.onboardingCompletedAt,
      membershipRole: businessMembers.role,
      updatedAt: businesses.updatedAt,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(eq(businessMembers.userId, userId))
    .orderBy(desc(businesses.updatedAt));
}

export async function getBusinessForUser(businessId: number, userId: number) {
  const db = await getDb();
  if (!db) return inMemoryBusinesses.find(b => b.id === businessId) ?? inMemoryBusinesses[0];
  const result = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      businessType: businesses.businessType,
      industry: businesses.industry,
      gstStatus: businesses.gstStatus,
      gstin: businesses.gstin,
      country: businesses.country,
      taxSystem: businesses.taxSystem,
      financialYear: businesses.financialYear,
      currency: businesses.currency,
      locale: businesses.locale,
      timezone: businesses.timezone,
      onboardingStep: businesses.onboardingStep,
      onboardingCompletedAt: businesses.onboardingCompletedAt,
      membershipRole: businessMembers.role,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(and(eq(businessMembers.userId, userId), eq(businesses.id, businessId)))
    .limit(1);
  return result[0];
}

export async function createBusinessWithOwner(userId: number, input: BusinessInput) {
  const db = await getDb();
  if (!db) {
    const newBiz: InMemoryBusiness = {
      id: inMemoryBusinesses.length + 1,
      name: input.name,
      businessType: input.businessType,
      industry: input.industry ?? "General",
      gstStatus: input.gstStatus ?? "not_registered",
      gstin: input.gstin ?? "",
      country: input.country ?? "US",
      taxSystem: input.taxSystem ?? "Sales Tax",
      financialYear: input.financialYear ?? "2026",
      currency: input.currency ?? "USD",
      locale: input.locale ?? "en-US",
      timezone: input.timezone ?? "America/New_York",
      onboardingStep: 3,
      onboardingCompletedAt: new Date(),
      membershipRole: "owner",
      updatedAt: new Date(),
    };
    inMemoryBusinesses.unshift(newBiz);
    return newBiz;
  }
  const businessId = await db.transaction(async tx => {
    const inserted = await tx
      .insert(businesses)
      .values({ ...input, ownerUserId: userId })
      .$returningId();
    const createdId = inserted[0]?.id;
    if (!createdId) throw new Error("Workspace could not be created.");
    await tx.insert(businessMembers).values({ businessId: createdId, userId, role: "owner" });
    return createdId;
  });
  return getBusinessForUser(businessId, userId);
}

export async function updateBusinessOnboarding(
  userId: number,
  input: BusinessInput & { businessId: number; complete: boolean }
) {
  const db = await getDb();
  if (!db) {
    const target = inMemoryBusinesses.find(b => b.id === input.businessId) ?? inMemoryBusinesses[0];
    if (target) {
      Object.assign(target, { ...input, onboardingStep: input.complete ? 3 : 2, onboardingCompletedAt: input.complete ? new Date() : null });
    }
    return target;
  }
  const permitted = await getBusinessForUser(input.businessId, userId);
  if (!permitted || !["owner", "admin"].includes(permitted.membershipRole)) {
    throw new Error("You do not have permission to update this workspace.");
  }
  const { businessId, complete, ...values } = input;
  await db
    .update(businesses)
    .set({
      ...values,
      onboardingStep: complete ? 3 : 2,
      onboardingCompletedAt: complete ? new Date() : null,
    })
    .where(eq(businesses.id, businessId));
  return getBusinessForUser(businessId, userId);
}

export async function updateBusinessProfile(
  userId: number,
  input: {
    businessId: number;
    country?: string;
    currency?: string;
    taxSystem?: string;
    locale?: string;
    timezone?: string;
    name?: string;
    gstStatus?: "registered" | "not_registered" | "pending";
    gstin?: string;
  }
) {
  const db = await getDb();
  if (!db) {
    const target = inMemoryBusinesses.find(b => b.id === input.businessId) ?? inMemoryBusinesses[0];
    if (target) {
      const { businessId, ...values } = input;
      for (const [k, v] of Object.entries(values)) {
        if (v !== undefined) (target as any)[k] = v;
      }
    }
    return target;
  }
  const permitted = await getBusinessForUser(input.businessId, userId);
  if (!permitted || !["owner", "admin"].includes(permitted.membershipRole)) {
    throw new Error("You do not have permission to update this workspace.");
  }
  const { businessId, ...values } = input;
  const updateData: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined) updateData[k] = v;
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(businesses).set(updateData).where(eq(businesses.id, businessId));
  }
  return getBusinessForUser(businessId, userId);
}

export async function getLatestFinancialSummaryForUser(userId: number, businessId: number) {
  const db = await getDb();
  const currentBiz = inMemoryBusinesses.find(b => b.id === businessId) ?? inMemoryBusinesses[0];
  if (!db) {
    return {
      periodStart: new Date("2026-08-01"),
      periodEnd: new Date("2026-08-31"),
      currency: currentBiz?.currency ?? "USD",
      revenueMinor: 12500000,
      expensesMinor: 4850000,
      cashMinor: 7650000,
      gstPositionMinor: 1420000,
      receivablesMinor: 3200000,
      payablesMinor: 1150000,
      calculationStatus: "verified" as const,
      calculatedAt: new Date(),
    };
  }
  const result = await db
    .select({
      periodStart: financialSummaries.periodStart,
      periodEnd: financialSummaries.periodEnd,
      currency: financialSummaries.currency,
      revenueMinor: financialSummaries.revenueMinor,
      expensesMinor: financialSummaries.expensesMinor,
      cashMinor: financialSummaries.cashMinor,
      gstPositionMinor: financialSummaries.gstPositionMinor,
      receivablesMinor: financialSummaries.receivablesMinor,
      payablesMinor: financialSummaries.payablesMinor,
      calculationStatus: financialSummaries.calculationStatus,
      calculatedAt: financialSummaries.calculatedAt,
    })
    .from(businessMembers)
    .innerJoin(financialSummaries, eq(businessMembers.businessId, financialSummaries.businessId))
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(financialSummaries.businessId, businessId),
        eq(financialSummaries.calculationStatus, "verified")
      )
    )
    .orderBy(desc(financialSummaries.periodEnd), desc(financialSummaries.calculatedAt))
    .limit(1);
  return result[0];
}

/** Server-only persistence hook for a verified document/ledger pipeline. */
export async function recordVerifiedFinancialSummary(input: VerifiedFinancialSummaryInput) {
  const db = await getDb();
  if (!db) return;
  await db.insert(financialSummaries).values({
    ...input,
    calculationStatus: "verified",
    calculatedAt: new Date(),
  });
}
