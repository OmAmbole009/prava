import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import {
  actionItems,
  businesses,
  businessMembers,
  documentExtractions,
  documents,
  financialSummaries,
  gstPreparations,
  gstSubmissionRequests,
  operationalTasks,
  reconciliationItems,
  reviewRequests,
} from "../drizzle/schema.js";
import { invokeLLM } from "./_core/llm.js";
import { getDb } from "./db.js";
import { formatMinorAmount } from "../shared/locale.js";
import { buildCaAdvisoryResponse, retrieveCaKnowledgeAsync } from "./caRag.js";
import { searchBusinessDocumentsRag } from "./weaviateVectorDb.js";
import { evaluateQueryScope, buildOutOfScopeResponse, buildGreetingResponse } from "./guardrails.js";

export const askPravaInputSchema = z.object({
  businessId: z.number().int().positive(),
  message: z.string().min(1).max(2000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .optional(),
});

async function verifyWorkspaceAccess(userId, businessId) {
  const db = await getDb();
  if (!db) {
    return {
      businessId,
      name: "Prava Technologies Private Limited",
      currency: "INR",
      locale: "en-IN",
      taxSystem: "GST & Indian Direct Tax",
      gstin: "27AABCP8821F1Z2",
      role: "owner",
    };
  }

  const member = await db
    .select({
      businessId: businesses.id,
      name: businesses.name,
      currency: businesses.currency,
      locale: businesses.locale,
      taxSystem: businesses.taxSystem,
      gstin: businesses.gstin,
      role: businessMembers.role,
    })
    .from(businessMembers)
    .innerJoin(businesses, eq(businessMembers.businessId, businesses.id))
    .where(
      and(
        eq(businessMembers.userId, userId),
        eq(businesses.id, businessId)
      )
    )
    .limit(1);

  if (!member[0]) {
    throw new Error("You do not have access to this workspace.");
  }
  return member[0];
}

export function parseInvoiceDetails(doc, extraction, fmt) {
  let parsed = {};
  if (extraction?.extractedData) {
    try {
      parsed = typeof extraction.extractedData === "string" ? JSON.parse(extraction.extractedData) : extraction.extractedData;
    } catch {}
  }

  const totalMinor = extraction?.totalMinor ?? (parsed.total ? Math.round(parseFloat(parsed.total) * 100) : 0);
  const taxableMinor = extraction?.taxableValueMinor ?? (parsed.taxableValue ? Math.round(parseFloat(parsed.taxableValue) * 100) : 0);
  const cgstMinor = extraction?.cgstMinor ?? (parsed.cgst ? Math.round(parseFloat(parsed.cgst) * 100) : 0);
  const sgstMinor = extraction?.sgstMinor ?? (parsed.sgst ? Math.round(parseFloat(parsed.sgst) * 100) : 0);
  const igstMinor = extraction?.igstMinor ?? (parsed.igst ? Math.round(parseFloat(parsed.igst) * 100) : 0);
  const totalGstMinor = cgstMinor + sgstMinor + igstMinor;

  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
  const lineItems = rawItems.map((item, idx) => ({
    name: item.name || item.description || item.item || `Line Item ${idx + 1}`,
    quantity: item.qty ?? item.quantity ?? 1,
    unitPrice: item.rate ?? item.unitPrice ?? null,
    amount: item.amount ?? null,
    hsn: item.hsn ?? null,
  }));

  const invoiceNumber = extraction?.invoiceNumber || parsed.invoiceNumber || `DOC-${doc.id}`;
  const vendorName = extraction?.vendorName || parsed.vendorName || "Commercial Document";
  const buyerName = parsed.buyerName || null;
  const invoiceDate = extraction?.invoiceDate ? new Date(extraction.invoiceDate).toLocaleDateString("en-IN") : (parsed.invoiceDate || "Not recorded");

  return {
    id: doc.id,
    originalName: doc.originalName,
    documentType: doc.documentType || parsed.documentType || "invoice",
    status: doc.status || extraction?.status || "extracted",
    invoiceNumber,
    invoiceDate,
    invoiceType: extraction?.invoiceType || parsed.invoiceType || "purchase",
    vendorName,
    vendorGstin: extraction?.gstin || parsed.gstin || null,
    buyerName,
    placeOfSupply: extraction?.placeOfSupply || parsed.placeOfSupply || null,
    taxableFormatted: fmt(taxableMinor),
    cgstFormatted: fmt(cgstMinor),
    sgstFormatted: fmt(sgstMinor),
    igstFormatted: fmt(igstMinor),
    totalGstFormatted: fmt(totalGstMinor),
    totalFormatted: fmt(totalMinor),
    totalMinor,
    lineItems,
  };
}

export async function getLiveWorkspaceContext(userId, businessId) {
  const workspace = await verifyWorkspaceAccess(userId, businessId);
  const db = await getDb();

  const fmt = (minor) =>
    formatMinorAmount(minor, workspace.currency, workspace.locale);

  if (!db) {
    const { inMemoryAccountingEntries, inMemoryActionItems, inMemoryDocuments, inMemoryTasks } = await import("./operations.js");
    const { buildAccountsReceivable, buildAccountsPayable } = await import("./arApEngine.js");
    const { getDashboardIntelligence } = await import("./intelligenceEngine.js");

    const entries = inMemoryAccountingEntries.filter(e => e.businessId === businessId);
    let revenueMinor = 0;
    let expensesMinor = 0;
    for (const e of entries) {
      if (e.category === "revenue" || e.entryType === "credit") revenueMinor += (e.amountMinor || 0);
      else expensesMinor += (e.amountMinor || 0);
    }

    const bizDocs = inMemoryDocuments.filter(d => d.document.businessId === businessId);
    const extractions = bizDocs.filter(d => d.extraction);
    if (revenueMinor === 0 && expensesMinor === 0 && extractions.length > 0) {
      for (const d of extractions) {
        const amt = d.extraction.totalMinor || (d.extraction.taxableValueMinor || 0);
        if (d.extraction.invoiceType === "sales") revenueMinor += amt;
        else if (d.extraction.invoiceType === "purchase") expensesMinor += amt;
      }
    }

    let outputGstMinor = 0;
    let inputGstMinor = 0;
    for (const d of extractions) {
      const gst = (d.extraction.cgstMinor || 0) + (d.extraction.sgstMinor || 0) + (d.extraction.igstMinor || 0);
      if (d.extraction.invoiceType === "sales") outputGstMinor += gst;
      else if (d.extraction.invoiceType === "purchase") inputGstMinor += gst;
    }
    const gstPositionMinor = outputGstMinor - inputGstMinor;

    const ar = buildAccountsReceivable(extractions);
    const ap = buildAccountsPayable(extractions);
    const receivablesMinor = ar.totalOutstandingMinor;
    const payablesMinor = ap.totalOutstandingMinor;
    const cashMinor = Math.max(0, revenueMinor - expensesMinor);

    let intel = null;
    try {
      intel = await getDashboardIntelligence(businessId);
    } catch {
      // ignore
    }

    const bizActions = inMemoryActionItems.filter(a => a.businessId === businessId && a.status === "open");
    const bizTasks = inMemoryTasks.filter(t => t.businessId === businessId);

    // If current business has documents use those, otherwise use inMemoryDocuments
    const allCandidateDocs = bizDocs.length > 0 ? bizDocs : inMemoryDocuments;
    const parsedInvoices = allCandidateDocs.map(d => parseInvoiceDetails(d.document, d.extraction, fmt));

    return {
      workspace,
      intelligence: intel,
      financials: {
        revenueMinor,
        revenueFormatted: fmt(revenueMinor),
        expensesMinor,
        expensesFormatted: fmt(expensesMinor),
        cashMinor,
        cashFormatted: fmt(cashMinor),
        gstPositionMinor,
        gstPositionFormatted: fmt(gstPositionMinor),
        receivablesMinor,
        receivablesFormatted: fmt(receivablesMinor),
        payablesMinor,
        payablesFormatted: fmt(payablesMinor),
      },
      openActions: bizActions.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        documentId: a.documentId,
        taskId: a.taskId,
        type: a.type,
        priority: a.priority,
      })),
      recentDocuments: bizDocs.slice(0, 10).map(d => ({
        id: d.document.id,
        originalName: d.document.originalName,
        documentType: d.document.documentType,
        status: d.document.status,
        vendorName: d.extraction?.vendorName || "Commercial Document",
        invoiceNumber: d.extraction?.invoiceNumber || `DOC-${d.document.id}`,
        totalMinor: d.extraction?.totalMinor || 0,
        totalFormatted: fmt(d.extraction?.totalMinor || 0),
        invoiceType: d.extraction?.invoiceType || "purchase",
      })),
      invoices: parsedInvoices,
      tasks: bizTasks.map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        status: t.status,
        requiresProfessionalReview: t.requiresProfessionalReview,
      })),
      gstPreparation: {
        status: bizTasks[0]?.status || "fresh",
        salesFormatted: fmt(revenueMinor),
        estimatedTaxFormatted: fmt(gstPositionMinor),
        inputTaxCreditFormatted: fmt(Math.round(expensesMinor * 0.18)),
      },
    };
  }

  // 1. Live financial summary
  const summary = await db
    .select()
    .from(financialSummaries)
    .where(
      and(
        eq(financialSummaries.businessId, businessId),
        eq(financialSummaries.calculationStatus, "verified")
      )
    )
    .orderBy(desc(financialSummaries.periodEnd), desc(financialSummaries.calculatedAt))
    .limit(1);

  const rawSummary = summary[0];

  // 2. Open action items
  const openActions = await db
    .select({
      id: actionItems.id,
      title: actionItems.title,
      description: actionItems.description,
      priority: actionItems.priority,
      documentId: actionItems.documentId,
      taskId: actionItems.taskId,
      type: actionItems.type,
    })
    .from(actionItems)
    .where(
      and(
        eq(actionItems.businessId, businessId),
        eq(actionItems.status, "open")
      )
    )
    .orderBy(desc(actionItems.createdAt))
    .limit(10);

  // 3. Recent documents with extractions
  const recentDocs = await db
    .select({
      id: documents.id,
      originalName: documents.originalName,
      documentType: documents.documentType,
      status: documents.status,
      vendorName: documentExtractions.vendorName,
      invoiceNumber: documentExtractions.invoiceNumber,
      invoiceDate: documentExtractions.invoiceDate,
      totalMinor: documentExtractions.totalMinor,
      invoiceType: documentExtractions.invoiceType,
      extractedData: documentExtractions.extractedData,
    })
    .from(documents)
    .leftJoin(documentExtractions, eq(documents.id, documentExtractions.documentId))
    .where(eq(documents.businessId, businessId))
    .orderBy(desc(documents.createdAt))
    .limit(20);

  // 4. Tasks
  const tasks = await db
    .select()
    .from(operationalTasks)
    .where(eq(operationalTasks.businessId, businessId))
    .orderBy(desc(operationalTasks.updatedAt))
    .limit(10);

  // 5. GST Preparations
  const gstPrep = await db
    .select()
    .from(gstPreparations)
    .where(eq(gstPreparations.businessId, businessId))
    .orderBy(desc(gstPreparations.updatedAt))
    .limit(1);

  // 6. Reconciliation items
  const recons = await db
    .select()
    .from(reconciliationItems)
    .where(eq(reconciliationItems.businessId, businessId))
    .orderBy(desc(reconciliationItems.createdAt))
    .limit(15);

  const financials = {
    revenueMinor: rawSummary?.revenueMinor ?? 0,
    revenueFormatted: fmt(rawSummary?.revenueMinor ?? 0),
    expensesMinor: rawSummary?.expensesMinor ?? 0,
    expensesFormatted: fmt(rawSummary?.expensesMinor ?? 0),
    cashMinor: rawSummary?.cashMinor ?? 0,
    cashFormatted: fmt(rawSummary?.cashMinor ?? 0),
    gstPositionMinor: rawSummary?.gstPositionMinor ?? 0,
    gstPositionFormatted: fmt(rawSummary?.gstPositionMinor ?? 0),
    receivablesMinor: rawSummary?.receivablesMinor ?? 0,
    receivablesFormatted: fmt(rawSummary?.receivablesMinor ?? 0),
    payablesMinor: rawSummary?.payablesMinor ?? 0,
    payablesFormatted: fmt(rawSummary?.payablesMinor ?? 0),
  };

  const dbInvoices = recentDocs.map((doc) => parseInvoiceDetails(doc, doc, fmt));

  return {
    workspace,
    financials,
    openActions,
    recentDocuments: recentDocs.map((doc) => ({
      ...doc,
      totalFormatted: doc.totalMinor ? fmt(doc.totalMinor) : "Not set",
    })),
    invoices: dbInvoices,
    tasks,
    gstPreparation: gstPrep[0]
      ? {
          status: gstPrep[0].status,
          salesFormatted: fmt(gstPrep[0].salesMinor),
          estimatedTaxFormatted: fmt(gstPrep[0].netTaxPositionMinor),
          inputTaxCreditFormatted: fmt(gstPrep[0].inputTaxCreditMinor),
        }
      : null,
    reconciliationItems: recons,
  };
}

export async function askPrava(userId, input) {
  const context = await getLiveWorkspaceContext(userId, input.businessId);

  // Guardrail check: Pre-screen whether the question is within Prava's financial/business scope
  const scopeEval = evaluateQueryScope(input.message);
  if (scopeEval.isGreeting) {
    const greetingRes = buildGreetingResponse(context.workspace);
    return {
      ...greetingRes,
      dataSnapshot: {
        revenue: context.financials.revenueFormatted,
        expenses: context.financials.expensesFormatted,
        cash: context.financials.cashFormatted,
        gstPosition: context.financials.gstPositionFormatted,
        receivables: context.financials.receivablesFormatted,
        payables: context.financials.payablesFormatted,
      },
    };
  }

  if (scopeEval.isOutOfScope) {
    const outOfScopeRes = buildOutOfScopeResponse(context.workspace, scopeEval.detectedDomain);
    return {
      ...outOfScopeRes,
      dataSnapshot: {
        revenue: context.financials.revenueFormatted,
        expenses: context.financials.expensesFormatted,
        cash: context.financials.cashFormatted,
        gstPosition: context.financials.gstPositionFormatted,
        receivables: context.financials.receivablesFormatted,
        payables: context.financials.payablesFormatted,
      },
    };
  }

  // RAG: Retrieve semantic vector context from Weaviate Vector DB
  let vectorStatutes = [];
  let vectorDocs = [];
  try {
    vectorStatutes = await retrieveCaKnowledgeAsync(input.message);
  } catch (err) {
    console.warn("[askPrava] Vector statutory retrieval fallback:", err.message);
  }
  try {
    vectorDocs = await searchBusinessDocumentsRag(input.businessId, input.message, 3);
  } catch (err) {
    console.warn("[askPrava] Vector document retrieval fallback:", err.message);
  }

  // Build full invoices database section
  const invoicesList = context.invoices && context.invoices.length > 0 ? context.invoices : [];
  const invoicesDatabasePrompt = invoicesList.length > 0
    ? `VERIFIED INVOICES & DOCUMENTS DATABASE (${invoicesList.length} verified invoices/receipts):
${invoicesList.map((inv, i) => `${i + 1}. INVOICE #${inv.invoiceNumber} (Doc ID: ${inv.id})
   - File: "${inv.originalName}" (${inv.documentType})
   - Date: ${inv.invoiceDate} | Type: ${inv.invoiceType ? inv.invoiceType.toUpperCase() : "PURCHASE"}
   - Vendor / Supplier: ${inv.vendorName}${inv.vendorGstin ? ` (GSTIN: ${inv.vendorGstin})` : ""}
   ${inv.buyerName ? `- Buyer / Customer: ${inv.buyerName}` : ""}
   ${inv.placeOfSupply ? `- Place of Supply: ${inv.placeOfSupply}` : ""}
   - Taxable Subtotal: ${inv.taxableFormatted}
   - Tax Breakdown: CGST: ${inv.cgstFormatted}, SGST: ${inv.sgstFormatted}, IGST: ${inv.igstFormatted} (Total GST: ${inv.totalGstFormatted})
   - Final Total Amount: ${inv.totalFormatted}
   - Extraction & Verification Status: ${inv.status}
   ${inv.lineItems && inv.lineItems.length > 0 ? `- Itemized Line Items:\n${inv.lineItems.map(item => `     * ${item.name} (Qty: ${item.quantity}${item.unitPrice ? `, Rate: ${item.unitPrice}` : ""}${item.amount ? `, Total: ${item.amount}` : ""})`).join("\n")}` : "   - Itemized Line Items: General invoice items extracted"}`).join("\n\n")}`
    : `VERIFIED INVOICES & DOCUMENTS DATABASE:
(No invoices or receipts are currently recorded in this workspace.)`;

  // Synthesize context prompt
  const systemPrompt = `You are "Ask Prava", the intelligent financial co-pilot and operational assistant for "${context.workspace.name}".
You help the business owner understand their finances, inspect invoice line items, prepare GST/tax work, track cashflow, redirect them to pages, and execute tasks.

STRICT PRINCIPLES & CAPABILITIES:
1. INVOICE INQUIRY RULES (HIGHEST PRIORITY):
   - You have access to the complete VERIFIED INVOICES & DOCUMENTS DATABASE below.
   - When asked about any invoice, receipt, purchase, supplier, customer, tax on an invoice, or product:
     * If matching invoice(s) exist in the database: Provide exact invoice number, date, vendor, total, tax breakdown (CGST, SGST, IGST), and line items.
     * IF THE REQUESTED INVOICE, VENDOR, PERSON, NUMBER, OR RECORD IS NOT IN THE DATABASE (or if no invoices are uploaded):
       YOU MUST CLEARLY AND CONCISELY STATE:
       "We don't have record of this invoice or vendor in your business documents."
       DO NOT guess, hallucinate, invent invoice numbers, or assume amounts that are not present.
       DO NOT provide long, useless filler essays or unsolicited financial lectures when data is missing.
       Directly suggest uploading the document: "You can upload this document at [Invoices & Receipts](/documents) to have Prava process and record it."
2. TASK EXECUTION & REDIRECTION:
   - When the user asks to redirect, go somewhere, or perform an action (e.g., "take me to invoices", "redirect to documents", "go to tax", "open ca suite", "show money", "view tasks", "reconcile", "upload invoice"):
     * Directly confirm the redirection in your response: e.g. "Taking you to Invoices & Receipts..." or "Opening Tax & Compliance..."
     * Provide a markdown link: e.g. [Open Invoices & Receipts](/documents) or [Open Tax Hub](/tax).
3. GUARDRAIL BOUNDARY: You are strictly focused on business finances, accounting, taxation, invoices, cashflow, and workspace operations for "${context.workspace.name}". If the user's inquiry is completely unrelated to business finance, refuse and start your response with "[GUARDRAIL_NOT_RELATED] This question is not related to your business finances or Prava operations."
4. NEVER invent numbers or claim transactions that are not in the context.
5. Speak in simple, clear, professional language without obscure accounting jargon.

CURRENT BUSINESS LEDGER:
- Business: ${context.workspace.name} (${context.workspace.taxSystem}, Currency: ${context.workspace.currency})
- Revenue: ${context.financials.revenueFormatted}
- Expenses: ${context.financials.expensesFormatted}
- Available Cash: ${context.financials.cashFormatted}
- Money owed to you (Receivables): ${context.financials.receivablesFormatted}
- Money you owe (Payables): ${context.financials.payablesFormatted}
- Estimated Net Tax / GST to pay: ${context.financials.gstPositionFormatted}

${invoicesDatabasePrompt}

${vectorStatutes.length > 0 ? `RELEVANT STATUTORY REGULATIONS (Weaviate Vector RAG):
${vectorStatutes.map(s => `- [${s.topic}] (${s.sections?.join(", ") || "Statute"}): ${s.rules?.slice(0, 2).join("; ") || ""} Advice: ${s.actionableAdvice || ""}`).join("\n")}
` : ""}
${vectorDocs.length > 0 ? `MATCHING SOURCE INVOICES & DOCUMENTS (Weaviate Vector RAG):
${vectorDocs.map(d => `- Doc #${d.documentId} [${d.vendorName || "Commercial Invoice"}]: ${d.content}`).join("\n")}
` : ""}
${context.intelligence ? `BUSINESS HEALTH & PROACTIVE INTELLIGENCE:
- Health Score: ${context.intelligence.healthScore}/100 (${context.intelligence.healthGradeLabel})
- Critical Issues: ${context.intelligence.criticalCount}, Warnings: ${context.intelligence.warningCount}
${context.intelligence.topFindings?.length ? `- Top Findings:\n${context.intelligence.topFindings.map(f => `  * [${f.severity.toUpperCase()}] ${f.title}: ${f.plainEnglish}`).join("\n")}` : ""}
${context.intelligence.todayActions?.length ? `- Actions for Today:\n${context.intelligence.todayActions.map(a => `  * ${a.action}: ${a.why}`).join("\n")}` : ""}
` : ""}
LIVE ACTION ITEMS NEEDING ATTENTION (${context.openActions.length}):
${context.openActions.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title}: ${a.description} (Doc #${a.documentId || "none"}, Task #${a.taskId || "none"})`).join("\n") || "No open action items."}

WORKFLOW TASKS:
${context.tasks.map((t, i) => `${i + 1}. Task #${t.id} "${t.title}" (${t.type}) - Status: ${t.status}`).join("\n") || "No tasks started."}

${context.gstPreparation ? `GST PREPARATION SUMMARY:
- Status: ${context.gstPreparation.status}
- Sales: ${context.gstPreparation.salesFormatted}
- Estimated Net Tax: ${context.gstPreparation.estimatedTaxFormatted}
- Input Tax Credit: ${context.gstPreparation.inputTaxCreditFormatted}` : "No GST preparation generated yet."}

${(context.reconciliationItems && context.reconciliationItems.length > 0) ? `RECONCILIATION ITEMS:
${context.reconciliationItems.map((r, i) => `${i + 1}. Ref: ${r.reference || r.itemType}, Status: ${r.status}, Reason: ${r.reason}`).join("\n")}` : ""}

RESPONSE FORMAT:
Always respond with structured, concise, friendly markdown. If the question asks for an invoice not in records, state it directly and concisely without fluff.`;

  const conversationMessages = [
    { role: "system", content: systemPrompt },
  ];

  if (input.history && input.history.length > 0) {
    for (const h of input.history.slice(-6)) {
      conversationMessages.push({
        role: h.role,
        content: h.content,
      });
    }
  }

  conversationMessages.push({
    role: "user",
    content: input.message,
  });

  const response = await invokeLLM({
    model: "gemini-3-flash-preview",
    max_tokens: 1200,
    messages: conversationMessages,
  });

  const rawAnswer = response.choices[0]?.message.content;

  // Post-check: If LLM triggered guardrail refusal
  if (typeof rawAnswer === "string" && (rawAnswer.includes("[GUARDRAIL_NOT_RELATED]") || rawAnswer.includes("Question Not Related to Business Finances"))) {
    const outOfScopeRes = buildOutOfScopeResponse(context.workspace);
    return {
      ...outOfScopeRes,
      dataSnapshot: {
        revenue: context.financials.revenueFormatted,
        expenses: context.financials.expensesFormatted,
        cash: context.financials.cashFormatted,
        gstPosition: context.financials.gstPositionFormatted,
        receivables: context.financials.receivablesFormatted,
        payables: context.financials.payablesFormatted,
      },
    };
  }

  const lower = input.message.toLowerCase();

  // Extract vendor or invoice candidate for precise record verification
  let queriedVendorOrNumber = null;
  const vendorMatch = input.message.match(/(?:invoice|bill|receipt)\s+(?:from|for|by|of)\s+([A-Za-z0-9\s.,&'-]+?)(?:\?|\.|$)/i);
  if (vendorMatch && vendorMatch[1]) {
    queriedVendorOrNumber = vendorMatch[1].trim();
  } else {
    const numMatch = input.message.match(/(?:invoice|bill|doc|document)\s*(?:#|no\.?|number)?\s*([A-Za-z0-9\-_/]+)/i);
    if (numMatch && numMatch[1] && !["the", "any", "my", "our", "all", "this", "a", "an"].includes(numMatch[1].toLowerCase())) {
      queriedVendorOrNumber = numMatch[1].trim();
    }
  }

  let matchingInvoices = [];
  if (queriedVendorOrNumber) {
    const qLower = queriedVendorOrNumber.toLowerCase();
    matchingInvoices = invoicesList.filter(inv =>
      inv.invoiceNumber.toLowerCase().includes(qLower) ||
      (inv.vendorName && inv.vendorName.toLowerCase().includes(qLower)) ||
      (inv.originalName && inv.originalName.toLowerCase().includes(qLower))
    );
  }

  const isSpecificMissingLookup =
    queriedVendorOrNumber &&
    matchingInvoices.length === 0 &&
    /\b(do we have|is there|any invoice|show me|find|check|where is|what is)\b/i.test(lower);

  // Detect if the user is asking a financial, tax, compliance, or CA advisory question
  const isFinanceCaQuestion =
    /\b(what is|what are|explain|how does|define|meaning of|guide on|tell me about|how to calculate|difference between|rules for|provisions of|can i claim|is .* allowed|is .* deductible|eligibility for|conditions for)\b/i.test(lower) ||
    /\b(itc|input tax credit|tds|msme|43b|44ad|44ada|advance tax|rcm|reverse charge|gstr|gst|depreciation|dividend|remuneration|blocked credit|17\(5\)|16\(2\)|194c|194j|194q|40a|working capital|cash flow|cashflow|tax saving|save tax|audit|compliance)\b/i.test(lower);

  // Use the LLM's intelligent response if present and substantive
  let answer = typeof rawAnswer === "string" && rawAnswer.trim().length > 0 ? rawAnswer : "";

  // If local fallback mock ran OR specific invoice lookup / conceptual CA guidance requested
  if (isSpecificMissingLookup || (rawAnswer?.includes("### Financial Analysis & Guidance") && queriedVendorOrNumber && matchingInvoices.length === 0)) {
    answer = `We do not have record of an invoice for **"${queriedVendorOrNumber}"** in your business documents.\n\nIf you have this document, you can upload it at [Invoices & Receipts](/documents) to have Prava process and record it into your ledger.`;
  } else if (rawAnswer?.includes("### Financial Analysis & Guidance") && matchingInvoices.length > 0) {
    const inv = matchingInvoices[0];
    answer = `### 📄 Invoice #${inv.invoiceNumber}\n\nFound matching invoice in your business records:\n- **Vendor**: ${inv.vendorName}${inv.vendorGstin ? ` (${inv.vendorGstin})` : ""}\n- **Date**: ${inv.invoiceDate}\n- **Type**: ${inv.invoiceType.toUpperCase()}\n- **Taxable Subtotal**: ${inv.taxableFormatted}\n- **Tax Breakdown**: CGST: ${inv.cgstFormatted}, SGST: ${inv.sgstFormatted}, IGST: ${inv.igstFormatted} (Total GST: ${inv.totalGstFormatted})\n- **Final Amount**: **${inv.totalFormatted}**\n- **Status**: ${inv.status}\n\n${inv.lineItems?.length ? `**Line Items:**\n${inv.lineItems.map(item => `- ${item.name} (Qty: ${item.quantity}${item.unitPrice ? `, Rate: ${item.unitPrice}` : ""}${item.amount ? `, Total: ${item.amount}` : ""})`).join("\n")}` : ""}`;
  } else if (!answer || rawAnswer?.includes("### Financial Analysis & Guidance") || isFinanceCaQuestion) {
    // If the LLM returned boilerplate or gave a generic response for a finance/CA question, provide authoritative statutory guidance
    if (!answer || rawAnswer?.includes("### Financial Analysis & Guidance") || rawAnswer?.includes("I have reviewed your active business records regarding")) {
      const caAdvice = buildCaAdvisoryResponse(input.message, context.financials, context.workspace, vectorStatutes);
      answer = `### ⚖️ ${caAdvice.title}\n\n${caAdvice.analysis}\n\n#### 📋 Statutory Protocol & Action Plan:\n${caAdvice.actionPlan.map((step) => `- ${step}`).join("\n")}\n\n> ⚠️ **Autonomous CA Advisory Warning**: ${caAdvice.warning}\n\n*Statutory Reference: ${caAdvice.sectionsReferenced.join(", ")}*`;
    }
  }

  // Determine contextual action buttons and redirection flags
  const actions = [];
  const sources = [];

  const isRedirectRequest = /\b(redirect|take\s+me\s+to|navigate\s+to|go\s+to|open|switch\s+to|bring\s+me\s+to|show\s+me\s+page)\b/i.test(lower);

  // Add matching sources from invoices
  if (invoicesList.length > 0) {
    for (const inv of invoicesList.slice(0, 3)) {
      if (lower.includes(inv.invoiceNumber.toLowerCase()) || (inv.vendorName && lower.includes(inv.vendorName.toLowerCase())) || lower.includes("invoice") || lower.includes("bill")) {
        sources.push({
          title: `${inv.vendorName} (${inv.invoiceNumber})`,
          type: "Verified Invoice",
          documentId: inv.id,
        });
      }
    }
  }

  // Add Weaviate Vector RAG sources
  if (vectorStatutes.length > 0) {
    for (const vs of vectorStatutes.slice(0, 2)) {
      sources.push({
        title: vs.topic,
        type: "Statutory Law (Weaviate RAG)",
      });
    }
  }
  if (vectorDocs.length > 0) {
    for (const vd of vectorDocs) {
      sources.push({
        title: vd.vendorName ? `${vd.vendorName} Invoice` : `Document #${vd.documentId}`,
        type: "Indexed Invoice (Weaviate RAG)",
        documentId: vd.documentId,
      });
    }
  }

  // Action mapping based on user intent
  if (lower.includes("invoice") || lower.includes("bill") || lower.includes("document") || lower.includes("receipt") || lower.includes("upload")) {
    actions.push({
      label: "Go to Invoices & Receipts →",
      path: "/documents",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
    if (context.recentDocuments[0]) {
      sources.push({
        title: context.recentDocuments[0].originalName,
        type: "Document",
        documentId: context.recentDocuments[0].id,
      });
    }
  }

  if (lower.includes("gst") || lower.includes("tax") || lower.includes("filing") || lower.includes("itc") || lower.includes("owe")) {
    actions.push({
      label: "Open Taxes & Compliance →",
      path: "/tax",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
    if (context.tasks.find((t) => t.type.includes("gst"))) {
      const gstTask = context.tasks.find((t) => t.type.includes("gst"));
      actions.push({
        label: "View GST Preparation",
        path: `/tasks/${gstTask.id}`,
        variant: "outline",
      });
      sources.push({
        title: gstTask.title,
        type: "Task Workflow",
        taskId: gstTask.id,
      });
    }
  }

  if (lower.includes("ca-suite") || lower.includes("autonomous ca") || lower.includes("ca suite") || lower.includes("statute") || lower.includes("43b")) {
    actions.push({
      label: "Open Autonomous CA Suite →",
      path: "/ca-suite",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  if (lower.includes("ca review") || lower.includes("ca desk") || lower.includes("accountant review") || lower.includes("icai")) {
    actions.push({
      label: "Open CA Review Desk →",
      path: "/ca-review",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  if (lower.includes("earn") || lower.includes("spend") || lower.includes("revenue") || lower.includes("expense") || lower.includes("cash") || lower.includes("money") || lower.includes("bank")) {
    actions.push({
      label: "View Money In & Out →",
      path: "/money",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  if (lower.includes("task") || lower.includes("fix") || lower.includes("action") || lower.includes("attention") || lower.includes("checklist")) {
    actions.push({
      label: "View Tasks & Things to Fix →",
      path: "/tasks",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
    if (context.openActions[0]?.documentId) {
      actions.push({
        label: "Review Needed Document",
        path: `/documents/${context.openActions[0].documentId}`,
        variant: "secondary",
      });
    }
  }

  if (lower.includes("dashboard") || lower.includes("home") || lower.includes("overview")) {
    actions.push({
      label: "Go to Home Dashboard →",
      path: "/dashboard",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  if (lower.includes("billing") || lower.includes("plan") || lower.includes("subscription")) {
    actions.push({
      label: "Open Billing & Plans →",
      path: "/billing",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  if (lower.includes("profile") || lower.includes("onboarding") || lower.includes("business details")) {
    actions.push({
      label: "Open Business Profile →",
      path: "/onboarding",
      variant: "default",
      isRedirect: isRedirectRequest,
    });
  }

  // Fallback default actions if none triggered
  if (actions.length === 0) {
    actions.push({ label: "Go to Home Dashboard", path: "/dashboard", variant: "outline" });
    actions.push({ label: "View Invoices & Receipts", path: "/documents", variant: "default" });
  }

  return {
    answer,
    actions,
    sources: sources.length > 0 ? sources : undefined,
    isOutOfScope: false,
    dataSnapshot: {
      revenue: context.financials.revenueFormatted,
      expenses: context.financials.expensesFormatted,
      cash: context.financials.cashFormatted,
      gstPosition: context.financials.gstPositionFormatted,
      receivables: context.financials.receivablesFormatted,
      payables: context.financials.payablesFormatted,
    },
  };
}

export async function getSuggestedQuestions(userId, businessId) {
  const context = await getLiveWorkspaceContext(userId, businessId);
  const questions = [
    "How much did my business earn and spend this month?",
    "What invoices or documents need my review?",
    "How much GST or tax might I owe?",
    "What tasks need my attention today?",
    "How much money is owed to my business?",
    "Is my GST preparation ready to send to my CA?",
  ];

  if (context.openActions.length > 0) {
    questions.unshift(`Why do I have ${context.openActions.length} items needing attention?`);
  }

  return questions.slice(0, 6);
}

export async function getCaReviewItemsForUser(userId, businessId) {
  await verifyWorkspaceAccess(userId, businessId);
  const { getAssignedCaForBusiness, inMemoryCaObservations } = await import("./caManagement.js");
  const assignedCa = await getAssignedCaForBusiness(businessId);
  const db = await getDb();
  if (!db) {
    return {
      assignedCa: assignedCa || {
        caUserId: 201,
        fullName: "CA Rajesh Verma, FCA",
        email: "ca.verma@prava.internal",
        phone: "+91 98200 12345",
        membershipNumber: "ICAI #409212",
        firmName: "Verma & Associates Chartered Accountants",
        specialization: "GST Filings, Direct Tax & Corporate Audit",
        bio: "Designated In-House Chartered Accountant for Statutory & Compliance Verification",
        assignedAt: new Date("2026-01-15"),
      },
      professionalReviews: [],
      submissionAuthorizations: [],
      caObservations: inMemoryCaObservations.filter(o => o.businessId === businessId),
    };
  }

  const reviews = await db
    .select({
      id: reviewRequests.id,
      taskId: reviewRequests.taskId,
      taskTitle: operationalTasks.title,
      taskType: operationalTasks.type,
      status: reviewRequests.status,
      note: reviewRequests.note,
      createdAt: reviewRequests.createdAt,
      updatedAt: reviewRequests.updatedAt,
      taskStatus: operationalTasks.status,
    })
    .from(reviewRequests)
    .innerJoin(operationalTasks, eq(reviewRequests.taskId, operationalTasks.id))
    .where(eq(reviewRequests.businessId, businessId))
    .orderBy(desc(reviewRequests.createdAt));

  const submissionReqs = await db
    .select({
      id: gstSubmissionRequests.id,
      taskId: gstSubmissionRequests.taskId,
      taskTitle: operationalTasks.title,
      taskType: operationalTasks.type,
      status: gstSubmissionRequests.status,
      requesterNote: gstSubmissionRequests.requesterNote,
      reviewerNote: gstSubmissionRequests.reviewerNote,
      createdAt: gstSubmissionRequests.createdAt,
      approvedAt: gstSubmissionRequests.approvedAt,
    })
    .from(gstSubmissionRequests)
    .innerJoin(operationalTasks, eq(gstSubmissionRequests.taskId, operationalTasks.id))
    .where(eq(gstSubmissionRequests.businessId, businessId))
    .orderBy(desc(gstSubmissionRequests.createdAt));

  const { caAuditObservations } = await import("../drizzle/schema.js");
  const observations = await db
    .select({
      id: caAuditObservations.id,
      taskId: caAuditObservations.taskId,
      caUserId: caAuditObservations.caUserId,
      decision: caAuditObservations.decision,
      observationTitle: caAuditObservations.observationTitle,
      detailedNotes: caAuditObservations.detailedNotes,
      certificateReference: caAuditObservations.certificateReference,
      createdAt: caAuditObservations.createdAt,
    })
    .from(caAuditObservations)
    .where(eq(caAuditObservations.businessId, businessId))
    .orderBy(desc(caAuditObservations.createdAt));

  return {
    assignedCa,
    professionalReviews: reviews,
    submissionAuthorizations: submissionReqs,
    caObservations: observations,
  };
}
