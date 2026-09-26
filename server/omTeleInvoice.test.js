import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseGstInvoiceData } from "./gstInvoiceParser.js";
import { validateExtraction } from "./operations.js";

describe("Om Tele Services Invoice Real-File Parser", () => {
  it("extracts exact figures and parties from the father's company invoice", () => {
    const filePath = path.resolve(".storage_cache/businesses_1_documents_pdf_rendition_1__4__c0b5ce81.pdf");
    expect(fs.existsSync(filePath)).toBe(true);

    const buffer = fs.readFileSync(filePath);
    const parsed = parseGstInvoiceData(buffer, "application/pdf", "pdf_rendition_1__4__.pdf", {
      name: "Om Tele Services",
      gstin: "27AGCPA0345A1ZD",
    });

    // 1. Seller & Buyer Verification
    expect(parsed.vendorName).toBe("OM TELE SERVICES");
    expect(parsed.gstin).toBe("27AGCPA0345A1ZD");
    expect(parsed.pan).toBe("AGCPA0345A");
    expect(parsed.buyerName).toBe("Dinesh Engineers Limited");
    expect(parsed.buyerGstin).toBe("27AACCD3117C1Z9");
    expect(parsed.invoiceNumber).toBe("OTS/2026/05");
    expect(parsed.invoiceDate).toBe("2026-09-19");

    // 2. Exact Amounts Verification
    expect(parsed.taxableValue).toBe("391500.00");
    expect(parsed.cgst).toBe("35235.00");
    expect(parsed.sgst).toBe("35235.00");
    expect(parsed.igst).toBe("0.00");
    expect(parsed.total).toBe("461970.00");

    // 3. Validation & Minor Units
    const validated = validateExtraction(parsed);
    expect(validated.reasons).toEqual([]);
    expect(validated.taxableValueMinor).toBe(39150000); // ₹3,91,500.00
    expect(validated.cgstMinor).toBe(3523500);         // ₹35,235.00
    expect(validated.sgstMinor).toBe(3523500);         // ₹35,235.00
    expect(validated.igstMinor).toBe(0);
    expect(validated.totalMinor).toBe(46197000);        // ₹4,61,970.00
  });
});
