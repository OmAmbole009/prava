import express from "express";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { inMemoryIssuedInvoices } from "./issuedInvoices.js";
import { invoicesRouter } from "./routes/invoices.js";

const USER_ID = 1;
const BUSINESS_ID = 1;

let server;
let baseUrl;

function createApp() {
  const app = express();
  app.use(express.json());
  // The real app authenticates before the router, so mirror that here.
  app.use((req, _res, next) => {
    req.user = { id: USER_ID, role: "owner" };
    next();
  });
  app.use("/api/invoices", invoicesRouter);
  return app;
}

async function call(method, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

function buildPayload(overrides = {}) {
  return {
    businessId: BUSINESS_ID,
    documentKind: "invoice",
    invoiceDate: "2026-03-15",
    status: "issued",
    currency: "INR",
    taxMode: "gst",
    taxRatePercent: 18,
    party: { name: "Apex Solutions Pvt Ltd", placeOfSupply: "Maharashtra" },
    lineItems: [{ description: "Consulting", quantity: "1", unitPrice: "1000.00" }],
    discount: { type: "none", value: 0 },
    ...overrides,
  };
}

beforeAll(async () => {
  const app = createApp();
  await new Promise(resolve => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(async () => {
  await new Promise(resolve => server.close(resolve));
});

beforeEach(() => {
  inMemoryIssuedInvoices.length = 0;
});

describe("issued invoice routes", () => {
  it("creates, lists and downloads a document", async () => {
    const created = await call("POST", "/api/invoices/issued", buildPayload());
    expect(created.status).toBe(201);
    expect(created.payload.data.invoiceNumber).toMatch(/^INV-\d{4}-0001$/);
    expect(created.payload.data.totalMinor).toBe(118000);

    const listed = await call("GET", `/api/invoices/issued?businessId=${BUSINESS_ID}`);
    expect(listed.status).toBe(200);
    expect(listed.payload.data).toHaveLength(1);

    const pdf = await call("GET", `/api/invoices/issued/${created.payload.data.id}/pdf`);
    expect(pdf.status).toBe(200);
    expect(pdf.payload.data.mimeType).toBe("application/pdf");
    expect(pdf.payload.data.content.length).toBeGreaterThan(100);
  });

  it("does not mistake the issued routes for a document id", async () => {
    const listed = await call("GET", `/api/invoices/issued?businessId=${BUSINESS_ID}`);
    expect(listed.status).toBe(200);
    expect(Array.isArray(listed.payload.data)).toBe(true);
  });

  it("updates and deletes a document", async () => {
    const created = await call("POST", "/api/invoices/issued", buildPayload());
    const id = created.payload.data.id;

    const updated = await call("PUT", `/api/invoices/issued/${id}`, {
      businessId: BUSINESS_ID,
      status: "paid",
      notes: "Settled.",
    });
    expect(updated.status).toBe(200);
    expect(updated.payload.data.status).toBe("paid");
    expect(updated.payload.data.notes).toBe("Settled.");

    const removed = await call("DELETE", `/api/invoices/issued/${id}`);
    expect(removed.status).toBe(200);
    expect(removed.payload.data.success).toBe(true);

    const missing = await call("GET", `/api/invoices/issued/${id}`);
    expect(missing.status).toBe(404);
  });

  it("rejects an invalid payload with a readable message", async () => {
    const response = await call("POST", "/api/invoices/issued", {
      businessId: BUSINESS_ID,
      invoiceDate: "2026-03-15",
      party: { name: "Apex" },
      lineItems: [],
    });
    expect(response.status).toBe(400);
    expect(response.payload.error.message).toBeTruthy();
  });

  it("filters the list by document kind", async () => {
    await call("POST", "/api/invoices/issued", buildPayload({ documentKind: "invoice" }));
    await call("POST", "/api/invoices/issued", buildPayload({ documentKind: "bill" }));

    const bills = await call("GET", `/api/invoices/issued?businessId=${BUSINESS_ID}&documentKind=bill`);
    expect(bills.payload.data).toHaveLength(1);
    expect(bills.payload.data[0].documentKind).toBe("bill");
  });
});
