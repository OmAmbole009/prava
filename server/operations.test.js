import { describe, expect, it, vi } from "vitest";
import { authorizedSubmissionGate, buildGstReconciliationItems, calculateGstPreparation, canIndependentlyApproveSubmission, deriveCashIntakeReconciliation, deriveDocumentToGstWorkflow, normalizeProviderFailureCode, persistReviewedDocumentState, resolveLinkedDocumentReviewActions, reviewActionOutcome, validateExtraction } from "./operations.js";

describe("financial-operations deterministic safeguards", () => {
  it("flags inconsistent GST document totals for human review", () => {
    const result = validateExtraction({
      vendorName: "Example Supplier", gstin: "27ABCDE1234F1Z5", invoiceNumber: "INV-1", invoiceDate: "2026-08-31",
      taxableValue: "100.00", cgst: "9.00", sgst: "9.00", igst: "0", total: "119.00", placeOfSupply: "Maharashtra", invoiceType: "purchase", reviewReasons: [],
    });
    expect(result.reasons).toContain("Invoice total does not match taxable value plus GST components.");
  });

  it("calculates GST preparation amounts deterministically from extracted minor units", () => {
    const result = calculateGstPreparation([
      { invoiceType: "sales", taxableValueMinor: 10000, cgstMinor: 900, sgstMinor: 900, igstMinor: 0, totalMinor: 11800, status: "extracted" },
      { invoiceType: "purchase", taxableValueMinor: 5000, cgstMinor: 450, sgstMinor: 450, igstMinor: 0, totalMinor: 5900, status: "extracted" },
    ]);
    expect(result.netTaxPositionMinor).toBe(900);
    expect(result.documentsRequiringReview).toBe(0);
  });

  it("keeps unclassified invoices out of completed sales or purchase assumptions", () => {
    const result = validateExtraction({
      vendorName: "Example Supplier", gstin: "27ABCDE1234F1Z5", invoiceNumber: "INV-2", invoiceDate: "2026-08-31",
      taxableValue: "100.00", cgst: "9.00", sgst: "9.00", igst: "0", total: "118.00", placeOfSupply: "Maharashtra", invoiceType: "unknown", reviewReasons: [],
    });
    expect(result.reasons).toContain("Invoice direction needs review before accounting categorization.");
  });

  it("generates matched, duplicate, mismatch, and missing GST reconciliation outcomes", () => {
    const items = buildGstReconciliationItems([
      { documentId: 1, invoiceNumber: "INV-1", gstin: "27ABCDE1234F1Z5", status: "extracted", extractedData: JSON.stringify({ reviewReasons: [] }) },
      { documentId: 2, invoiceNumber: "INV-1", gstin: "27ABCDE1234F1Z5", status: "extracted", extractedData: JSON.stringify({ reviewReasons: [] }) },
      { documentId: 3, invoiceNumber: "INV-3", gstin: "27ABCDE1234F1Z5", status: "extracted", extractedData: JSON.stringify({ reviewReasons: ["Invoice total does not match taxable value plus GST components."] }) },
    ], [{ label: "Bank transactions" }]);
    expect(items.map(item => item.status)).toEqual(["matched", "duplicate", "mismatch", "missing"]);
  });

  it("resolves a document-review action only when the reviewed document is approved", () => {
    expect(reviewActionOutcome("approve")).toBe("resolved");
    expect(reviewActionOutcome("save_for_review")).toBe("open");
  });

  it("executes the linked action-item persistence update for approval, not save-for-review", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const db = { update };

    expect(await resolveLinkedDocumentReviewActions(db, 42, "save_for_review")).toBe(false);
    expect(update).not.toHaveBeenCalled();

    expect(await resolveLinkedDocumentReviewActions(db, 42, "approve")).toBe(true);
    expect(update).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "resolved" }));
    expect(where).toHaveBeenCalledTimes(1);
  });

  it("derives preparation and reconciliation state across an approved document-to-GST workflow", () => {
    const workflow = deriveDocumentToGstWorkflow([
      { documentId: 1, invoiceNumber: "S-001", gstin: "27ABCDE1234F1Z5", status: "extracted", extractedData: JSON.stringify({ reviewReasons: [] }), invoiceType: "sales", taxableValueMinor: 10000, cgstMinor: 900, sgstMinor: 900, igstMinor: 0, totalMinor: 11800 },
      { documentId: 2, invoiceNumber: "P-001", gstin: "27ABCDE1234F1Z5", status: "extracted", extractedData: JSON.stringify({ reviewReasons: [] }), invoiceType: "purchase", taxableValueMinor: 5000, cgstMinor: 450, sgstMinor: 450, igstMinor: 0, totalMinor: 5900 },
    ], [{ status: "complete", label: "Business GSTIN" }, { status: "complete", label: "Sales invoices" }, { status: "complete", label: "Purchase invoices" }]);
    expect(workflow.preparationStatus).toBe("prepared");
    expect(workflow.preparation.netTaxPositionMinor).toBe(900);
    expect(workflow.reconciliationStatus).toBe("ready_for_review");
    expect(workflow.reconciliationItems.map(item => item.status)).toEqual(["matched", "matched"]);
  });

  it("keeps workflow output in review when a document or requirement remains unresolved", () => {
    const workflow = deriveDocumentToGstWorkflow([
      { documentId: 1, invoiceNumber: "S-002", gstin: "27ABCDE1234F1Z5", status: "needs_review", extractedData: JSON.stringify({ reviewReasons: ["Invoice total does not match taxable value plus GST components."] }), invoiceType: "sales", taxableValueMinor: 10000, cgstMinor: 900, sgstMinor: 900, igstMinor: 0, totalMinor: 11900 },
    ], [{ status: "needs_review", label: "Sales invoices" }]);
    expect(workflow.preparationStatus).toBe("needs_review");
    expect(workflow.reconciliationStatus).toBe("needs_review");
    expect(workflow.reconciliationItems.map(item => item.status)).toEqual(["needs_review", "missing"]);
  });

  it("stages bank statements as review-only cash evidence without inventing transactions or balances", () => {
    const workflow = deriveCashIntakeReconciliation([
      { documentId: 12, originalName: "August statement.pdf", documentType: "bank_statement", status: "uploaded" },
    ], [{ status: "complete", label: "Bank statement" }, { status: "complete", label: "Confirm reconciliation period" }]);
    expect(workflow.reconciliationStatus).toBe("needs_review");
    expect(workflow.items).toEqual([expect.objectContaining({ documentId: 12, status: "needs_review", itemType: "bank_statement" })]);
    expect(workflow.items[0]?.reason).toContain("no financial values or matches have been inferred");
  });

  it("keeps cash intake collecting when no bank statement has been supplied", () => {
    const workflow = deriveCashIntakeReconciliation([], [{ status: "missing", label: "Bank statement" }]);
    expect(workflow.reconciliationStatus).toBe("collecting");
    expect(workflow.items).toEqual([expect.objectContaining({ status: "missing", reference: "Bank statement" })]);
  });

  it("allows an authorized-submission request only after a fully prepared GST return has no outstanding review boundary", () => {
    expect(authorizedSubmissionGate({ type: "gst_return_preparation", status: "prepared", requiresProfessionalReview: 0 }, { status: "prepared" })).toEqual({ allowed: true });
    expect(authorizedSubmissionGate({ type: "gst_return_preparation", status: "needs_review", requiresProfessionalReview: 0 }, { status: "needs_review" })).toMatchObject({ allowed: false });
    expect(authorizedSubmissionGate({ type: "cash_reconciliation", status: "prepared", requiresProfessionalReview: 0 }, { status: "prepared" })).toMatchObject({ allowed: false });
    expect(authorizedSubmissionGate({ type: "gst_return_preparation", status: "prepared", requiresProfessionalReview: 1 }, { status: "prepared" })).toMatchObject({ allowed: false });
  });

  it("requires an independent workspace administrator to approve a GST submission request", () => {
    expect(canIndependentlyApproveSubmission({ workspaceRole: "admin", requestedByUserId: 11, reviewerUserId: 12, status: "awaiting_review" })).toEqual({ allowed: true });
    expect(canIndependentlyApproveSubmission({ workspaceRole: "member", requestedByUserId: 11, reviewerUserId: 12, status: "awaiting_review" })).toMatchObject({ allowed: false });
    expect(canIndependentlyApproveSubmission({ workspaceRole: "admin", requestedByUserId: 11, reviewerUserId: 11, status: "awaiting_review" })).toMatchObject({ allowed: false });
    expect(canIndependentlyApproveSubmission({ workspaceRole: "admin", requestedByUserId: 11, reviewerUserId: 12, status: "approved" })).toMatchObject({ allowed: false });
  });

  it("records provider dispatch failure categories without retaining unsafe raw provider detail", () => {
    expect(normalizeProviderFailureCode("UPI timeout / customer detail")).toBe("UPI_timeout___customer_detail");
    expect(normalizeProviderFailureCode(" x ".repeat(80))).toHaveLength(128);
    expect(normalizeProviderFailureCode("   ")).toBe("");
  });

  it("persists approval through document, requirement, action, and downstream GST workflow state", async () => {
    const where = vi.fn(async () => undefined);
    const set = vi.fn(() => ({ where }));
    const update = vi.fn(() => ({ set }));
    const raw = { vendorName: "Supplier", gstin: "27ABCDE1234F1Z5", invoiceNumber: "P-001", invoiceDate: "2026-08-10", taxableValue: "100.00", cgst: "9.00", sgst: "9.00", igst: "0", total: "118.00", placeOfSupply: "Maharashtra", invoiceType: "purchase", reviewReasons: [] };
    const persisted = await persistReviewedDocumentState({ db: { update }, documentId: 7, taskId: 3, documentType: "invoice", decision: "approve", previousConfidenceBps: 5000, raw, validated: validateExtraction(raw) });
    expect(persisted).toMatchObject({ status: "extracted", requirementKey: "purchase_invoices", actionOutcome: "resolved" });
    expect(update).toHaveBeenCalledTimes(4);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "extracted" }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "resolved" }));
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ status: "complete" }));
    const workflow = deriveDocumentToGstWorkflow([{ documentId: 7, invoiceNumber: "P-001", gstin: "27ABCDE1234F1Z5", status: persisted.status, extractedData: JSON.stringify({ reviewReasons: [] }), invoiceType: raw.invoiceType, taxableValueMinor: 10000, cgstMinor: 900, sgstMinor: 900, igstMinor: 0, totalMinor: 11800 }], [{ status: "complete", label: "Purchase invoices" }]);
    expect(workflow.preparationStatus).toBe("prepared");
    expect(workflow.reconciliationStatus).toBe("ready_for_review");
  });
});
