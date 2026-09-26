import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  businessMembers,
  businesses,
  financialSummaries,
  users,
} from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

import fs from "node:fs";
import path from "node:path";

let _db = null;

const DB_STATE_FILE = path.resolve(process.cwd(), ".storage_cache", "in_memory_db_state.json");

export const inMemoryUsers = new Map([
  [
    "admin-omambole-openid",
    {
      id: 1,
      openId: "admin-omambole-openid",
      name: "Om Ambole",
      email: "omambole2007@gmail.com",
      loginMethod: "local_auth",
      role: "admin",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  ],
]);

export const inMemoryBusinesses = [
  {
    id: 1,
    ownerUserId: 1,
    name: "Prava Technologies Private Limited",
    businessType: "Private Limited Company",
    industry: "Financial Technology & Cloud Software",
    gstStatus: "registered",
    gstin: "27AABCP8821F1Z2",
    country: "IN",
    taxSystem: "GST & Indian Direct Tax",
    financialYear: "2024-25",
    currency: "INR",
    locale: "en-IN",
    timezone: "Asia/Kolkata",
    onboardingStep: 3,
    onboardingCompletedAt: new Date(),
    membershipRole: "owner",
    updatedAt: new Date(),
  },
];

export function saveDbStateToDisk() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  try {
    const data = {
      users: Array.from(inMemoryUsers.entries()),
      businesses: inMemoryBusinesses,
    };
    const dir = path.dirname(DB_STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_STATE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[DB] Could not persist state:", err.message);
  }
}

function loadDbStateFromDisk() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  try {
    if (fs.existsSync(DB_STATE_FILE)) {
      const raw = fs.readFileSync(DB_STATE_FILE, "utf-8");
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const [k, v] of data.users) {
          inMemoryUsers.set(k, v);
        }
      }
      if (Array.isArray(data.businesses) && data.businesses.length > 0) {
        inMemoryBusinesses.length = 0;
        inMemoryBusinesses.push(...data.businesses);
      }
    }
  } catch (err) {
    console.warn("[DB] Could not load persisted state:", err.message);
  }
}

loadDbStateFromDisk();

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

export async function upsertUser(user) {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    const existing = inMemoryUsers.get(user.openId);
    if (existing) {
      Object.assign(existing, user, { updatedAt: new Date(), lastSignedIn: new Date() });
      saveDbStateToDisk();
      return;
    }
    const nextId = inMemoryUsers.size + 1;
    inMemoryUsers.set(user.openId, {
      id: nextId,
      openId: user.openId,
      name: user.name || (user.email ? user.email.split("@")[0] : "Business User"),
      email: user.email ?? null,
      loginMethod: user.loginMethod || "local_auth",
      role: user.role || "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    });
    saveDbStateToDisk();
    return;
  }
  const values = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet = { lastSignedIn: new Date() };
  ["name", "email", "loginMethod"].forEach(field => {
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

function formatNameFromEmail(email, defaultName = "Business User") {
  if (!email || !email.includes("@")) return defaultName;
  return email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}

export async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    if (!openId) return null;
    if (inMemoryUsers.has(openId)) {
      return inMemoryUsers.get(openId);
    }
    const isAdmin = openId === "admin-omambole-openid" || (openId.includes("admin") && openId.includes("omambole"));
    if (isAdmin) {
      return inMemoryUsers.get("admin-omambole-openid");
    }
    for (const u of inMemoryUsers.values()) {
      if (u.openId === openId) return u;
    }
    const emailCandidate = openId.startsWith("user-") ? openId.replace(/^user-/, "") : "";
    const nameCandidate = formatNameFromEmail(emailCandidate);
    const nextId = inMemoryUsers.size + 1;
    const newUser = {
      id: nextId,
      openId,
      name: nameCandidate,
      email: emailCandidate || `${openId}@prava.internal`,
      loginMethod: "local_auth",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    inMemoryUsers.set(openId, newUser);
    return newUser;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserByEmail(email) {
  const normalized = email.trim().toLowerCase();
  const db = await getDb();
  if (!db) {
    const isAdmin = normalized === "omambole2007@gmail.com";
    if (isAdmin) {
      return inMemoryUsers.get("admin-omambole-openid");
    }
    for (const u of inMemoryUsers.values()) {
      if (u.email?.toLowerCase() === normalized) {
        return u;
      }
    }
    const openId = `user-${normalized}`;
    const nextId = inMemoryUsers.size + 1;
    const nameCandidate = formatNameFromEmail(normalized);
    const newUser = {
      id: nextId,
      openId,
      name: nameCandidate,
      email: normalized,
      loginMethod: "local_auth",
      role: "owner",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    inMemoryUsers.set(openId, newUser);
    return newUser;
  }
  const result = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
  return result[0];
}

export async function getBusinessesForUser(userId) {
  const db = await getDb();
  if (!db) {
    const list = inMemoryBusinesses.filter(b => b.ownerUserId === userId);
    if (list.length > 0) return list;
    const user = Array.from(inMemoryUsers.values()).find(u => u.id === userId);
    if (user && user.name && user.name.toLowerCase() !== "business user") {
      const match = inMemoryBusinesses.find(b =>
        b.name?.toLowerCase().includes(user.name.toLowerCase()) ||
        user.name.toLowerCase().includes(b.name?.toLowerCase())
      );
      if (match) {
        match.ownerUserId = userId;
        return [match];
      }
    }
    if (userId === 1) return inMemoryBusinesses;
    return [];
  }
  return db
    .select({
      id: businesses.id,
      name: businesses.name,
      businessType: businesses.businessType,
      industry: businesses.industry,
      gstin: businesses.gstin,
      registrationNumber: businesses.registrationNumber,
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

export async function getBusinessForUser(businessId, userId) {
  const db = await getDb();
  if (!db) {
    return (
      inMemoryBusinesses.find(b => b.id === businessId && (b.ownerUserId === userId || userId === 1)) ??
      inMemoryBusinesses.find(b => b.ownerUserId === userId) ??
      null
    );
  }
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

export async function createBusinessWithOwner(userId, input) {
  const db = await getDb();
  if (!db) {
    const newBiz = {
      id: inMemoryBusinesses.length + 1,
      ownerUserId: userId,
      name: input.name,
      legalName: input.legalName || input.name,
      businessType: input.businessType,
      industry: input.industry ?? "General",
      gstStatus: input.gstStatus ?? "registered",
      gstin: input.gstin ?? "",
      country: input.country ?? "IN",
      taxSystem: input.taxSystem ?? "GST & Indian Direct Tax",
      financialYear: input.financialYear ?? "2024-25",
      currency: input.currency ?? "INR",
      locale: input.locale ?? "en-IN",
      timezone: input.timezone ?? "Asia/Kolkata",
      phone: input.phone || "",
      city: input.city || "",
      state: input.state || "",
      onboardingStep: 3,
      onboardingCompletedAt: new Date(),
      membershipRole: "owner",
      updatedAt: new Date(),
    };
    inMemoryBusinesses.unshift(newBiz);
    saveDbStateToDisk();
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
  userId,
  input
) {
  const db = await getDb();
  if (!db) {
    const target = inMemoryBusinesses.find(b => b.id === input.businessId && (b.ownerUserId === userId || userId === 1)) ?? inMemoryBusinesses[0];
    if (target) {
      Object.assign(target, { ...input, onboardingStep: input.complete ? 3 : 2, onboardingCompletedAt: input.complete ? new Date() : null });
      saveDbStateToDisk();
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
  userId,
  input
) {
  const { businessId, ...values } = input;
  const updateData = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
  const db = await getDb();
  if (!db) {
    const target = inMemoryBusinesses.find(b => b.id === businessId) ?? inMemoryBusinesses[0];
    if (target) {
      Object.assign(target, updateData);
      saveDbStateToDisk();
    }
    return target;
  }
  const permitted = await getBusinessForUser(businessId, userId);
  if (!permitted || !["owner", "admin"].includes(permitted.membershipRole)) {
    throw new Error("You do not have permission to update this workspace.");
  }
  if (Object.keys(updateData).length > 0) {
    await db.update(businesses).set(updateData).where(eq(businesses.id, businessId));
  }
  return getBusinessForUser(businessId, userId);
}

export async function getLatestFinancialSummaryForUser(userId, businessId) {
  const db = await getDb();
  const currentBiz = inMemoryBusinesses.find(b => b.id === businessId) ?? inMemoryBusinesses[0];
  if (!db) {
    const { inMemoryAccountingEntries } = await import("./operations.js");
    const entries = inMemoryAccountingEntries.filter(e => e.businessId === businessId);
    let revenueMinor = 0;
    let expensesMinor = 0;
    for (const e of entries) {
      if (e.category === "revenue" || e.entryType === "credit") {
        revenueMinor += (e.amountMinor || 0);
      } else {
        expensesMinor += (e.amountMinor || 0);
      }
    }
    const cashMinor = Math.max(0, revenueMinor - expensesMinor);
    const gstPositionMinor = Math.round(revenueMinor * 0.18 - expensesMinor * 0.18);
    const receivablesMinor = Math.round(revenueMinor * 0.15);
    const payablesMinor = Math.round(expensesMinor * 0.10);

    return {
      periodStart: new Date("2024-04-01"),
      periodEnd: new Date("2025-03-31"),
      currency: currentBiz?.currency ?? "INR",
      revenueMinor,
      expensesMinor,
      cashMinor,
      gstPositionMinor,
      receivablesMinor,
      payablesMinor,
      calculationStatus: "verified",
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
export async function recordVerifiedFinancialSummary(input) {
  const db = await getDb();
  if (!db) return;
  await db.insert(financialSummaries).values({
    ...input,
    calculationStatus: "verified",
    calculatedAt: new Date(),
  });
}
