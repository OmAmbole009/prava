import { and, eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  adminAuditEvents,
  businesses,
  businessMembers,
  caAssignments,
  caAuditObservations,
  caProfiles,
  documentExtractions,
  documents,
  gstPreparations,
  operationalTasks,
  users,
} from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { submitCaDecision } from "./caManagement.js";

// Only runs against a real MySQL instance (DATABASE_URL). In-memory runs skip it,
// because the guarantee under test is the database transaction and row lock.
const hasDatabase = Boolean(process.env.DATABASE_URL);

const created = { ownerId: 0, caId: 0, businessId: 0, taskId: 0, documentId: 0, profileId: 0 };

async function cleanup() {
  const db = await getDb();
  if (!db || !created.businessId) return;
  await db.delete(caAuditObservations).where(eq(caAuditObservations.businessId, created.businessId));
  if (created.taskId) {
    await db.delete(gstPreparations).where(eq(gstPreparations.taskId, created.taskId));
    await db.delete(documentExtractions).where(eq(documentExtractions.documentId, created.documentId));
    await db.delete(documents).where(eq(documents.taskId, created.taskId));
    await db.delete(operationalTasks).where(eq(operationalTasks.id, created.taskId));
  }
  await db.delete(caAssignments).where(eq(caAssignments.businessId, created.businessId));
  // Decisions write an administrative audit row that references the reviewer.
  if (created.caId) await db.delete(adminAuditEvents).where(eq(adminAuditEvents.actorUserId, created.caId));
  await db.delete(businessMembers).where(eq(businessMembers.businessId, created.businessId));
  await db.delete(businesses).where(eq(businesses.id, created.businessId));
  if (created.profileId) await db.delete(caProfiles).where(eq(caProfiles.id, created.profileId));
  if (created.caId) await db.delete(users).where(eq(users.id, created.caId));
  if (created.ownerId) await db.delete(users).where(eq(users.id, created.ownerId));
  Object.assign(created, { ownerId: 0, caId: 0, businessId: 0, taskId: 0, documentId: 0, profileId: 0 });
}

async function seed() {
  const db = await getDb();
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

  created.ownerId = (await db.insert(users).values({
    openId: `conc-owner-${suffix}`, name: "Concurrency Owner", loginMethod: "test", role: "user",
  }).$returningId())[0].id;

  created.caId = (await db.insert(users).values({
    openId: `conc-ca-${suffix}`, name: "Concurrency CA", loginMethod: "test", role: "ca",
  }).$returningId())[0].id;

  created.businessId = (await db.insert(businesses).values({
    ownerUserId: created.ownerId,
    name: `Concurrency Workspace ${suffix}`,
    businessType: "Proprietorship",
    industry: "Testing",
    gstStatus: "registered",
    gstin: "27ABCDE1234F1Z5",
  }).$returningId())[0].id;

  await db.insert(businessMembers).values({ businessId: created.businessId, userId: created.ownerId, role: "owner" });

  created.profileId = (await db.insert(caProfiles).values({
    userId: created.caId,
    fullName: "CA Concurrency Test",
    email: `conc-ca-${suffix}@prava.test`,
    membershipNumber: `ICAI-CONC-${suffix}`,
    createdByAdminId: created.ownerId,
    status: "active",
  }).$returningId())[0].id;

  await db.insert(caAssignments).values({
    caUserId: created.caId,
    businessId: created.businessId,
    assignedByAdminId: created.ownerId,
    status: "active",
  });

  created.taskId = (await db.insert(operationalTasks).values({
    businessId: created.businessId,
    createdByUserId: created.ownerId,
    type: "gst_return_preparation",
    title: "Concurrency review task",
    status: "ready_for_review",
    requiresProfessionalReview: 1,
    version: 0,
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    periodEnd: new Date("2026-05-01T00:00:00.000Z"),
  }).$returningId())[0].id;

  created.documentId = (await db.insert(documents).values({
    businessId: created.businessId,
    taskId: created.taskId,
    uploadedByUserId: created.ownerId,
    storageKey: `concurrency/${suffix}.pdf`,
    storageUrl: "https://storage.example/concurrency.pdf",
    originalName: "concurrency-invoice.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1,
    documentType: "invoice",
    status: "extracted",
  }).$returningId())[0].id;

  await db.insert(documentExtractions).values({
    documentId: created.documentId,
    model: "concurrency-harness",
    status: "extracted",
    confidenceBps: 9700,
    invoiceNumber: `INV-${suffix}`,
    totalMinor: 118000,
    cgstMinor: 9000,
    sgstMinor: 9000,
    igstMinor: 0,
    taxableValueMinor: 100000,
    extractedData: "{}",
  });

  await db.insert(gstPreparations).values({
    businessId: created.businessId,
    taskId: created.taskId,
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    periodEnd: new Date("2026-05-01T00:00:00.000Z"),
    status: "prepared",
    netTaxPositionMinor: 18000,
  });
}

const decision = (overrides = {}) => ({
  taskId: created.taskId,
  businessId: created.businessId,
  decision: "approved",
  observationTitle: "Concurrent review",
  detailedNotes: "Reviewed the source invoice, extraction and prepared working before deciding.",
  ...overrides,
});

describe.skipIf(!hasDatabase)("professional decisions on real MySQL", () => {
  afterEach(cleanup);

  it("allows exactly one of two simultaneous decisions to commit", async () => {
    await seed();
    const db = await getDb();

    const results = await Promise.allSettled([
      submitCaDecision(created.caId, decision({ expectedVersion: 0 })),
      submitCaDecision(created.caId, decision({ decision: "rejected", expectedVersion: 0 })),
    ]);

    const fulfilled = results.filter(result => result.status === "fulfilled");
    const rejected = results.filter(result => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(String(rejected[0].reason?.message ?? rejected[0].reason)).toMatch(/changed after you opened it/i);

    const observations = await db.select().from(caAuditObservations).where(eq(caAuditObservations.taskId, created.taskId));
    expect(observations).toHaveLength(1);

    const [task] = await db.select().from(operationalTasks).where(eq(operationalTasks.id, created.taskId));
    expect(task.version).toBe(1);

    // The task status must match the decision that actually committed.
    if (observations[0].decision === "approved") expect(task.status).toBe("ready_for_review");
    else expect(task.status).toBe("rejected");
  });

  it("rejects a decision that was prepared against a superseded version", async () => {
    await seed();
    await submitCaDecision(created.caId, decision({ expectedVersion: 0 }));

    await expect(
      submitCaDecision(created.caId, decision({ decision: "rejected", expectedVersion: 0 })),
    ).rejects.toThrow(/changed after you opened it/i);
  });

  it("keeps the committed decision when the losing request would have changed it", async () => {
    await seed();
    const db = await getDb();
    await submitCaDecision(created.caId, decision({ expectedVersion: 0 }));
    await expect(
      submitCaDecision(created.caId, decision({ decision: "needs_revision", expectedVersion: 0 })),
    ).rejects.toThrow(/changed after you opened it/i);

    const [task] = await db.select().from(operationalTasks).where(eq(operationalTasks.id, created.taskId));
    const observations = await db.select().from(caAuditObservations).where(
      and(eq(caAuditObservations.taskId, created.taskId), eq(caAuditObservations.decision, "approved")),
    );
    expect(task.status).toBe("ready_for_review");
    expect(observations).toHaveLength(1);
  });
});
