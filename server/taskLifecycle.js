/**
 * Explicit compliance-task lifecycle.
 *
 * Every task status change must go through `assertTaskTransition`. The table is
 * intentionally conservative: a task can only move forward along a reviewed
 * path, and terminal states cannot be re-opened by an ordinary API request.
 *
 * Status values mirror the `operationalTasks.status` enum in drizzle/schema.js.
 */

export const TASK_STATUSES = Object.freeze([
  "intake",
  "collecting",
  "processing",
  "needs_review",
  "ready_for_review",
  "professional_review",
  "prepared",
  "submission_pending",
  "submitted",
  "accepted",
  "rejected",
  "blocked",
  "completed",
]);

/**
 * Allowed forward transitions. `blocked` is reachable from any active state and
 * can return to the state it blocked from via explicit unblock operations.
 */
export const TASK_STATUS_TRANSITIONS = Object.freeze({
  intake: ["collecting", "blocked", "rejected"],
  collecting: ["processing", "needs_review", "blocked", "rejected"],
  processing: ["needs_review", "ready_for_review", "blocked", "rejected"],
  needs_review: ["collecting", "processing", "ready_for_review", "professional_review", "blocked", "rejected"],
  ready_for_review: ["professional_review", "prepared", "needs_review", "blocked", "rejected"],
  professional_review: ["prepared", "needs_review", "rejected", "blocked"],
  prepared: ["submission_pending", "needs_review", "professional_review", "blocked", "rejected"],
  submission_pending: ["submitted", "prepared", "blocked", "rejected"],
  submitted: ["accepted", "rejected", "completed", "blocked"],
  accepted: ["completed"],
  rejected: [],
  blocked: ["collecting", "needs_review", "prepared", "rejected"],
  completed: [],
});

/**
 * Statuses that may never be awarded by an automated process or by the business
 * owner alone. They require recorded qualified-professional review plus the
 * separate client-authorization step.
 */
export const PROFESSIONAL_APPROVAL_REQUIRED_STATUSES = Object.freeze([
  "prepared",
  "submission_pending",
  "submitted",
  "accepted",
  "completed",
]);

/** Events that materially change reviewed evidence and therefore void approvals. */
export const APPROVAL_INVALIDATING_EVENTS = Object.freeze([
  "document.uploaded",
  "document.review_corrected",
  "document.deleted",
  "task.period_changed",
  "gst.preparation_recalculated",
  "gst.requirement_changed",
]);

export function isKnownTaskStatus(status) {
  return TASK_STATUSES.includes(status);
}

export function canTransitionTaskStatus(from, to) {
  if (!isKnownTaskStatus(from) || !isKnownTaskStatus(to)) return false;
  if (from === to) return true;
  return (TASK_STATUS_TRANSITIONS[from] || []).includes(to);
}

export class InvalidTaskTransitionError extends Error {
  constructor(from, to) {
    super(`Cannot move task from "${from}" to "${to}".`);
    this.name = "InvalidTaskTransitionError";
    this.statusCode = 409;
    this.code = "INVALID_TASK_TRANSITION";
    this.from = from;
    this.to = to;
  }
}

export function assertTaskTransition(from, to) {
  if (!canTransitionTaskStatus(from, to)) throw new InvalidTaskTransitionError(from, to);
  return true;
}

/**
 * A recorded approval survives only while no listed material event has occurred
 * after the approval timestamp.
 */
export function approvalSurvivesEvents({ approvedAt, events = [], invalidatingEvents = APPROVAL_INVALIDATING_EVENTS }) {
  if (!approvedAt) return false;
  const approvedTime = new Date(approvedAt).getTime();
  if (Number.isNaN(approvedTime)) return false;
  return !events.some(event => {
    if (!invalidatingEvents.includes(event.type)) return false;
    const eventTime = new Date(event.at ?? event.occurredAt ?? 0).getTime();
    return Number.isFinite(eventTime) && eventTime > approvedTime;
  });
}
