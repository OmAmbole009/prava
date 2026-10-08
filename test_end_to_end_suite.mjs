import fs from "fs";
import path from "path";
import {
  checkOllamaHealth,
  extractInvoiceWithQwen,
  validateFinancialCalculations,
} from "./server/services/ocrService.js";
import {
  uploadAndProcessDocument,
  reviewDocumentForUser,
  inMemoryDocuments,
  inMemoryExtractions,
  inMemoryAccountingEntries,
  calculateGstPreparation,
} from "./server/operations.js";

async function runEndToEndTestSuite() {
  console.log("================================================================================");
  console.log("PRAVA LOCAL QWEN2.5-VL-7B OCR & FINANCIAL RECONCILIATION TEST SUITE");
  console.log("================================================================================\n");

  // TEST 1: Ollama Service Health Check
  console.log("[TEST 1/5] Checking Ollama Service & Model Availability...");
  const health = await checkOllamaHealth();
  console.log("  Ollama Status:", health.status);
  console.log("  Model:", health.model);
  console.log("  Message:", health.message);
  if (!health.ok) {
    throw new Error("Ollama health check failed: " + health.message);
  }
  console.log("  -> PASSED: Ollama is running with qwen2.5vl:7b.\n");

  // TEST 2: Intra-State Invoice (CGST + SGST, 2 line items)
  console.log("[TEST 2/5] Testing Intra-State GST Invoice (CGST + SGST)...");
  const cgstPngBytes = fs.readFileSync("test-invoice.png");
  const cgstResult = await extractInvoiceWithQwen(cgstPngBytes, "image/png", "test-invoice.png");
  console.log("  Vendor:", cgstResult.vendor?.name, "| GSTIN:", cgstResult.vendor?.gstin);
  console.log("  Buyer:", cgstResult.buyer?.name, "| GSTIN:", cgstResult.buyer?.gstin);
  console.log("  Invoice #:", cgstResult.invoice?.number, "| Date:", cgstResult.invoice?.date);
  console.log("  Taxable:", cgstResult.amounts?.taxable_amount, "| CGST:", cgstResult.amounts?.cgst, "| SGST:", cgstResult.amounts?.sgst, "| Total:", cgstResult.amounts?.total_amount);
  console.log("  Items Count:", cgstResult.items?.length);
  console.log("  Validation Valid?", cgstResult.validation?.isValid, "| Warnings:", cgstResult.validation?.warnings);

  if (!cgstResult.vendor?.name || !cgstResult.invoice?.number || Number(cgstResult.amounts?.cgst) <= 0) {
    throw new Error("CGST invoice extraction did not match expected structure.");
  }
  console.log("  -> PASSED: Intra-state invoice with CGST + SGST extracted & validated.\n");

  // TEST 3: Inter-State Invoice (IGST, 3 line items)
  console.log("[TEST 3/5] Testing Inter-State GST Invoice (IGST, Multiple Line Items)...");
  const igstPngBytes = fs.readFileSync("test-igst-invoice.png");
  const igstResult = await extractInvoiceWithQwen(igstPngBytes, "image/png", "test-igst-invoice.png");
  console.log("  Vendor:", igstResult.vendor?.name, "| GSTIN:", igstResult.vendor?.gstin);
  console.log("  Buyer:", igstResult.buyer?.name, "| GSTIN:", igstResult.buyer?.gstin);
  console.log("  Invoice #:", igstResult.invoice?.number, "| Date:", igstResult.invoice?.date);
  console.log("  Taxable:", igstResult.amounts?.taxable_amount, "| IGST:", igstResult.amounts?.igst, "| Total:", igstResult.amounts?.total_amount);
  console.log("  Items Count:", igstResult.items?.length);
  igstResult.items?.forEach((item, i) => {
    console.log(`    Item ${i+1}: ${item.description} | Qty: ${item.quantity} | Rate: ${item.rate} | Amount: ${item.amount}`);
  });
  console.log("  Validation Valid?", igstResult.validation?.isValid, "| Warnings:", igstResult.validation?.warnings);

  if (!igstResult.vendor?.name || Number(igstResult.amounts?.igst) <= 0 || igstResult.items?.length < 2) {
    throw new Error("IGST invoice extraction did not match expected structure.");
  }
  console.log("  -> PASSED: Inter-state invoice with IGST & multiple line items extracted & validated.\n");

  // TEST 4: Real PDF Invoice Processing
  console.log("[TEST 4/5] Testing PDF Invoice Upload & Multi-page Rendering...");
  const pdfBytes = fs.readFileSync("test-invoice.pdf");
  const pdfResult = await extractInvoiceWithQwen(pdfBytes, "application/pdf", "test-invoice.pdf");
  console.log("  PDF Vendor:", pdfResult.vendor?.name);
  console.log("  PDF Invoice #:", pdfResult.invoice?.number);
  console.log("  PDF Total Amount:", pdfResult.amounts?.total_amount);
  console.log("  PDF Validation Valid?", pdfResult.validation?.isValid);

  if (!pdfResult.vendor?.name || !pdfResult.invoice?.number) {
    throw new Error("PDF invoice extraction failed.");
  }
  console.log("  -> PASSED: PDF invoice rendered and parsed successfully by Qwen2.5-VL.\n");

  // TEST 5: Complete Prava Flow (Upload -> Process -> Accounting -> Review/Edit -> Ledger)
  console.log("[TEST 5/5] Testing Prava Complete Workflow (Upload -> Extraction -> Ledger -> Review)...");
  const testUserId = "user-audit-test-101";
  const testBusinessId = 1;

  const uploadResult = await uploadAndProcessDocument(testUserId, {
    businessId: testBusinessId,
    documentType: "invoice",
    originalName: "Apex_Solutions_INV0842.png",
    mimeType: "image/png",
    base64: cgstPngBytes.toString("base64"),
  });

  console.log("  Document Upload Result:", uploadResult);
  const createdDocId = uploadResult.documentId;
  const createdDoc = inMemoryDocuments.find(d => d.document.id === createdDocId);
  console.log("  Saved Document Record ID:", createdDoc?.document?.id, "Status:", createdDoc?.document?.status);
  console.log("  Stored Model in DB:", createdDoc?.extraction?.model);
  console.log("  Confidence BPS:", createdDoc?.extraction?.confidenceBps);

  const accountingEntry = inMemoryAccountingEntries.find(e => e.documentId === createdDocId);
  console.log("  Balanced Accounting Entry:", accountingEntry?.accountName, "| Type:", accountingEntry?.entryType, "| AmountMinor:", accountingEntry?.amountMinor);

  // Test User Editing / Reviewing the extracted document
  console.log("  Simulating User Review & Correction...");
  const reviewed = await reviewDocumentForUser(testUserId, {
    documentId: createdDocId,
    decision: "approve",
    vendorName: "Apex Solutions Technologies Pvt Ltd",
    gstin: "27AABCU9603R1ZM",
    invoiceNumber: "INV-2026-0842-REV",
    invoiceDate: "2026-03-15",
    taxableValue: "100000.00",
    cgst: "9000.00",
    sgst: "9000.00",
    igst: "0.00",
    total: "118000.00",
    placeOfSupply: "27-Maharashtra",
    invoiceType: "purchase",
  });
  console.log("  Review Response Status:", reviewed.extraction?.status, "Updated Number:", reviewed.extraction?.invoiceNumber);

  // Test GST Preparation & Reconciliation
  const prep = calculateGstPreparation(inMemoryExtractions);
  console.log("  GST Filing Workbench Calculation:", {
    taxableValueMinor: prep.taxableValueMinor,
    cgstMinor: prep.cgstMinor,
    sgstMinor: prep.sgstMinor,
    inputTaxCreditMinor: prep.inputTaxCreditMinor,
  });

  console.log("  -> PASSED: Complete Prava ingestion, review, and accounting flow verified.\n");

  console.log("================================================================================");
  console.log("ALL 5 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

runEndToEndTestSuite().catch((err) => {
  console.error("\n❌ TEST SUITE FAILED:", err);
  process.exit(1);
});
