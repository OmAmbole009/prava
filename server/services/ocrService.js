import { Ollama } from "ollama";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let PDFParseClass = null;
try {
  const pdfModule = require("pdf-parse");
  PDFParseClass = pdfModule.PDFParse || pdfModule.default?.PDFParse || null;
} catch {
  // handled gracefully
}

// Configurable environment variables
export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5vl:7b";
const INFERENCE_TIMEOUT_MS = 180000; // 3 minutes timeout for vision model

export const GSTIN_REGEX = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/**
 * Health check to verify Ollama status and model availability
 */
export async function checkOllamaHealth() {
  const cleanUrl = OLLAMA_BASE_URL.replace(/\/$/, "");
  try {
    const res = await fetch(`${cleanUrl}/api/tags`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      return {
        ok: false,
        status: "offline",
        message: "Ollama is not responding. Please make sure Ollama is started.",
      };
    }
    const data = await res.json();
    const models = (data.models || []).map(m => m.name || m.model);
    const targetBase = OLLAMA_MODEL.split(":")[0];
    const isModelInstalled = models.some(m => m === OLLAMA_MODEL || m.startsWith(`${targetBase}:`));

    if (!isModelInstalled) {
      return {
        ok: false,
        status: "model_missing",
        availableModels: models,
        message: `Ollama is running, but ${OLLAMA_MODEL} is not installed. Please run 'ollama pull ${OLLAMA_MODEL}'.`,
      };
    }

    return {
      ok: true,
      status: "ready",
      model: OLLAMA_MODEL,
      availableModels: models,
      message: `Ollama is connected with ${OLLAMA_MODEL}.`,
    };
  } catch (err) {
    if (err.name === "TimeoutError") {
      return {
        ok: false,
        status: "timeout",
        message: "Connection to Ollama timed out. Please check if the Ollama service is responsive.",
      };
    }
    return {
      ok: false,
      status: "unreachable",
      message: "Ollama is not running. Please start Ollama and make sure qwen2.5vl:7b is installed.",
    };
  }
}

/**
 * Renders a PDF buffer into base64 PNG images using Python pypdfium2
 */
export async function renderPdfToImages(pdfBuffer, maxPages = 4) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(process.cwd(), "server", "pdfToImages.py");
    const py = spawn("python", [scriptPath], { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    py.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(`PDF rendering process failed (code ${code}): ${stderr || "Unknown error"}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        if (!parsed.success) {
          return reject(new Error(parsed.error || "Failed to render PDF pages"));
        }
        resolve(parsed.images || []);
      } catch (err) {
        reject(new Error(`Failed to parse PDF renderer output: ${err.message}`));
      }
    });

    py.on("error", (err) => {
      reject(new Error(`Could not spawn Python for PDF rendering: ${err.message}`));
    });

    py.stdin.write(pdfBuffer);
    py.stdin.end();
  });
}

/**
 * Deterministic Financial Validation in JavaScript.
 * Validates model output against statutory rules and mathematical invariants.
 */
export function validateFinancialCalculations(extracted) {
  const warnings = [];
  const errors = [];
  const calculations = {};

  const vendor = extracted.vendor || {};
  const invoice = extracted.invoice || {};
  const buyer = extracted.buyer || {};
  const amounts = extracted.amounts || {};
  const items = Array.isArray(extracted.items) ? extracted.items : [];

  // 1. Mandatory Field Checks
  if (!vendor.name || typeof vendor.name !== "string" || !vendor.name.trim()) {
    warnings.push("Vendor name was not detected on the invoice.");
  }
  if (!invoice.number || typeof invoice.number !== "string" || !invoice.number.trim()) {
    warnings.push("Invoice number was not detected.");
  }
  if (!invoice.date) {
    warnings.push("Invoice date was not detected.");
  }
  if (amounts.total_amount === null || amounts.total_amount === undefined) {
    errors.push("Invoice total amount is missing.");
  }

  // 2. GSTIN Format Validations
  if (vendor.gstin) {
    const cleanVendorGstin = vendor.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(cleanVendorGstin)) {
      warnings.push(`Vendor GSTIN format (${vendor.gstin}) does not match the statutory 15-character GSTIN pattern.`);
    }
  }
  if (buyer.gstin) {
    const cleanBuyerGstin = buyer.gstin.trim().toUpperCase();
    if (!GSTIN_REGEX.test(cleanBuyerGstin)) {
      warnings.push(`Buyer GSTIN format (${buyer.gstin}) does not match the statutory 15-character GSTIN pattern.`);
    }
  }

  // 3. Line Items Validation: quantity * rate ≈ amount
  let computedItemsTaxableTotal = 0;
  items.forEach((item, index) => {
    const idx = index + 1;
    const desc = item.description || `Item #${idx}`;
    const qty = item.quantity;
    const rate = item.rate;
    const amt = item.amount;

    if (typeof qty === "number" && typeof rate === "number" && typeof amt === "number") {
      const expected = Math.round(qty * rate * 100) / 100;
      const diff = Math.abs(expected - amt);
      if (diff > 0.05) {
        warnings.push(`Line item "${desc}": calculated amount (qty: ${qty} × rate: ${rate} = ₹${expected.toFixed(2)}) differs from item amount (₹${amt.toFixed(2)}).`);
      }
    }

    if (typeof amt === "number") {
      computedItemsTaxableTotal += amt;
    }
  });

  calculations.computedItemsTaxableTotal = Math.round(computedItemsTaxableTotal * 100) / 100;

  // 4. Tax Summation Check: CGST + SGST + IGST = total_tax
  const cgst = typeof amounts.cgst === "number" ? amounts.cgst : 0;
  const sgst = typeof amounts.sgst === "number" ? amounts.sgst : 0;
  const igst = typeof amounts.igst === "number" ? amounts.igst : 0;
  const computedTotalTax = Math.round((cgst + sgst + igst) * 100) / 100;
  calculations.computedTotalTax = computedTotalTax;

  if (amounts.total_tax !== null && amounts.total_tax !== undefined) {
    const reportedTotalTax = Number(amounts.total_tax);
    if (!isNaN(reportedTotalTax)) {
      const taxDiff = Math.abs(computedTotalTax - reportedTotalTax);
      if (taxDiff > 0.10) {
        warnings.push(`Total tax discrepancy: CGST (₹${cgst.toFixed(2)}) + SGST (₹${sgst.toFixed(2)}) + IGST (₹${igst.toFixed(2)}) = ₹${computedTotalTax.toFixed(2)}, which does not match reported total tax of ₹${reportedTotalTax.toFixed(2)}.`);
      }
    }
  }

  // 5. Grand Total Summation Check: subtotal/taxable + taxes - discount ≈ total_amount
  const taxableBase = typeof amounts.taxable_amount === "number"
    ? amounts.taxable_amount
    : (typeof amounts.subtotal === "number" ? amounts.subtotal : (computedItemsTaxableTotal > 0 ? computedItemsTaxableTotal : null));

  const discount = typeof amounts.discount === "number" ? amounts.discount : 0;
  const taxesToAdd = amounts.total_tax !== null && amounts.total_tax !== undefined ? Number(amounts.total_tax) : computedTotalTax;

  if (taxableBase !== null && amounts.total_amount !== null && amounts.total_amount !== undefined) {
    const expectedGrandTotal = Math.round((taxableBase + taxesToAdd - discount) * 100) / 100;
    calculations.expectedGrandTotal = expectedGrandTotal;
    const reportedGrandTotal = Number(amounts.total_amount);
    const grandDiff = Math.abs(expectedGrandTotal - reportedGrandTotal);

    if (grandDiff > 1.0) {
      warnings.push(`Grand total mismatch: taxable base (₹${taxableBase.toFixed(2)}) + tax (₹${taxesToAdd.toFixed(2)}) - discount (₹${discount.toFixed(2)}) = ₹${expectedGrandTotal.toFixed(2)}, but invoice states ₹${reportedGrandTotal.toFixed(2)}.`);
    }
  }

  // 6. State Code & Inter-State vs Intra-State Audit
  if (vendor.gstin && buyer.gstin) {
    const vendorState = vendor.gstin.slice(0, 2);
    const buyerState = buyer.gstin.slice(0, 2);
    const isInterState = vendorState !== buyerState;

    if (isInterState && (cgst > 0 || sgst > 0) && igst === 0) {
      warnings.push(`Inter-state transaction detected (Supplier: State ${vendorState}, Buyer: State ${buyerState}), but CGST/SGST was charged instead of IGST.`);
    } else if (!isInterState && igst > 0 && cgst === 0 && sgst === 0) {
      warnings.push(`Intra-state transaction detected (Both parties in State ${vendorState}), but IGST was charged instead of CGST + SGST.`);
    }
  }

  return {
    isValid: errors.length === 0 && warnings.length === 0,
    hasErrors: errors.length > 0,
    errors,
    warnings,
    calculations,
  };
}

/**
 * Formulates the extraction prompt according to Phase 6 requirements
 */
function buildExtractionPrompt() {
  return `You are an expert tax accountant and OCR extraction engine for Indian GST and commercial invoices.
Analyze this document image thoroughly, automatically determine the document type (invoice, credit note, debit note, bill of supply, receipt), and extract all information into strict JSON format with this exact schema:

{
  "document_type": "invoice",
  "document_subtype": null,
  "original_invoice_ref": {
    "number": null,
    "date": null
  },
  "note_reason": null,
  "vendor": {
    "name": null,
    "gstin": null,
    "address": null
  },
  "invoice": {
    "number": null,
    "date": null,
    "due_date": null
  },
  "buyer": {
    "name": null,
    "gstin": null,
    "address": null
  },
  "amounts": {
    "subtotal": null,
    "discount": null,
    "taxable_amount": null,
    "cgst": null,
    "sgst": null,
    "igst": null,
    "total_tax": null,
    "total_amount": null
  },
  "items": [
    {
      "description": null,
      "hsn_sac": null,
      "quantity": null,
      "unit": null,
      "rate": null,
      "tax_rate": null,
      "tax_amount": null,
      "amount": null
    }
  ]
}

STRICT EXTRACTION RULES:
1. Return ONLY the raw JSON object matching the exact structure above. No markdown code blocks, no explanation.
2. Determine "document_type" accurately:
   - "credit_note": if titled Credit Note, Section 34 Credit Memo, or credit adjustment.
   - "debit_note": if titled Debit Note or debit memo.
   - "bill": if titled Bill of Supply (under Section 31(3)(c)), Utility Bill, Expense Bill, or Cash Bill.
   - "receipt": if titled Payment Receipt, Cash Receipt, or Voucher.
   - "invoice": for Tax Invoice, Commercial Invoice, or Proforma Invoice.
3. If document is a credit note or debit note, extract the original invoice reference number & date into "original_invoice_ref".
4. Use null when information is not visible or cannot be determined.
5. NEVER invent, hallucinate, or guess values.
6. All amount and numeric fields MUST be numbers (e.g. 50000 or 50000.00) or null, NEVER strings with currency symbols.
7. Extract every line item in the items array with its description, HSN/SAC, quantity, unit, rate, and amount.
8. The invoice date should be normalized to YYYY-MM-DD or DD-MM-YYYY format as printed.`;
}

/**
 * Main Service: Extracts invoice data using locally running Ollama Qwen2.5-VL-7B
 * Followed by deterministic financial validation in JavaScript.
 */
export async function extractInvoiceWithQwen(bytes, mimeType, originalName = "", business = null) {
  // Step 1: Health check on Ollama
  const health = await checkOllamaHealth();
  if (!health.ok) {
    throw new Error(health.message);
  }

  if (!bytes || bytes.length === 0) {
    throw new Error("Invalid document: file content is empty.");
  }

  // Step 2: Prepare images for Qwen2.5-VL
  let imageBuffers = [];

  if (mimeType === "application/pdf" || originalName.toLowerCase().endsWith(".pdf")) {
    try {
      const renderedB64List = await renderPdfToImages(bytes);
      if (renderedB64List.length > 0) {
        imageBuffers = renderedB64List.map(b64 => Buffer.from(b64, "base64"));
      }
    } catch (err) {
      console.warn("[OCRService] PDF rendering warning:", err.message);
      // If PDF rendering had an issue, check if it's a corrupt PDF
      if (err.message.includes("PDF") || err.message.includes("code")) {
        throw new Error(`PDF processing error: The file "${originalName}" could not be rendered. It may be corrupt or encrypted.`);
      }
    }
  } else if (["image/jpeg", "image/png", "image/webp"].includes(mimeType) || /\.(png|jpe?g|webp)$/i.test(originalName)) {
    imageBuffers = [bytes];
  } else {
    throw new Error(`Unsupported file type: ${mimeType || originalName}. Please upload a PDF, PNG, JPG, or WebP invoice.`);
  }

  if (imageBuffers.length === 0) {
    throw new Error(`Could not extract any processable image pages from "${originalName}".`);
  }

  // Step 3: Invoke Ollama Qwen2.5-VL
  const ollama = new Ollama({ host: OLLAMA_BASE_URL });
  const prompt = buildExtractionPrompt();

  let response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

    // Limit to first 3 pages if long PDF
    const imagesToSend = imageBuffers.slice(0, 3);

    response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
          images: imagesToSend,
        },
      ],
      format: "json",
      stream: false,
    });

    clearTimeout(timeout);
  } catch (err) {
    if (err.name === "AbortError" || err.message?.includes("abort")) {
      throw new Error(`Model extraction timed out after ${INFERENCE_TIMEOUT_MS / 1000} seconds. The document might be too large or the GPU is under heavy load.`);
    }
    if (err.code === "ECONNREFUSED" || err.message?.includes("ECONNREFUSED")) {
      throw new Error("Ollama is not running. Please start Ollama and make sure qwen2.5vl:7b is installed.");
    }
    throw new Error(`Ollama model inference failed: ${err.message}`);
  }

  const rawContent = response?.message?.content;
  if (!rawContent || typeof rawContent !== "string") {
    throw new Error("Qwen2.5-VL model returned an empty response.");
  }

  // Step 4: Parse JSON
  let structuredData;
  try {
    let cleanJson = rawContent.trim();
    if (cleanJson.startsWith("```")) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    }
    structuredData = JSON.parse(cleanJson);
  } catch (err) {
    console.error("[OCRService] Malformed JSON from model:", rawContent);
    throw new Error(`Model returned malformed JSON: ${err.message}. Raw output could not be parsed.`);
  }

  // Ensure default structures
  structuredData.vendor = structuredData.vendor || { name: null, gstin: null, address: null };
  structuredData.invoice = structuredData.invoice || { number: null, date: null, due_date: null };
  structuredData.buyer = structuredData.buyer || { name: null, gstin: null, address: null };
  structuredData.amounts = structuredData.amounts || {
    subtotal: null,
    discount: null,
    taxable_amount: null,
    cgst: null,
    sgst: null,
    igst: null,
    total_tax: null,
    total_amount: null,
  };
  structuredData.items = Array.isArray(structuredData.items) ? structuredData.items : [];

  // Step 5: Deterministic Financial Validation
  const validation = validateFinancialCalculations(structuredData);

  // Step 6: Determine Direction (Sales vs Purchase) relative to current business
  let invoiceType = "purchase";
  const bizGstin = business?.gstin?.toUpperCase().trim() || "";
  const bizName = business?.name?.toUpperCase().trim() || "";

  const vendorName = (structuredData.vendor.name || "").toUpperCase();
  const buyerName = (structuredData.buyer.name || "").toUpperCase();
  const vendorGstin = (structuredData.vendor.gstin || "").toUpperCase();
  const buyerGstin = (structuredData.buyer.gstin || "").toUpperCase();

  if (bizGstin && buyerGstin && bizGstin === buyerGstin) {
    invoiceType = "purchase";
  } else if (bizGstin && vendorGstin && bizGstin === vendorGstin) {
    invoiceType = "sales";
  } else if (bizName && buyerName.includes(bizName)) {
    invoiceType = "purchase";
  } else if (bizName && vendorName.includes(bizName)) {
    invoiceType = "sales";
  }

  // Step 7: Place of Supply
  let placeOfSupply = "27-Maharashtra";
  if (vendorGstin && vendorGstin.length >= 2) {
    const stateCode = vendorGstin.slice(0, 2);
    placeOfSupply = `${stateCode}-State`;
  }

  return {
    ...structuredData,
    invoiceType,
    placeOfSupply,
    validation,
    model: OLLAMA_MODEL,
    rawOutput: rawContent,
  };
}

export default {
  OLLAMA_BASE_URL,
  OLLAMA_MODEL,
  checkOllamaHealth,
  renderPdfToImages,
  validateFinancialCalculations,
  extractInvoiceWithQwen,
};
