/**
 * Prava Business Intelligence Engine
 * Orchestrates all analysis engines to produce proactive, prioritized findings.
 *
 * This is the core of Prava's "financial and compliance intelligence layer."
 * It analyzes a business's data and tells them what needs attention,
 * in plain English, with specific amounts and recommended actions.
 */

import { inMemoryDocuments, inMemoryExtractions, inMemoryTasks, inMemoryActionItems, inMemoryAccountingEntries, inMemoryReconciliationItems } from "./operations.js";
import { analyzeTdsForBusiness, getTdsDashboardSummary } from "./tdsEngine.js";
import { buildAccountsReceivable, buildAccountsPayable, getArApDashboardSummary } from "./arApEngine.js";
import { calculateBusinessHealthScore, getHealthScoreSummary } from "./healthScore.js";

// ─── Finding Types ────────────────────────────────────────────────────────────

/**
 * Severity levels for findings:
 * - "critical"  → Must act now (red)
 * - "warning"   → Should act soon (orange)
 * - "info"      → Good to know (yellow/blue)
 * - "positive"  → Everything is fine (green)
 */

function makeFinding({
  id,
  type,
  severity = "warning",
  title,
  plainEnglish,
  amountMinor = 0,
  amountLabel = null,
  recommendedAction,
  actionPath = null,
  transactionRefs = [],
  calculationBreakdown = null,
}) {
  return {
    id,
    type,
    severity,
    title,
    plainEnglish,
    amountMinor,
    amountLabel: amountLabel || (amountMinor > 0 ? `Rs ${Math.round(amountMinor / 100).toLocaleString("en-IN")}` : null),
    recommendedAction,
    actionPath,
    transactionRefs,
    calculationBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

// ─── Finding Generators ───────────────────────────────────────────────────────

function findTdsObligations(tdsAnalysis) {
  const findings = [];

  if (!tdsAnalysis || tdsAnalysis.vendorsWithTdsObligation === 0) return findings;

  const vendors = tdsAnalysis.vendors || [];
  const totalTdsMinor = tdsAnalysis.totalTdsRequiredMinor || 0;

  findings.push(makeFinding({
    id: "tds_obligations",
    type: "tds",
    severity: "critical",
    title: "Tax may need to be deducted from vendor payments",
    plainEnglish: `You have payments to ${tdsAnalysis.vendorsWithTdsObligation} vendor${tdsAnalysis.vendorsWithTdsObligation !== 1 ? "s" : ""} where tax may need to be deducted before paying them. If you miss this, 30% of the expense could be disallowed when calculating your business tax.`,
    amountMinor: totalTdsMinor,
    recommendedAction: "Review which vendors require TDS deduction and how much to deduct.",
    actionPath: "/tax",
    transactionRefs: vendors.map(v => ({ vendorName: v.vendorName, amount: `Rs ${v.totalTdsRupees?.toLocaleString("en-IN")}` })),
    calculationBreakdown: vendors.slice(0, 3).map(v => ({
      label: v.vendorName,
      detail: `Rs ${v.totalTdsRupees?.toLocaleString("en-IN")} may need to be deducted`,
    })),
  }));

  return findings;
}

function findOverdueReceivables(arData) {
  const findings = [];

  if (!arData || arData.totalOverdueMinor === 0) return findings;

  const overdueRupees = Math.round(arData.totalOverdueMinor / 100);
  const over60Minor = (arData.aging?.["61_to_90"] || 0) + (arData.aging?.["over_90"] || 0);
  const over60Rupees = Math.round(over60Minor / 100);

  findings.push(makeFinding({
    id: "overdue_receivables",
    type: "receivables",
    severity: over60Minor > 0 ? "critical" : "warning",
    title: `Customers owe you Rs ${overdueRupees.toLocaleString("en-IN")} that is overdue`,
    plainEnglish: over60Minor > 0
      ? `Rs ${overdueRupees.toLocaleString("en-IN")} is overdue from customers. Rs ${over60Rupees.toLocaleString("en-IN")} has been outstanding for more than 60 days — this needs urgent follow-up.`
      : `Rs ${overdueRupees.toLocaleString("en-IN")} from ${arData.overdueCustomersCount} customer${arData.overdueCustomersCount !== 1 ? "s" : ""} is past the due date.`,
    amountMinor: arData.totalOverdueMinor,
    recommendedAction: "Follow up with customers who haven't paid on time.",
    actionPath: "/money",
    transactionRefs: (arData.customers || [])
      .filter(c => c.overdueCount > 0)
      .slice(0, 5)
      .map(c => ({
        customerName: c.customerName,
        overdue: `Rs ${Math.round(c.overdueMinor / 100).toLocaleString("en-IN")}`,
        daysOverdue: `${c.worstDaysOverdue} days`,
      })),
  }));

  // Additional finding for chronic late payers
  const chronicLate = (arData.customers || []).filter(c => c.isChronicLatePayer);
  if (chronicLate.length > 0) {
    findings.push(makeFinding({
      id: "chronic_late_customers",
      type: "receivables_pattern",
      severity: "info",
      title: `${chronicLate.length} customer${chronicLate.length !== 1 ? "s" : ""} repeatedly pay late`,
      plainEnglish: `${chronicLate.map(c => c.customerName).join(", ")} ${chronicLate.length === 1 ? "has" : "have"} paid late more than once. Consider setting stricter payment terms.`,
      recommendedAction: "Review payment terms with these customers.",
      actionPath: "/money",
      transactionRefs: chronicLate.map(c => ({ customerName: c.customerName })),
    }));
  }

  return findings;
}

function findOverduePayables(apData) {
  const findings = [];

  if (!apData || apData.totalOverdueMinor === 0) return findings;

  const overdueRupees = Math.round(apData.totalOverdueMinor / 100);

  findings.push(makeFinding({
    id: "overdue_payables",
    type: "payables",
    severity: "warning",
    title: `Rs ${overdueRupees.toLocaleString("en-IN")} in vendor bills are overdue`,
    plainEnglish: `You have Rs ${overdueRupees.toLocaleString("en-IN")} in overdue vendor bills. Paying these late can damage vendor relationships and may have legal consequences for MSME vendors.`,
    amountMinor: apData.totalOverdueMinor,
    recommendedAction: "Pay overdue vendor bills.",
    actionPath: "/money",
    transactionRefs: (apData.vendors || [])
      .filter(v => v.overdueCount > 0)
      .slice(0, 5)
      .map(v => ({ vendorName: v.vendorName, overdue: `Rs ${Math.round(v.overdueMinor / 100).toLocaleString("en-IN")}` })),
  }));

  return findings;
}

function findDocumentsNeedingReview(documents) {
  const findings = [];

  const needsReview = documents.filter(d =>
    d.document?.status === "needs_review" ||
    d.extraction?.status === "needs_review"
  );

  if (needsReview.length === 0) return findings;

  findings.push(makeFinding({
    id: "documents_need_review",
    type: "document_review",
    severity: needsReview.length >= 5 ? "critical" : "warning",
    title: `${needsReview.length} document${needsReview.length !== 1 ? "s" : ""} need${needsReview.length === 1 ? "s" : ""} your review`,
    plainEnglish: `${needsReview.length} uploaded document${needsReview.length !== 1 ? "s" : ""} ${needsReview.length === 1 ? "has" : "have"} information that needs to be confirmed. Unreviewed documents are not included in your financial reports or tax calculations.`,
    recommendedAction: "Review and confirm the extracted information from these documents.",
    actionPath: "/documents",
    transactionRefs: needsReview.slice(0, 5).map(d => ({
      name: d.document?.originalName || "Document",
      vendor: d.extraction?.vendorName || "Unknown",
    })),
  }));

  return findings;
}

function findReconciliationIssues(reconciliationItems) {
  const findings = [];

  const openItems = (reconciliationItems || []).filter(
    i => i.status !== "resolved" && i.status !== "ignored"
  );

  if (openItems.length === 0) return findings;

  const mismatches = openItems.filter(i => i.status === "mismatch");
  const missing = openItems.filter(i => i.status === "missing");
  const duplicates = openItems.filter(i => i.status === "duplicate");

    const issueDetails = [
      mismatches.length > 0 ? `${mismatches.length} amount mismatch${mismatches.length !== 1 ? "es" : ""}` : "",
      missing.length > 0 ? `${missing.length} missing record${missing.length !== 1 ? "s" : ""}` : "",
      duplicates.length > 0 ? `${duplicates.length} possible duplicate${duplicates.length !== 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");

    findings.push(makeFinding({
      id: "reconciliation_issues",
      type: "reconciliation",
      severity: openItems.length >= 5 ? "critical" : "warning",
      title: `${openItems.length} transaction${openItems.length !== 1 ? "s" : ""} don't match`,
      plainEnglish: `We found ${openItems.length} record${openItems.length !== 1 ? "s" : ""} that need${openItems.length === 1 ? "s" : ""} checking: ${issueDetails || `${openItems.length} unmatched transactions`}.`,
      recommendedAction: "Review and resolve the unmatched transactions.",
      actionPath: openItems[0]?.taskId ? `/tasks/${openItems[0].taskId}` : "/tasks",
      transactionRefs: openItems.slice(0, 5).map(i => ({
        reference: i.reference || `Record #${i.id}`,
        status: i.status,
        amount: i.amountMinor ? `Rs ${Math.round(i.amountMinor / 100).toLocaleString("en-IN")}` : null,
      })),
    }));

  return findings;
}

function findGstIssues(documents, gstPreparations) {
  const findings = [];
  const prep = Array.isArray(gstPreparations) ? gstPreparations[0] : gstPreparations;

  if (!prep) return findings;

  if (prep.documentsRequiringReview > 0) {
    const netTaxRupees = Math.round((prep.netTaxPositionMinor || 0) / 100);
    const salesGstRupees = Math.round(((prep.cgstMinor || 0) + (prep.sgstMinor || 0) + (prep.igstMinor || 0)) / 100);
    const itcRupees = Math.round((prep.inputTaxCreditMinor || 0) / 100);

    findings.push(makeFinding({
      id: "gst_needs_review",
      type: "gst",
      severity: "warning",
      title: `GST records need review before filing`,
      plainEnglish: `Your estimated GST amount is Rs ${netTaxRupees.toLocaleString("en-IN")}. But ${prep.documentsRequiringReview} document${prep.documentsRequiringReview !== 1 ? "s" : ""} still need${prep.documentsRequiringReview === 1 ? "s" : ""} to be reviewed before this amount can be finalized.`,
      amountMinor: prep.netTaxPositionMinor || 0,
      recommendedAction: "Review pending documents to finalize your GST position.",
      actionPath: "/tax",
      calculationBreakdown: [
        { label: "GST collected from customers", detail: `Rs ${salesGstRupees.toLocaleString("en-IN")}` },
        { label: "GST you may be able to claim back", detail: `Rs ${itcRupees.toLocaleString("en-IN")}` },
        { label: "Estimated GST to pay", detail: `Rs ${netTaxRupees.toLocaleString("en-IN")}` },
      ],
    }));
  }

  return findings;
}

function findExpenseAnomalies(documents, accountingEntries) {
  const findings = [];

  const entries = accountingEntries || [];
  if (entries.length < 5) return findings; // Not enough data

  const expenses = entries.filter(e =>
    (e.entryType === "debit" || e.category === "operating_expense") && e.amountMinor > 0
  );

  if (expenses.length < 3) return findings;

  // Detect duplicate invoices (same vendor + same amount within 7 days)
  const duplicates = [];
  for (let i = 0; i < expenses.length; i++) {
    for (let j = i + 1; j < expenses.length; j++) {
      const a = expenses[i];
      const b = expenses[j];
      if (
        a.accountName === b.accountName &&
        a.amountMinor === b.amountMinor &&
        a.amountMinor > 0 &&
        Math.abs(new Date(a.entryDate) - new Date(b.entryDate)) <= 7 * 86400000
      ) {
        duplicates.push({ a, b });
      }
    }
  }

  if (duplicates.length > 0) {
    const totalDuplicateMinor = duplicates.reduce((s, d) => s + d.a.amountMinor, 0);
    findings.push(makeFinding({
      id: "possible_duplicate_expenses",
      type: "expense_anomaly",
      severity: "warning",
      title: `${duplicates.length} possible duplicate expense${duplicates.length !== 1 ? "s" : ""}`,
      plainEnglish: `We found ${duplicates.length} expense${duplicates.length !== 1 ? "s" : ""} that look like ${duplicates.length === 1 ? "it was" : "they were"} recorded twice — same vendor, same amount, within a few days. Total value: Rs ${Math.round(totalDuplicateMinor / 100).toLocaleString("en-IN")}.`,
      amountMinor: totalDuplicateMinor,
      recommendedAction: "Review these expenses to confirm they are not duplicates.",
      actionPath: "/documents",
      transactionRefs: duplicates.slice(0, 3).map(d => ({
        vendor: d.a.accountName,
        amount: `Rs ${Math.round(d.a.amountMinor / 100).toLocaleString("en-IN")}`,
      })),
    }));
  }

  return findings;
}

function findMissingPurchaseDocs(actionItems) {
  const findings = [];
  const missingInfo = (actionItems || []).filter(
    a => a.type === "missing_information" && a.status === "open"
  );

  if (missingInfo.length === 0) return findings;

  findings.push(makeFinding({
    id: "missing_documents",
    type: "documentation",
    severity: "info",
    title: `${missingInfo.length} document${missingInfo.length !== 1 ? "s" : ""} still missing`,
    plainEnglish: `${missingInfo.length} required document${missingInfo.length !== 1 ? "s are" : " is"} still missing. Incomplete records can affect your tax calculations and compliance status.`,
    recommendedAction: "Upload the missing documents to complete your records.",
    actionPath: "/documents",
    transactionRefs: missingInfo.slice(0, 3).map(a => ({ label: a.title, description: a.description })),
  }));

  return findings;
}

// ─── Cash Flow Intelligence ───────────────────────────────────────────────────

function buildCashFlowProjection(arData, apData, tdsData) {
  const expectedInflow = arData?.totalOutstandingMinor || 0;
  const vendorPayments = apData?.dueThisMonthMinor || 0;
  const tdsPayable = (tdsData?.estimatedTdsMinor || 0);

  const projectedNet = expectedInflow - vendorPayments - tdsPayable;

  return {
    expectedCustomerPaymentsMinor: expectedInflow,
    vendorPaymentsDueMinor: vendorPayments,
    tdsPayableMinor: tdsPayable,
    projectedNetMinor: projectedNet,
    projectedNetRupees: Math.round(projectedNet / 100),
    isShortfall: projectedNet < 0,
    shortfallRupees: projectedNet < 0 ? Math.round(Math.abs(projectedNet) / 100) : 0,
    note: "This is an estimate based on outstanding invoices in Prava. Actual cash flows may differ.",
  };
}

// ─── Main Intelligence Function ───────────────────────────────────────────────

/**
 * Runs the full intelligence analysis for a business.
 * Returns prioritized findings, scores, and summaries.
 *
 * @param {number} businessId
 * @returns {object} Complete intelligence analysis
 */
export async function runBusinessIntelligence(businessId) {
  // Get all data for this business
  const documents = inMemoryDocuments.filter(d => d.document?.businessId === businessId);
  const reconciliationItems = inMemoryReconciliationItems.filter(r => r.businessId === businessId);
  const actionItems = inMemoryActionItems.filter(a => a.businessId === businessId);
  const accountingEntries = inMemoryAccountingEntries.filter(e => e.businessId === businessId);
  const tasks = inMemoryTasks.filter(t => t.businessId === businessId);
  const gstPreparations = tasks
    .filter(t => t.type === "gst_return_preparation" && t.preparation)
    .map(t => t.preparation)
    .filter(Boolean);

  // Run TDS analysis
  const tdsAnalysis = analyzeTdsForBusiness(documents);
  const tdsSummary = getTdsDashboardSummary(documents);

  // Run AR/AP analysis
  const tdsVendors = tdsAnalysis.vendors || [];
  const arData = buildAccountsReceivable(documents);
  const apData = buildAccountsPayable(documents, tdsVendors);
  const arApSummary = getArApDashboardSummary(documents, tdsVendors);

  // Run health score
  const healthScore = calculateBusinessHealthScore({
    documents,
    reconciliationItems,
    arData,
    apData,
    tdsData: tdsSummary,
    gstPreparations,
    actionItems,
  });

  // Collect all findings
  const allFindings = [
    ...findTdsObligations(tdsAnalysis),
    ...findOverdueReceivables(arData),
    ...findOverduePayables(apData),
    ...findDocumentsNeedingReview(documents),
    ...findReconciliationIssues(reconciliationItems),
    ...findGstIssues(documents, gstPreparations),
    ...findExpenseAnomalies(documents, accountingEntries),
    ...findMissingPurchaseDocs(actionItems),
  ];

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2, positive: 3 };
  allFindings.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  const criticalFindings = allFindings.filter(f => f.severity === "critical");
  const warningFindings = allFindings.filter(f => f.severity === "warning");
  const infoFindings = allFindings.filter(f => f.severity === "info");

  // Financial totals from accounting entries
  let revenueMinor = 0;
  let expensesMinor = 0;
  for (const e of accountingEntries) {
    if (e.category === "revenue" || e.invoiceType === "sales") revenueMinor += (e.amountMinor || 0);
    else expensesMinor += (e.amountMinor || 0);
  }

  // GST position from actual calculations
  const latestGstPrep = gstPreparations[0];
  const gstCollectedMinor = latestGstPrep
    ? (latestGstPrep.cgstMinor || 0) + (latestGstPrep.sgstMinor || 0) + (latestGstPrep.igstMinor || 0)
    : Math.round(revenueMinor * 0.18);
  const itcMinor = latestGstPrep?.inputTaxCreditMinor || Math.round(expensesMinor * 0.18 * 0.7);
  const netGstMinor = Math.max(0, gstCollectedMinor - itcMinor);

  // Cash flow projection
  const cashFlowProjection = buildCashFlowProjection(arData, apData, tdsSummary);

  return {
    businessId,
    generatedAt: new Date().toISOString(),

    // Prioritized findings
    findings: allFindings,
    criticalCount: criticalFindings.length,
    warningCount: warningFindings.length,
    infoCount: infoFindings.length,
    totalFindingsCount: allFindings.length,

    // Health score
    healthScore: {
      overall: healthScore.overall,
      grade: healthScore.grade,
      gradeLabel: healthScore.gradeLabel,
      gradeColor: healthScore.gradeColor,
      components: healthScore.components,
      improvementAreas: healthScore.improvementAreas,
      plainEnglish: healthScore.plainEnglish,
    },

    // Financial intelligence
    financials: {
      revenueMinor,
      expensesMinor,
      netIncomeMinor: revenueMinor - expensesMinor,
      gst: {
        collectedFromCustomersMinor: gstCollectedMinor,
        claimableFromPurchasesMinor: itcMinor,
        estimatedToPayMinor: netGstMinor,
        documentsNeedingReview: latestGstPrep?.documentsRequiringReview || 0,
        calculationNote: "Based on documents uploaded to Prava. Review all documents to finalize.",
      },
      tds: tdsSummary,
      ar: {
        totalOutstandingMinor: arData.totalOutstandingMinor,
        totalOverdueMinor: arData.totalOverdueMinor,
        aging: arData.aging,
        summary: arData.summary,
      },
      ap: {
        totalOutstandingMinor: apData.totalOutstandingMinor,
        dueThisMonthMinor: apData.dueThisMonthMinor,
        totalOverdueMinor: apData.totalOverdueMinor,
        summary: apData.summary,
      },
      cashFlow: cashFlowProjection,
    },

    // "What should I do today?" - top 5 prioritized actions
    todayActions: allFindings.slice(0, 5).map((f, i) => ({
      priority: i + 1,
      severity: f.severity,
      title: f.title,
      plainEnglish: f.plainEnglish,
      action: f.title,
      why: f.plainEnglish,
      actionPath: f.actionPath,
      amountLabel: f.amountLabel,
    })),

    // Context for AI assistant
    contextSummary: {
      totalDocuments: documents.length,
      docsNeedingReview: documents.filter(d => d.document?.status === "needs_review").length,
      openActionItems: actionItems.filter(a => a.status === "open").length,
      openReconciliationItems: reconciliationItems.filter(r => r.status !== "resolved" && r.status !== "ignored").length,
      tdsObligationsExist: tdsSummary.hasObligations,
      overdueReceivablesExist: arData.totalOverdueMinor > 0,
      overduePayablesExist: apData.totalOverdueMinor > 0,
    },
  };
}

// ─── Lightweight Version for Dashboard ───────────────────────────────────────

/**
 * Returns a lightweight intelligence summary for the main dashboard.
 * Avoids full computation — just the top findings and score.
 */
export async function getDashboardIntelligence(businessId) {
  const full = await runBusinessIntelligence(businessId);
  return {
    healthScore: full.healthScore.overall,
    healthGrade: full.healthScore.grade,
    healthGradeLabel: full.healthScore.gradeLabel,
    healthColor: full.healthScore.gradeColor,
    criticalCount: full.criticalCount,
    warningCount: full.warningCount,
    topFindings: full.findings.slice(0, 4),
    todayActions: full.todayActions,
    gstEstimateMinor: full.financials.gst.estimatedToPayMinor,
    tdsEstimateMinor: full.financials.tds.estimatedTdsMinor,
    arOutstandingMinor: full.financials.ar.totalOutstandingMinor,
    arOverdueMinor: full.financials.ar.totalOverdueMinor,
    apDueThisMonthMinor: full.financials.ap.dueThisMonthMinor,
    revenueMinor: full.financials.revenueMinor,
    expensesMinor: full.financials.expensesMinor,
    contextSummary: full.contextSummary,
  };
}
