import { createHash } from "node:crypto";

/**
 * Evidence binding for professional (CA) approvals.
 *
 * An approval is only meaningful for the exact evidence the reviewer saw. The
 * fingerprint is a deterministic digest of the reviewed documents, their
 * extractions and the prepared GST computation. If any of those change, the
 * fingerprint changes and a previously recorded approval is treated as stale.
 */

export const CA_DECISIONS = Object.freeze(["approved", "needs_revision", "rejected"]);

/** Task states in which a professional decision may be recorded. */
export const REVIEWABLE_TASK_STATUSES = Object.freeze([
  "needs_review",
  "ready_for_review",
  "professional_review",
  "prepared",
  "submission_pending",
  "blocked",
]);

function stableNumber(value) {
  if (value === null || value === undefined || value === "") return "0";
  const number = Number(value);
  return Number.isFinite(number) ? String(number) : String(value);
}

function timeValue(value) {
  if (!value) return "0";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? String(time) : String(value);
}

/**
 * @param {object} input
 * @param {Array<object>} input.documents  document rows (id, documentType, status, updatedAt)
 * @param {Array<object>} input.extractions extraction rows (documentId, invoiceNumber, totalMinor, status)
 * @param {object|null} input.preparation GST preparation row (salesMinor, cgstMinor, sgstMinor, igstMinor, inputTaxCreditMinor)
 *
 * Only substantive evidence is fingerprinted: document identity, the extracted
 * invoice number and total, and the prepared financial figures. Row status and
 * updatedAt are deliberately excluded, because recording a decision or moving a
 * task through its lifecycle changes them without changing the evidence the
 * professional reviewed.
 * @param {string|number} input.taskId
 * @param {string|number} input.periodStart
 * @param {string|number} input.periodEnd
 * @returns {string} hex sha256 digest (64 chars)
 */
export function computeEvidenceFingerprint({ documents = [], extractions = [], preparation = null, taskId = "", periodStart = "", periodEnd = "" } = {}) {
  const docs = [...documents]
    .map(doc => ({
      id: String(doc.id ?? doc.document?.id ?? ""),
      type: String(doc.documentType ?? doc.document?.documentType ?? ""),
      status: String(doc.status ?? doc.document?.status ?? ""),
      updated: timeValue(doc.updatedAt ?? doc.document?.updatedAt),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const ext = [...extractions]
    .map(row => ({
      documentId: String(row.documentId ?? ""),
      number: String(row.invoiceNumber ?? ""),
      total: stableNumber(row.totalMinor),
    }))
    .sort((a, b) => `${a.documentId}:${a.number}`.localeCompare(`${b.documentId}:${b.number}`));

  const prep = preparation
    ? {
        sales: stableNumber(preparation.salesMinor),
        cgst: stableNumber(preparation.cgstMinor),
        sgst: stableNumber(preparation.sgstMinor),
        igst: stableNumber(preparation.igstMinor),
        itc: stableNumber(preparation.inputTaxCreditMinor),
      }
    : null;

  const payload = JSON.stringify({
    task: String(taskId),
    period: [timeValue(periodStart), timeValue(periodEnd)],
    docs,
    ext,
    prep,
  });

  return createHash("sha256").update(payload).digest("hex");
}

/**
 * A professional may only act on a business they are actively assigned to, and
 * only while their profile is verified/active. Platform administrators are not
 * automatically authorised to perform reserved professional activities.
 */
export function authorizeCaReview({ profile, assignments = [], businessId, taskBusinessId }) {
  if (!profile) {
    return { allowed: false, reason: "A verified Chartered Accountant profile is required to record a professional decision." };
  }
  if (profile.status !== "active") {
    return { allowed: false, reason: `This professional profile is ${profile.status} and cannot record decisions.` };
  }
  if (Number(businessId) !== Number(taskBusinessId)) {
    return { allowed: false, reason: "The task does not belong to the specified business workspace." };
  }
  const assigned = assignments.some(a => Number(a.businessId) === Number(businessId) && a.status !== "unassigned");
  if (!assigned) {
    return { allowed: false, reason: "You are not assigned to this business workspace and cannot review its tasks." };
  }
  return { allowed: true };
}

export function isReviewableTaskStatus(status) {
  return REVIEWABLE_TASK_STATUSES.includes(status);
}

/**
 * Canonical approval lifecycle states surfaced by the API and UI. Each value is
 * derived from stored rows (task, review request, submission request and
 * approval observations) — never from a client-side flag.
 */
export const APPROVAL_STATUSES = Object.freeze([
  "not_submitted",
  "awaiting_ca_review",
  "under_ca_review",
  "changes_requested",
  "approved",
  "approval_invalidated",
  "awaiting_client_authorization",
  "authorized_for_execution",
  "submitted",
  "completed",
  "rejected",
  "on_hold",
]);

export const APPROVAL_STATUS_LABELS = Object.freeze({
  not_submitted: "Not submitted",
  awaiting_ca_review: "Awaiting CA review",
  under_ca_review: "Under CA review",
  changes_requested: "Changes requested",
  approved: "Approved",
  approval_invalidated: "Approval invalidated",
  awaiting_client_authorization: "Awaiting client authorization",
  authorized_for_execution: "Authorized for execution",
  submitted: "Submitted",
  completed: "Completed",
  rejected: "Rejected",
  on_hold: "On hold",
});

export const APPROVAL_STATUS_TONES = Object.freeze({
  not_submitted: "neutral",
  awaiting_ca_review: "info",
  under_ca_review: "info",
  changes_requested: "warning",
  approved: "success",
  approval_invalidated: "danger",
  awaiting_client_authorization: "warning",
  authorized_for_execution: "success",
  submitted: "info",
  completed: "success",
  rejected: "danger",
  on_hold: "warning",
});

/**
 * Derives the single user-facing approval state from persisted records.
 *
 * @param {object} input
 * @param {string} input.taskStatus       operationalTasks.status
 * @param {string|null} [input.reviewRequestStatus]
 * @param {string|null} [input.submissionStatus]
 * @param {string|null} [input.latestDecision]  latest professional decision, if any
 * @param {boolean} [input.hasApproval]          an approval observation exists
 * @param {boolean} [input.approvalValid]        that approval still binds current evidence
 */
export function deriveApprovalStatus({
  taskStatus,
  reviewRequestStatus = null,
  submissionStatus = null,
  latestDecision = null,
  hasApproval = false,
  approvalValid = false,
} = {}) {
  if (taskStatus === "rejected" || submissionStatus === "failed") return "rejected";
  if (taskStatus === "blocked" || submissionStatus === "cancelled") return "on_hold";
  if (taskStatus === "completed") return "completed";
  if (submissionStatus === "submitted" || taskStatus === "submitted" || taskStatus === "accepted") return "submitted";
  // An invalidated approval outranks any downstream authorization state: the
  // evidence the authorization relied on no longer exists in reviewed form.
  if (hasApproval && !approvalValid) return "approval_invalidated";
  if (submissionStatus === "approved" || submissionStatus === "dispatching") return "authorized_for_execution";
  if (submissionStatus === "awaiting_review") return "awaiting_client_authorization";
  if (hasApproval && approvalValid) return "approved";
  if (latestDecision === "needs_revision") return "changes_requested";
  if (latestDecision === "rejected") return "rejected";
  if (reviewRequestStatus === "in_review") return "under_ca_review";
  if (reviewRequestStatus === "requested") return "awaiting_ca_review";
  if (taskStatus === "professional_review") return "under_ca_review";
  if (taskStatus === "needs_review" && latestDecision) return "changes_requested";
  return "not_submitted";
}

/**
 * The single next action a business owner must take, or null when the owner has
 * nothing left to do (for example while a CA is reviewing).
 */
export function deriveNextAction({ approvalStatus, taskStatus, approvalValid }) {
  switch (approvalStatus) {
    case "not_submitted":
      return {
        code: "request_review",
        label: "Request professional review",
        description: "Upload the required evidence, prepare the working, then request CA review.",
        allowed: taskStatus !== "completed",
      };
    case "changes_requested":
      return {
        code: "resolve_changes",
        label: "Resolve the requested changes",
        description: "Correct the flagged evidence or values, then resubmit for review.",
        allowed: true,
      };
    case "approval_invalidated":
      return {
        code: "resubmit_review",
        label: "Resubmit for a fresh review",
        description: "The reviewed evidence changed after approval, so a new professional review is required.",
        allowed: true,
      };
    case "awaiting_client_authorization":
      return {
        code: "authorize_submission",
        label: "Review and authorize the prepared filing",
        description: "A valid professional approval exists. Authorize the action only after checking what will be submitted.",
        allowed: Boolean(approvalValid),
      };
    case "authorized_for_execution":
      return {
        code: "waiting_provider",
        label: "Awaiting authorized filing provider",
        description: "Authorization is recorded. No filing occurs until a configured provider confirms dispatch.",
        allowed: false,
      };
    case "approved":
      return {
        code: "request_authorization",
        label: "Continue to client authorization",
        description: "The professional approval is valid for the current evidence. Authorization is a separate step.",
        allowed: true,
      };
    case "awaiting_ca_review":
      return {
        code: "waiting_review",
        label: "Awaiting your assigned CA",
        description: "Your request is queued for professional review. No action is required from you.",
        allowed: false,
      };
    case "under_ca_review":
      return {
        code: "waiting_review",
        label: "Under CA review",
        description: "A professional is reviewing the evidence. No action is required from you.",
        allowed: false,
      };
    case "submitted":
      return {
        code: "await_acknowledgement",
        label: "Await acknowledgement",
        description: "A provider reference was recorded. Filing evidence is available on this task.",
        allowed: false,
      };
    case "completed":
      return { code: "none", label: "Nothing pending", description: "This task is complete.", allowed: false };
    case "rejected":
      return {
        code: "contact_support",
        label: "Review the rejection reason",
        description: "This task was rejected. Read the recorded reason before starting a new task.",
        allowed: false,
      };
    case "on_hold":
      return {
        code: "resolve_blocker",
        label: "Resolve the blocker",
        description: "This task is on hold. Clear the outstanding blocker before it can continue.",
        allowed: false,
      };
    default:
      return null;
  }
}

export function evidenceReference(fingerprint) {
  if (!fingerprint || typeof fingerprint !== "string") return null;
  return fingerprint.slice(0, 12).toUpperCase();
}

/**
 * Decides whether a prior approval is still valid for the current evidence.
 * Returns a reason when invalid so it can be stored in the audit trail.
 */
export function evaluateApprovalValidity({ approval, currentFingerprint }) {
  if (!approval) return { valid: false, reason: "No professional approval has been recorded for this task." };
  if (approval.invalidatedAt) return { valid: false, reason: approval.invalidationReason || "The approval was invalidated after a material change." };
  if (approval.evidenceFingerprint && approval.evidenceFingerprint !== currentFingerprint) {
    return { valid: false, reason: "The reviewed evidence changed after approval; a fresh review is required." };
  }
  return { valid: true, reason: null };
}
