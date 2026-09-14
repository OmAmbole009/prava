import { describe, expect, it, vi } from "vitest";
import { actionItems, businessMembers, documentExtractions, documents, gstPreparations, operationalTasks, reconciliationItems, taskRequirements } from "../drizzle/schema.js";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  storageGetSignedUrl: vi.fn(async () => "https://storage.example/source.pdf"),
  checkFeatureEntitlement: vi.fn(async () => ({ allowed: true, reason: undefined })),
  consumeUsage: vi.fn(async () => undefined),
}));

vi.mock("./db.js", () => ({ getDb: mocks.getDb }));
vi.mock("./storage.js", () => ({ storageGetSignedUrl: mocks.storageGetSignedUrl, storagePut: vi.fn() }));
vi.mock("./entitlements.js", () => ({ checkFeatureEntitlement: mocks.checkFeatureEntitlement, consumeUsage: mocks.consumeUsage }));

import { prepareGstReturn, reconcileGstTask, reviewDocumentForUser } from "./operations.js";

function createWorkflowHarness() {
  const state = {
    document: { id: 7, businessId: 1, taskId: 3, storageKey: "businesses/1/documents/purchase.pdf", documentType: "invoice", status: "needs_review" },
    extraction: { confidenceBps: 5000, status: "needs_review", vendorName: null, gstin: null, invoiceNumber: null, invoiceDate: null, taxableValueMinor: null, cgstMinor: null, sgstMinor: null, igstMinor: null, totalMinor: null, placeOfSupply: null, invoiceType: "unknown", extractedData: JSON.stringify({ reviewReasons: ["Invoice direction needs review before accounting categorization."] }) },
    task: { id: 3, businessId: 1, type: "gst_return_preparation", status: "collecting", periodStart: new Date("2026-08-01T00:00:00.000Z"), periodEnd: new Date("2026-09-01T00:00:00.000Z"), requiresProfessionalReview: 0 },
    requirements: [{ taskId: 3, requirementKey: "business_gstin", status: "complete", label: "Business GSTIN" }, { taskId: 3, requirementKey: "purchase_invoices", status: "needs_review", label: "Purchase invoices" }],
    preparation: null,
    actions: [{ documentId: 7, type: "review_document", status: "open" }],
    reconciliation: [],
  };
  const resolveRows = (table, fields) => {
    if (table === documents) {
      if (fields && "document" in fields) return [{ document: state.document, extraction: state.extraction }];
      return [{ documentId: 7, invoiceNumber: state.extraction.invoiceNumber, gstin: state.extraction.gstin, status: state.extraction.status, extractedData: state.extraction.extractedData, invoiceType: state.extraction.invoiceType, taxableValueMinor: state.extraction.taxableValueMinor, cgstMinor: state.extraction.cgstMinor, sgstMinor: state.extraction.sgstMinor, igstMinor: state.extraction.igstMinor, totalMinor: state.extraction.totalMinor }];
    }
    if (table === operationalTasks) return [{ task: state.task, role: "owner" }];
    if (table === taskRequirements) return state.requirements;
    if (table === gstPreparations) return state.preparation ? [state.preparation] : [];
    if (table === businessMembers) return [{ businessId: 1, name: "Integration Workspace", gstin: "27ABCDE1234F1Z5", gstStatus: "registered", role: "owner" }];
    if (table === reconciliationItems) return state.reconciliation;
    return [];
  };
  const db = {
    select: vi.fn((fields) => {
      let table;
      const builder = {
        from(next) { table = next; return builder; },
        innerJoin() { return builder; },
        leftJoin() { return builder; },
        where() { return builder; },
        orderBy() { return builder; },
        limit() { return Promise.resolve(resolveRows(table, fields)); },
        then(resolve) { return Promise.resolve(resolveRows(table, fields)).then(resolve); },
      };
      return builder;
    }),
    update: vi.fn((table) => ({
      set(values) {
        return { where: async () => {
          if (table === documentExtractions) Object.assign(state.extraction, values);
          if (table === documents) Object.assign(state.document, values);
          if (table === taskRequirements) state.requirements.forEach((item) => Object.assign(item, values));
          if (table === actionItems) state.actions.forEach((item) => Object.assign(item, values));
          if (table === operationalTasks) Object.assign(state.task, values);
          if (table === gstPreparations && state.preparation) Object.assign(state.preparation, values);
        } };
      },
    })),
    insert: vi.fn((table) => ({
      values(values) {
        if (table === gstPreparations) {
          state.preparation = { ...values };
          return { onDuplicateKeyUpdate: async ({ set }) => Object.assign(state.preparation, set) };
        }
        if (table === reconciliationItems) state.reconciliation = values;
        return Promise.resolve();
      },
    })),
    delete: vi.fn(() => ({ where: async () => undefined })),
  };
  return { db, state };
}

describe("non-production document-to-GST service harness", () => {
  it("runs reviewed document approval through task preparation and reconciliation persistence", async () => {
    const { db, state } = createWorkflowHarness();
    mocks.getDb.mockResolvedValue(db);

    await reviewDocumentForUser(11, { documentId: 7, decision: "approve", vendorName: "Example Supplier", gstin: "27ABCDE1234F1Z5", invoiceNumber: "P-001", invoiceDate: "2026-08-10", taxableValue: "100.00", cgst: "9.00", sgst: "9.00", igst: "0.00", total: "118.00", placeOfSupply: "Maharashtra", invoiceType: "purchase" });
    await prepareGstReturn(11, 3);
    await reconcileGstTask(11, 3);

    expect(state.document.status).toBe("extracted");
    expect(state.extraction.status).toBe("extracted");
    expect(state.actions[0].status).toBe("resolved");
    expect(state.requirements.every((item) => item.status === "complete")).toBe(true);
    expect(state.preparation.status).toBe("prepared");
    expect(state.task.status).toBe("ready_for_review");
    expect(state.reconciliation).toEqual([expect.objectContaining({ status: "matched", documentId: 7 })]);
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith("businesses/1/documents/purchase.pdf");
  });
});
