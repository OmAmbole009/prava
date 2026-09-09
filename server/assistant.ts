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
} from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { getDb } from "./db";
import { formatMinorAmount } from "@shared/locale";

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

export type ActionButton = {
  label: string;
  path: string;
  variant?: "default" | "outline" | "secondary";
};

export type AssistantResponse = {
  answer: string;
  actions: ActionButton[];
  sources?: Array<{
    title: string;
    type: string;
    documentId?: number;
    taskId?: number;
  }>;
  dataSnapshot?: {
    revenue?: string;
    expenses?: string;
    cash?: string;
    gstPosition?: string;
    receivables?: string;
    payables?: string;
  };
};

async function verifyWorkspaceAccess(userId: number, businessId: number) {
  const db = await getDb();
  if (!db) {
    return {
      businessId,
      name: "Acme Global Solutions",
      currency: "USD",
      locale: "en-US",
      taxSystem: "Sales Tax",
      gstin: "US-TAX-98765",
      role: "owner" as const,
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

export async function getLiveWorkspaceContext(userId: number, businessId: number) {
  const workspace = await verifyWorkspaceAccess(userId, businessId);
  const db = await getDb();

  const fmt = (minor: number) =>
    formatMinorAmount(minor, workspace.currency, workspace.locale);

  if (!db) {
    return {
      workspace,
      financials: {
        revenueMinor: 12500000,
        revenueFormatted: fmt(12500000),
        expensesMinor: 4850000,
        expensesFormatted: fmt(4850000),
        cashMinor: 7650000,
        cashFormatted: fmt(7650000),
        gstPositionMinor: 1420000,
        gstPositionFormatted: fmt(1420000),
        receivablesMinor: 3200000,
        receivablesFormatted: fmt(3200000),
        payablesMinor: 1150000,
        payablesFormatted: fmt(1150000),
      },
      openActions: [
        {
          id: 1,
          title: "Review Supplier Invoice INV-2026-0801",
          description: "Verify extracted invoice components and jurisdiction before quarter-end preparation.",
          documentId: 1,
          taskId: 1,
          type: "review_document" as const,
          priority: "high" as const,
        },
      ],
      recentDocuments: [
        {
          id: 1,
          originalName: "Supplier_Invoice_Apex_Aug2026.pdf",
          documentType: "invoice",
          status: "extracted",
          vendorName: "Apex Global Supplies",
          invoiceNumber: "INV-2026-0801",
          totalMinor: 5335000,
          totalFormatted: fmt(5335000),
          invoiceType: "purchase",
        },
      ],
      tasks: [
        {
          id: 1,
          type: "gst_return_preparation",
          title: "Tax & Compliance Preparation — Q3 2026",
          status: "prepared",
          requiresProfessionalReview: 0,
        },
      ],
      gstPreparation: {
        status: "prepared",
        salesFormatted: fmt(12500000),
        estimatedTaxFormatted: fmt(940000),
        inputTaxCreditFormatted: fmt(480000),
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

  return {
    workspace,
    financials,
    openActions,
    recentDocuments: recentDocs.map((doc) => ({
      ...doc,
      totalFormatted: doc.totalMinor ? fmt(doc.totalMinor) : "Not set",
    })),
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

export async function askPrava(
  userId: number,
  input: z.infer<typeof askPravaInputSchema>
): Promise<AssistantResponse> {
  const context = await getLiveWorkspaceContext(userId, input.businessId);

  // Synthesize context prompt
  const systemPrompt = `You are "Ask Prava", the intelligent financial operations assistant for the business "${context.workspace.name}".
You help the business owner understand their finances, find missing documents, prepare GST/tax work, track cashflow, and know exactly what requires their attention.

CRITICAL PRINCIPLES:
1. Ground your answers strictly in the provided verified business data below.
2. NEVER invent numbers or claim transactions that are not in the context.
3. Speak in simple, clear, friendly language without confusing accounting jargon (e.g. instead of "Receivables", say "Money owed to you"; instead of "Input Tax Credit Discrepancy", say "GST credit that needs checking").
4. If the user asks about an action that requires CA or professional approval (such as filing taxes or final submission), remind them that Prava prepares everything and helps send it to their CA/advisor for sign-off.
5. Provide actionable advice and guide the user on what button/page to check.

CURRENT BUSINESS DATA:
- Business: ${context.workspace.name} (${context.workspace.taxSystem}, Currency: ${context.workspace.currency})
- Revenue: ${context.financials.revenueFormatted}
- Expenses: ${context.financials.expensesFormatted}
- Available Cash: ${context.financials.cashFormatted}
- Money owed to you (Receivables): ${context.financials.receivablesFormatted}
- Money you owe (Payables): ${context.financials.payablesFormatted}
- Estimated Tax / GST to pay: ${context.financials.gstPositionFormatted}

LIVE ACTION ITEMS NEEDING ATTENTION (${context.openActions.length}):
${context.openActions.map((a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.title}: ${a.description} (Doc #${a.documentId || "none"}, Task #${a.taskId || "none"})`).join("\n") || "No open action items."}

RECENT SOURCE DOCUMENTS (${context.recentDocuments.length}):
${context.recentDocuments.map((d, i) => `${i + 1}. Doc #${d.id} "${d.originalName}" (${d.documentType}) - Status: ${d.status}, Vendor: ${d.vendorName || "Unknown"}, Invoice #: ${d.invoiceNumber || "N/A"}, Amount: ${d.totalFormatted}, Type: ${d.invoiceType || "unknown"}`).join("\n") || "No documents uploaded yet."}

WORKFLOW TASKS:
${context.tasks.map((t, i) => `${i + 1}. Task #${t.id} "${t.title}" (${t.type}) - Status: ${t.status}`).join("\n") || "No tasks started."}

${context.gstPreparation ? `GST PREPARATION SUMMARY:
- Status: ${context.gstPreparation.status}
- Sales: ${context.gstPreparation.salesFormatted}
- Estimated Net Tax: ${context.gstPreparation.estimatedTaxFormatted}
- Input Tax Credit: ${context.gstPreparation.inputTaxCreditFormatted}` : "No GST preparation generated yet."}

${(context.reconciliationItems && context.reconciliationItems.length > 0) ? `RECONCILIATION ITEMS:
${context.reconciliationItems.map((r, i) => `${i + 1}. Ref: ${r.reference || r.itemType}, Status: ${r.status}, Reason: ${r.reason}`).join("\n")}` : ""}

RESPONSE FORMAT INSTRUCTIONS:
Always respond with helpful, structured markdown explaining the facts simply and directly.`;

  const conversationMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
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
  const answer =
    typeof rawAnswer === "string"
      ? rawAnswer
      : "I have gathered your business information. Here is what you need to know.";

  // Determine contextual action buttons based on user query and intent
  const actions: ActionButton[] = [];
  const sources: AssistantResponse["sources"] = [];

  const lower = input.message.toLowerCase();

  if (lower.includes("invoice") || lower.includes("bill") || lower.includes("document") || lower.includes("receipt")) {
    actions.push({ label: "View Documents", path: "/documents", variant: "default" });
    if (context.recentDocuments[0]) {
      sources.push({
        title: context.recentDocuments[0].originalName,
        type: "Document",
        documentId: context.recentDocuments[0].id,
      });
    }
  }

  if (lower.includes("gst") || lower.includes("tax") || lower.includes("filing") || lower.includes("owe")) {
    actions.push({ label: "Open Tax Hub", path: "/tax", variant: "default" });
    if (context.tasks.find((t) => t.type.includes("gst"))) {
      const gstTask = context.tasks.find((t) => t.type.includes("gst"))!;
      actions.push({ label: "View GST Preparation", path: `/tasks/${gstTask.id}`, variant: "outline" });
      sources.push({
        title: gstTask.title,
        type: "Task Workflow",
        taskId: gstTask.id,
      });
    }
  }

  if (lower.includes("earn") || lower.includes("spend") || lower.includes("revenue") || lower.includes("expense") || lower.includes("cash") || lower.includes("money")) {
    actions.push({ label: "View Money Breakdown", path: "/money", variant: "default" });
  }

  if (lower.includes("do today") || lower.includes("attention") || lower.includes("task") || lower.includes("fix") || lower.includes("unmatched") || lower.includes("missing")) {
    actions.push({ label: "View Tasks & Checklist", path: "/tasks", variant: "default" });
    if (context.openActions[0]?.documentId) {
      actions.push({
        label: "Review Needed Document",
        path: `/documents/${context.openActions[0].documentId}`,
        variant: "secondary",
      });
    }
  }

  if (lower.includes("ca") || lower.includes("accountant") || lower.includes("review") || lower.includes("advisor")) {
    actions.push({ label: "Go to CA Review", path: "/ca-review", variant: "default" });
  }

  // Fallback default actions if none triggered
  if (actions.length === 0) {
    actions.push({ label: "Overview", path: "/dashboard", variant: "outline" });
    actions.push({ label: "Ask Another Question", path: "/assistant", variant: "default" });
  }

  return {
    answer,
    actions,
    sources: sources.length > 0 ? sources : undefined,
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

export async function getSuggestedQuestions(userId: number, businessId: number) {
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

export async function getCaReviewItemsForUser(userId: number, businessId: number) {
  await verifyWorkspaceAccess(userId, businessId);
  const { getAssignedCaForBusiness, inMemoryCaObservations } = await import("./caManagement");
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
      professionalReviews: [
        {
          id: 1,
          taskId: 1,
          taskTitle: "Tax & Compliance Preparation — Q3 2026",
          taskType: "gst_return_preparation",
          status: "in_review",
          note: "Reviewing supplier tax invoice attachments and jurisdiction details.",
          createdAt: new Date("2026-08-20"),
          updatedAt: new Date("2026-08-20"),
          taskStatus: "professional_review",
        },
      ],
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

  const { caAuditObservations } = await import("../drizzle/schema");
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

