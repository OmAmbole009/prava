import { describe, expect, it } from "vitest";
import { renderInvoicePdf } from "./invoiceRenderer.js";

const business = {
  name: "Prava Technologies Private Limited",
  legalName: "Prava Technologies Private Limited",
  email: "billing@prava.in",
  phone: "+91 98200 12345",
  addressLine1: "101, Tech Park, Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  postalCode: "400069",
  country: "IN",
  gstin: "27AABCP8821F1Z2",
};

/**
 * Pulls every text run out of the PDF content stream and unescapes the PDF
 * string syntax, so assertions can use the literal label the reader sees
 * (parentheses are escaped as `\(` / `\)` inside a PDF string).
 */
function extractText(buffer) {
  const content = buffer.toString("latin1");
  const runs = [];
  const pattern = /\(((?:\\.|[^()\\])*)\)\s*Tj/g;
  let match = pattern.exec(content);
  while (match !== null) {
    runs.push(match[1].replace(/\\(.)/g, "$1"));
    match = pattern.exec(content);
  }
  return runs.join("\n");
}

function buildInvoice(overrides = {}) {
  return {
    id: 1,
    businessId: 1,
    documentKind: "invoice",
    invoiceNumber: "INV-2026-0001",
    invoiceDate: new Date("2026-03-15T00:00:00.000Z"),
    dueDate: new Date("2026-04-14T00:00:00.000Z"),
    status: "issued",
    currency: "INR",
    taxMode: "gst",
    taxRate: 18,
    partyName: "Apex Solutions Pvt Ltd",
    partyEmail: "accounts@apexsolutions.in",
    partyPhone: "+91 98200 98765",
    partyAddressLine1: "402, Business Hub, BKC",
    partyCity: "Mumbai",
    partyState: "Maharashtra",
    partyPostalCode: "400051",
    partyCountry: "IN",
    partyTaxId: "27AABCU9603R1ZM",
    partyPlaceOfSupply: "Maharashtra",
    lineItems: [
      {
        description: "Cloud Infrastructure Consulting",
        hsnSac: "998313",
        unit: "hrs",
        quantity: 10,
        unitPrice: 5000,
        taxRatePercent: 18,
        lineTotalMinor: 5000000,
        discountMinor: 0,
        taxableMinor: 5000000,
        cgstMinor: 450000,
        sgstMinor: 450000,
        igstMinor: 0,
        taxMinor: 900000,
        totalMinor: 5900000,
      },
    ],
    subtotalMinor: 5000000,
    discountMinor: 0,
    taxMinor: 900000,
    cgstMinor: 450000,
    sgstMinor: 450000,
    igstMinor: 0,
    totalMinor: 5900000,
    amountPaidMinor: 0,
    notes: "Payment is due within 30 days.",
    terms: "This is a computer generated invoice.",
    createdAt: new Date("2026-03-15T00:00:00.000Z"),
    updatedAt: new Date("2026-03-15T00:00:00.000Z"),
    ...overrides,
  };
}

describe("renderInvoicePdf", () => {
  it("produces a valid PDF document", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice(),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    const header = buffer.subarray(0, 8).toString("latin1");
    expect(header).toBe("%PDF-1.4");
    expect(buffer.subarray(-6).toString("latin1").trim()).toBe("%%EOF");
  });

  it("embeds the invoice details in the content stream", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice(),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    expect(content).toContain("TAX INVOICE");
    expect(content).toContain("INV-2026-0001");
    expect(content).toContain("Apex Solutions Pvt Ltd");
    expect(content).toContain("INR 59000.00");
  });

  it("titles a bill instead of an invoice", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice({ documentKind: "bill", invoiceNumber: "BILL-2026-0001" }),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });

    const content = buffer.toString("latin1");
    expect(content).toContain("BILL");
    expect(content).not.toContain("TAX INVOICE");
  });

  it("shows the unit rate, taxable value and tax amount for every line", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice(),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    // The rate is stored in major units and must not be divided by 100 again.
    expect(content).toContain("5000.00");
    expect(content).not.toContain("50.00");
    expect(content).toContain("50000.00");
    expect(content).toContain("9000.00");
  });

  it("labels a percentage discount with its rate", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice({
        discountMinor: 500000,
        discountType: "percent",
        discountValue: "10",
      }),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    expect(extractText(buffer)).toContain("Discount (10%)");
    expect(content).toContain("-5000.00");
  });

  it("breaks an intra-state invoice into CGST and SGST", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice(),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    expect(content).toContain("CGST");
    expect(content).toContain("SGST");
    expect(content).not.toContain("IGST");
  });

  it("shows a single IGST row for an inter-state invoice", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice({
        partyPlaceOfSupply: "Karnataka",
        cgstMinor: 0,
        sgstMinor: 0,
        igstMinor: 900000,
      }),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    expect(content).toContain("IGST");
    expect(content).not.toContain("CGST");
    expect(content).not.toContain("SGST");
  });

  it("adds a page for every additional page of line items", () => {
    const manyItems = Array.from({ length: 60 }, (_, index) => ({
      description: `Line item number ${index + 1}`,
      hsnSac: "998313",
      unit: "hrs",
      quantity: 1,
      unitPrice: 100,
      taxRatePercent: 18,
      lineTotalMinor: 10000,
      discountMinor: 0,
      taxableMinor: 10000,
      cgstMinor: 900,
      sgstMinor: 900,
      igstMinor: 0,
      taxMinor: 1800,
      totalMinor: 11800,
    }));

    const buffer = renderInvoicePdf({
      invoice: buildInvoice({ lineItems: manyItems }),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");
    const pageCount = (content.match(/\/Type \/Page[^s]/g) || []).length;
    expect(pageCount).toBeGreaterThan(1);
  });

  it("keeps the xref table consistent with the object offsets", () => {
    const buffer = renderInvoicePdf({
      invoice: buildInvoice(),
      business,
      generatedAt: new Date("2026-03-15T10:00:00.000Z"),
    });
    const content = buffer.toString("latin1");

    const startxrefMatch = content.match(/startxref\s+(\d+)/);
    expect(startxrefMatch).toBeTruthy();
    const startxref = Number(startxrefMatch[1]);
    expect(content.slice(startxref, startxref + 4)).toBe("xref");

    const objectOffsets = [...content.matchAll(/^(\d{10}) 00000 n $/gm)].map(match => Number(match[1]));
    expect(objectOffsets.length).toBeGreaterThan(0);
    for (const offset of objectOffsets) {
      expect(content.slice(offset, offset + 40)).toMatch(/^\d+ 0 obj/);
    }
  });
});
