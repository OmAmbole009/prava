import { beforeAll, describe, expect, it } from "vitest";
import { inMemoryBusinessMembers } from "./db.js";
import {
  computeEvidenceFingerprint,
  deriveApprovalStatus,
  deriveNextAction,
  evidenceReference,
} from "./caApproval.js";
import {
  getTaskApprovalView,
  getTaskForCa,
  inMemoryCaObservations,
  submitCaDecision,
  invalidateCaApprovalsForTask,
} from "./caManagement.js";
import {
  getDocumentForUser,
  inMemoryDocuments,
  inMemoryExtractions,
  inMemoryGstPreparations,
  inMemoryGstSubmissions,
  inMemoryReviewRequests,
  inMemoryTasks,
  listTasksForUser,
} from "./operations.js";
import { inMemoryBusinesses } from "./db.js";

const ASSIGNED_CA = 201;

// The development store enforces tenant membership, so the business owner used
// by these tests must be an explicit member of the workspace.
beforeAll(() => {
  if (!inMemoryBusinessMembers.some(m => Number(m.businessId) === 1 && Number(m.userId) === 2)) {
    inMemoryBusinessMembers.push({ id: 9001, businessId: 1, userId: 2, role: "owner", status: "active" });
  }
  if (!inMemoryBusinessMembers.some(m => Number(m.businessId) === 1 && Number(m.userId) === 3)) {
    inMemoryBusinessMembers.push({ id: 9002, businessId: 1, userId: 3, role: "admin", status: "active" });
  }
});

function seedTask(id, overrides = {}) {
  const task = {
    id,
    businessId: 1,
    createdByUserId: 2,
    type: "gst_return_preparation",
    title: `Approval workflow task ${id}`,
    status: "ready_for_review",
    periodStart: new Date("2026-04-01T00:00:00.000Z"),
    periodEnd: new Date("2026-05-01T00:00:00.000Z"),
    requiresProfessionalReview: 1,
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
    requirements: [],
    ...overrides,
  };
  inMemoryTasks.push(task);
  return task;
}

function seedEvidence(taskId, { totalMinor = 118000 } = {}) {
  const documentId = 9000 + taskId;
  const extractionId = documentId;
  const document = {
    id: documentId,
    businessId: 1,
    taskId,
    uploadedByUserId: 2,
    originalName: `invoice-${taskId}.pdf`,
    mimeType: "application/pdf",
    sizeBytes: 1024,
    documentType: "invoice",
    status: "extracted",
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
  };
  const extraction = {
    id: extractionId,
    documentId,
    model: "test-engine",
    status: "extracted",
    confidenceBps: 9600,
    vendorName: "Example Supplier",
    gstin: "27ABCDE1234F1Z5",
    invoiceNumber: `INV-${taskId}`,
    taxableValueMinor: totalMinor - 18000,
    cgstMinor: 9000,
    sgstMinor: 9000,
    igstMinor: 0,
    totalMinor,
    extractedData: "{}",
    createdAt: new Date("2026-05-02T00:00:00.000Z"),
  };
  inMemoryDocuments.push({ document, extraction });
  inMemoryExtractions.push(extraction);
  const preparation = {
    id: taskId,
    businessId: 1,
    taskId,
    status: "prepared",
    salesMinor: totalMinor,
    taxableValueMinor: totalMinor - 18000,
    cgstMinor: 9000,
    sgstMinor: 9000,
    igstMinor: 0,
    inputTaxCreditMinor: 0,
    netTaxPositionMinor: 18000,
    documentsRequiringReview: 0,
    updatedAt: new Date("2026-05-02T00:00:00.000Z"),
  };
  inMemoryGstPreparations.push(preparation);
  return { document, extraction, preparation };
}

const decisionPayload = (taskId, overrides = {}) => ({
  taskId,
  businessId: 1,
  decision: "approved",
  observationTitle: "GSTR-3B computation and ITC cross-checked",
  detailedNotes: "Verified every source invoice against the prepared working and the eligibility of claimed credit.",
  ...overrides,
});

describe("Approval status derivation", () => {
  it("maps stored state to each user-facing status", () => {
    expect(deriveApprovalStatus({ taskStatus: "collecting" })).toBe("not_submitted");
    expect(deriveApprovalStatus({ taskStatus: "needs_review", reviewRequestStatus: "requested" })).toBe("awaiting_ca_review");
    expect(deriveApprovalStatus({ taskStatus: "professional_review", reviewRequestStatus: "in_review" })).toBe("under_ca_review");
    expect(deriveApprovalStatus({ taskStatus: "needs_review", latestDecision: "needs_revision" })).toBe("changes_requested");
    expect(deriveApprovalStatus({ taskStatus: "ready_for_review", hasApproval: true, approvalValid: true })).toBe("approved");
    expect(deriveApprovalStatus({ taskStatus: "ready_for_review", hasApproval: true, approvalValid: false })).toBe("approval_invalidated");
    expect(deriveApprovalStatus({ taskStatus: "ready_for_review", hasApproval: true, approvalValid: true, submissionStatus: "awaiting_review" })).toBe("awaiting_client_authorization");
    expect(deriveApprovalStatus({ taskStatus: "submission_pending", hasApproval: true, approvalValid: true, submissionStatus: "approved" })).toBe("authorized_for_execution");
    expect(deriveApprovalStatus({ taskStatus: "submitted", submissionStatus: "submitted" })).toBe("submitted");
    expect(deriveApprovalStatus({ taskStatus: "completed" })).toBe("completed");
    expect(deriveApprovalStatus({ taskStatus: "rejected" })).toBe("rejected");
    expect(deriveApprovalStatus({ taskStatus: "blocked" })).toBe("on_hold");
  });

  it("lets an invalidated approval outrank downstream authorization", () => {
    expect(deriveApprovalStatus({
      taskStatus: "submission_pending",
      hasApproval: true,
      approvalValid: false,
      submissionStatus: "approved",
    })).toBe("approval_invalidated");
  });

  it("explains the next action and blocks filing when approval is invalid", () => {
    const resubmit = deriveNextAction({ approvalStatus: "approval_invalidated", taskStatus: "ready_for_review", approvalValid: false });
    expect(resubmit.code).toBe("resubmit_review");
    expect(resubmit.allowed).toBe(true);

    const authorize = deriveNextAction({ approvalStatus: "awaiting_client_authorization", taskStatus: "prepared", approvalValid: false });
    expect(authorize.allowed).toBe(false);

    const waiting = deriveNextAction({ approvalStatus: "awaiting_ca_review", taskStatus: "needs_review", approvalValid: false });
    expect(waiting.allowed).toBe(false);
  });

  it("exposes a short, non-secret evidence reference", () => {
    expect(evidenceReference("abcdef0123456789")).toBe("ABCDEF012345");
    expect(evidenceReference(null)).toBeNull();
  });
});

describe("Business owner approval view", () => {
  it("shows awaiting CA review once a review request exists, before any decision", async () => {
    const task = seedTask(7101, { status: "needs_review" });
    seedEvidence(task.id);
    inMemoryReviewRequests.push({
      id: 7101,
      businessId: 1,
      taskId: task.id,
      requestedByUserId: 2,
      status: "requested",
      createdAt: new Date("2026-05-03T00:00:00.000Z"),
    });

    const view = await getTaskApprovalView(2, task.id);
    expect(view.approvalStatus).toBe("awaiting_ca_review");
    expect(view.currentApproval).toBeNull();
    expect(view.history).toHaveLength(0);
    expect(view.nextAction.allowed).toBe(false);
    expect(view.assignedCa?.caUserId).toBe(ASSIGNED_CA);
  });

  it("shows the recorded approval, reviewer identity and evidence reference", async () => {
    const task = seedTask(7102);
    seedEvidence(task.id);

    const result = await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    expect(result.evidenceFingerprint).toMatch(/^[a-f0-9]{64}$/);

    const view = await getTaskApprovalView(2, task.id);
    expect(view.approvalStatus).toBe("approved");
    expect(view.approvalValid).toBe(true);
    expect(view.currentApproval.caName).toBe("CA Rajesh Verma, FCA");
    expect(view.currentApproval.membershipNumber).toBe("ICAI #409212");
    expect(view.evidenceReference).toHaveLength(12);
    expect(view.nextAction.code).toBe("request_authorization");
  });
});

describe("Approval invalidation", () => {
  it("marks the approval stale when reviewed evidence changes", async () => {
    const task = seedTask(7201);
    const evidence = seedEvidence(task.id);
    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));

    const before = await getTaskApprovalView(2, task.id);
    expect(before.approvalStatus).toBe("approved");

    // A correction to the extracted total changes the reviewed evidence.
    evidence.extraction.totalMinor = 125000;

    const after = await getTaskApprovalView(2, task.id);
    expect(after.approvalStatus).toBe("approval_invalidated");
    expect(after.approvalValid).toBe(false);
    expect(after.validityReason).toMatch(/evidence changed/i);
    expect(after.nextAction.code).toBe("resubmit_review");
  });

  it("keeps historical approvals visible after invalidation", async () => {
    const task = seedTask(7202);
    seedEvidence(task.id);
    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    await invalidateCaApprovalsForTask(1, task.id, "A new source document was uploaded after the previous review.");

    const view = await getTaskApprovalView(2, task.id);
    expect(view.approvalStatus).toBe("approval_invalidated");
    expect(view.history).toHaveLength(1);
    expect(view.history[0].decision).toBe("approved");
    expect(view.history[0].invalidatedAt).not.toBeNull();
    expect(view.history[0].invalidationReason).toMatch(/new source document/i);
  });

  it("does not treat a re-approval as the old approval", async () => {
    const task = seedTask(7203);
    seedEvidence(task.id);
    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    await invalidateCaApprovalsForTask(1, task.id, "Evidence corrected.");

    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id, {
      observationTitle: "Re-reviewed after correction",
      detailedNotes: "Rechecked the corrected invoice total and recomputed the net position before approving again.",
    }));

    const view = await getTaskApprovalView(2, task.id);
    expect(view.approvalStatus).toBe("approved");
    expect(view.approvalValid).toBe(true);
    expect(view.history).toHaveLength(2);
    expect(view.currentApproval.observationTitle).toBe("Re-reviewed after correction");
  });

  it("cannot authorize execution on an invalidated approval", async () => {
    const task = seedTask(7204);
    seedEvidence(task.id);
    const { approveAuthorizedGstSubmission } = await import("./operations.js");
    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    await invalidateCaApprovalsForTask(1, task.id, "Evidence corrected after approval.");
    inMemoryGstSubmissions.push({
      id: 7204,
      businessId: 1,
      taskId: task.id,
      requestedByUserId: 2,
      status: "awaiting_review",
      createdAt: new Date("2026-05-03T00:00:00.000Z"),
    });
    task.workspaceRole = "admin";

    await expect(
      approveAuthorizedGstSubmission(3, { taskId: task.id, reviewerNote: "Independent review of the prepared return." }),
    ).rejects.toThrow(/approval|evidence/i);
  });
});

describe("Tenant isolation in the development store", () => {
  function seedForeignWorkspace() {
    if (!inMemoryBusinesses.some(b => Number(b.id) === 77)) {
      inMemoryBusinesses.push({ id: 77, ownerUserId: 700, name: "Other Tenant Pvt Ltd", gstin: "29ZZZZZ0000Z1Z0", gstStatus: "registered" });
    }
    return 77;
  }

  it("rejects a task in another tenant's workspace", async () => {
    const other = seedForeignWorkspace();
    const task = seedTask(7401, { businessId: other });
    await expect(getTaskApprovalView(2, task.id)).rejects.toThrow(/permission|access/i);
  });

  it("rejects listing tasks of another workspace", async () => {
    const other = seedForeignWorkspace();
    await expect(listTasksForUser(2, other)).rejects.toThrow(/permission|access/i);
  });

  it("rejects reading another tenant's document", async () => {
    const other = seedForeignWorkspace();
    const task = seedTask(7402, { businessId: other });
    const evidence = seedEvidence(task.id);
    evidence.document.businessId = other;
    await expect(getDocumentForUser(2, evidence.document.id)).rejects.toThrow(/permission|access/i);
  });

  it("rejects an unknown workspace rather than defaulting to the demo one", async () => {
    await expect(listTasksForUser(2, 4242)).rejects.toThrow(/not found/i);
  });
});

describe("Concurrent professional decisions", () => {
  it("records exactly one decision for two reviewers acting on the same version", async () => {
    const task = seedTask(7501);
    seedEvidence(task.id);
    const startingVersion = Number(task.version ?? 0);

    const results = await Promise.allSettled([
      submitCaDecision(ASSIGNED_CA, { ...decisionPayload(task.id), expectedVersion: startingVersion }),
      submitCaDecision(ASSIGNED_CA, { ...decisionPayload(task.id, { decision: "rejected" }), expectedVersion: startingVersion }),
    ]);

    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    expect(inMemoryCaObservations.filter(o => Number(o.taskId) === task.id)).toHaveLength(1);
    expect(Number(task.version)).toBe(startingVersion + 1);
  });

  it("refuses a decision based on a version the reviewer has already superseded", async () => {
    const task = seedTask(7502);
    seedEvidence(task.id);
    await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    const staleVersion = Number(task.version) - 1;
    await expect(
      submitCaDecision(ASSIGNED_CA, { ...decisionPayload(task.id, { decision: "rejected" }), expectedVersion: staleVersion }),
    ).rejects.toThrow(/changed after you opened it/i);
  });
});

describe("CA access control and evidence inspection", () => {
  it("rejects a professional who is not assigned to the business", async () => {
    const task = seedTask(7301, { businessId: 99 });
    await expect(getTaskForCa(ASSIGNED_CA, task.id)).rejects.toThrow(/not assigned/i);
  });

  it("rejects an actor without a verified professional profile", async () => {
    const task = seedTask(7302);
    await expect(getTaskForCa(424242, task.id)).rejects.toThrow(/verified Chartered Accountant profile/i);
  });

  it("returns the underlying evidence to an assigned professional", async () => {
    const task = seedTask(7303);
    seedEvidence(task.id);
    const view = await getTaskForCa(ASSIGNED_CA, task.id);
    expect(view.documents).toHaveLength(1);
    expect(view.documents[0].extraction.totalMinor).toBe(118000);
    expect(view.preparation.netTaxPositionMinor).toBe(18000);
    expect(view.canDecide).toBe(true);
    expect(view.reviewer.membershipNumber).toBe("ICAI #409212");
  });

  it("refuses a decision for a task that is no longer reviewable", async () => {
    const task = seedTask(7304, { status: "completed" });
    seedEvidence(task.id);
    await expect(submitCaDecision(ASSIGNED_CA, decisionPayload(task.id))).rejects.toThrow(/cannot be recorded/i);
  });

  it("binds a decision to the evidence fingerprint, not to the UI", async () => {
    const task = seedTask(7305);
    const evidence = seedEvidence(task.id);
    const expected = computeEvidenceFingerprint({
      documents: [evidence.document],
      extractions: [evidence.extraction],
      preparation: evidence.preparation,
      taskId: task.id,
      periodStart: task.periodStart,
      periodEnd: task.periodEnd,
    });
    const result = await submitCaDecision(ASSIGNED_CA, decisionPayload(task.id));
    expect(result.evidenceFingerprint).toBe(expected);
    const stored = inMemoryCaObservations.find(o => Number(o.taskId) === task.id);
    expect(stored.evidenceFingerprint).toBe(expected);
  });
});
