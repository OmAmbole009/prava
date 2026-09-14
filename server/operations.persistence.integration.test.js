import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { actionItems, auditEvents, businessMembers, businesses, documentExtractions, documents, gstPreparations, gstSubmissionNotifications, gstSubmissionRequests, operationalTasks, reconciliationItems, reviewRequests, taskRequirements, users } from "../drizzle/schema.js";
import { getDb } from "./db.js";
import { rejectAuthorizedGstSubmission } from "./gstAdmin.js";

const mocks = vi.hoisted(() => ({
  storageGetSignedUrl: vi.fn(async () => "https://storage.example/integration-source.pdf"),
  checkFeatureEntitlement: vi.fn(async () => ({ allowed: true, reason: undefined })),
  consumeUsage: vi.fn(async () => undefined),
}));

vi.mock("./storage.js", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl, storagePut: vi.fn() }));
vi.mock("./entitlements.js", () => ({ checkFeatureEntitlement: mocks.checkFeatureEntitlement, consumeUsage: mocks.consumeUsage }));

import { approveAuthorizedGstSubmission, beginAuthorizedGstProviderDispatch, getActionCenter, prepareGstReturn, recordAuthorizedGstProviderFailure, recordOfficialGstSubmission, reconcileGstTask, requestAuthorizedGstSubmission, reviewDocumentForUser } from "./operations.js";

const created = { userId: 0, approvalUserId: 0, businessId: 0, taskId: 0, documentId: 0 };

afterEach(async () => {
  const db = await getDb();
  if (!db || !created.userId) return;
  if (created.taskId) {
    await db.delete(gstSubmissionNotifications).where(eq(gstSubmissionNotifications.recipientUserId, created.userId));
    await db.delete(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, created.taskId));
    await db.delete(reconciliationItems).where(eq(reconciliationItems.taskId, created.taskId));
    await db.delete(reviewRequests).where(eq(reviewRequests.taskId, created.taskId));
    await db.delete(gstPreparations).where(eq(gstPreparations.taskId, created.taskId));
    await db.delete(taskRequirements).where(eq(taskRequirements.taskId, created.taskId));
    await db.delete(auditEvents).where(eq(auditEvents.taskId, created.taskId));
  }
  if (created.documentId) await db.delete(documentExtractions).where(eq(documentExtractions.documentId, created.documentId));
  if (created.businessId) {
    await db.delete(actionItems).where(eq(actionItems.businessId, created.businessId));
    await db.delete(auditEvents).where(eq(auditEvents.businessId, created.businessId));
    await db.delete(documents).where(eq(documents.businessId, created.businessId));
    await db.delete(operationalTasks).where(eq(operationalTasks.businessId, created.businessId));
    await db.delete(businessMembers).where(eq(businessMembers.businessId, created.businessId));
    await db.delete(businesses).where(eq(businesses.id, created.businessId));
  }
  await db.delete(users).where(eq(users.id, created.userId));
  if (created.approvalUserId) await db.delete(users).where(eq(users.id, created.approvalUserId));
  Object.assign(created, { userId: 0, approvalUserId: 0, businessId: 0, taskId: 0, documentId: 0 });
});

describe("real-persistence non-production document-to-GST integration", () => {
  it("reviews a document, resolves its action, prepares GST, and persists reconciliation output within an isolated workspace", async () => {
    const db = await getDb();
    if (!db) return;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const userResult = await db.insert(users).values({ openId: `integration-${suffix}`, name: "Integration Harness", loginMethod: "test", role: "user" }).$returningId();
    created.userId = userResult[0].id;
    const businessResult = await db.insert(businesses).values({ ownerUserId: created.userId, name: `Integration Workspace ${suffix}`, businessType: "Proprietorship", industry: "Testing", gstStatus: "registered", gstin: "27ABCDE1234F1Z5" }).$returningId();
    created.businessId = businessResult[0].id;
    await db.insert(businessMembers).values({ businessId: created.businessId, userId: created.userId, role: "owner" });
    const taskResult = await db.insert(operationalTasks).values({ businessId: created.businessId, createdByUserId: created.userId, type: "gst_return_preparation", title: "Integration GST preparation", status: "collecting", periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-09-01T00:00:00.000Z") }).$returningId();
    created.taskId = taskResult[0].id;
    await db.insert(taskRequirements).values([{ taskId: created.taskId, requirementKey: "business_gstin", label: "Business GSTIN", status: "complete" }, { taskId: created.taskId, requirementKey: "purchase_invoices", label: "Purchase invoices", status: "needs_review" }]);
    const documentResult = await db.insert(documents).values({ businessId: created.businessId, taskId: created.taskId, uploadedByUserId: created.userId, storageKey: `integration/${suffix}.pdf`, storageUrl: "https://storage.example/integration-source.pdf", originalName: "integration-purchase.pdf", mimeType: "application/pdf", sizeBytes: 1, documentType: "invoice", status: "needs_review" }).$returningId();
    created.documentId = documentResult[0].id;
    await db.insert(documentExtractions).values({ documentId: created.documentId, model: "integration-harness", status: "needs_review", confidenceBps: 5000, invoiceType: "unknown", extractedData: JSON.stringify({ reviewReasons: ["Invoice direction needs review before accounting categorization."] }) });
    await db.insert(actionItems).values({ businessId: created.businessId, taskId: created.taskId, documentId: created.documentId, type: "review_document", title: "Review integration document", status: "open", priority: "high" });

    await reviewDocumentForUser(created.userId, { documentId: created.documentId, decision: "approve", vendorName: "Example Supplier", gstin: "27ABCDE1234F1Z5", invoiceNumber: "P-001", invoiceDate: "2026-08-10", taxableValue: "100.00", cgst: "9.00", sgst: "9.00", igst: "0.00", total: "118.00", placeOfSupply: "Maharashtra", invoiceType: "purchase" });
    const prepared = await prepareGstReturn(created.userId, created.taskId);
    const reconciliation = await reconcileGstTask(created.userId, created.taskId);
    const actions = await getActionCenter(created.userId, created.businessId);

    expect(prepared?.status).toBe("prepared");
    expect(reconciliation).toEqual([expect.objectContaining({ status: "matched", documentId: created.documentId })]);
    expect(actions.some(action => action.documentId === created.documentId && action.type === "review_document")).toBe(false);
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith(`integration/${suffix}.pdf`);
  }, 20_000);

  it("requires independent approval and provider evidence before a GST return is confirmed submitted", async () => {
    const db = await getDb();
    if (!db) return;
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
    const requester = await db.insert(users).values({ openId: `submission-requester-${suffix}`, name: "Submission Requester", loginMethod: "test", role: "user" }).$returningId();
    created.userId = requester[0].id;
    const reviewer = await db.insert(users).values({ openId: `submission-reviewer-${suffix}`, name: "Submission Reviewer", loginMethod: "test", role: "user" }).$returningId();
    created.approvalUserId = reviewer[0].id;
    const workspace = await db.insert(businesses).values({ ownerUserId: created.userId, name: `Submission Workspace ${suffix}`, businessType: "Proprietorship", industry: "Testing", gstStatus: "registered", gstin: "27ABCDE1234F1Z5" }).$returningId();
    created.businessId = workspace[0].id;
    await db.insert(businessMembers).values([{ businessId: created.businessId, userId: created.userId, role: "admin" }, { businessId: created.businessId, userId: created.approvalUserId, role: "admin" }]);
    const task = await db.insert(operationalTasks).values({ businessId: created.businessId, createdByUserId: created.userId, type: "gst_return_preparation", title: "Submission lifecycle", status: "prepared", requiresProfessionalReview: 0, periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-09-01T00:00:00.000Z") }).$returningId();
    created.taskId = task[0].id;
    await db.insert(gstPreparations).values({ businessId: created.businessId, taskId: created.taskId, periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-09-01T00:00:00.000Z"), status: "prepared" });

    const requested = await requestAuthorizedGstSubmission(created.userId, { taskId: created.taskId, acknowledgement: true, note: "Ready for independent review." });
    expect(requested.submissionRequest?.status).toBe("awaiting_review");
    await expect(approveAuthorizedGstSubmission(created.userId, { taskId: created.taskId, reviewerNote: "Requester cannot self-approve." })).rejects.toThrow("cannot approve their own");

    await expect(rejectAuthorizedGstSubmission(created.userId, { taskId: created.taskId, reviewerNote: "Requester cannot reject their own review." })).rejects.toThrow("cannot reject their own");
    const rejected = await rejectAuthorizedGstSubmission(created.approvalUserId, { taskId: created.taskId, reviewerNote: "A correction is required before this request can proceed." });
    expect(rejected).toEqual({ rejected: true });
    const rejectionNotifications = await db.select().from(gstSubmissionNotifications).where(eq(gstSubmissionNotifications.recipientUserId, created.userId));
    expect(rejectionNotifications).toEqual(expect.arrayContaining([expect.objectContaining({ channel: "in_app", status: "delivered" }), expect.objectContaining({ channel: "email", status: "suppressed" })]));

    await requestAuthorizedGstSubmission(created.userId, { taskId: created.taskId, acknowledgement: true, note: "Fresh request after corrections." });

    const approved = await approveAuthorizedGstSubmission(created.approvalUserId, { taskId: created.taskId, reviewerNote: "Source evidence and preparation have been reviewed." });
    expect(approved.status).toBe("submission_pending");
    expect(approved.submissionRequest?.status).toBe("approved");
    await expect(recordOfficialGstSubmission(created.approvalUserId, created.taskId, "OFFICIAL-BEFORE-DISPATCH")).rejects.toThrow("provider dispatch");

    const key = await beginAuthorizedGstProviderDispatch(created.approvalUserId, created.taskId, "Test Authorized GSP");
    expect(key).toMatch(/^gst-/);
    const failed = await recordAuthorizedGstProviderFailure(created.approvalUserId, created.taskId, "PROVIDER_TIMEOUT / response discarded");
    expect(failed.status).toBe("prepared");
    expect(failed.submissionRequest).toMatchObject({ status: "failed", failureCode: "PROVIDER_TIMEOUT___response_discarded" });

    await requestAuthorizedGstSubmission(created.userId, { taskId: created.taskId, acknowledgement: true });
    await approveAuthorizedGstSubmission(created.approvalUserId, { taskId: created.taskId, reviewerNote: "Fresh independent approval after provider failure." });
    await beginAuthorizedGstProviderDispatch(created.approvalUserId, created.taskId, "Test Authorized GSP");
    const submitted = await recordOfficialGstSubmission(created.approvalUserId, created.taskId, "OFFICIAL-REF-2026-001");
    expect(submitted.status).toBe("submitted");
    expect(submitted.preparation).toMatchObject({ status: "submitted", officialReference: "OFFICIAL-REF-2026-001" });
    expect(submitted.submissionRequest).toMatchObject({ status: "submitted", providerName: "Test Authorized GSP", providerSubmissionId: "OFFICIAL-REF-2026-001" });
  }, 50_000);
});
