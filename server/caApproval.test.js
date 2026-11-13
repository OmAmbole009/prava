import { describe, expect, it } from "vitest";
import {
  authorizeCaReview,
  computeEvidenceFingerprint,
  evaluateApprovalValidity,
  isReviewableTaskStatus,
} from "./caApproval.js";

const baseEvidence = {
  taskId: 41,
  periodStart: "2026-01-01T00:00:00.000Z",
  periodEnd: "2026-02-01T00:00:00.000Z",
  documents: [
    { id: 7, documentType: "invoice", status: "extracted", updatedAt: "2026-02-02T09:00:00.000Z" },
    { id: 8, documentType: "invoice", status: "extracted", updatedAt: "2026-02-02T09:05:00.000Z" },
  ],
  extractions: [
    { documentId: 7, invoiceNumber: "INV-100", totalMinor: 118000, status: "extracted" },
    { documentId: 8, invoiceNumber: "INV-101", totalMinor: 59000, status: "extracted" },
  ],
  preparation: {
    salesMinor: 150000,
    cgstMinor: 13500,
    sgstMinor: 13500,
    igstMinor: 0,
    inputTaxCreditMinor: 9000,
    updatedAt: "2026-02-03T00:00:00.000Z",
    status: "prepared",
  },
};

describe("Evidence fingerprint", () => {
  it("is deterministic and order-independent for the same evidence", () => {
    const a = computeEvidenceFingerprint(baseEvidence);
    const shuffled = {
      ...baseEvidence,
      documents: [...baseEvidence.documents].reverse(),
      extractions: [...baseEvidence.extractions].reverse(),
    };
    expect(a).toMatch(/^[a-f0-9]{64}$/);
    expect(computeEvidenceFingerprint(shuffled)).toBe(a);
  });

  it("changes when a reviewed financial value changes", () => {
    const original = computeEvidenceFingerprint(baseEvidence);
    const corrected = computeEvidenceFingerprint({
      ...baseEvidence,
      extractions: [
        baseEvidence.extractions[0],
        { ...baseEvidence.extractions[1], totalMinor: 60000 },
      ],
    });
    expect(corrected).not.toBe(original);
  });

  it("changes when a document is added or re-extracted", () => {
    const original = computeEvidenceFingerprint(baseEvidence);
    const withNewDocument = computeEvidenceFingerprint({
      ...baseEvidence,
      documents: [...baseEvidence.documents, { id: 9, documentType: "credit_note", status: "uploaded", updatedAt: "2026-02-04T00:00:00.000Z" }],
    });
    const reextracted = computeEvidenceFingerprint({
      ...baseEvidence,
      documents: [
        { ...baseEvidence.documents[0], status: "needs_review" },
        baseEvidence.documents[1],
      ],
    });
    expect(withNewDocument).not.toBe(original);
    expect(reextracted).not.toBe(original);
  });

  it("changes when the task period differs", () => {
    const original = computeEvidenceFingerprint(baseEvidence);
    expect(computeEvidenceFingerprint({ ...baseEvidence, periodStart: "2026-02-01T00:00:00.000Z" })).not.toBe(original);
  });
});

describe("CA review authorization", () => {
  const profile = { userId: 201, status: "active", membershipNumber: "ICAI #409212" };
  const assignments = [{ businessId: 1, status: "active" }];

  it("allows an active, assigned professional for a matching task", () => {
    expect(authorizeCaReview({ profile, assignments, businessId: 1, taskBusinessId: 1 })).toEqual({ allowed: true });
  });

  it("rejects a platform administrator without a CA profile", () => {
    const result = authorizeCaReview({ profile: null, assignments, businessId: 1, taskBusinessId: 1 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/verified Chartered Accountant profile/i);
  });

  it("rejects suspended or revoked professionals", () => {
    for (const status of ["suspended", "revoked"]) {
      const result = authorizeCaReview({ profile: { ...profile, status }, assignments, businessId: 1, taskBusinessId: 1 });
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(new RegExp(status));
    }
  });

  it("rejects professionals not assigned to the business (cross-tenant review)", () => {
    const result = authorizeCaReview({ profile, assignments: [{ businessId: 2, status: "active" }], businessId: 1, taskBusinessId: 1 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not assigned/i);

    const unassigned = authorizeCaReview({ profile, assignments: [{ businessId: 1, status: "unassigned" }], businessId: 1, taskBusinessId: 1 });
    expect(unassigned.allowed).toBe(false);
  });

  it("rejects a business/task mismatch", () => {
    const result = authorizeCaReview({ profile, assignments, businessId: 1, taskBusinessId: 2 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/does not belong/i);
  });

  it("only permits decisions on reviewable task states", () => {
    expect(isReviewableTaskStatus("ready_for_review")).toBe(true);
    expect(isReviewableTaskStatus("professional_review")).toBe(true);
    expect(isReviewableTaskStatus("collecting")).toBe(false);
    expect(isReviewableTaskStatus("completed")).toBe(false);
    expect(isReviewableTaskStatus("rejected")).toBe(false);
  });
});

describe("Approval validity", () => {
  const fingerprint = "a".repeat(64);

  it("is invalid when no approval exists", () => {
    expect(evaluateApprovalValidity({ approval: null, currentFingerprint: fingerprint }).valid).toBe(false);
  });

  it("is valid for matching, un-invalidated evidence", () => {
    expect(evaluateApprovalValidity({
      approval: { evidenceFingerprint: fingerprint, invalidatedAt: null },
      currentFingerprint: fingerprint,
    })).toEqual({ valid: true, reason: null });
  });

  it("is invalid when the evidence changed after approval", () => {
    const result = evaluateApprovalValidity({
      approval: { evidenceFingerprint: "b".repeat(64), invalidatedAt: null },
      currentFingerprint: fingerprint,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/evidence changed/i);
  });

  it("is invalid when explicitly invalidated", () => {
    const result = evaluateApprovalValidity({
      approval: { evidenceFingerprint: fingerprint, invalidatedAt: new Date(), invalidationReason: "New document uploaded." },
      currentFingerprint: fingerprint,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("New document uploaded.");
  });
});
