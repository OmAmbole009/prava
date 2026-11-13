import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { HttpError } from "../shared/_core/errors.js";
import { canTransitionTaskStatus } from "./taskLifecycle.js";
import {
  APPROVAL_STATUS_LABELS,
  APPROVAL_STATUS_TONES,
  authorizeCaReview,
  computeEvidenceFingerprint,
  deriveApprovalStatus,
  deriveNextAction,
  evaluateApprovalValidity,
  evidenceReference,
  isReviewableTaskStatus,
} from "./caApproval.js";
import {
  actionItems,
  adminAuditEvents,
  businesses,
  caAssignments,
  caAuditObservations,
  caCredentials,
  caProfiles,
  documentExtractions,
  documents,
  gstPreparations,
  gstSubmissionRequests,
  operationalTasks,
  reviewRequests,
  taskRequirements,
  users,
} from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { hashCaPassword, inMemoryCaCredentials, inMemoryCaProfiles } from "./caAuth.js";

export const grantCaAccessSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().trim().toLowerCase().email(),
  phone: z.string().trim().max(32).optional(),
  membershipNumber: z.string().trim().min(3).max(64),
  firmName: z.string().trim().max(160).optional(),
  specialization: z.string().trim().max(200).default("GST Filings, Direct Tax & Corporate Audit"),
  initialPassword: z.string().min(8).max(256),
  bio: z.string().max(1000).optional(),
  assignedBusinessIds: z.array(z.number().int().positive()).optional().default([]),
});

export const updateCaStatusSchema = z.object({
  caUserId: z.number().int().positive(),
  status: z.enum(["active", "suspended", "revoked"]),
  reason: z.string().max(500).optional(),
});

export const resetCaPasswordSchema = z.object({
  caUserId: z.number().int().positive(),
  newPassword: z.string().min(8).max(256),
});

export const caAssignmentSchema = z.object({
  caUserId: z.number().int().positive(),
  businessId: z.number().int().positive(),
  notes: z.string().max(500).optional(),
});

export const caDecisionSchema = z.object({
  taskId: z.number().int().positive(),
  businessId: z.number().int().positive(),
  decision: z.enum(["approved", "needs_revision", "rejected"]),
  observationTitle: z.string().trim().min(3).max(200),
  detailedNotes: z.string().trim().min(10).max(3000),
  certificateReference: z.string().trim().max(128).optional(),
  // Optimistic concurrency: the task version the reviewer inspected. When
  // supplied, a decision is rejected if the task changed in the meantime.
  expectedVersion: z.number().int().min(0).optional(),
});

// Serializes decisions per task in the development store. The database path uses
// a row lock instead; this exists so local mode cannot double-approve under
// concurrent requests.
const inMemoryDecisionLocks = new Map();
function withInMemoryTaskLock(taskId, fn) {
  const key = String(taskId);
  const previous = inMemoryDecisionLocks.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  inMemoryDecisionLocks.set(key, run.catch(() => {}));
  return run;
}

// In-memory assignment storage for mock mode
export const inMemoryCaAssignments = [
  {
    id: 1,
    caUserId: 201,
    businessId: 1,
    status: "active",
    notes: "Designated Chartered Accountant for statutory & tax compliance sign-offs.",
    assignedByAdminId: 1,
    assignedAt: new Date("2026-01-15"),
  },
];

export const inMemoryCaObservations = [];
export const inMemoryReviewRequests = [];
export const inMemoryGstSubmissions = [];

// Helper to record administrative audit events
async function recordAudit(actorUserId, action, entityType, entityId, metadata) {
  const db = await getDb();
  if (db) {
    await db.insert(adminAuditEvents).values({
      actorUserId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });
  }
}

// -------------------------------------------------------------
// ADMIN PROCEDURES
// -------------------------------------------------------------

export async function listAllCas() {
  const db = await getDb();
  if (!db) {
    return inMemoryCaProfiles.map(p => {
      const assignments = inMemoryCaAssignments.filter(a => a.caUserId === p.userId && a.status === "active");
      return {
        ...p,
        assignedWorkspacesCount: assignments.length,
        assignedBusinessIds: assignments.map(a => a.businessId),
      };
    });
  }

  const profiles = await db
    .select({
      id: caProfiles.id,
      userId: caProfiles.userId,
      fullName: caProfiles.fullName,
      email: caProfiles.email,
      phone: caProfiles.phone,
      membershipNumber: caProfiles.membershipNumber,
      firmName: caProfiles.firmName,
      specialization: caProfiles.specialization,
      status: caProfiles.status,
      bio: caProfiles.bio,
      createdByAdminId: caProfiles.createdByAdminId,
      createdAt: caProfiles.createdAt,
      updatedAt: caProfiles.updatedAt,
    })
    .from(caProfiles)
    .orderBy(desc(caProfiles.createdAt));

  const assignments = await db
    .select({
      caUserId: caAssignments.caUserId,
      businessId: caAssignments.businessId,
    })
    .from(caAssignments)
    .where(eq(caAssignments.status, "active"));

  return profiles.map(p => {
    const userAssignments = assignments.filter(a => a.caUserId === p.userId);
    return {
      ...p,
      assignedWorkspacesCount: userAssignments.length,
      assignedBusinessIds: userAssignments.map(a => a.businessId),
    };
  });
}

export async function grantCaAccess(adminUserId, input) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const db = await getDb();

  if (!db) {
    const existing = inMemoryCaProfiles.find(p => p.email.toLowerCase() === normalizedEmail);
    if (existing) throw new Error("A Chartered Accountant with this email address already exists.");

    const newUserId = 200 + inMemoryCaProfiles.length + 1;
    const newProfile = {
      id: inMemoryCaProfiles.length + 1,
      userId: newUserId,
      fullName: input.fullName,
      email: normalizedEmail,
      phone: input.phone || null,
      membershipNumber: input.membershipNumber,
      firmName: input.firmName || null,
      specialization: input.specialization,
      status: "active",
      bio: input.bio || null,
      createdByAdminId: adminUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    inMemoryCaProfiles.push(newProfile);

    const salt = randomBytes(16).toString("hex");
    const hash = await hashCaPassword(input.initialPassword, salt);
    inMemoryCaCredentials.set(newUserId, { passwordHash: hash, passwordSalt: salt });

    for (const bId of input.assignedBusinessIds) {
      inMemoryCaAssignments.push({
        id: inMemoryCaAssignments.length + 1,
        caUserId: newUserId,
        businessId: bId,
        status: "active",
        notes: "Assigned during CA onboarding",
        assignedByAdminId: adminUserId,
        assignedAt: new Date(),
      });
    }

    return {
      id: newProfile.id,
      userId: newUserId,
      email: newProfile.email,
      fullName: newProfile.fullName,
      membershipNumber: newProfile.membershipNumber,
    };
  }

  // Live database transaction
  const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
  let targetUserId;

  if (existingUser[0]) {
    targetUserId = existingUser[0].id;
    await db.update(users).set({ role: "ca", name: input.fullName }).where(eq(users.id, targetUserId));
  } else {
    const insertedUser = await db
      .insert(users)
      .values({
        openId: `ca-${randomBytes(8).toString("hex")}`,
        name: input.fullName,
        email: normalizedEmail,
        loginMethod: "ca_portal",
        role: "ca",
      })
      .$returningId();
    targetUserId = insertedUser[0].id;
  }

  const salt = randomBytes(16).toString("hex");
  const hash = await hashCaPassword(input.initialPassword, salt);

  await db
    .insert(caProfiles)
    .values({
      userId: targetUserId,
      fullName: input.fullName,
      email: normalizedEmail,
      phone: input.phone,
      membershipNumber: input.membershipNumber,
      firmName: input.firmName,
      specialization: input.specialization,
      status: "active",
      bio: input.bio,
      createdByAdminId: adminUserId,
    })
    .onDuplicateKeyUpdate({
      set: {
        fullName: input.fullName,
        phone: input.phone,
        membershipNumber: input.membershipNumber,
        firmName: input.firmName,
        specialization: input.specialization,
        status: "active",
        bio: input.bio,
      },
    });

  await db
    .insert(caCredentials)
    .values({
      userId: targetUserId,
      passwordHash: hash,
      passwordSalt: salt,
      setByAdminId: adminUserId,
    })
    .onDuplicateKeyUpdate({
      set: {
        passwordHash: hash,
        passwordSalt: salt,
        setByAdminId: adminUserId,
        updatedAt: new Date(),
      },
    });

  if (input.assignedBusinessIds.length > 0) {
    for (const bId of input.assignedBusinessIds) {
      await db.insert(caAssignments).values({
        caUserId: targetUserId,
        businessId: bId,
        status: "active",
        notes: "Assigned by Administrator during onboarding",
        assignedByAdminId: adminUserId,
      });
    }
  }

  await recordAudit(adminUserId, "CA_ACCESS_GRANTED", "ca_profile", String(targetUserId), {
    email: normalizedEmail,
    membershipNumber: input.membershipNumber,
    assignedBusinesses: input.assignedBusinessIds,
  });

  return {
    userId: targetUserId,
    email: normalizedEmail,
    fullName: input.fullName,
    membershipNumber: input.membershipNumber,
  };
}

export async function updateCaStatus(adminUserId, input) {
  const db = await getDb();
  if (!db) {
    const profile = inMemoryCaProfiles.find(p => p.userId === input.caUserId);
    if (!profile) throw new Error("Chartered Accountant profile not found.");
    profile.status = input.status;
    profile.updatedAt = new Date();
    return { success: true, status: input.status };
  }

  await db.update(caProfiles).set({ status: input.status, updatedAt: new Date() }).where(eq(caProfiles.userId, input.caUserId));
  await recordAudit(adminUserId, `CA_STATUS_${input.status.toUpperCase()}`, "ca_profile", String(input.caUserId), { reason: input.reason });
  return { success: true, status: input.status };
}

export async function resetCaPassword(adminUserId, input) {
  const salt = randomBytes(16).toString("hex");
  const hash = await hashCaPassword(input.newPassword, salt);

  const db = await getDb();
  if (!db) {
    inMemoryCaCredentials.set(input.caUserId, { passwordHash: hash, passwordSalt: salt });
    return { success: true };
  }

  await db
    .insert(caCredentials)
    .values({
      userId: input.caUserId,
      passwordHash: hash,
      passwordSalt: salt,
      setByAdminId: adminUserId,
    })
    .onDuplicateKeyUpdate({
      set: {
        passwordHash: hash,
        passwordSalt: salt,
        setByAdminId: adminUserId,
        updatedAt: new Date(),
      },
    });

  await recordAudit(adminUserId, "CA_PASSWORD_RESET", "ca_credential", String(input.caUserId));
  return { success: true };
}

export async function assignCaToBusiness(adminUserId, input) {
  const db = await getDb();
  if (!db) {
    const existing = inMemoryCaAssignments.find(a => a.caUserId === input.caUserId && a.businessId === input.businessId && a.status === "active");
    if (!existing) {
      inMemoryCaAssignments.push({
        id: inMemoryCaAssignments.length + 1,
        caUserId: input.caUserId,
        businessId: input.businessId,
        status: "active",
        notes: input.notes || "Assigned by Administrator",
        assignedByAdminId: adminUserId,
        assignedAt: new Date(),
      });
    }
    return { success: true };
  }

  await db.insert(caAssignments).values({
    caUserId: input.caUserId,
    businessId: input.businessId,
    status: "active",
    notes: input.notes,
    assignedByAdminId: adminUserId,
  });

  await recordAudit(adminUserId, "CA_ASSIGNED_WORKSPACE", "ca_assignment", String(input.caUserId), {
    businessId: input.businessId,
  });

  return { success: true };
}

export async function unassignCaFromBusiness(adminUserId, caUserId, businessId) {
  const db = await getDb();
  if (!db) {
    const item = inMemoryCaAssignments.find(a => a.caUserId === caUserId && a.businessId === businessId && a.status === "active");
    if (item) item.status = "unassigned";
    return { success: true };
  }

  await db
    .update(caAssignments)
    .set({ status: "unassigned" })
    .where(and(eq(caAssignments.caUserId, caUserId), eq(caAssignments.businessId, businessId)));

  await recordAudit(adminUserId, "CA_UNASSIGNED_WORKSPACE", "ca_assignment", String(caUserId), { businessId });
  return { success: true };
}

// -------------------------------------------------------------
// CA PORTAL PROCEDURES (For logged-in CA)
// -------------------------------------------------------------

export async function getCaProfileForUser(userId) {
  const db = await getDb();
  if (!db) {
    const profile = inMemoryCaProfiles.find(p => p.userId === userId) ?? null;
    if (!profile) return null;
    const assignments = inMemoryCaAssignments.filter(a => a.caUserId === profile.userId && a.status === "active");
    return { ...profile, assignedWorkspacesCount: assignments.length };
  }

  const profile = await db.select().from(caProfiles).where(eq(caProfiles.userId, userId)).limit(1);
  if (!profile[0]) {
    // No verified professional profile exists for this user. Return null rather
    // than inventing a membership number or verification status.
    return null;
  }

  const assignments = await db
    .select({ id: caAssignments.id })
    .from(caAssignments)
    .where(and(eq(caAssignments.caUserId, userId), eq(caAssignments.status, "active")));

  return { ...profile[0], assignedWorkspacesCount: assignments.length };
}

export async function getCaDashboardStats(caUserId) {
  const db = await getDb();
  if (!db) {
    const pendingReviewsCount = inMemoryReviewRequests.filter(r => r.status === "in_review" || r.status === "requested").length;
    const totalGstSubmissionsInQueue = inMemoryGstSubmissions.filter(s => s.status === "awaiting_review").length;
    return {
      assignedBusinessesCount: inMemoryCaAssignments.filter(a => a.caUserId === caUserId && a.status === "active").length,
      pendingReviewsCount,
      completedReviewsCount: inMemoryCaObservations.filter(o => o.caUserId === caUserId).length,
      totalGstSubmissionsInQueue,
      caProfile: inMemoryCaProfiles.find(p => p.userId === caUserId) ?? null,
    };
  }

  const profile = await getCaProfileForUser(caUserId);
  const assignments = await db
    .select({ businessId: caAssignments.businessId })
    .from(caAssignments)
    .where(and(eq(caAssignments.caUserId, caUserId), eq(caAssignments.status, "active")));

  const businessIds = assignments.map(a => a.businessId);

  let pendingReviewsCount = 0;
  let completedReviewsCount = 0;
  let gstSubmissionsInQueue = 0;

  if (businessIds.length > 0) {
    const pendingReviews = await db
      .select({ id: reviewRequests.id })
      .from(reviewRequests)
      .where(and(inArray(reviewRequests.businessId, businessIds), inArray(reviewRequests.status, ["requested", "in_review"])));
    pendingReviewsCount = pendingReviews.length;

    const completedObs = await db
      .select({ id: caAuditObservations.id })
      .from(caAuditObservations)
      .where(eq(caAuditObservations.caUserId, caUserId));
    completedReviewsCount = completedObs.length;

    const gstQueue = await db
      .select({ id: gstSubmissionRequests.id })
      .from(gstSubmissionRequests)
      .where(and(inArray(gstSubmissionRequests.businessId, businessIds), eq(gstSubmissionRequests.status, "awaiting_review")));
    gstSubmissionsInQueue = gstQueue.length;
  }

  return {
    assignedBusinessesCount: businessIds.length,
    pendingReviewsCount,
    completedReviewsCount,
    totalGstSubmissionsInQueue: gstSubmissionsInQueue,
    caProfile: profile,
  };
}

export async function getAssignedWorkspacesForCa(caUserId) {
  const db = await getDb();
  if (!db) {
    const { inMemoryBusinesses } = await import("./db.js");
    return inMemoryCaAssignments
      .filter(a => a.caUserId === caUserId && a.status === "active")
      .map(a => {
        const business = inMemoryBusinesses.find(b => b.id === a.businessId);
        if (!business) return null;
        return {
          id: business.id,
          name: business.name,
          businessType: business.businessType,
          industry: business.industry,
          gstStatus: business.gstStatus,
          gstin: business.gstin,
          country: business.country,
          currency: business.currency,
          taxSystem: business.taxSystem,
          assignedAt: a.assignedAt,
          assignmentNotes: a.notes,
        };
      })
      .filter(Boolean);
  }

  const assigned = await db
    .select({
      id: businesses.id,
      name: businesses.name,
      businessType: businesses.businessType,
      industry: businesses.industry,
      gstStatus: businesses.gstStatus,
      gstin: businesses.gstin,
      country: businesses.country,
      currency: businesses.currency,
      taxSystem: businesses.taxSystem,
      assignedAt: caAssignments.assignedAt,
      assignmentNotes: caAssignments.notes,
    })
    .from(caAssignments)
    .innerJoin(businesses, eq(caAssignments.businessId, businesses.id))
    .where(and(eq(caAssignments.caUserId, caUserId), eq(caAssignments.status, "active")));

  return assigned;
}

export async function listCaReviewQueue(caUserId) {
  const db = await getDb();
  if (!db) {
    return {
      reviewRequests: inMemoryReviewRequests,
      gstSubmissions: inMemoryGstSubmissions,
      historicalObservations: inMemoryCaObservations.filter(o => o.caUserId === caUserId),
    };
  }

  // Query assigned business IDs
  const assigned = await db
    .select({ businessId: caAssignments.businessId })
    .from(caAssignments)
    .where(and(eq(caAssignments.caUserId, caUserId), eq(caAssignments.status, "active")));

  const bIds = assigned.map(a => a.businessId);
  if (bIds.length === 0) {
    return { reviewRequests: [], gstSubmissions: [], historicalObservations: [] };
  }

  const reviews = await db
    .select({
      id: reviewRequests.id,
      businessId: reviewRequests.businessId,
      businessName: businesses.name,
      taskId: reviewRequests.taskId,
      taskTitle: operationalTasks.title,
      taskType: operationalTasks.type,
      status: reviewRequests.status,
      note: reviewRequests.note,
      createdAt: reviewRequests.createdAt,
    })
    .from(reviewRequests)
    .innerJoin(businesses, eq(reviewRequests.businessId, businesses.id))
    .innerJoin(operationalTasks, eq(reviewRequests.taskId, operationalTasks.id))
    .where(inArray(reviewRequests.businessId, bIds))
    .orderBy(desc(reviewRequests.createdAt));

  const submissions = await db
    .select({
      id: gstSubmissionRequests.id,
      businessId: gstSubmissionRequests.businessId,
      businessName: businesses.name,
      taskId: gstSubmissionRequests.taskId,
      taskTitle: operationalTasks.title,
      status: gstSubmissionRequests.status,
      requesterNote: gstSubmissionRequests.requesterNote,
      createdAt: gstSubmissionRequests.createdAt,
    })
    .from(gstSubmissionRequests)
    .innerJoin(businesses, eq(gstSubmissionRequests.businessId, businesses.id))
    .innerJoin(operationalTasks, eq(gstSubmissionRequests.taskId, operationalTasks.id))
    .where(inArray(gstSubmissionRequests.businessId, bIds))
    .orderBy(desc(gstSubmissionRequests.createdAt));

  const observations = await db
    .select({
      id: caAuditObservations.id,
      businessId: caAuditObservations.businessId,
      taskId: caAuditObservations.taskId,
      caUserId: caAuditObservations.caUserId,
      decision: caAuditObservations.decision,
      observationTitle: caAuditObservations.observationTitle,
      detailedNotes: caAuditObservations.detailedNotes,
      certificateReference: caAuditObservations.certificateReference,
      createdAt: caAuditObservations.createdAt,
    })
    .from(caAuditObservations)
    .where(eq(caAuditObservations.caUserId, caUserId))
    .orderBy(desc(caAuditObservations.createdAt));

  return {
    reviewRequests: reviews,
    gstSubmissions: submissions,
    historicalObservations: observations,
  };
}

/**
 * Load the exact evidence a reviewer is expected to have inspected.
 * Returns plain rows so the same fingerprint can be computed in DB and
 * local (in-memory) modes.
 */
export async function loadTaskEvidence(db, task) {
  if (!db) {
    const { inMemoryDocuments, inMemoryExtractions, inMemoryGstPreparations } = await import("./operations.js");
    const docs = inMemoryDocuments
      .filter(entry => Number(entry.document?.taskId) === Number(task.id))
      .map(entry => entry.document);
    const docIds = new Set(docs.map(d => Number(d.id)));
    return {
      documents: docs,
      extractions: inMemoryExtractions.filter(row => docIds.has(Number(row.documentId))),
      preparation: inMemoryGstPreparations.find(p => Number(p.taskId) === Number(task.id)) || null,
    };
  }

  const docs = await db.select().from(documents).where(eq(documents.taskId, task.id));
  const docIds = docs.map(doc => doc.id);
  const extractions = docIds.length
    ? await db.select().from(documentExtractions).where(inArray(documentExtractions.documentId, docIds))
    : [];
  const preparation = await db.select().from(gstPreparations).where(eq(gstPreparations.taskId, task.id)).limit(1);
  return { documents: docs, extractions, preparation: preparation[0] ?? null };
}

/**
 * Mark every earlier professional approval for a task as invalid after a
 * material change to its reviewed evidence. The original record is preserved
 * (tamper-evident history); only its validity flag changes.
 */
export async function invalidateCaApprovalsForTask(businessId, taskId, reason) {
  const safeReason = String(reason || "Material change to reviewed evidence.").slice(0, 200);
  const db = await getDb();
  if (!db) {
    let count = 0;
    for (const observation of inMemoryCaObservations) {
      if (Number(observation.businessId) === Number(businessId)
        && Number(observation.taskId) === Number(taskId)
        && observation.decision === "approved"
        && !observation.invalidatedAt) {
        observation.invalidatedAt = new Date();
        observation.invalidationReason = safeReason;
        count += 1;
      }
    }
    return count;
  }
  const result = await db.update(caAuditObservations)
    .set({ invalidatedAt: new Date(), invalidationReason: safeReason })
    .where(and(
      eq(caAuditObservations.businessId, businessId),
      eq(caAuditObservations.taskId, taskId),
      eq(caAuditObservations.decision, "approved"),
      isNull(caAuditObservations.invalidatedAt),
    ));
  const affected = result?.[0]?.affectedRows ?? 0;
  if (affected > 0) {
    await db.insert(actionItems).values({
      businessId,
      taskId,
      type: "professional_review",
      title: "Previous CA approval was invalidated",
      description: `${safeReason} A fresh professional review is required before this task can proceed.`,
      priority: "high",
    });
  }
  return affected;
}

/** Returns the latest professional approval plus whether it still binds current evidence. */
export async function getCurrentCaApproval(db, task) {
  if (!db) {
    const latest = inMemoryCaObservations
      .filter(o => Number(o.taskId) === Number(task.id) && o.decision === "approved")
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
    const evidence = await loadTaskEvidence(null, task);
    const fingerprint = computeEvidenceFingerprint({
      ...evidence,
      taskId: task.id,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
    });
    return { approval: latest, fingerprint, ...evaluateApprovalValidity({ approval: latest, currentFingerprint: fingerprint }) };
  }
  const rows = await db.select().from(caAuditObservations)
    .where(and(eq(caAuditObservations.taskId, task.id), eq(caAuditObservations.decision, "approved")))
    .orderBy(desc(caAuditObservations.createdAt), desc(caAuditObservations.id)).limit(1);
  const approval = rows[0] || null;
  const evidence = await loadTaskEvidence(db, task);
  const fingerprint = computeEvidenceFingerprint({
    ...evidence,
    taskId: task.id,
    periodStart: task.periodStart,
    periodEnd: task.periodEnd,
  });
  return { approval, fingerprint, ...evaluateApprovalValidity({ approval, currentFingerprint: fingerprint }) };
}

export async function submitCaDecision(caUserId, input) {
  const db = await getDb();
  const certRef = input.certificateReference || `CA-AUDIT-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;

  if (!db) {
    // Development store: serialize per task so concurrent decisions cannot both
    // pass the status/version checks.
    return withInMemoryTaskLock(input.taskId, async () => {
      const profile = inMemoryCaProfiles.find(p => p.userId === caUserId);
      const task = (await import("./operations.js")).inMemoryTasks.find(t => Number(t.id) === Number(input.taskId));
      if (!task) throw new HttpError(404, "The task to review was not found.");
      if (Number(task.businessId) !== Number(input.businessId)) {
        throw new HttpError(403, "The task does not belong to the specified business workspace.");
      }

      const authz = authorizeCaReview({
        profile,
        assignments: inMemoryCaAssignments.filter(a => a.caUserId === caUserId),
        businessId: input.businessId,
        taskBusinessId: task.businessId,
      });
      if (!authz.allowed) throw new HttpError(403, authz.reason);
      const currentVersion = Number(task.version ?? 0);
      if (input.expectedVersion !== undefined && Number(input.expectedVersion) !== currentVersion) {
        throw new HttpError(409, "This task changed after you opened it. Reload the latest evidence and review again.");
      }
      if (!isReviewableTaskStatus(task.status)) {
        throw new HttpError(409, `A professional decision cannot be recorded while the task is "${task.status}".`);
      }

      const evidence = await loadTaskEvidence(null, task);
      const evidenceFingerprint = computeEvidenceFingerprint({
        ...evidence,
        taskId: task.id,
        periodStart: task.periodStart,
        periodEnd: task.periodEnd,
      });
      const evidenceSnapshot = JSON.stringify({
        documentCount: evidence.documents.length,
        reviewedDocumentIds: evidence.documents.map(doc => doc.id),
        extractionCount: evidence.extractions.length,
        preparationStatus: evidence.preparation?.status ?? null,
        fingerprint: evidenceFingerprint,
        capturedAt: new Date().toISOString(),
      });

      inMemoryCaObservations.unshift({
        id: inMemoryCaObservations.length + 1,
        businessId: input.businessId,
        taskId: input.taskId,
        caUserId,
        decision: input.decision,
        observationTitle: input.observationTitle,
        detailedNotes: input.detailedNotes,
        certificateReference: certRef,
        evidenceFingerprint,
        evidenceSnapshot,
        taskVersion: currentVersion,
        invalidatedAt: null,
        invalidationReason: null,
        createdAt: new Date(),
      });

      task.status = input.decision === "approved"
        ? (["prepared", "submission_pending", "submitted", "completed"].includes(task.status) ? task.status : "ready_for_review")
        : input.decision === "needs_revision" ? "needs_review" : "rejected";
      task.version = currentVersion + 1;
      task.updatedAt = new Date();

      const reviewRequest = (await import("./operations.js")).inMemoryReviewRequests
        .filter(r => Number(r.taskId) === Number(input.taskId))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
      if (reviewRequest) {
        reviewRequest.status = input.decision === "approved" ? "completed" : input.decision === "needs_revision" ? "in_review" : "declined";
      }

      await recordAudit(caUserId, `CA_REVIEW_${input.decision.toUpperCase()}`, "operational_task", String(input.taskId), {
        businessId: input.businessId,
        certificateReference: certRef,
        evidenceFingerprint,
        taskVersion: currentVersion,
        professionalMembershipNumber: profile.membershipNumber,
      });

      return {
        success: true,
        decision: input.decision,
        certificateReference: certRef,
        evidenceFingerprint,
        taskVersion: currentVersion + 1,
      };
    });
  }

  // Database path: a single transaction with a row lock. Only one decision can
  // observe and advance a given task version; the observation, task update,
  // review-request update and preparation update commit together or not at all.
  const outcome = await db.transaction(async tx => {
    const locked = (await tx.select().from(operationalTasks)
      .where(eq(operationalTasks.id, input.taskId))
      .for("update"))[0];

    if (!locked) throw new HttpError(404, "The task to review was not found.");
    if (Number(locked.businessId) !== Number(input.businessId)) {
      throw new HttpError(403, "The task does not belong to the specified business workspace.");
    }

    const profile = (await tx.select().from(caProfiles).where(eq(caProfiles.userId, caUserId)).limit(1))[0];
    const assignments = await tx.select().from(caAssignments).where(eq(caAssignments.caUserId, caUserId));
    const authz = authorizeCaReview({
      profile,
      assignments,
      businessId: input.businessId,
      taskBusinessId: locked.businessId,
    });
    if (!authz.allowed) throw new HttpError(403, authz.reason);

    const currentVersion = Number(locked.version ?? 0);
    if (input.expectedVersion !== undefined && Number(input.expectedVersion) !== currentVersion) {
      throw new HttpError(409, "This task changed after you opened it. Reload the latest evidence and review again.");
    }
    if (!isReviewableTaskStatus(locked.status)) {
      throw new HttpError(409, `A professional decision cannot be recorded while the task is "${locked.status}".`);
    }

    const evidence = await loadTaskEvidence(tx, locked);
    const evidenceFingerprint = computeEvidenceFingerprint({
      ...evidence,
      taskId: locked.id,
      periodStart: locked.periodStart,
      periodEnd: locked.periodEnd,
    });
    const evidenceSnapshot = JSON.stringify({
      documentCount: evidence.documents.length,
      reviewedDocumentIds: evidence.documents.map(doc => doc.id),
      extractionCount: evidence.extractions.length,
      preparationStatus: evidence.preparation?.status ?? null,
      fingerprint: evidenceFingerprint,
      taskVersion: currentVersion,
      capturedAt: new Date().toISOString(),
    });

    await tx.insert(caAuditObservations).values({
      businessId: input.businessId,
      taskId: input.taskId,
      caUserId,
      decision: input.decision,
      observationTitle: input.observationTitle,
      detailedNotes: input.detailedNotes,
      certificateReference: certRef,
      evidenceFingerprint,
      evidenceSnapshot,
    });

    const nextReviewStatus = input.decision === "approved" ? "completed" : input.decision === "needs_revision" ? "in_review" : "declined";
    await tx.update(reviewRequests)
      .set({ status: nextReviewStatus, updatedAt: new Date() })
      .where(and(eq(reviewRequests.taskId, input.taskId), eq(reviewRequests.businessId, input.businessId)));

    // An approval does not change an already-prepared (or later) task's lifecycle
    // step: professional approval and preparation are separate states.
    const targetStatus = input.decision === "approved"
      ? (["prepared", "submission_pending", "submitted", "completed"].includes(locked.status)
          ? locked.status
          : (canTransitionTaskStatus(locked.status, "ready_for_review") ? "ready_for_review" : locked.status))
      : input.decision === "needs_revision"
        ? "needs_review"
        : "rejected";

    if (!canTransitionTaskStatus(locked.status, targetStatus)) {
      throw new HttpError(409, `A "${input.decision}" decision cannot move the task from "${locked.status}" to "${targetStatus}".`);
    }

    await tx.update(operationalTasks)
      .set({ status: targetStatus, version: currentVersion + 1, updatedAt: new Date() })
      .where(eq(operationalTasks.id, input.taskId));

    if (input.decision === "approved") {
      await tx.update(gstPreparations)
        .set({ status: "prepared", updatedAt: new Date() })
        .where(eq(gstPreparations.taskId, input.taskId));
    }

    return {
      evidenceFingerprint,
      reviewedDocumentIds: evidence.documents.map(doc => doc.id),
      taskVersion: currentVersion + 1,
      membershipNumber: profile.membershipNumber,
    };
  });

  await recordAudit(caUserId, `CA_REVIEW_${input.decision.toUpperCase()}`, "operational_task", String(input.taskId), {
    businessId: input.businessId,
    certificateReference: certRef,
    evidenceFingerprint: outcome.evidenceFingerprint,
    reviewedDocumentIds: outcome.reviewedDocumentIds,
    professionalMembershipNumber: outcome.membershipNumber,
    taskVersion: outcome.taskVersion - 1,
  });

  return {
    success: true,
    decision: input.decision,
    certificateReference: certRef,
    evidenceFingerprint: outcome.evidenceFingerprint,
    taskVersion: outcome.taskVersion,
  };
}

// Client helper: Get assigned CA info for a business
export async function getAssignedCaForBusiness(businessId) {
  const db = await getDb();
  if (!db) {
    const assignment = inMemoryCaAssignments.find(a => a.businessId === businessId && a.status === "active");
    if (!assignment) return null;
    const profile = inMemoryCaProfiles.find(p => p.userId === assignment.caUserId);
    if (!profile) return null;
    return {
      caUserId: profile.userId,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      membershipNumber: profile.membershipNumber,
      firmName: profile.firmName,
      specialization: profile.specialization,
      bio: profile.bio,
      assignedAt: assignment.assignedAt,
    };
  }

  const result = await db
    .select({
      caUserId: caProfiles.userId,
      fullName: caProfiles.fullName,
      email: caProfiles.email,
      phone: caProfiles.phone,
      membershipNumber: caProfiles.membershipNumber,
      firmName: caProfiles.firmName,
      specialization: caProfiles.specialization,
      bio: caProfiles.bio,
      assignedAt: caAssignments.assignedAt,
    })
    .from(caAssignments)
    .innerJoin(caProfiles, eq(caAssignments.caUserId, caProfiles.userId))
    .where(and(eq(caAssignments.businessId, businessId), eq(caAssignments.status, "active"), eq(caProfiles.status, "active")))
    .limit(1);

  return result[0] ?? null;
}

// -------------------------------------------------------------
// APPROVAL LIFECYCLE READ MODELS (consumed by the UI)
// -------------------------------------------------------------

function shapeObservation(row, currentFingerprint) {
  const stale = row.decision === "approved"
    && Boolean(row.evidenceFingerprint)
    && Boolean(currentFingerprint)
    && row.evidenceFingerprint !== currentFingerprint;
  return {
    id: row.id,
    decision: row.decision,
    observationTitle: row.observationTitle,
    detailedNotes: row.detailedNotes,
    certificateReference: row.certificateReference ?? null,
    caUserId: row.caUserId,
    caName: row.caName ?? null,
    membershipNumber: row.membershipNumber ?? null,
    professionalStatus: row.professionalStatus ?? null,
    evidenceReference: evidenceReference(row.evidenceFingerprint),
    invalidatedAt: row.invalidatedAt ?? null,
    invalidationReason: row.invalidationReason ?? null,
    stale,
    createdAt: row.createdAt,
  };
}

/** Full professional decision history for a task, newest first. */
export async function listTaskApprovalHistory(db, task, currentFingerprint = null) {
  if (!db) {
    return inMemoryCaObservations
      .filter(o => Number(o.taskId) === Number(task.id))
      .map(o => {
        const profile = inMemoryCaProfiles.find(p => p.userId === o.caUserId) ?? null;
        return shapeObservation({
          ...o,
          caName: profile?.fullName ?? null,
          membershipNumber: profile?.membershipNumber ?? null,
          professionalStatus: profile?.status ?? null,
        }, currentFingerprint);
      })
      .sort((a, b) => (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) || (Number(b.id) - Number(a.id)));
  }

  const rows = await db
    .select({
      id: caAuditObservations.id,
      decision: caAuditObservations.decision,
      observationTitle: caAuditObservations.observationTitle,
      detailedNotes: caAuditObservations.detailedNotes,
      certificateReference: caAuditObservations.certificateReference,
      caUserId: caAuditObservations.caUserId,
      evidenceFingerprint: caAuditObservations.evidenceFingerprint,
      invalidatedAt: caAuditObservations.invalidatedAt,
      invalidationReason: caAuditObservations.invalidationReason,
      createdAt: caAuditObservations.createdAt,
      caName: caProfiles.fullName,
      membershipNumber: caProfiles.membershipNumber,
      professionalStatus: caProfiles.status,
    })
    .from(caAuditObservations)
    .leftJoin(caProfiles, eq(caProfiles.userId, caAuditObservations.caUserId))
    .where(eq(caAuditObservations.taskId, task.id))
    .orderBy(desc(caAuditObservations.createdAt), desc(caAuditObservations.id));

  return rows.map(row => shapeObservation(row, currentFingerprint));
}

function groupBy(list, keyFn) {
  const map = new Map();
  for (const item of list) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/**
 * Batched approval facts for many tasks: five queries regardless of portfolio
 * size, instead of a fingerprint + history round trip per task.
 */
async function buildApprovalFacts(db, tasks) {
  const facts = new Map();
  if (tasks.length === 0) return facts;
  const taskIds = tasks.map(task => Number(task.id));

  let observations;
  let documentRows;
  let extractionRows;
  let preparationRows;
  let reviewRows;
  let submissionRows;

  if (!db) {
    const operations = await import("./operations.js");
    observations = operations.inMemoryCaObservations.map(row => {
      const profile = inMemoryCaProfiles.find(p => p.userId === row.caUserId) ?? null;
      return {
        ...row,
        caName: profile?.fullName ?? null,
        membershipNumber: profile?.membershipNumber ?? null,
        professionalStatus: profile?.status ?? null,
      };
    });
    documentRows = operations.inMemoryDocuments.map(entry => entry.document).filter(Boolean);
    extractionRows = operations.inMemoryExtractions;
    preparationRows = operations.inMemoryGstPreparations;
    reviewRows = operations.inMemoryReviewRequests;
    submissionRows = operations.inMemoryGstSubmissions;
  } else {
    observations = await db
      .select({
        id: caAuditObservations.id,
        taskId: caAuditObservations.taskId,
        decision: caAuditObservations.decision,
        observationTitle: caAuditObservations.observationTitle,
        detailedNotes: caAuditObservations.detailedNotes,
        certificateReference: caAuditObservations.certificateReference,
        caUserId: caAuditObservations.caUserId,
        evidenceFingerprint: caAuditObservations.evidenceFingerprint,
        invalidatedAt: caAuditObservations.invalidatedAt,
        invalidationReason: caAuditObservations.invalidationReason,
        createdAt: caAuditObservations.createdAt,
        caName: caProfiles.fullName,
        membershipNumber: caProfiles.membershipNumber,
        professionalStatus: caProfiles.status,
      })
      .from(caAuditObservations)
      .leftJoin(caProfiles, eq(caProfiles.userId, caAuditObservations.caUserId))
      .where(inArray(caAuditObservations.taskId, taskIds))
      .orderBy(desc(caAuditObservations.createdAt), desc(caAuditObservations.id));

    documentRows = await db.select().from(documents).where(inArray(documents.taskId, taskIds));
    const docIds = documentRows.map(doc => doc.id);
    extractionRows = docIds.length
      ? await db.select().from(documentExtractions).where(inArray(documentExtractions.documentId, docIds))
      : [];
    preparationRows = await db.select().from(gstPreparations).where(inArray(gstPreparations.taskId, taskIds));
    reviewRows = await db.select().from(reviewRequests).where(inArray(reviewRequests.taskId, taskIds));
    submissionRows = await db.select().from(gstSubmissionRequests).where(inArray(gstSubmissionRequests.taskId, taskIds));
  }

  const observationsByTask = groupBy(observations, row => Number(row.taskId));
  const latestByTask = rows => {
    const map = new Map();
    for (const row of rows) {
      const key = Number(row.taskId);
      const current = map.get(key);
      if (!current) { map.set(key, row); continue; }
      const delta = new Date(row.createdAt) - new Date(current.createdAt);
      if (delta > 0 || (delta === 0 && Number(row.id) > Number(current.id))) map.set(key, row);
    }
    return map;
  };
  const reviewByTask = latestByTask(reviewRows);
  const submissionByTask = latestByTask(submissionRows);
  const documentsByTask = groupBy(documentRows, doc => Number(doc.taskId));
  const extractionsByDocument = groupBy(extractionRows, row => Number(row.documentId));
  const preparationByTask = new Map(preparationRows.map(row => [Number(row.taskId), row]));

  for (const task of tasks) {
    const id = Number(task.id);
    const taskDocuments = documentsByTask.get(id) ?? [];
    const taskExtractions = taskDocuments.flatMap(doc => extractionsByDocument.get(Number(doc.id)) ?? []);
    const preparation = preparationByTask.get(id) ?? null;
    const fingerprint = computeEvidenceFingerprint({
      documents: taskDocuments,
      extractions: taskExtractions,
      preparation,
      taskId: task.id,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
    });

    const history = (observationsByTask.get(id) ?? [])
      .slice()
      .sort((a, b) => (new Date(b.createdAt) - new Date(a.createdAt)) || (Number(b.id) - Number(a.id)))
      .map(row => shapeObservation(row, fingerprint));
    const approval = (observationsByTask.get(id) ?? []).find(row => row.decision === "approved") ?? null;

    facts.set(id, {
      fingerprint,
      history,
      approval,
      reviewRequestStatus: reviewByTask.get(id)?.status ?? null,
      submissionStatus: submissionByTask.get(id)?.status ?? null,
      ...evaluateApprovalValidity({ approval, currentFingerprint: fingerprint }),
    });
  }

  return facts;
}

/**
 * The complete, authoritative approval picture for one task as seen by an
 * authorised member of the business workspace.
 */
export async function getTaskApprovalView(userId, taskId) {
  const { getTaskForUser } = await import("./operations.js");
  const task = await getTaskForUser(userId, taskId);
  const db = await getDb();

  const current = await getCurrentCaApproval(db, task);
  const history = await listTaskApprovalHistory(db, task, current.fingerprint);
  const assignedCa = await getAssignedCaForBusiness(task.businessId);

  const reviewRequestStatus = task.reviewRequest?.status ?? null;
  const submissionStatus = task.submissionRequest?.status ?? null;
  const latestDecision = history[0]?.decision ?? null;
  const hasApproval = Boolean(current.approval);

  const approvalStatus = deriveApprovalStatus({
    taskStatus: task.status,
    reviewRequestStatus,
    submissionStatus,
    latestDecision,
    hasApproval,
    approvalValid: Boolean(current.valid),
  });

  const currentApproval = current.approval
    ? history.find(item => item.id === current.approval.id) ?? null
    : null;

  return {
    task: {
      id: task.id,
      businessId: task.businessId,
      title: task.title,
      type: task.type,
      status: task.status,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
      requiresProfessionalReview: Boolean(task.requiresProfessionalReview),
      version: Number(task.version ?? 0),
    },
    approvalStatus,
    approvalStatusLabel: APPROVAL_STATUS_LABELS[approvalStatus],
    tone: APPROVAL_STATUS_TONES[approvalStatus],
    approvalValid: Boolean(current.valid),
    // A missing approval is a normal starting state, not an invalidation.
    validityReason: current.approval && !current.valid ? current.reason : null,
    evidenceReference: evidenceReference(current.fingerprint),
    currentApproval,
    history,
    assignedCa,
    reviewRequest: task.reviewRequest
      ? { id: task.reviewRequest.id, status: task.reviewRequest.status, createdAt: task.reviewRequest.createdAt }
      : null,
    submissionRequest: task.submissionRequest
      ? {
          id: task.submissionRequest.id,
          status: task.submissionRequest.status,
          requestedByUserId: task.submissionRequest.requestedByUserId ?? null,
          approvedByUserId: task.submissionRequest.approvedByUserId ?? null,
          approvedAt: task.submissionRequest.approvedAt ?? null,
          providerName: task.submissionRequest.providerName ?? null,
          submittedAt: task.submissionRequest.submittedAt ?? null,
        }
      : null,
    nextAction: deriveNextAction({ approvalStatus, taskStatus: task.status, approvalValid: Boolean(current.valid) }),
    execution: {
      // Authorization is never proof of filing. Until a filing provider exists,
      // acknowledgement stays null rather than being invented.
      authorizationRecorded: Boolean(task.submissionRequest && ["approved", "submitted"].includes(task.submissionRequest.status)),
      filingInitiated: Boolean(task.submissionRequest?.submittedAt) || ["submitted", "completed"].includes(task.status),
      provider: task.submissionRequest?.providerName ?? null,
      acknowledgement: null,
    },
    generatedAt: new Date(),
  };
}

const PAGE_DEFAULT = 50;
const PAGE_MAX = 200;

function normalisePage({ limit, offset } = {}) {
  const safeLimit = Math.min(PAGE_MAX, Math.max(1, Number(limit) || PAGE_DEFAULT));
  const safeOffset = Math.max(0, Number(offset) || 0);
  return { limit: safeLimit, offset: safeOffset };
}

function countStatuses(items) {
  return items.reduce((acc, item) => {
    acc[item.approvalStatus] = (acc[item.approvalStatus] || 0) + 1;
    return acc;
  }, {});
}

/** Compact approval status for every task in a business workspace. */
export async function getBusinessApprovalOverview(userId, businessId, page = {}) {
  const { listTasksForUser } = await import("./operations.js");
  const tasks = await listTasksForUser(userId, businessId);
  const db = await getDb();
  const assignedCa = await getAssignedCaForBusiness(businessId);
  const facts = await buildApprovalFacts(db, tasks);

  const items = tasks.map(task => {
    const fact = facts.get(Number(task.id));
    const latestDecision = fact.history[0]?.decision ?? null;
    const approvalStatus = deriveApprovalStatus({
      taskStatus: task.status,
      reviewRequestStatus: task.reviewRequest?.status ?? null,
      submissionStatus: task.submissionRequest?.status ?? null,
      latestDecision,
      hasApproval: Boolean(fact.approval),
      approvalValid: Boolean(fact.valid),
    });
    return {
      taskId: task.id,
      title: task.title,
      type: task.type,
      taskStatus: task.status,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
      approvalStatus,
      approvalStatusLabel: APPROVAL_STATUS_LABELS[approvalStatus],
      tone: APPROVAL_STATUS_TONES[approvalStatus],
      approvalValid: Boolean(fact.valid),
      invalidationReason: fact.approval && !fact.valid ? fact.reason : null,
      evidenceReference: evidenceReference(fact.fingerprint),
      lastReviewAt: fact.history[0]?.createdAt ?? null,
      lastDecision: latestDecision,
      nextAction: deriveNextAction({ approvalStatus, taskStatus: task.status, approvalValid: Boolean(fact.valid) }),
      updatedAt: task.updatedAt,
      version: Number(task.version ?? 0),
    };
  });

  // Stable ordering: most recently touched first, task id as the tie-break.
  items.sort((a, b) => {
    const delta = new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0);
    return delta !== 0 ? delta : Number(b.taskId) - Number(a.taskId);
  });

  const { limit, offset } = normalisePage(page);
  const pageItems = items.slice(offset, offset + limit);

  return {
    businessId,
    assignedCa,
    tasks: pageItems,
    counts: countStatuses(items),
    total: items.length,
    limit,
    offset,
    hasMore: offset + pageItems.length < items.length,
    generatedAt: new Date(),
  };
}

const QUEUE_PRIORITY = {
  approval_invalidated: 0,
  awaiting_ca_review: 1,
  under_ca_review: 2,
  changes_requested: 3,
  not_submitted: 4,
  approved: 5,
  awaiting_client_authorization: 6,
  authorized_for_execution: 7,
  submitted: 8,
  completed: 9,
  rejected: 10,
  on_hold: 11,
};

/** Review workload for the signed-in professional, restricted to assignments. */
export async function getCaApprovalQueue(caUserId, page = {}) {
  const db = await getDb();
  const assignments = db
    ? await db.select({ businessId: caAssignments.businessId }).from(caAssignments)
        .where(and(eq(caAssignments.caUserId, caUserId), eq(caAssignments.status, "active")))
    : inMemoryCaAssignments.filter(a => a.caUserId === caUserId && a.status === "active");

  const businessIds = assignments.map(a => a.businessId);
  if (businessIds.length === 0) {
    return { items: [], counts: {}, total: 0, limit: PAGE_DEFAULT, offset: 0, hasMore: false, generatedAt: new Date() };
  }

  const tasks = db
    ? await db.select().from(operationalTasks).where(inArray(operationalTasks.businessId, businessIds))
    : (await import("./operations.js")).inMemoryTasks.filter(t => businessIds.map(Number).includes(Number(t.businessId)));

  const facts = await buildApprovalFacts(db, tasks);

  const businessNames = new Map();
  if (db) {
    const rows = await db.select({ id: businesses.id, name: businesses.name }).from(businesses)
      .where(inArray(businesses.id, businessIds));
    rows.forEach(row => businessNames.set(Number(row.id), row.name));
  } else {
    const { inMemoryBusinesses } = await import("./db.js");
    inMemoryBusinesses.forEach(row => businessNames.set(Number(row.id), row.name));
  }

  const items = tasks.map(task => {
    const fact = facts.get(Number(task.id));
    const latestDecision = fact.history[0]?.decision ?? null;
    const approvalStatus = deriveApprovalStatus({
      taskStatus: task.status,
      reviewRequestStatus: fact.reviewRequestStatus,
      submissionStatus: fact.submissionStatus,
      latestDecision,
      hasApproval: Boolean(fact.approval),
      approvalValid: Boolean(fact.valid),
    });
    return {
      taskId: task.id,
      businessId: task.businessId,
      businessName: businessNames.get(Number(task.businessId)) ?? null,
      title: task.title,
      type: task.type,
      taskStatus: task.status,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
      approvalStatus,
      approvalStatusLabel: APPROVAL_STATUS_LABELS[approvalStatus],
      tone: APPROVAL_STATUS_TONES[approvalStatus],
      approvalValid: Boolean(fact.valid),
      invalidationReason: fact.approval && !fact.valid ? fact.reason : null,
      evidenceReference: evidenceReference(fact.fingerprint),
      lastDecision: latestDecision,
      lastReviewAt: fact.history[0]?.createdAt ?? null,
      waitingDays: Math.max(0, Math.floor((Date.now() - new Date(task.updatedAt ?? task.createdAt).getTime()) / 86_400_000)),
      updatedAt: task.updatedAt,
      version: Number(task.version ?? 0),
    };
  });

  // Invalidated and awaiting-review work first, then staleness, then id.
  items.sort((a, b) => {
    const priority = (QUEUE_PRIORITY[a.approvalStatus] ?? 99) - (QUEUE_PRIORITY[b.approvalStatus] ?? 99);
    if (priority !== 0) return priority;
    const delta = new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0);
    return delta !== 0 ? delta : Number(b.taskId) - Number(a.taskId);
  });

  const { limit, offset } = normalisePage(page);
  const pageItems = items.slice(offset, offset + limit);

  return {
    items: pageItems,
    counts: countStatuses(items),
    total: items.length,
    limit,
    offset,
    hasMore: offset + pageItems.length < items.length,
    generatedAt: new Date(),
  };
}

/**
 * Evidence view for an assigned professional. A CA is not a business member, so
 * this is the only supported way for a reviewer to inspect source documents,
 * extractions, requirements and the current approval state.
 */
export async function getTaskForCa(caUserId, taskId) {
  const db = await getDb();
  const profile = db
    ? (await db.select().from(caProfiles).where(eq(caProfiles.userId, caUserId)).limit(1))[0]
    : inMemoryCaProfiles.find(p => p.userId === caUserId);

  if (!profile) throw new HttpError(403, "A verified Chartered Accountant profile is required to review tasks.");
  if (profile.status !== "active") throw new HttpError(403, `This professional profile is ${profile.status} and cannot review tasks.`);

  const task = db
    ? (await db.select().from(operationalTasks).where(eq(operationalTasks.id, taskId)).limit(1))[0]
    : (await import("./operations.js")).inMemoryTasks.find(t => Number(t.id) === Number(taskId));
  if (!task) throw new HttpError(404, "The task to review was not found.");

  const assignments = db
    ? await db.select().from(caAssignments).where(eq(caAssignments.caUserId, caUserId))
    : inMemoryCaAssignments.filter(a => a.caUserId === caUserId);

  const authz = authorizeCaReview({
    profile,
    assignments,
    businessId: task.businessId,
    taskBusinessId: task.businessId,
  });
  if (!authz.allowed) throw new HttpError(403, authz.reason);

  const evidence = await loadTaskEvidence(db, task);
  const fingerprint = computeEvidenceFingerprint({
    ...evidence,
    taskId: task.id,
    periodStart: task.periodStart,
    periodEnd: task.periodEnd,
  });
  const history = await listTaskApprovalHistory(db, task, fingerprint);
  const current = await getCurrentCaApproval(db, task);

  let requirements = [];
  let reviewRequest = null;
  let submissionRequest = null;
  let businessName = null;

  if (db) {
    requirements = await db.select().from(taskRequirements).where(eq(taskRequirements.taskId, task.id));
    reviewRequest = (await db.select().from(reviewRequests).where(eq(reviewRequests.taskId, task.id)).orderBy(desc(reviewRequests.createdAt), desc(reviewRequests.id)).limit(1))[0] ?? null;
    submissionRequest = (await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, task.id)).orderBy(desc(gstSubmissionRequests.createdAt), desc(gstSubmissionRequests.id)).limit(1))[0] ?? null;
    businessName = (await db.select({ name: businesses.name }).from(businesses).where(eq(businesses.id, task.businessId)).limit(1))[0]?.name ?? null;
  } else {
    const operations = await import("./operations.js");
    const { inMemoryBusinesses } = await import("./db.js");
    requirements = task.requirements ?? [];
    reviewRequest = operations.inMemoryReviewRequests.filter(r => Number(r.taskId) === Number(task.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null;
    submissionRequest = operations.inMemoryGstSubmissions.filter(s => Number(s.taskId) === Number(task.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] ?? null;
    businessName = inMemoryBusinesses.find(b => Number(b.id) === Number(task.businessId))?.name ?? null;
  }

  const approvalStatus = deriveApprovalStatus({
    taskStatus: task.status,
    reviewRequestStatus: reviewRequest?.status ?? null,
    submissionStatus: submissionRequest?.status ?? null,
    latestDecision: history[0]?.decision ?? null,
    hasApproval: Boolean(current.approval),
    approvalValid: Boolean(current.valid),
  });

  return {
    task: {
      id: task.id,
      businessId: task.businessId,
      businessName,
      title: task.title,
      type: task.type,
      status: task.status,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
      description: task.description ?? null,
      requiresProfessionalReview: Boolean(task.requiresProfessionalReview),
      version: Number(task.version ?? 0),
    },
    reviewer: {
      userId: profile.userId,
      fullName: profile.fullName,
      membershipNumber: profile.membershipNumber,
      firmName: profile.firmName ?? null,
      specialization: profile.specialization ?? null,
      status: profile.status,
    },
    requirements,
    documents: evidence.documents.map(doc => ({
      id: doc.id,
      originalName: doc.originalName,
      documentType: doc.documentType,
      status: doc.status,
      mimeType: doc.mimeType,
      sizeBytes: doc.sizeBytes,
      createdAt: doc.createdAt,
      extraction: (() => {
        const extraction = evidence.extractions.find(row => Number(row.documentId) === Number(doc.id));
        if (!extraction) return null;
        return {
          status: extraction.status,
          confidenceBps: extraction.confidenceBps ?? null,
          vendorName: extraction.vendorName ?? null,
          gstin: extraction.gstin ?? null,
          invoiceNumber: extraction.invoiceNumber ?? null,
          invoiceDate: extraction.invoiceDate ?? null,
          taxableValueMinor: extraction.taxableValueMinor ?? null,
          cgstMinor: extraction.cgstMinor ?? null,
          sgstMinor: extraction.sgstMinor ?? null,
          igstMinor: extraction.igstMinor ?? null,
          totalMinor: extraction.totalMinor ?? null,
        };
      })(),
    })),
    preparation: evidence.preparation,
    reviewRequest,
    submissionRequest,
    approvalStatus,
    approvalStatusLabel: APPROVAL_STATUS_LABELS[approvalStatus],
    tone: APPROVAL_STATUS_TONES[approvalStatus],
    approvalValid: Boolean(current.valid),
    validityReason: current.approval && !current.valid ? current.reason : null,
    evidenceReference: evidenceReference(fingerprint),
    history,
    canDecide: isReviewableTaskStatus(task.status),
    generatedAt: new Date(),
  };
}
