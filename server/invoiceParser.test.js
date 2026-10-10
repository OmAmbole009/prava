import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { classifyDocument, parseGstInvoiceData } from "./gstInvoiceParser.js";
import { calculateGstPreparation, resolveDocumentType, validateExtraction } from "./operations.js";

describe("Autonomous Indian GST, Credit Note & Commercial Invoice Parser", () => {
  it("extracts exact figures from Prava Demo Invoice", async () => {
    const filePath = path.resolve(".storage_cache/businesses_2_documents_Prava_Demo_Invoice_6260fc22.pdf");
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const parsed = await parseGstInvoiceData(buffer, "application/pdf", "Prava_Demo_Invoice.pdf");

    expect(parsed.vendorName).toBe("Prava Technologies Pvt. Ltd.");
    expect(parsed.gstin).toBe("27AAACP1234A1Z5");
    expect(parsed.buyerName).toBe("Aarav Retail Solutions");
    expect(parsed.buyerGstin).toBe("27AABCA5678L1Z2");
    expect(parsed.invoiceNumber).toBe("PRV-2026-0042");
    expect(parsed.invoiceDate).toBe("2026-09-28");
    expect(parsed.taxableValue).toBe("78000.00");
    expect(parsed.cgst).toBe("7020.00");
    expect(parsed.sgst).toBe("7020.00");
    expect(parsed.total).toBe("92040.00");

    const validated = validateExtraction(parsed);
    expect(validated.reasons).toEqual([]);
    expect(validated.taxableValueMinor).toBe(7800000);
    expect(validated.cgstMinor).toBe(702000);
    expect(validated.sgstMinor).toBe(702000);
    expect(validated.totalMinor).toBe(9204000);
  });

  it("extracts exact figures from real supplier tax invoices dynamically", async () => {
    const filePath = path.resolve(".storage_cache/businesses_1_documents_pdf_rendition_1__4__c0b5ce81.pdf");
    if (!fs.existsSync(filePath)) return;

    const buffer = fs.readFileSync(filePath);
    const parsed = await parseGstInvoiceData(buffer, "application/pdf", "supplier_invoice.pdf");

    expect(parsed.vendorName).toBe("OM TELE SERVICES");
    expect(parsed.gstin).toBe("27AGCPA0345A1ZD");
    expect(parsed.buyerName).toBe("Dinesh Engineers Limited");
    expect(parsed.buyerGstin).toBe("27AACCD3117C1Z9");
    expect(parsed.invoiceNumber).toBe("OTS/2026/05");
    expect(parsed.taxableValue).toBe("391500.00");
    expect(parsed.cgst).toBe("35235.00");
    expect(parsed.sgst).toBe("35235.00");
    expect(parsed.total).toBe("461970.00");

    const validated = validateExtraction(parsed);
    expect(validated.reasons).toEqual([]);
    expect(validated.taxableValueMinor).toBe(39150000);
    expect(validated.totalMinor).toBe(46197000);
  });

  describe("Autonomous Document Classification", () => {
    it("autonomously classifies Credit Notes under Section 34 of CGST Act", () => {
      const text = `
        CREDIT NOTE (SECTION 34 OF CGST ACT, 2017)
        Original Invoice Ref: INV-2026-0842 Dated: 15-09-2026
        Credit Note No: CN-01
        Reason: Defective Goods Returned
        Taxable: 10000.00 CGST: 900.00 SGST: 900.00 Total: 11800.00
      `;
      const classification = classifyDocument(text, "credit_memo.pdf");
      expect(classification.documentType).toBe("credit_note");
      expect(classification.isCreditNote).toBe(true);
      expect(classification.originalInvoiceNumber).toBe("INV-2026-0842");
      expect(classification.originalInvoiceDate).toBe("2026-09-15");
      expect(resolveDocumentType(classification.documentType)).toBe("credit_note");
    });

    it("autonomously classifies Debit Notes", () => {
      const text = `
        DEBIT NOTE
        Debit Note No: DN-2026-99
        Original Invoice: INV-2026-0100
        Reason: Supplementary charge for logistics
        Total: 5000.00
      `;
      const classification = classifyDocument(text, "debit_note_dn99.pdf");
      expect(classification.documentType).toBe("debit_note");
      expect(classification.isDebitNote).toBe(true);
      expect(resolveDocumentType(classification.documentType)).toBe("debit_note");
    });

    it("autonomously classifies Bills of Supply (exempt/composition supplies)", () => {
      const text = `
        BILL OF SUPPLY
        Composition Taxable Person - Not eligible to collect tax from customer
        Bill No: BOS-2026-44
        Date: 01-10-2026
        Total Amount: 4500.00
      `;
      const classification = classifyDocument(text, "bill_of_supply.pdf");
      expect(classification.documentType).toBe("invoice");
      expect(classification.isBillOfSupply).toBe(true);
      expect(resolveDocumentType(classification.documentType)).toBe("invoice");
    });

    it("autonomously classifies Payment Receipts", () => {
      const text = `
        PAYMENT RECEIPT / VOUCHER
        Receipt No: RCP-883
        Received with thanks from: ABC Corp
        Amount: 25000.00
      `;
      const classification = classifyDocument(text, "receipt_883.pdf");
      expect(classification.documentType).toBe("receipt");
      expect(resolveDocumentType(classification.documentType)).toBe("receipt");
    });
  });

  describe("End-to-End Image Parsing for Credit Notes & Bills", () => {
    it("reads all financial values and links original invoice for test-credit-note.png", async () => {
      const filePath = path.resolve("test-credit-note.png");
      if (!fs.existsSync(filePath)) return;

      const buffer = fs.readFileSync(filePath);
      const parsed = await parseGstInvoiceData(buffer, "image/png", "test-credit-note.png");

      expect(parsed.documentType).toBe("credit_note");
      expect(parsed.isCreditNote).toBe(true);
      expect(parsed.vendorName).toBe("Apex Solutions Pvt Ltd");
      expect(parsed.buyerName).toBe("Prava Enterprises Ltd");
      expect(parsed.invoiceNumber).toBe("CN-2026-001");
      expect(parsed.originalInvoiceNumber).toBe("INV-2026-0842");
      expect(parsed.taxableValue).toBe("20000.00");
      expect(parsed.cgst).toBe("1800.00");
      expect(parsed.sgst).toBe("1800.00");
      expect(parsed.total).toBe("23600.00");

      const validated = validateExtraction(parsed);
      expect(validated.reasons).toEqual([]);
      expect(validated.totalMinor).toBe(2360000);
    });

    it("reads all values accurately for test-bill-of-supply.png without charging tax", async () => {
      const filePath = path.resolve("test-bill-of-supply.png");
      if (!fs.existsSync(filePath)) return;

      const buffer = fs.readFileSync(filePath);
      const parsed = await parseGstInvoiceData(buffer, "image/png", "test-bill-of-supply.png");

      expect(parsed.isBillOfSupply).toBe(true);
      expect(parsed.vendorName).toBe("Ganesh General Traders");
      expect(parsed.buyerName).toBe("Prava Retail Enterprises");
      expect(parsed.invoiceNumber).toBe("BOS-2026-104");
      expect(parsed.taxableValue).toBe("4500.00");
      expect(parsed.cgst).toBe("0.00");
      expect(parsed.sgst).toBe("0.00");
      expect(parsed.total).toBe("4500.00");

      const validated = validateExtraction(parsed);
      expect(validated.reasons).toEqual([]);
      expect(validated.totalMinor).toBe(450000);
    });
  });

  describe("Credit Note Accounting Invariants in GST Preparation", () => {
    it("correctly reduces outward liability when a sales credit note is issued", () => {
      const rows = [
        // Outward Tax Invoice: 100,000 + 9,000 CGST + 9,000 SGST = 118,000
        {
          documentId: 1,
          status: "extracted",
          invoiceType: "sales",
          taxableValueMinor: 10000000,
          cgstMinor: 900000,
          sgstMinor: 900000,
          igstMinor: 0,
          totalMinor: 11800000,
          extractedData: JSON.stringify({ reviewReasons: [] }),
        },
        // Sales Credit Note: 20,000 + 1,800 CGST + 1,800 SGST = 23,600
        {
          documentId: 2,
          documentType: "credit_note",
          status: "extracted",
          invoiceType: "sales",
          taxableValueMinor: 2000000,
          cgstMinor: 180000,
          sgstMinor: 180000,
          igstMinor: 0,
          totalMinor: 2360000,
          extractedData: JSON.stringify({ isCreditNote: true, documentType: "credit_note", reviewReasons: [] }),
        },
      ];

      const prep = calculateGstPreparation(rows);
      // Net Sales = 118,000 - 23,600 = 94,400
      expect(prep.salesMinor).toBe(9440000);
      // Net Taxable = 100,000 - 20,000 = 80,000
      expect(prep.taxableValueMinor).toBe(8000000);
      // Net CGST = 9,000 - 1,800 = 7,200
      expect(prep.cgstMinor).toBe(720000);
      // Net SGST = 9,000 - 1,800 = 7,200
      expect(prep.sgstMinor).toBe(720000);
      // Net Tax Position = 7,200 + 7,200 = 14,400
      expect(prep.netTaxPositionMinor).toBe(1440000);
    });

    it("correctly reduces input tax credit (ITC) when a purchase credit note is received", () => {
      const rows = [
        // Purchase Invoice: ITC Claim = 9,000 + 9,000 = 18,000
        {
          documentId: 10,
          status: "extracted",
          invoiceType: "purchase",
          taxableValueMinor: 10000000,
          cgstMinor: 900000,
          sgstMinor: 900000,
          igstMinor: 0,
          totalMinor: 11800000,
          extractedData: JSON.stringify({ reviewReasons: [] }),
        },
        // Purchase Credit Note: ITC Reversal = 1,800 + 1,800 = 3,600
        {
          documentId: 11,
          documentType: "credit_note",
          status: "extracted",
          invoiceType: "purchase",
          taxableValueMinor: 2000000,
          cgstMinor: 180000,
          sgstMinor: 180000,
          igstMinor: 0,
          totalMinor: 2360000,
          extractedData: JSON.stringify({ isCreditNote: true, documentType: "credit_note", reviewReasons: [] }),
        },
      ];

      const prep = calculateGstPreparation(rows);
      // Net ITC = 18,000 - 3,600 = 14,400
      expect(prep.inputTaxCreditMinor).toBe(1440000);
    });
  });
});
