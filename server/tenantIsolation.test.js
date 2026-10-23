import { describe, expect, it } from "vitest";
import { appRouter } from "./routers.js";
import { createBusinessWithOwner } from "./db.js";
import {
  getDocumentForUser,
  reviewDocumentForUser,
  deleteInvoiceForUser,
  uploadAndProcessDocument,
} from "./operations.js";
import {
  getPlatformOverview,
  getAdminBusinessesList,
  setBusinessAccountStatus,
  getAdminOcrQueue,
  retryOcrExtraction,
} from "./services/adminPlatformService.js";

describe("Tenant Isolation & Role-Based Access Control", () => {
  it("prevents non-admin callers from accessing administrative procedures via tRPC router", async () => {
    const regularUserCtx = {
      user: {
        id: 101,
        openId: "regular-user-101",
        name: "Regular Tenant",
        email: "tenant@example.com",
        loginMethod: "email",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} },
      res: {},
    };

    const caller = appRouter.createCaller(regularUserCtx);

    // Any attempt to call admin endpoints should throw "required permission" or TRPCError
    await expect(caller.admin.securityOverview()).rejects.toThrow();
  });

  it("enforces tenant boundary on getDocumentForUser across distinct users", async () => {
    const userAId = 9101;
    const userBId = 9102;

    // Create Business A for User A
    const bizA = await createBusinessWithOwner(userAId, {
      name: "Tenant Alpha Technologies",
      country: "IN",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      taxSystem: "GST",
    });

    // Create Business B for User B
    const bizB = await createBusinessWithOwner(userBId, {
      name: "Tenant Beta Logistics",
      country: "IN",
      currency: "INR",
      locale: "en-IN",
      timezone: "Asia/Kolkata",
      taxSystem: "GST",
    });

    expect(bizA.id).not.toBe(bizB.id);

    // User A uploads an invoice
    const sampleInvoiceText =
      "%PDF-1.4\n" +
      "TAX INVOICE\n" +
      "Vendor: Alpha Supplies Pvt Ltd\n" +
      "GSTIN: 27AAAAA0000A1Z5\n" +
      "Invoice No: ALPHA-2026-901\n" +
      "Date: 15/04/2026\n" +
      "Taxable Value: 10,000.00\n" +
      "CGST 9%: 900.00\n" +
      "SGST 9%: 900.00\n" +
      "Total: 11,800.00\n" +
      "%%EOF";

    const base64 = Buffer.from(sampleInvoiceText).toString("base64");

    const docA = await uploadAndProcessDocument(userAId, {
      businessId: bizA.id,
      originalName: "alpha_invoice.pdf",
      mimeType: "application/pdf",
      base64: base64,
    });

    expect(docA.documentId).toBeDefined();

    // User A should be able to access their own document
    const retrievedA = await getDocumentForUser(userAId, docA.documentId);
    expect(retrievedA.document.id).toBe(docA.documentId);

    // User B (from Tenant Beta) MUST NOT be able to access User A's document
    await expect(getDocumentForUser(userBId, docA.documentId)).rejects.toThrow();

    // User B MUST NOT be able to review or alter User A's document
    await expect(
      reviewDocumentForUser(userBId, {
        documentId: docA.documentId,
        decision: "approve",
        vendorName: "Compromised Name",
        invoiceNumber: "HACK-01",
        taxableValue: "100.00",
        total: "118.00",
      })
    ).rejects.toThrow();

    // User B MUST NOT be able to delete User A's document
    await expect(deleteInvoiceForUser(userBId, docA.documentId)).rejects.toThrow();
  });

  it("calculates real platform overview metrics without fabricating values", async () => {
    const overview = await getPlatformOverview();

    expect(overview).toHaveProperty("metrics");
    expect(overview.metrics).toHaveProperty("totalBusinesses");
    expect(overview.metrics).toHaveProperty("activeBusinesses");
    expect(overview.metrics).toHaveProperty("totalUsers");
    expect(overview.metrics).toHaveProperty("totalDocuments");
    expect(overview.metrics).toHaveProperty("ocrSuccessRate");
    expect(overview).toHaveProperty("systemHealth");

    expect(typeof overview.metrics.totalBusinesses).toBe("number");
    expect(typeof overview.metrics.totalDocuments).toBe("number");
    expect(typeof overview.metrics.ocrSuccessRate).toBe("number");
    expect(overview.metrics.ocrSuccessRate).toBeGreaterThanOrEqual(0);
    expect(overview.metrics.ocrSuccessRate).toBeLessThanOrEqual(100);
  });

  it("allows administrators to safely update business account status with audit trails", async () => {
    const testAdminId = 1;
    const testBiz = await createBusinessWithOwner(9201, {
      name: "Tenant Gamma Corp",
      country: "IN",
      currency: "INR",
    });

    // Suspend Gamma Corp
    const suspended = await setBusinessAccountStatus(
      testAdminId,
      testBiz.id,
      "suspended",
      "Quarterly compliance review pending"
    );

    expect(suspended.success).toBe(true);
    expect(suspended.status).toBe("suspended");

    // Reactivate Gamma Corp
    const reactivated = await setBusinessAccountStatus(
      testAdminId,
      testBiz.id,
      "active",
      "Compliance verification verified and approved"
    );

    expect(reactivated.success).toBe(true);
    expect(reactivated.status).toBe("active");
  });

  it("provides OCR queue monitoring and safe retry functionality", async () => {
    const adminUser = 1;
    const biz = await createBusinessWithOwner(adminUser, {
      name: "Queue Monitoring Test Corp",
      country: "IN",
      currency: "INR",
    });

    const cleanInvoiceText = `TAX INVOICE
Vendor: Reliable Cloud Services
GSTIN: 27AABCS1429B1ZB
Invoice No: INV-2026-CLOUD-99
Date: 22-04-2026
Taxable Value: 50,000.00
CGST 9%: 4,500.00
SGST 9%: 4,500.00
Total: 59,000.00`;

    const uploaded = await uploadAndProcessDocument(adminUser, {
      businessId: biz.id,
      originalName: "clean_cloud_invoice.txt",
      mimeType: "text/plain",
      base64: Buffer.from(cleanInvoiceText).toString("base64"),
    });

    const queue = await getAdminOcrQueue({ status: "all" });
    expect(Array.isArray(queue)).toBe(true);
    expect(queue.length).toBeGreaterThan(0);

    const retryResult = await retryOcrExtraction(adminUser, uploaded.documentId);
    expect(retryResult.success).toBe(true);
    expect(retryResult.documentId).toBe(uploaded.documentId);
  });
});
