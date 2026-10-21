import { beforeEach, describe, expect, it } from "vitest";
import { issuedInvoiceInputSchema } from "./invoiceBuilder.js";
import {
  createIssuedInvoice,
  deleteIssuedInvoice,
  getIssuedInvoice,
  inMemoryIssuedInvoices,
  listIssuedInvoices,
  renderIssuedInvoicePdf,
  updateIssuedInvoice,
} from "./issuedInvoices.js";

const USER_ID = 1;
const BUSINESS_ID = 1;

function buildInput(overrides = {}) {
  return issuedInvoiceInputSchema.parse({
    businessId: BUSINESS_ID,
    documentKind: "invoice",
    invoiceDate: "2026-03-15",
    dueDate: "2026-04-14",
    status: "issued",
    currency: "INR",
    taxMode: "gst",
    taxRatePercent: 18,
    party: {
      name: "Apex Solutions Pvt Ltd",
      email: "accounts@apexsolutions.in",
      phone: "+91 98200 98765",
      addressLine1: "402, Business Hub, BKC",
      city: "Mumbai",
      state: "Maharashtra",
      postalCode: "400051",
      country: "IN",
      taxId: "27AABCU9603R1ZM",
      placeOfSupply: "Maharashtra",
    },
    lineItems: [
      {
        description: "Cloud Infrastructure Consulting",
        hsnSac: "998313",
        unit: "hrs",
        quantity: "2",
        unitPrice: "5000.00",
      },
    ],
    discount: { type: "none", value: 0 },
    notes: "Thank you for your business.",
    terms: "Payment is due within 30 days.",
    ...overrides,
  });
}

beforeEach(() => {
  inMemoryIssuedInvoices.length = 0;
});

describe("issued invoices", () => {
  it("creates an invoice with sequential numbering and correct GST split", async () => {
    const created = await createIssuedInvoice(USER_ID, buildInput());

    expect(created.invoiceNumber).toMatch(/^INV-\d{4}-0001$/);
    expect(created.documentKind).toBe("invoice");
    expect(created.subtotalMinor).toBe(1000000);
    expect(created.cgstMinor).toBe(90000);
    expect(created.sgstMinor).toBe(90000);
    expect(created.igstMinor).toBe(0);
    expect(created.taxMinor).toBe(180000);
    expect(created.totalMinor).toBe(1180000);
  });

  it("numbers invoices and bills on separate sequences", async () => {
    await createIssuedInvoice(USER_ID, buildInput());
    await createIssuedInvoice(USER_ID, buildInput({ documentKind: "bill" }));
    const second = await createIssuedInvoice(USER_ID, buildInput());

    const documents = await listIssuedInvoices(USER_ID, BUSINESS_ID);
    const numbers = documents.map(item => item.invoiceNumber).sort();
    expect(numbers).toEqual(["BILL-2026-0001", "INV-2026-0001", "INV-2026-0002"]);
  });

  it("keeps the discount when a document is edited without resending it", async () => {
    const created = await createIssuedInvoice(
      USER_ID,
      buildInput({ discount: { type: "percent", value: 10 } }),
    );

    expect(created.discountMinor).toBe(100000);
    expect(created.discountType).toBe("percent");
    expect(created.discountValue).toBe("10");
    // Tax is charged on the discounted value: 900000 + 18% of 900000.
    expect(created.taxMinor).toBe(162000);
    expect(created.totalMinor).toBe(1062000);

    const updated = await updateIssuedInvoice(USER_ID, created.id, {
      notes: "Payment received in full.",
    });

    expect(updated.discountType).toBe("percent");
    expect(updated.discountValue).toBe("10");
    expect(updated.discountMinor).toBe(100000);
    expect(updated.totalMinor).toBe(1062000);
    expect(updated.notes).toBe("Payment received in full.");
  });

  it("recomputes the totals when the discount changes", async () => {
    const created = await createIssuedInvoice(
      USER_ID,
      buildInput({ discount: { type: "percent", value: 10 } }),
    );

    const updated = await updateIssuedInvoice(USER_ID, created.id, {
      discount: { type: "amount", value: 2000 },
    });

    expect(updated.discountType).toBe("amount");
    expect(updated.discountValue).toBe("2000");
    expect(updated.discountMinor).toBe(200000);
    expect(updated.totalMinor).toBe(944000);
  });

  it("switches to IGST when the place of supply is another state", async () => {
    const created = await createIssuedInvoice(
      USER_ID,
      buildInput({
        party: {
          name: "Karnataka Traders",
          placeOfSupply: "Karnataka",
        },
      }),
    );

    expect(created.igstMinor).toBe(180000);
    expect(created.cgstMinor).toBe(0);
    expect(created.sgstMinor).toBe(0);
  });

  it("lists, reads and deletes a workspace document", async () => {
    const created = await createIssuedInvoice(USER_ID, buildInput());

    const listed = await listIssuedInvoices(USER_ID, BUSINESS_ID);
    expect(listed).toHaveLength(1);

    const fetched = await getIssuedInvoice(USER_ID, created.id);
    expect(fetched.id).toBe(created.id);
    expect(fetched.partyName).toBe("Apex Solutions Pvt Ltd");

    await deleteIssuedInvoice(USER_ID, created.id);
    await expect(getIssuedInvoice(USER_ID, created.id)).rejects.toThrow(/not found/i);
  });

  it("refuses a document number that already exists in the workspace", async () => {
    await createIssuedInvoice(USER_ID, buildInput({ invoiceNumber: "INV-CUSTOM-1" }));

    await expect(
      createIssuedInvoice(USER_ID, buildInput({ invoiceNumber: "INV-CUSTOM-1" })),
    ).rejects.toThrow(/already exists/i);
  });

  it("renders a downloadable PDF for a saved document", async () => {
    const created = await createIssuedInvoice(USER_ID, buildInput());
    const pdf = await renderIssuedInvoicePdf(USER_ID, created.id);

    expect(pdf.mimeType).toBe("application/pdf");
    expect(pdf.filename).toBe(`Invoice_${created.invoiceNumber}.pdf`);

    const buffer = Buffer.from(pdf.content, "base64");
    expect(buffer.subarray(0, 8).toString("latin1")).toBe("%PDF-1.4");
    expect(buffer.subarray(-6).toString("latin1").trim()).toBe("%%EOF");
  });

  it("blocks a user who does not own the workspace", async () => {
    const created = await createIssuedInvoice(USER_ID, buildInput());

    await expect(getIssuedInvoice(99, created.id)).rejects.toThrow(/do not have access/i);
  });
});
