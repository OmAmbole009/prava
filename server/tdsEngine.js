/**
 * Prava TDS Intelligence Engine
 * Analyzes vendor payments to determine TDS applicability, applicable section,
 * applicable rate, threshold status, and deduction amount.
 *
 * Covers: 194C, 194J, 194I, 194Q, 194H, 194A, 194B
 * Financial year: configurable (defaults to current Indian FY)
 */

// ─── TDS Rule Database ───────────────────────────────────────────────────────

/**
 * TDS rules keyed by financial year.
 */
const TDS_RULES = [
  {
    id: "194C_individual",
    section: "194C",
    description: "Payments to contractors and sub-contractors (Individual/HUF)",
    plainDescription: "Payment to an individual or sole proprietor for work or services",
    rate: 1,
    rateHigher: 20,
    singleThreshold: 30000,
    aggregateThreshold: 100000,
    applicableTo: ["individual", "huf"],
    keywords: ["contractor", "labour", "construction", "housekeeping", "security", "transport", "freight", "advertising"],
  },
  {
    id: "194C_company",
    section: "194C",
    description: "Payments to contractors and sub-contractors (Company/Firm)",
    plainDescription: "Payment to a company or firm for work or services",
    rate: 2,
    rateHigher: 20,
    singleThreshold: 30000,
    aggregateThreshold: 100000,
    applicableTo: ["company", "firm", "llp"],
    keywords: ["contractor", "labour", "construction", "housekeeping", "security", "transport", "freight", "advertising"],
  },
  {
    id: "194J_professional",
    section: "194J",
    description: "Professional fees (legal, medical, engineering, CA, etc.)",
    plainDescription: "Payment for professional services like legal, CA, consulting, medical",
    rate: 10,
    rateHigher: 20,
    singleThreshold: 30000,
    aggregateThreshold: 30000,
    applicableTo: ["all"],
    keywords: ["legal", "advocate", "lawyer", "ca ", "chartered accountant", "doctor", "medical", "engineer", "architect", "consultant", "advisory", "professional"],
  },
  {
    id: "194J_technical",
    section: "194J",
    description: "Technical service fees (IT, software, cloud, technical)",
    plainDescription: "Payment for technical services like software, IT, cloud services",
    rate: 2,
    rateHigher: 20,
    singleThreshold: 30000,
    aggregateThreshold: 30000,
    applicableTo: ["all"],
    keywords: ["software", "it service", "cloud", "saas", "technical", "data", "maintenance", "amc", "managed service"],
  },
  {
    id: "194I_building",
    section: "194I",
    description: "Rent for land, building, or furniture",
    plainDescription: "Rent paid for office space, land, or furniture",
    rate: 10,
    rateHigher: 20,
    singleThreshold: 0,
    aggregateThreshold: 240000,
    applicableTo: ["all"],
    keywords: ["rent", "lease", "office space", "commercial space", "building", "land", "premises"],
  },
  {
    id: "194I_plant",
    section: "194I",
    description: "Rent for plant, machinery, or equipment",
    plainDescription: "Rent paid for machinery or equipment",
    rate: 2,
    rateHigher: 20,
    singleThreshold: 0,
    aggregateThreshold: 240000,
    applicableTo: ["all"],
    keywords: ["plant", "machinery", "equipment", "vehicle hire", "generator"],
  },
  {
    id: "194Q",
    section: "194Q",
    description: "Purchase of goods (buyer turnover > Rs 10 Cr)",
    plainDescription: "Purchase of goods from a seller exceeding Rs 50 lakh in a year",
    rate: 0.1,
    rateHigher: 5,
    singleThreshold: 0,
    aggregateThreshold: 5000000,
    applicableTo: ["all"],
    keywords: ["purchase", "goods", "stock", "inventory", "material", "product"],
  },
  {
    id: "194H",
    section: "194H",
    description: "Commission or brokerage",
    plainDescription: "Commission or brokerage payment to an agent or broker",
    rate: 5,
    rateHigher: 20,
    singleThreshold: 0,
    aggregateThreshold: 15000,
    applicableTo: ["all"],
    keywords: ["commission", "brokerage", "agent", "broker", "referral fee", "incentive"],
  },
  {
    id: "194A",
    section: "194A",
    description: "Interest (other than on securities)",
    plainDescription: "Interest paid to a person (not on securities/bonds)",
    rate: 10,
    rateHigher: 20,
    singleThreshold: 0,
    aggregateThreshold: 5000,
    applicableTo: ["all"],
    keywords: ["interest", "loan interest", "late payment interest"],
  },
];

// ─── Financial Year Helpers ───────────────────────────────────────────────────

export function getCurrentIndianFY() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(2)}`;
}

export function getIndianFYForDate(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  const fyStart = month >= 4 ? year : year - 1;
  return `${fyStart}-${String(fyStart + 1).slice(2)}`;
}

// ─── Section Determination ────────────────────────────────────────────────────

function inferVendorType(vendorName) {
  const name = (vendorName || "").toLowerCase();
  if (
    name.includes("pvt") || name.includes("private") || name.includes(" ltd") ||
    name.includes("limited") || name.includes(" llp") || name.includes("llc") ||
    name.includes(" inc") || name.includes("corp") || name.includes("technologies") ||
    name.includes("solutions") || name.includes("services") || name.includes("systems")
  ) return "company";
  if (name.includes("& co") || name.includes("associates") || name.includes("& associates") ||
    name.includes("firm") || name.includes("partners") || name.includes("& partners")) return "firm";
  return "individual";
}

function inferPaymentCategory(ext) {
  const vendor = (ext.vendorName || "").toLowerCase();
  const data = (typeof ext.extractedData === "string" ? ext.extractedData : JSON.stringify(ext.extractedData || "")).toLowerCase();

  if (vendor.includes("rent") || vendor.includes("property") || vendor.includes("realty") || vendor.includes("estate")) return "rent building";
  if (vendor.includes("aws") || vendor.includes("amazon web") || vendor.includes("azure") || vendor.includes("google cloud") || vendor.includes("microsoft") || data.includes("cloud")) return "cloud technical service";
  if (vendor.includes("consulting") || vendor.includes("advisory") || vendor.includes("associates") || data.includes("consulting")) return "professional consulting";
  if (vendor.includes("security") || vendor.includes("housekeeping") || vendor.includes("facility") || vendor.includes("cleaning")) return "contractor services";
  if (vendor.includes("advocate") || vendor.includes("law") || vendor.includes("legal") || vendor.includes("attorney")) return "legal professional";
  if (data.includes("software") || data.includes("saas") || data.includes("subscription")) return "software technical service";
  if (data.includes("rent") || data.includes("lease")) return "rent building";
  if (data.includes("contractor") || data.includes("labour")) return "contractor";
  if (data.includes("commission") || data.includes("brokerage")) return "commission";
  return "general service";
}

export function determineApplicableTdsRule(payment) {
  const nameLC = (payment.vendorName || "").toLowerCase();
  const categoryLC = (payment.paymentCategory || "").toLowerCase();
  const searchText = `${nameLC} ${categoryLC}`;
  const vendorType = (payment.vendorType || inferVendorType(payment.vendorName)).toLowerCase();

  let bestRule = null;
  let bestScore = 0;

  for (const rule of TDS_RULES) {
    const typeOk = rule.applicableTo.includes("all") || rule.applicableTo.includes(vendorType);
    if (!typeOk) continue;

    const matchedKeywords = rule.keywords.filter(kw => searchText.includes(kw));
    if (matchedKeywords.length > bestScore) {
      bestScore = matchedKeywords.length;
      bestRule = rule;
    }
  }

  // Default: 194J technical for unmatched company vendors
  if (!bestRule && vendorType === "company") {
    bestRule = TDS_RULES.find(r => r.id === "194J_technical") || null;
  }

  return bestRule;
}

// ─── TDS Calculation ─────────────────────────────────────────────────────────

export function analyzeTdsForPayment(payment, cumulativePaidSoFar = 0, options = {}) {
  const { hasPan = true } = options;
  const amountMinor = payment.amountMinor || 0;

  const rule = determineApplicableTdsRule(payment);

  if (!rule) {
    return {
      applicable: false,
      reason: "No TDS rule matched for this payment type.",
      plainReason: "This payment type does not appear to require tax deduction based on available information.",
      amountMinor,
      tdsMinor: 0,
      netPaymentMinor: amountMinor,
      section: null,
      rate: 0,
    };
  }

  const cumulativeAfter = cumulativePaidSoFar + amountMinor;
  const aggregateThresholdMinor = rule.aggregateThreshold * 100;
  const singleThresholdMinor = rule.singleThreshold * 100;

  const exceedsSingle = singleThresholdMinor > 0 && amountMinor > singleThresholdMinor;
  const exceedsAggregate = aggregateThresholdMinor > 0 && cumulativeAfter > aggregateThresholdMinor;
  const thresholdExceeded = exceedsSingle || exceedsAggregate;

  if (!thresholdExceeded) {
    const remaining = Math.max(0, aggregateThresholdMinor - cumulativePaidSoFar);
    return {
      applicable: false,
      reason: `Below threshold. Cumulative: Rs ${Math.round(cumulativePaidSoFar / 100).toLocaleString("en-IN")}, Threshold: Rs ${rule.aggregateThreshold.toLocaleString("en-IN")}`,
      plainReason: `Payments to this vendor are below the Rs ${rule.aggregateThreshold.toLocaleString("en-IN")} yearly limit. You can pay Rs ${Math.round(remaining / 100).toLocaleString("en-IN")} more before TDS is required.`,
      amountMinor,
      tdsMinor: 0,
      netPaymentMinor: amountMinor,
      section: rule.section,
      rule,
      thresholdStatus: {
        singleThreshold: rule.singleThreshold,
        aggregateThreshold: rule.aggregateThreshold,
        cumulativePaidRupees: Math.round(cumulativePaidSoFar / 100),
        thresholdExceeded: false,
      },
    };
  }

  const effectiveRate = hasPan ? rule.rate : rule.rateHigher;

  // Calculate TDS on portion exceeding aggregate threshold when first crossed
  let tdsableAmountMinor = amountMinor;
  if (!exceedsSingle && exceedsAggregate && cumulativePaidSoFar < aggregateThresholdMinor) {
    tdsableAmountMinor = cumulativeAfter - aggregateThresholdMinor;
  }

  const tdsMinor = Math.round(tdsableAmountMinor * effectiveRate / 100);
  const netPaymentMinor = amountMinor - tdsMinor;

  return {
    applicable: true,
    section: rule.section,
    rule,
    rate: effectiveRate,
    hasPan,
    amountMinor,
    tdsMinor,
    netPaymentMinor,
    tdsableAmountMinor,

    plainReason: `Payments for "${rule.plainDescription}" require tax to be deducted before paying the recipient, under Section ${rule.section} of the Income Tax Act.`,
    whyNow: exceedsAggregate
      ? `Your total payments to this vendor this year have crossed Rs ${rule.aggregateThreshold.toLocaleString("en-IN")}, which triggers TDS.`
      : `This payment of Rs ${Math.round(amountMinor / 100).toLocaleString("en-IN")} exceeds the Rs ${rule.singleThreshold.toLocaleString("en-IN")} single-payment limit.`,

    calculation: {
      paymentAmountRupees: Math.round(amountMinor / 100),
      applicableSection: rule.section,
      sectionDescription: rule.description,
      tdsRatePercent: effectiveRate,
      tdsableAmountRupees: Math.round(tdsableAmountMinor / 100),
      tdsAmountRupees: Math.round(tdsMinor / 100),
      amountRecipientReceivesRupees: Math.round(netPaymentMinor / 100),
      depositDue: "7th of the following month via Challan 281",
      reportingForm: "Form 26Q (Quarterly)",
      penaltyIfMissed: "30% of expense disallowed under Section 40(a)(ia) if TDS not deducted/deposited",
    },

    thresholdStatus: {
      singleThreshold: rule.singleThreshold,
      aggregateThreshold: rule.aggregateThreshold,
      cumulativePaidRupees: Math.round(cumulativePaidSoFar / 100),
      cumulativeAfterRupees: Math.round(cumulativeAfter / 100),
      thresholdExceeded: true,
      exceedsSingle,
      exceedsAggregate,
    },
  };
}

// ─── Batch Analysis ───────────────────────────────────────────────────────────

export function analyzeTdsForBusiness(extractions) {
  const fy = getCurrentIndianFY();
  const purchaseExtractions = (extractions || []).filter(e =>
    e.extraction?.invoiceType === "purchase" &&
    e.extraction?.vendorName &&
    (e.extraction?.totalMinor || 0) > 0
  );

  // Group by vendor
  const vendorMap = new Map();
  for (const item of purchaseExtractions) {
    const ext = item.extraction;
    const vendorKey = (ext.vendorName || "Unknown").toLowerCase().trim();
    if (!vendorMap.has(vendorKey)) {
      vendorMap.set(vendorKey, {
        vendorName: ext.vendorName,
        vendorGstin: ext.gstin || null,
        payments: [],
        cumulativeMinor: 0,
      });
    }
    const vendor = vendorMap.get(vendorKey);
    vendor.payments.push({
      documentId: item.document?.id,
      invoiceNumber: ext.invoiceNumber,
      invoiceDate: ext.invoiceDate,
      amountMinor: ext.totalMinor || 0,
      taxableValueMinor: ext.taxableValueMinor || 0,
      vendorName: ext.vendorName,
      paymentCategory: inferPaymentCategory(ext),
      vendorType: inferVendorType(ext.vendorName),
    });
    vendor.cumulativeMinor += (ext.totalMinor || 0);
  }

  const vendorAnalyses = [];
  let totalTdsRequired = 0;
  let vendorsWithTds = 0;

  for (const [, vendor] of vendorMap) {
    let cumulative = 0;
    const paymentAnalyses = [];

    for (const payment of vendor.payments) {
      const analysis = analyzeTdsForPayment(payment, cumulative, {
        hasPan: Boolean(vendor.vendorGstin),
      });
      cumulative += payment.amountMinor;
      paymentAnalyses.push({
        ...analysis,
        invoiceNumber: payment.invoiceNumber,
        invoiceDate: payment.invoiceDate,
        documentId: payment.documentId,
      });
      if (analysis.applicable) {
        totalTdsRequired += analysis.tdsMinor;
      }
    }

    const hasTds = paymentAnalyses.some(p => p.applicable);
    if (hasTds) vendorsWithTds++;

    vendorAnalyses.push({
      vendorName: vendor.vendorName,
      vendorGstin: vendor.vendorGstin,
      cumulativeRupees: Math.round(vendor.cumulativeMinor / 100),
      hasTdsObligation: hasTds,
      totalTdsMinor: paymentAnalyses.reduce((s, p) => s + (p.tdsMinor || 0), 0),
      totalTdsRupees: Math.round(paymentAnalyses.reduce((s, p) => s + (p.tdsMinor || 0), 0) / 100),
      payments: paymentAnalyses,
    });
  }

  return {
    financialYear: fy,
    analysisDate: new Date().toISOString(),
    totalVendorsAnalyzed: vendorMap.size,
    vendorsWithTdsObligation: vendorsWithTds,
    totalTdsRequiredMinor: totalTdsRequired,
    totalTdsRequiredRupees: Math.round(totalTdsRequired / 100),
    vendors: vendorAnalyses.filter(v => v.hasTdsObligation),
    allVendors: vendorAnalyses,
    summary: {
      hasTdsObligations: vendorsWithTds > 0,
      plainEnglish: vendorsWithTds > 0
        ? `Tax may need to be deducted from payments to ${vendorsWithTds} vendor${vendorsWithTds !== 1 ? "s" : ""}. Estimated amount: Rs ${Math.round(totalTdsRequired / 100).toLocaleString("en-IN")}.`
        : "No TDS obligations identified based on current payment records.",
      estimatedTdsRupees: Math.round(totalTdsRequired / 100),
    },
  };
}

export function getTdsDashboardSummary(extractions) {
  const analysis = analyzeTdsForBusiness(extractions);
  return {
    hasObligations: analysis.vendorsWithTdsObligation > 0,
    vendorsWithTds: analysis.vendorsWithTdsObligation,
    estimatedTdsMinor: analysis.totalTdsRequiredMinor,
    estimatedTdsRupees: analysis.totalTdsRequiredRupees,
    financialYear: analysis.financialYear,
    plainEnglish: analysis.summary.plainEnglish,
    depositDue: "7th of the following month",
  };
}

export function determineTdsSection({ description = "", vendorName = "", vendorType = "company" } = {}) {
  const rule = determineApplicableTdsRule({
    vendorName,
    paymentCategory: description,
    vendorType,
  });
  return rule ? {
    section: rule.section,
    rate: rule.rate,
    singleThreshold: rule.singleThreshold,
    aggregateThreshold: rule.aggregateThreshold,
    rule,
  } : { section: null, rate: 0 };
}

export function calculateTdsForPayment({
  amount = 0,
  section = null,
  vendorName = "",
  vendorPan = null,
  vendorType = "company",
  priorFyPayments = 0,
  description = "",
} = {}) {
  const amountMinor = Math.round(amount * 100);
  const priorMinor = Math.round(priorFyPayments * 100);

  // If section is provided explicitly, find rule for that section
  let paymentCat = description;
  if (section) {
    if (section === "194J") paymentCat = paymentCat || "professional fee consulting";
    else if (section === "194C") paymentCat = paymentCat || "contractor work";
    else if (section === "194I") paymentCat = paymentCat || "rent building";
  }

  const analysis = analyzeTdsForPayment(
    {
      amountMinor,
      vendorName,
      vendorType,
      paymentCategory: paymentCat,
    },
    priorMinor,
    { hasPan: Boolean(vendorPan) }
  );

  return {
    isApplicable: analysis.applicable,
    section: analysis.section,
    applicableRate: analysis.rate,
    tdsAmount: Math.round((analysis.tdsMinor || 0) / 100),
    netPayable: Math.round((analysis.netPaymentMinor || 0) / 100),
    reason: analysis.plainReason || analysis.reason,
    explanation: analysis.plainReason,
    panWarning: !analysis.hasPan,
    aggregateThresholdExceeded: analysis.thresholdStatus?.exceedsAggregate || false,
    ...analysis,
  };
}

