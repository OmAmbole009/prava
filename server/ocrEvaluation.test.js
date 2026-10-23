import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseGstInvoiceData, extractDocumentText, extractLineItems } from "./gstInvoiceParser.js";
import { validateExtraction, uploadAndProcessDocument, inMemoryDocuments, inMemoryExtractions } from "./operations.js";

describe("Comprehensive OCR Pipeline Evaluation & Mathematical Reliability Suite", () => {
  // Test Case 1: Inter-state IGST Invoice with Multiple Line Items
  it("evaluates inter-state IGST invoice with multiple line items (test-igst-invoice.png)", async () => {
    const filePath = path.resolve("test-igst-invoice.png");
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const parsed = await parseGstInvoiceData(buffer, "image/png", "test-igst-invoice.png");

    expect(parsed.vendorName).toContain("Bangalore Cloud Systems");
    expect(parsed.gstin).toBe("29AAGCB5555M1Z8");
    expect(parsed.buyerName).toContain("Prava Enterprise");
    expect(parsed.invoiceNumber).toBe("BCS/2026/109");
    expect(parsed.taxableValue).toBe("100000.00");
    expect(parsed.igst).toBe("18000.00");
    expect(parsed.total).toBe("118000.00");

    // Line items verification
    expect(parsed.items.length).toBeGreaterThanOrEqual(1);
    expect(parsed.fieldConfidence).toBeDefined();
    expect(parsed.fieldConfidence.gstin.verified).toBe(true);
    expect(parsed.fieldConfidence.total.verified).toBe(true);

    const validated = validateExtraction(parsed);
    expect(validated.reasons).toEqual([]);
    expect(validated.taxableValueMinor).toBe(10000000);
    expect(validated.igstMinor).toBe(1800000);
    expect(validated.totalMinor).toBe(11800000);
  });

  // Test Case 2: Statutory Credit Note with Original Invoice Reference
  it("evaluates statutory credit note with original invoice reference (test-credit-note.png)", async () => {
    const filePath = path.resolve("test-credit-note.png");
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const parsed = await parseGstInvoiceData(buffer, "image/png", "test-credit-note.png");

    expect(parsed.documentType).toBe("credit_note");
    expect(parsed.isCreditNote).toBe(true);
    expect(parsed.vendorName).toContain("Apex Solutions");
    expect(parsed.invoiceNumber).toBe("CN-2026-001");
    expect(parsed.originalInvoiceNumber).toBe("INV-2026-0842");
    expect(parsed.taxableValue).toBe("20000.00");
    expect(parsed.cgst).toBe("1800.00");
    expect(parsed.sgst).toBe("1800.00");
    expect(parsed.total).toBe("23600.00");
    expect(parsed.fieldConfidence.total.verified).toBe(true);
  });

  // Test Case 3: Bill of Supply (0% Tax / Exempt)
  it("evaluates composition Bill of Supply with 0% tax (test-bill-of-supply.png)", async () => {
    const filePath = path.resolve("test-bill-of-supply.png");
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const parsed = await parseGstInvoiceData(buffer, "image/png", "test-bill-of-supply.png");

    expect(parsed.isBillOfSupply).toBe(true);
    expect(parsed.vendorName).toContain("Ganesh General Traders");
    expect(parsed.invoiceNumber).toBe("BOS-2026-104");
    expect(parsed.taxableValue).toBe("4500.00");
    expect(parsed.cgst).toBe("0.00");
    expect(parsed.sgst).toBe("0.00");
    expect(parsed.total).toBe("4500.00");
    expect(parsed.fieldConfidence.taxComponents.verified).toBe(true);
  });

  // Test Case 4: Mathematical Discrepancy Detection
  it("detects and flags intentional arithmetic discrepancy between line items and total", async () => {
    const syntheticText = `
      TAX INVOICE
      Supplier: Quantum Tech Solutions Pvt Ltd
      GSTIN: 27AABCT9988P1Z3
      Invoice No: QTS-2026-88
      Date: 25-10-2026
      Bill To: Client Alpha Ltd
      Taxable Subtotal: 50,000.00
      CGST: 4,500.00
      SGST: 4,500.00
      Grand Total: 65,000.00
    `;
    const parsed = await parseGstInvoiceData(Buffer.from(syntheticText), "text/plain", "discrepant.txt");

    // Taxable (50,000) + CGST (4,500) + SGST (4,500) = 59,000, but printed total is 65,000
    expect(parsed.reviewReasons.some(r => r.includes("mismatch") || r.includes("differs"))).toBe(true);
    expect(parsed.status).toBe("needs_review");
    expect(parsed.confidenceBps).toBeLessThan(9000);
  });

  // Test Case 5: Empty Buffer and Corrupted File Handling
  it("safely handles 0-byte empty buffer without unhandled crash", async () => {
    await expect(extractDocumentText(Buffer.alloc(0), "application/pdf", "empty.pdf"))
      .rejects.toThrow(/empty/i);
  });

  // Test Case 6: Invalid PDF Header Detection
  it("rejects non-PDF buffer labeled as application/pdf", async () => {
    const invalidBuffer = Buffer.from("NOT_A_VALID_PDF_HEADER");
    await expect(extractDocumentText(invalidBuffer, "application/pdf", "fake.pdf"))
      .rejects.toThrow(/invalid pdf format/i);
  });

  // Test Case 7: Encrypted / Password-Protected PDF Detection
  it("detects and rejects password-protected PDFs with informative error message", async () => {
    const encryptedPdfBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Encrypt 2 0 R >>\nendobj\n2 0 obj\n<< /Filter /Standard >>\nendobj\n%%EOF");
    await expect(extractDocumentText(encryptedPdfBuffer, "application/pdf", "protected.pdf"))
      .rejects.toThrow(/password-protected|encrypted/i);
  });

  // Test Case 8: Multi-tax rate line item reconstruction
  it("extracts line items across multiple tax rates and validates math", () => {
    const tableText = `
      # Item Description HSN/SAC Qty Rate Tax% Amount
      1 Server Hardware   847130  2   45000.00 18% 90000.00
      2 Cable Accessories 854442  10  500.00   12% 5000.00
    `;
    const items = extractLineItems(tableText);
    expect(items.length).toBe(2);
    expect(items[0].description).toBe("Server Hardware");
    expect(items[0].amount).toBe(90000);
    expect(items[1].description).toBe("Cable Accessories");
    expect(items[1].amount).toBe(5000);
  });

  // Test Case 9: Duplicate Invoice Detection in Workspace
  it("detects duplicate invoice numbers uploaded for the same vendor in the same workspace", async () => {
    const pngPath = path.resolve("test-igst-invoice.png");
    if (!fs.existsSync(pngPath)) return;
    const realPngBuffer = fs.readFileSync(pngPath);

    // Upload first copy
    const upload1 = await uploadAndProcessDocument(1, {
      businessId: 1,
      documentType: "invoice",
      originalName: "BCS_Invoice_Copy1.png",
      mimeType: "image/png",
      base64: realPngBuffer.toString("base64"),
    });
    expect(upload1.documentId).toBeGreaterThan(0);

    // Upload second duplicate copy
    const upload2 = await uploadAndProcessDocument(1, {
      businessId: 1,
      documentType: "invoice",
      originalName: "BCS_Invoice_Copy2.png",
      mimeType: "image/png",
      base64: realPngBuffer.toString("base64"),
    });

    const doc2 = inMemoryDocuments.find(d => d.document.id === upload2.documentId);
    expect(doc2).toBeDefined();
    // Verify duplicate is flagged in reviewReasons
    const reasons = JSON.parse(doc2.extraction.extractedData).reviewReasons || [];
    const isFlaggedDuplicate = reasons.some(r => r.includes("Duplicate") || r.includes("BCS/2026/109"));
    expect(isFlaggedDuplicate).toBe(true);
    expect(doc2.document.status).toBe("needs_review");
  }, 25000);
});
