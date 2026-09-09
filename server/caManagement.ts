import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  adminAuditEvents,
  businesses,
  caAssignments,
  caAuditObservations,
  caCredentials,
  caProfiles,
  documents,
  gstPreparations,
  gstSubmissionRequests,
  operationalTasks,
  reviewRequests,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { hashCaPassword, inMemoryCaCredentials, inMemoryCaProfiles } from "./caAuth";

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
});

export type InMemoryCaAssignment = {
  id: number;
  caUserId: number;
  businessId: number;
  status: "active" | "unassigned";
  notes?: string | null;
  assignedByAdminId: number;
  assignedAt: Date;
};

export type InMemoryCaObservation = {
  id: number;
  businessId: number;
  taskId: number;
  caUserId: number;
  decision: "approved" | "needs_revision" | "rejected";
  observationTitle: string;
  detailedNotes: string;
  certificateReference?: string | null;
  createdAt: Date;
};

// In-memory assignment storage for mock mode
export const inMemoryCaAssignments: InMemoryCaAssignment[] = [
  {
    id: 1,
    caUserId: 201,
    businessId: 1,
    status: "active",
    notes: "Primary designated Chartered Accountant for quarterly GST & annual audit review.",
    assignedByAdminId: 1,
    assignedAt: new Date("2026-01-15"),
  },
];

export const inMemoryCaObservations: InMemoryCaObservation[] = [
  {
    id: 1,
    businessId: 1,
    taskId: 1,
    caUserId: 201,
    decision: "approved",
    observationTitle: "Statutory ITC & Outward Tax Computation Verified",
    detailedNotes: "All sample sales invoices and input tax credit claims have been cross-checked against supplier GST declarations. GSTR-3B tax liability computation is reconciled and approved for dispatch.",
    certificateReference: "CA-VERMA-2026-Q3-0091",
    createdAt: new Date("2026-08-22"),
  },
];

// Helper to record administrative audit events
async function recordAudit(actorUserId: number, action: string, entityType: string, entityId?: string, metadata?: Record<string, unknown>) {
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

export async function grantCaAccess(adminUserId: number, input: z.infer<typeof grantCaAccessSchema>) {
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
      status: "active" as const,
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
  let targetUserId: number;

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

export async function updateCaStatus(adminUserId: number, input: z.infer<typeof updateCaStatusSchema>) {
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

export async function resetCaPassword(adminUserId: number, input: z.infer<typeof resetCaPasswordSchema>) {
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

export async function assignCaToBusiness(adminUserId: number, input: z.infer<typeof caAssignmentSchema>) {
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

export async function unassignCaFromBusiness(adminUserId: number, caUserId: number, businessId: number) {
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

export async function getCaProfileForUser(userId: number) {
  const db = await getDb();
  if (!db) {
    const profile = inMemoryCaProfiles.find(p => p.userId === userId) ?? inMemoryCaProfiles[0];
    const assignments = inMemoryCaAssignments.filter(a => a.caUserId === profile.userId && a.status === "active");
    return { ...profile, assignedWorkspacesCount: assignments.length };
  }

  const profile = await db.select().from(caProfiles).where(eq(caProfiles.userId, userId)).limit(1);
  if (!profile[0]) {
    // If admin checking profile or unseeded, return sensible placeholder
    return {
      id: 0,
      userId,
      fullName: "Chartered Accountant",
      email: "ca@prava.internal",
      phone: "",
      membershipNumber: "ICAI #409212",
      firmName: "Prava In-House Audit Team",
      specialization: "GST, Tax & Financial Review",
      status: "active" as const,
      bio: "Designated In-House Chartered Accountant",
      createdByAdminId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      assignedWorkspacesCount: 1,
    };
  }

  const assignments = await db
    .select({ id: caAssignments.id })
    .from(caAssignments)
    .where(and(eq(caAssignments.caUserId, userId), eq(caAssignments.status, "active")));

  return { ...profile[0], assignedWorkspacesCount: assignments.length };
}

export async function getCaDashboardStats(caUserId: number) {
  const db = await getDb();
  if (!db) {
    return {
      assignedBusinessesCount: inMemoryCaAssignments.filter(a => a.caUserId === caUserId && a.status === "active").length,
      pendingReviewsCount: 1,
      completedReviewsCount: inMemoryCaObservations.length,
      totalGstSubmissionsInQueue: 1,
      caProfile: inMemoryCaProfiles.find(p => p.userId === caUserId) ?? inMemoryCaProfiles[0],
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

export async function getAssignedWorkspacesForCa(caUserId: number) {
  const db = await getDb();
  if (!db) {
    return [
      {
        id: 1,
        name: "Acme Global Solutions",
        businessType: "Corporation",
        industry: "Technology & Services",
        gstStatus: "registered",
        gstin: "US-TAX-98765",
        country: "US",
        currency: "USD",
        taxSystem: "Sales Tax",
        pendingReviewCount: 1,
        lastFilingDate: "2026-08-20",
        assignedAt: new Date("2026-01-15"),
        assignmentNotes: "Designated lead CA for statutory audit and GST filing.",
      },
    ];
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

export async function listCaReviewQueue(caUserId: number) {
  const db = await getDb();
  if (!db) {
    return {
      reviewRequests: [
        {
          id: 1,
          businessId: 1,
          businessName: "Acme Global Solutions",
          taskId: 1,
          taskTitle: "Tax & Compliance Preparation — Q3 2026",
          taskType: "gst_return_preparation",
          status: "in_review",
          note: "Please review supplier tax invoice attachments and verify statutory input tax credit eligibility.",
          createdAt: new Date("2026-08-20"),
          gstPreparation: {
            salesMinor: 4850000,
            taxableValueMinor: 4500000,
            cgstMinor: 405000,
            sgstMinor: 405000,
            igstMinor: 0,
            inputTaxCreditMinor: 210000,
            netTaxPositionMinor: 600000,
          },
        },
      ],
      gstSubmissions: [
        {
          id: 1,
          businessId: 1,
          businessName: "Acme Global Solutions",
          taskId: 1,
          taskTitle: "Tax & Compliance Preparation — Q3 2026",
          status: "awaiting_review",
          requesterNote: "Ready for authorized dispatch after CA sign-off.",
          createdAt: new Date("2026-08-21"),
        },
      ],
      historicalObservations: inMemoryCaObservations,
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

export async function submitCaDecision(caUserId: number, input: z.infer<typeof caDecisionSchema>) {
  const db = await getDb();
  const certRef = input.certificateReference || `CA-AUDIT-${new Date().getFullYear()}-${randomBytes(4).toString("hex").toUpperCase()}`;

  if (!db) {
    inMemoryCaObservations.unshift({
      id: inMemoryCaObservations.length + 1,
      businessId: input.businessId,
      taskId: input.taskId,
      caUserId,
      decision: input.decision,
      observationTitle: input.observationTitle,
      detailedNotes: input.detailedNotes,
      certificateReference: certRef,
      createdAt: new Date(),
    });

    return {
      success: true,
      decision: input.decision,
      certificateReference: certRef,
    };
  }

  // Insert observation
  await db.insert(caAuditObservations).values({
    businessId: input.businessId,
    taskId: input.taskId,
    caUserId,
    decision: input.decision,
    observationTitle: input.observationTitle,
    detailedNotes: input.detailedNotes,
    certificateReference: certRef,
  });

  // Update review request status
  const nextStatus = input.decision === "approved" ? "completed" : input.decision === "needs_revision" ? "in_review" : "declined";
  await db
    .update(reviewRequests)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(and(eq(reviewRequests.taskId, input.taskId), eq(reviewRequests.businessId, input.businessId)));

  // If approved, advance task and GST prep status
  if (input.decision === "approved") {
    await db
      .update(operationalTasks)
      .set({ status: "ready_for_review", updatedAt: new Date() })
      .where(eq(operationalTasks.id, input.taskId));

    await db
      .update(gstPreparations)
      .set({ status: "prepared", updatedAt: new Date() })
      .where(eq(gstPreparations.taskId, input.taskId));
  } else if (input.decision === "needs_revision") {
    await db
      .update(operationalTasks)
      .set({ status: "needs_review", updatedAt: new Date() })
      .where(eq(operationalTasks.id, input.taskId));
  }

  await recordAudit(caUserId, `CA_REVIEW_${input.decision.toUpperCase()}`, "operational_task", String(input.taskId), {
    businessId: input.businessId,
    certificateReference: certRef,
  });

  return {
    success: true,
    decision: input.decision,
    certificateReference: certRef,
  };
}

// Client helper: Get assigned CA info for a business
export async function getAssignedCaForBusiness(businessId: number) {
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
