import { describe, expect, it } from "vitest";
import {
  APPROVAL_INVALIDATING_EVENTS,
  InvalidTaskTransitionError,
  TASK_STATUSES,
  approvalSurvivesEvents,
  assertTaskTransition,
  canTransitionTaskStatus,
} from "./taskLifecycle.js";

describe("Compliance task state machine", () => {
  it("allows the ordinary forward preparation path", () => {
    expect(canTransitionTaskStatus("collecting", "processing")).toBe(true);
    expect(canTransitionTaskStatus("processing", "ready_for_review")).toBe(true);
    expect(canTransitionTaskStatus("ready_for_review", "professional_review")).toBe(true);
    expect(canTransitionTaskStatus("professional_review", "prepared")).toBe(true);
    expect(canTransitionTaskStatus("prepared", "submission_pending")).toBe(true);
    expect(canTransitionTaskStatus("submission_pending", "submitted")).toBe(true);
    expect(canTransitionTaskStatus("submitted", "accepted")).toBe(true);
    expect(canTransitionTaskStatus("accepted", "completed")).toBe(true);
  });

  it("blocks skipping professional review or client authorisation", () => {
    expect(canTransitionTaskStatus("collecting", "prepared")).toBe(false);
    expect(canTransitionTaskStatus("collecting", "submitted")).toBe(false);
    expect(canTransitionTaskStatus("ready_for_review", "submitted")).toBe(false);
    expect(canTransitionTaskStatus("prepared", "submitted")).toBe(false);
    expect(canTransitionTaskStatus("prepared", "completed")).toBe(false);
    expect(canTransitionTaskStatus("needs_review", "completed")).toBe(false);
  });

  it("treats rejected and completed as terminal", () => {
    for (const terminal of ["rejected", "completed"]) {
      for (const target of TASK_STATUSES) {
        if (target === terminal) continue;
        expect(canTransitionTaskStatus(terminal, target)).toBe(false);
      }
    }
  });

  it("allows a blocked task to return to an active state", () => {
    expect(canTransitionTaskStatus("blocked", "collecting")).toBe(true);
    expect(canTransitionTaskStatus("blocked", "prepared")).toBe(true);
    expect(canTransitionTaskStatus("blocked", "completed")).toBe(false);
  });

  it("returns a failed provider dispatch to prepared for a fresh review", () => {
    expect(canTransitionTaskStatus("submission_pending", "prepared")).toBe(true);
    expect(canTransitionTaskStatus("prepared", "submitted")).toBe(false);
  });

  it("rejects unknown statuses and reports a 409 conflict", () => {
    expect(canTransitionTaskStatus("collecting", "teleported")).toBe(false);
    expect(canTransitionTaskStatus(undefined, "collecting")).toBe(false);
    try {
      assertTaskTransition("completed", "collecting");
      throw new Error("expected assertTaskTransition to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTaskTransitionError);
      expect(error.statusCode).toBe(409);
    }
  });
});

describe("Approval validity across material changes", () => {
  const approvedAt = new Date("2026-03-01T10:00:00.000Z");

  it("keeps an approval when no material event followed it", () => {
    expect(approvalSurvivesEvents({
      approvedAt,
      events: [{ type: "task.viewed", at: "2026-03-02T10:00:00.000Z" }],
    })).toBe(true);
  });

  it("invalidates an approval after a new document or correction", () => {
    for (const type of ["document.uploaded", "document.review_corrected", "gst.preparation_recalculated"]) {
      expect(APPROVAL_INVALIDATING_EVENTS).toContain(type);
      expect(approvalSurvivesEvents({
        approvedAt,
        events: [{ type, at: "2026-03-02T10:00:00.000Z" }],
      })).toBe(false);
    }
  });

  it("ignores events that predate the approval", () => {
    expect(approvalSurvivesEvents({
      approvedAt,
      events: [{ type: "document.uploaded", at: "2026-02-01T10:00:00.000Z" }],
    })).toBe(true);
  });

  it("requires an approval timestamp", () => {
    expect(approvalSurvivesEvents({ approvedAt: null, events: [] })).toBe(false);
    expect(approvalSurvivesEvents({ approvedAt: "not-a-date", events: [] })).toBe(false);
  });
});
