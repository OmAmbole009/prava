/**
 * Prava Business Health Score Engine
 * Calculates a measurable 0-100 business health score based on verifiable data.
 *
 * Every score component is based on real data — never an AI opinion.
 * Score changes are fully explainable with specific reasons.
 */

// ─── Score Component Weights ─────────────────────────────────────────────────

const COMPONENTS = {
  documentReview: {
    weight: 20,
    label: "Document Review",
    plainLabel: "Business records",
    description: "How complete and reviewed your uploaded documents are",
  },
  reconciliation: {
    weight: 20,
    label: "Reconciliation",
    plainLabel: "Records matching",
    description: "How many reconciliation issues have been resolved",
  },
  receivables: {
    weight: 15,
    label: "Receivables",
    plainLabel: "Customer payments",
    description: "How much is overdue vs total outstanding from customers",
  },
  payables: {
    weight: 15,
    label: "Payables",
    plainLabel: "Your bill payments",
    description: "How current your vendor payments are",
  },
  tdsCompliance: {
    weight: 15,
    label: "TDS Compliance",
    plainLabel: "Tax deductions",
    description: "Whether TDS obligations have been identified and addressed",
  },
  gstHealth: {
    weight: 10,
    label: "GST Health",
    plainLabel: "GST records",
    description: "Whether GST records are complete and reconciled",
  },
  documentation: {
    weight: 5,
    label: "Documentation",
    plainLabel: "Missing documents",
    description: "How many records are missing supporting documents",
  },
};

// ─── Component Score Calculators ─────────────────────────────────────────────

function scoreDocumentReview(documents) {
  const docs = documents || [];
  if (docs.length === 0) return { score: 50, reason: "No documents uploaded yet.", detail: "Upload invoices and bills to improve this score." };

  const total = docs.length;
  const reviewed = docs.filter(d =>
    d.document?.status === "extracted" ||
    (d.extraction?.status === "extracted")
  ).length;

  const needsReview = docs.filter(d =>
    d.document?.status === "needs_review" ||
    (d.extraction?.status === "needs_review")
  ).length;

  const ratio = reviewed / total;
  const score = Math.round(ratio * 100);

  let reason = "";
  let detail = "";

  if (needsReview === 0 && reviewed === total) {
    reason = "All documents reviewed.";
    detail = "Excellent — all uploaded documents have been verified.";
  } else if (needsReview > 0) {
    reason = `${needsReview} document${needsReview !== 1 ? "s" : ""} need review.`;
    detail = `Review ${needsReview} pending document${needsReview !== 1 ? "s" : ""} in Documents to increase this score.`;
  } else {
    reason = `${reviewed} of ${total} documents reviewed.`;
    detail = "Review remaining documents to complete your records.";
  }

  return { score, reason, detail, needsReview, totalDocs: total, reviewed };
}

function scoreReconciliation(reconciliationItems) {
  const items = reconciliationItems || [];
  if (items.length === 0) return { score: 85, reason: "No reconciliation issues found.", detail: "Your records appear consistent." };

  const open = items.filter(i => i.status !== "resolved" && i.status !== "ignored").length;
  const total = items.length;

  if (open === 0) return { score: 100, reason: "All reconciliation items resolved.", detail: "Your records are fully reconciled." };

  const resolvedRatio = (total - open) / total;
  const score = Math.round(resolvedRatio * 100);

  return {
    score,
    reason: `${open} reconciliation issue${open !== 1 ? "s" : ""} open.`,
    detail: `Review and resolve ${open} transaction${open !== 1 ? "s" : ""} in Things to Fix to improve this score.`,
    openItems: open,
    totalItems: total,
  };
}

function scoreReceivables(arData) {
  if (!arData || arData.totalOutstandingMinor === 0) {
    return { score: 90, reason: "No outstanding customer invoices.", detail: "No money is owed to your business from customers." };
  }

  const overdueRatio = arData.totalOverdueMinor / arData.totalOutstandingMinor;

  if (overdueRatio === 0) return { score: 100, reason: "All customer invoices are current.", detail: "No overdue customer payments." };

  // Score decreases proportionally with overdue ratio
  // 0% overdue = 100, 10% overdue = 90, 50% overdue = 50, 100% overdue = 10
  const score = Math.max(10, Math.round((1 - overdueRatio) * 100));

  const overdueRupees = Math.round(arData.totalOverdueMinor / 100);
  const over60 = (arData.aging?.["61_to_90"] || 0) + (arData.aging?.["over_90"] || 0);

  return {
    score,
    reason: `Rs ${overdueRupees.toLocaleString("en-IN")} overdue from customers.`,
    detail: over60 > 0
      ? `Rs ${Math.round(over60 / 100).toLocaleString("en-IN")} is more than 60 days overdue — follow up with customers.`
      : "Follow up with customers on overdue invoices to improve cash flow.",
    overdueRupees,
    overdueRatio: Math.round(overdueRatio * 100),
  };
}

function scorePayables(apData) {
  if (!apData || apData.totalOutstandingMinor === 0) {
    return { score: 90, reason: "No outstanding bills.", detail: "No pending vendor payments." };
  }

  const overdueRatio = apData.totalOverdueMinor / apData.totalOutstandingMinor;

  if (overdueRatio === 0) return { score: 100, reason: "All vendor bills are current.", detail: "No overdue vendor payments." };

  const score = Math.max(10, Math.round((1 - overdueRatio) * 100));
  const overdueRupees = Math.round(apData.totalOverdueMinor / 100);

  return {
    score,
    reason: `Rs ${overdueRupees.toLocaleString("en-IN")} in overdue vendor bills.`,
    detail: "Pay overdue vendor bills to maintain good vendor relationships and avoid penalties.",
    overdueRupees,
  };
}

function scoreTdsCompliance(tdsData) {
  if (!tdsData) return { score: 80, reason: "TDS analysis not available.", detail: "Upload purchase invoices to enable TDS analysis." };

  if (!tdsData.hasObligations) {
    return { score: 100, reason: "No TDS obligations identified.", detail: "No vendor payments require tax deduction based on current records." };
  }

  // TDS obligations exist but unresolved = lower score
  const amount = tdsData.estimatedTdsRupees || 0;
  const vendors = tdsData.vendorsWithTds || 0;

  return {
    score: 45,
    reason: `TDS may be required for ${vendors} vendor${vendors !== 1 ? "s" : ""}.`,
    detail: `Review TDS obligations (estimated Rs ${amount.toLocaleString("en-IN")}) in Taxes section.`,
    estimatedTdsRupees: amount,
  };
}

function scoreGstHealth(gstPreparations, documents) {
  const docs = documents || [];
  const salesDocs = docs.filter(d => d.extraction?.invoiceType === "sales");
  const purchaseDocs = docs.filter(d => d.extraction?.invoiceType === "purchase");

  if (salesDocs.length === 0 && purchaseDocs.length === 0) {
    return { score: 60, reason: "No GST records available.", detail: "Upload sales and purchase invoices to enable GST analysis." };
  }

  const prep = Array.isArray(gstPreparations) ? gstPreparations[0] : gstPreparations;

  if (prep && prep.status === "prepared") {
    return { score: 100, reason: "GST return prepared.", detail: "GST records are complete and prepared for review." };
  }

  if (prep && prep.documentsRequiringReview > 0) {
    return {
      score: 65,
      reason: `${prep.documentsRequiringReview} GST records need review.`,
      detail: `Review ${prep.documentsRequiringReview} document${prep.documentsRequiringReview !== 1 ? "s" : ""} in Taxes to improve GST health.`,
    };
  }

  // Has records but no preparation started
  if (salesDocs.length > 0 || purchaseDocs.length > 0) {
    return {
      score: 75,
      reason: "GST records present but return not prepared.",
      detail: "Start a GST return preparation to complete your GST records.",
    };
  }

  return { score: 60, reason: "GST records incomplete.", detail: "Upload more invoices to improve GST health." };
}

function scoreDocumentation(documents, actionItems) {
  const docs = documents || [];
  const actions = (actionItems || []).filter(a =>
    a.type === "missing_information" && a.status === "open"
  );

  if (docs.length === 0) return { score: 70, reason: "No documents uploaded.", detail: "Upload invoices and bills to improve documentation score." };

  if (actions.length === 0) return { score: 100, reason: "All required documents present.", detail: "Documentation appears complete." };

  const score = Math.max(30, 100 - (actions.length * 15));
  return {
    score,
    reason: `${actions.length} missing document${actions.length !== 1 ? "s" : ""} identified.`,
    detail: "Upload missing documents to complete your business records.",
    missingCount: actions.length,
  };
}

// ─── Main Score Calculator ────────────────────────────────────────────────────

/**
 * Calculates the overall business health score.
 *
 * @param {object} data - Input data
 * @param {Array} data.documents - Array of { document, extraction }
 * @param {Array} data.reconciliationItems - Reconciliation items
 * @param {object} data.arData - From buildAccountsReceivable()
 * @param {object} data.apData - From buildAccountsPayable()
 * @param {object} data.tdsData - From getTdsDashboardSummary()
 * @param {Array} data.gstPreparations - GST preparations
 * @param {Array} data.actionItems - Open action items
 * @returns {object} Health score with breakdown
 */
export function calculateBusinessHealthScore(data = {}) {
  const {
    documents = [],
    reconciliationItems = [],
    arData = null,
    apData = null,
    tdsData = null,
    gstPreparations = [],
    actionItems = [],
  } = data;

  const componentScores = {
    documentReview: scoreDocumentReview(documents),
    reconciliation: scoreReconciliation(reconciliationItems),
    receivables: scoreReceivables(arData),
    payables: scorePayables(apData),
    tdsCompliance: scoreTdsCompliance(tdsData),
    gstHealth: scoreGstHealth(gstPreparations, documents),
    documentation: scoreDocumentation(documents, actionItems),
  };

  // Calculate weighted total
  let totalWeightedScore = 0;
  let totalWeight = 0;
  for (const [key, component] of Object.entries(COMPONENTS)) {
    const rawScore = componentScores[key]?.score || 0;
    totalWeightedScore += rawScore * component.weight;
    totalWeight += component.weight;
  }

  const overallScore = Math.round(totalWeightedScore / totalWeight);

  // Determine grade
  let grade, gradeLabel, gradeColor;
  if (overallScore >= 85) { grade = "A"; gradeLabel = "Excellent"; gradeColor = "green"; }
  else if (overallScore >= 70) { grade = "B"; gradeLabel = "Good"; gradeColor = "blue"; }
  else if (overallScore >= 55) { grade = "C"; gradeLabel = "Fair"; gradeColor = "yellow"; }
  else if (overallScore >= 40) { grade = "D"; gradeLabel = "Needs Attention"; gradeColor = "orange"; }
  else { grade = "F"; gradeLabel = "Critical Issues"; gradeColor = "red"; }

  // Collect the most impactful improvement suggestions
  const improvementAreas = Object.entries(componentScores)
    .map(([key, cs]) => ({
      key,
      label: COMPONENTS[key]?.plainLabel || key,
      score: cs.score,
      reason: cs.reason,
      detail: cs.detail,
      weight: COMPONENTS[key]?.weight || 0,
      impact: Math.round(((100 - cs.score) * (COMPONENTS[key]?.weight || 0)) / 100),
    }))
    .filter(a => a.score < 90)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3);

  return {
    overall: overallScore,
    grade,
    gradeLabel,
    gradeColor,
    calculatedAt: new Date().toISOString(),

    components: Object.entries(componentScores).map(([key, cs]) => ({
      key,
      name: COMPONENTS[key]?.label,
      label: COMPONENTS[key]?.label,
      plainLabel: COMPONENTS[key]?.plainLabel,
      weight: COMPONENTS[key]?.weight,
      score: cs.score,
      maxScore: 100,
      reason: cs.reason,
      description: cs.detail || COMPONENTS[key]?.description,
      detail: cs.detail,
    })),

    improvementAreas,

    // Plain English summary for dashboard
    summaryText: overallScore >= 85
      ? "Your business is in great shape financially."
      : overallScore >= 70
        ? `Your business is doing well. ${improvementAreas[0]?.reason || "A few areas could be improved."}`
        : overallScore >= 55
          ? `A few things need attention. ${improvementAreas[0]?.reason || ""}`
          : `Several things need your attention. ${improvementAreas.map(a => a.reason).join(" ")}`,

    plainEnglish: overallScore >= 85
      ? "Your business is in great shape financially."
      : overallScore >= 70
        ? `Your business is doing well. ${improvementAreas[0]?.reason || "A few areas could be improved."}`
        : overallScore >= 55
          ? `A few things need attention. ${improvementAreas[0]?.reason || ""}`
          : `Several things need your attention. ${improvementAreas.map(a => a.reason).join(" ")}`,

    note: "This score is calculated from records available in Prava. It is not a financial or credit rating.",
  };
}

// ─── Quick Dashboard Summary ─────────────────────────────────────────────────

/**
 * Returns just the score and top issues for the dashboard header.
 */
export function getHealthScoreSummary(data) {
  const result = calculateBusinessHealthScore(data);
  return {
    score: result.overall,
    grade: result.grade,
    gradeLabel: result.gradeLabel,
    gradeColor: result.gradeColor,
    topIssues: result.improvementAreas.slice(0, 2).map(a => ({
      label: a.label,
      reason: a.reason,
    })),
    plainEnglish: result.plainEnglish,
  };
}
