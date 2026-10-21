import { describe, expect, it } from "vitest";
import {
  allocateDiscount,
  amountInWords,
  buildInvoiceNumber,
  computeInvoiceTotals,
  parseInvoiceSequence,
  resolveGstTreatment,
  toMinor,
} from "./invoiceBuilder.js";

const line = (overrides = {}) => ({
  description: "Consulting services",
  hsnSac: "998313",
  unit: "hrs",
  quantity: "1",
  unitPrice: "0",
  ...overrides,
});

describe("toMinor", () => {
  it("converts whole numbers to minor units", () => {
    expect(toMinor(100)).toBe(10000);
    expect(toMinor("100")).toBe(10000);
  });

  it("converts decimal strings without floating point drift", () => {
    expect(toMinor("19.99")).toBe(1999);
    expect(toMinor("0.01")).toBe(1);
    expect(toMinor("1234.56")).toBe(123456);
  });

  it("rounds half up at the third decimal", () => {
    expect(toMinor("19.995")).toBe(2000);
    expect(toMinor("19.994")).toBe(1999);
  });

  it("treats empty and invalid input as zero", () => {
    expect(toMinor("")).toBe(0);
    expect(toMinor(null)).toBe(0);
    expect(toMinor(undefined)).toBe(0);
  });
});

describe("computeInvoiceTotals", () => {
  it("multiplies quantity by rate in minor units", () => {
    const totals = computeInvoiceTotals({
      taxMode: "none",
      taxRatePercent: 0,
      discount: { type: "none", value: 0 },
      lineItems: [line({ quantity: "2.5", unitPrice: "5000.00" })],
    });

    expect(totals.subtotalMinor).toBe(1250000);
    expect(totals.totalMinor).toBe(1250000);
    expect(totals.lineItems[0].lineTotalMinor).toBe(1250000);
  });

  it("splits intra-state GST into CGST and SGST", () => {
    const totals = computeInvoiceTotals(
      {
        taxMode: "gst",
        taxRatePercent: 18,
        discount: { type: "none", value: 0 },
        party: { placeOfSupply: "Maharashtra" },
        lineItems: [line({ quantity: "2", unitPrice: "5000.00" })],
      },
      { supplierState: "Maharashtra" },
    );

    expect(totals.subtotalMinor).toBe(1000000);
    expect(totals.cgstMinor).toBe(90000);
    expect(totals.sgstMinor).toBe(90000);
    expect(totals.igstMinor).toBe(0);
    expect(totals.taxMinor).toBe(180000);
    expect(totals.totalMinor).toBe(1180000);
    expect(totals.isInterState).toBe(false);
  });

  it("applies IGST when the place of supply is another state", () => {
    const totals = computeInvoiceTotals(
      {
        taxMode: "gst",
        taxRatePercent: 18,
        discount: { type: "none", value: 0 },
        party: { placeOfSupply: "Karnataka" },
        lineItems: [line({ quantity: "2", unitPrice: "5000.00" })],
      },
      { supplierState: "Maharashtra" },
    );

    expect(totals.cgstMinor).toBe(0);
    expect(totals.sgstMinor).toBe(0);
    expect(totals.igstMinor).toBe(180000);
    expect(totals.totalMinor).toBe(1180000);
    expect(totals.isInterState).toBe(true);
  });

  it("applies a flat tax rate for non-GST jurisdictions", () => {
    const totals = computeInvoiceTotals({
      taxMode: "flat",
      taxRatePercent: 20,
      discount: { type: "none", value: 0 },
      lineItems: [line({ quantity: "1", unitPrice: "100.00" })],
    });

    expect(totals.taxMinor).toBe(2000);
    expect(totals.totalMinor).toBe(12000);
  });

  it("omits tax entirely when the tax mode is none", () => {
    const totals = computeInvoiceTotals({
      taxMode: "none",
      taxRatePercent: 18,
      discount: { type: "none", value: 0 },
      lineItems: [line({ quantity: "1", unitPrice: "100.00" })],
    });

    expect(totals.taxMinor).toBe(0);
    expect(totals.totalMinor).toBe(10000);
  });

  it("applies a percentage discount before tax", () => {
    const totals = computeInvoiceTotals({
      taxMode: "none",
      taxRatePercent: 0,
      discount: { type: "percent", value: 10 },
      lineItems: [line({ quantity: "1", unitPrice: "1000.00" })],
    });

    expect(totals.subtotalMinor).toBe(100000);
    expect(totals.discountMinor).toBe(10000);
    expect(totals.totalMinor).toBe(90000);
  });

  it("caps an amount discount at the subtotal", () => {
    const totals = computeInvoiceTotals({
      taxMode: "none",
      taxRatePercent: 0,
      discount: { type: "amount", value: "5000.00" },
      lineItems: [line({ quantity: "1", unitPrice: "100.00" })],
    });

    expect(totals.discountMinor).toBe(10000);
    expect(totals.totalMinor).toBe(0);
  });

  it("lets a line item override the invoice tax rate", () => {
    const totals = computeInvoiceTotals({
      taxMode: "flat",
      taxRatePercent: 18,
      discount: { type: "none", value: 0 },
      lineItems: [
        line({ quantity: "1", unitPrice: "1000.00" }),
        line({ quantity: "1", unitPrice: "1000.00", taxRatePercent: 5 }),
      ],
    });

    expect(totals.lineItems[0].taxMinor).toBe(18000);
    expect(totals.lineItems[1].taxMinor).toBe(5000);
    expect(totals.taxMinor).toBe(23000);
  });

  it("keeps the discount allocation equal to the requested discount", () => {
    const totals = computeInvoiceTotals({
      taxMode: "none",
      taxRatePercent: 0,
      discount: { type: "percent", value: 33 },
      lineItems: [
        line({ quantity: "1", unitPrice: "33.33" }),
        line({ quantity: "1", unitPrice: "33.33" }),
        line({ quantity: "1", unitPrice: "33.34" }),
      ],
    });

    const allocated = totals.lineItems.reduce((sum, item) => sum + item.discountMinor, 0);
    expect(allocated).toBe(totals.discountMinor);
    expect(totals.totalMinor).toBe(totals.subtotalMinor - totals.discountMinor);
  });
});

describe("allocateDiscount", () => {
  it("returns zeroes when there is nothing to discount", () => {
    expect(allocateDiscount([1000, 2000], 0)).toEqual([0, 0]);
  });

  it("never allocates more than the subtotal", () => {
    const allocation = allocateDiscount([1000, 2000], 99999);
    expect(allocation.reduce((sum, value) => sum + value, 0)).toBe(3000);
  });
});

describe("resolveGstTreatment", () => {
  it("treats matching states as intra-state", () => {
    expect(resolveGstTreatment("Maharashtra", "Maharashtra").isInterState).toBe(false);
    expect(resolveGstTreatment("maharashtra", "Maharashtra").isInterState).toBe(false);
  });

  it("treats a different state as inter-state", () => {
    expect(resolveGstTreatment("Karnataka", "Maharashtra").isInterState).toBe(true);
  });

  it("defaults to intra-state when the place of supply is unknown", () => {
    expect(resolveGstTreatment("", "Maharashtra").isInterState).toBe(false);
  });
});

describe("invoice numbering", () => {
  it("builds a zero padded yearly number", () => {
    expect(buildInvoiceNumber("invoice", 7, new Date("2026-03-15"))).toBe("INV-2026-0007");
    expect(buildInvoiceNumber("bill", 12, new Date("2026-03-15"))).toBe("BILL-2026-0012");
  });

  it("reads the sequence back out of an existing number", () => {
    expect(parseInvoiceSequence("INV-2026-0007", "invoice")).toBe(7);
    expect(parseInvoiceSequence("BILL-2026-0012", "bill")).toBe(12);
    expect(parseInvoiceSequence("CUSTOM-1", "invoice")).toBeNull();
  });
});

describe("amountInWords", () => {
  it("writes an Indian style amount in words", () => {
    // 1,250,000 minor units is Rs 12,500.00
    expect(amountInWords(1250000, "INR")).toBe("Rupees Twelve Thousand Five Hundred Only");
    expect(amountInWords(0, "INR")).toBe("Rupees Zero Only");
    expect(amountInWords(100000, "INR")).toBe("Rupees One Thousand Only");
    // 12,500,000 minor units is Rs 1,25,000.00
    expect(amountInWords(12500000, "INR")).toBe("Rupees One Lakh Twenty Five Thousand Only");
    // 1,234,567,800 minor units is Rs 1,23,45,678.00
    expect(amountInWords(1234567800, "INR")).toBe(
      "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only",
    );
  });
});
