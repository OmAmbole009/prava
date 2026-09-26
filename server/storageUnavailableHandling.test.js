import { describe, expect, it } from "vitest";
import {
  inMemoryTasks,
  inMemoryDocuments,
  inMemoryExtractions,
  inMemoryReconciliationItems,
  inMemoryGstPreparations,
  prepareGstReturn,
  reconcileGstTask,
  prepareCashReconciliation,
  resolveReconciliationItem,
  requestProfessionalReview,
  requestAuthorizedGstSubmission,
  getTaskForUser,
} from "./operations.js";

describe("Offline / in-memory storage resilience", () => {
  it("executes GST return preparation, reconciliation, review, and cash reconciliation without storage errors", async () => {
    const testTaskId = 9999;
    const testUserId = 999;
    const testBusinessId = 1;

    // Seed task in memory
    inMemoryTasks.push({
      id: testTaskId,
      businessId: testBusinessId,
      type: "gst_return_preparation",
      title: "GST Return for Q2",
      status: "ready_for_review",
      requirements: [
        { key: "sales_invoices", label: "Sales invoices", status: "complete" },
        { key: "purchase_invoices", label: "Purchase invoices", status: "complete" },
      ],
      requiresProfessionalReview: 0,
    });

    // Seed a document with extraction
    inMemoryDocuments.push({
      document: {
        id: 99991,
        taskId: testTaskId,
        businessId: testBusinessId,
        originalName: "invoice_test.pdf",
        documentType: "invoice",
        status: "extracted",
      },
      extraction: {
        documentId: 99991,
        invoiceNumber: "INV-OFFLINE-1",
        gstin: "27ABCDE1234F1Z5",
        status: "extracted",
        extractedData: JSON.stringify({ reviewReasons: [] }),
        invoiceType: "sales",
        taxableValueMinor: 50000,
        cgstMinor: 4500,
        sgstMinor: 4500,
        igstMinor: 0,
        totalMinor: 59000,
      },
    });

    // 1. Prepare GST Return - must NOT throw "GST preparation storage is unavailable"
    const prepResult = await prepareGstReturn(testUserId, testTaskId);
    expect(prepResult).toBeDefined();
    expect(prepResult.preparation.cgstMinor).toBe(4500);
    expect(prepResult.preparation.sgstMinor).toBe(4500);
    expect(prepResult.preparation.netTaxPositionMinor).toBe(9000);
    expect(prepResult.preparation.status).toBe("prepared");

    // 2. Reconcile GST Task - must NOT throw "Reconciliation storage is unavailable"
    const reconItems = await reconcileGstTask(testUserId, testTaskId);
    expect(Array.isArray(reconItems)).toBe(true);
    expect(reconItems.length).toBeGreaterThan(0);

    // 3. Resolve reconciliation item - must NOT throw
    const targetItem = reconItems[0];
    const resolveResult = await resolveReconciliationItem(testUserId, {
      reconciliationId: targetItem.id,
      resolution: "matched",
    });
    expect(resolveResult.success).toBe(true);

    // 4. Request professional review - must NOT throw "Review storage is unavailable"
    const reviewResult = await requestProfessionalReview(
      testUserId,
      testTaskId,
      "Please review the prepared GST calculations."
    );
    expect(reviewResult).toBeDefined();
    expect(reviewResult.id).toBe(testTaskId);

    // 5. Test Cash Reconciliation task
    const cashTaskId = 9998;
    inMemoryTasks.push({
      id: cashTaskId,
      businessId: testBusinessId,
      type: "cash_reconciliation",
      title: "Cash Reconciliation Q2",
      status: "collecting",
      requirements: [
        { key: "bank_statement", label: "Bank statement", status: "complete" },
      ],
      requiresProfessionalReview: 0,
    });
    inMemoryDocuments.push({
      document: {
        id: 99992,
        taskId: cashTaskId,
        businessId: testBusinessId,
        originalName: "statement_august.pdf",
        documentType: "bank_statement",
        status: "uploaded",
      },
      extraction: null,
    });

    const cashReconResult = await prepareCashReconciliation(testUserId, cashTaskId);
    expect(Array.isArray(cashReconResult)).toBe(true);
    expect(cashReconResult.length).toBeGreaterThan(0);
    expect(cashReconResult[0].itemType).toBe("bank_statement");
  });
});
