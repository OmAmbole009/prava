import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseGstInvoiceData } from "./gstInvoiceParser.js";
import { validateExtraction } from "./operations.js";

describe("Autonomous Indian GST & Commercial Invoice Parser", () => {
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
});
