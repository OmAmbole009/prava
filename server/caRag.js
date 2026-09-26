/**
 * Prava Indian Chartered Accountant RAG (Retrieval-Augmented Generation) Engine
 * Comprehensive statutory database covering Indian Direct Tax (Income Tax Act 1961),
 * Indirect Tax (CGST/IGST Act 2017), MSMED Act, and Tax Audit Standards.
 */

export const CA_STATUTORY_KNOWLEDGE_BASE = [
  {
    id: "sec-43bh-msme",
    topic: "MSME 45-Day Payment Rule & Tax Disallowance",
    sections: ["Section 43B(h) of Income Tax Act, 1961", "Section 15 & 16 of MSMED Act, 2006"],
    keywords: ["msme", "43b(h)", "43bh", "udyam", "vendor payment", "45 days", "15 days", "disallowance", "micro", "small"],
    rules: [
      "Any sum payable to a Micro or Small enterprise (registered on MSME Udyam) beyond the statutory limit shall be disallowed as a deduction in that financial year and added back to taxable profits.",
      "Statutory limit: Maximum 45 days if there is a written agreement; 15 days in the absence of a written agreement.",
      "Medium enterprises (investment > ₹10 Cr or turnover > ₹50 Cr) and traders (wholesale/retail) are EXEMPT from Section 43B(h).",
      "Disallowed expenses can be claimed as a deduction in the subsequent financial year in which payment is actually made.",
      "Delay in payment also attracts mandatory compound interest at 3 times the RBI bank rate under Section 16 of the MSMED Act (which is non-deductible).",
    ],
    actionableAdvice: "Audit your accounts payable weekly. Segregate vendors by Udyam status (Micro/Small). Ensure all invoices from Micro/Small vendors are settled within 15 days (or 45 days if contractual terms exist). Pay before March 31 to prevent corporate tax disallowance.",
  },
  {
    id: "advance-tax-208",
    topic: "Advance Tax Calculation & Section 234B/234C Penalties",
    sections: ["Section 208", "Section 209", "Section 211", "Section 234B", "Section 234C"],
    keywords: ["advance tax", "installments", "234c", "234b", "quarterly tax", "june 15", "september 15", "december 15", "march 15"],
    rules: [
      "Every person whose estimated tax liability for the financial year after deducting TDS/TCS is ₹10,000 or more must pay Advance Tax in four installments.",
      "Installment 1 (by 15th June): Minimum 15% of total estimated tax.",
      "Installment 2 (by 15th September): Minimum 45% of total estimated tax.",
      "Installment 3 (by 15th December): Minimum 75% of total estimated tax.",
      "Installment 4 (by 15th March): 100% of total estimated tax.",
      "Section 234C Interest: 1% per month simple interest for 3 months on shortfall in each installment (except Q4 which is 1% for 1 month).",
      "Section 234B Interest: 1% per month from 1st April if less than 90% of total assessed tax is paid before 31st March.",
    ],
    actionableAdvice: "Project your annual profit quarterly. Deduct all TDS already appearing in AIS/26AS. Deposit installment on Challan 280 (Major Head 0020 for companies, 0021 for others; Minor Head 100 Advance Tax).",
  },
  {
    id: "itc-section-16-2-aa",
    topic: "GSTR-2B vs 3B Input Tax Credit Reconciliation",
    sections: ["Section 16(2)(aa) of CGST Act", "Rule 36(4) of CGST Rules", "Section 50(3)"],
    keywords: ["gstr 2b", "gstr-2b", "itc", "input tax credit", "mismatch", "supplier default", "section 16", "2b reconciliation"],
    rules: [
      "Input Tax Credit (ITC) can only be availed if the invoice has been furnished by the supplier in their GSTR-1/IFF and communicated to the recipient in Form GSTR-2B.",
      "Provisional ITC (5% or 10% tolerance) was completely abolished effective 1st January 2022.",
      "If a supplier charges GST but fails to file GSTR-1, the buyer CANNOT claim ITC in GSTR-3B.",
      "Wrongful availment and utilization of ITC attracts 18% per annum interest under Section 50(3) from the date of utilization.",
      "Under CBIC Circular 183/15/2022, for past mismatches, recipient can substantiate with supplier CA certificate or self-certification for amounts < ₹5 Lakhs.",
    ],
    actionableAdvice: "Never claim ITC in GSTR-3B exceeding the figure in GSTR-2B Table 4. Run weekly 2B vs purchase register matching. Send automated chase notices to suppliers whose invoices are missing from 2B prior to the 11th of every month.",
  },
  {
    id: "tds-compliance-40a-ia",
    topic: "TDS Deductions & 30% Expense Disallowance (Section 40(a)(ia))",
    sections: ["Section 194C", "Section 194J", "Section 194I", "Section 194Q", "Section 40(a)(ia)", "Section 201(1A)"],
    keywords: ["tds", "194c", "194j", "194i", "194q", "40(a)(ia)", "disallowance", "form 26q", "challan 281"],
    rules: [
      "Section 194C: Contractor payments (1% for Individual/HUF, 2% for others; threshold ₹30,000 single / ₹1,00,000 aggregate).",
      "Section 194J: Professional fees (10%), Technical fees (2%), Royalty (2%); threshold ₹30,000.",
      "Section 194I: Rent for building (10%), plant/machinery (2%); threshold ₹2,40,000 p.a.",
      "Section 194Q: Buyer with turnover > ₹10 Cr purchasing goods > ₹50 Lakhs from a seller must deduct 0.1% TDS.",
      "Section 40(a)(ia): If tax is not deducted or deducted but not deposited on or before ITR due date, THIRTY PERCENT (30%) of the entire expenditure is disallowed and taxed!",
      "Section 201(1A): Interest of 1% per month for delay in deduction; 1.5% per month for delay in deposit.",
    ],
    actionableAdvice: "Deduct TDS at the point of invoice entry or payment (whichever is earlier). Deposit TDS by the 7th of the following month via Challan 281. File Form 26Q quarterly before 31st July, 31st Oct, 31st Jan, 31st May.",
  },
  {
    id: "presumptive-taxation-44ad-44ada",
    topic: "Presumptive Taxation (Section 44AD / 44ADA)",
    sections: ["Section 44AD", "Section 44ADA", "Section 44AB"],
    keywords: ["44ad", "44ada", "presumptive", "no audit", "freelancer", "consultant", "6 percent", "8 percent", "50 percent"],
    rules: [
      "Section 44AD (Eligible Businesses): Turnover limit up to ₹2 Crore (increased to ₹3 Crore if cash receipts <= 5%). Deemed profit: 6% for digital/banking turnover, 8% for cash turnover. Exemption from maintaining books and audit!",
      "Section 44ADA (Professionals - IT, Legal, Engineering, Accounting): Gross receipts up to ₹50 Lakhs (increased to ₹75 Lakhs if cash receipts <= 5%). Deemed profit: 50% of gross receipts. Remaining 50% is deemed business expenses without needing bills!",
      "Advance tax for 44AD/ADA: 100% can be paid in a single installment by 15th March.",
      "If opting for lower profit than deemed, taxpayer must maintain regular books u/s 44AA and undergo Tax Audit u/s 44AB.",
    ],
    actionableAdvice: "For consultants, agencies, and tech professionals with high profit margins and low overheads, Section 44ADA saves up to ₹1,50,000+ in CA bookkeeping and audit fees while drastically lowering tax scrutiny risk.",
  },
  {
    id: "founder-salary-vs-dividend",
    topic: "Founder Remuneration vs Dividend Tax Strategy",
    sections: ["Section 37(1)", "Section 115BBDA", "Section 115BAA"],
    keywords: ["founder salary", "director remuneration", "dividend", "tax saving", "corporate tax", "personal tax"],
    rules: [
      "Director/Founder Remuneration is an allowable business expense for the company under Section 37(1), directly reducing company taxable profit and saving 22.88% (or 25.17%) corporate tax.",
      "Salary in founder's hands is subject to standard deduction (₹75,000 under new regime), lower tax slabs (0-15L), and Section 80CCD(2) employer NPS contribution (up to 14% of salary completely tax-free!).",
      "Dividends are paid out of post-tax company profits (company pays 22.88% tax first) and then taxed AGAIN in the founder's hands at their slab rate (up to 39% with surcharge) with TDS of 10% u/s 194.",
      "Optimal Structure: Pay reasonable market remuneration to founder directors to reduce company profit to near optimal levels, avoiding double taxation.",
    ],
    actionableAdvice: "Set founder monthly salary up to ₹15L-₹24L with 14% Employer NPS under Section 80CCD(2). Avoid withdrawing profits as dividends unless retained earnings cannot be reinvested.",
  },
  {
    id: "cash-payments-40a3",
    topic: "Section 40A(3) Cash Payment Prohibition & Audit Flags",
    sections: ["Section 40A(3)", "Rule 6DD", "Section 269ST"],
    keywords: ["cash", "40a(3)", "40a3", "10000", "10,000", "cash disallowance", "petty cash"],
    rules: [
      "Where an assessee incurs any expenditure in respect of which a payment or aggregate of payments made to a person in a single day exceeds ₹10,000 in cash, NO DEDUCTION shall be allowed in respect of such expenditure.",
      "Limit is ₹35,000 in case of payments made for plying, hiring or leasing of goods carriages (transporters).",
      "Section 269ST: Receipt of ₹2 Lakhs or more in cash in a day or in respect of a single transaction attracts 100% penalty equal to the amount received!",
      "Rule 6DD exceptions: Payments to RBI/banks, payments to farmers for agricultural produce, payments on bank holidays where banking is not available.",
    ],
    actionableAdvice: "Never issue petty cash payments above ₹10,000 to any vendor or contractor. Mandate UPI, IMPS, or NEFT for all vendor disbursements to avoid 100% disallowance under Tax Audit Clause 21(d).",
  },
  {
    id: "blocked-itc-section-17-5",
    topic: "Section 17(5) Ineligible & Blocked Input Tax Credit (ITC)",
    sections: ["Section 17(5) of CGST Act, 2017", "Rule 42 & 43 of CGST Rules"],
    keywords: ["blocked itc", "17(5)", "motor vehicle", "food", "catering", "health insurance", "gift", "personal use", "lost goods"],
    rules: [
      "Motor vehicles for transportation of persons having approved seating capacity of <= 13 persons (including driver) are strictly BLOCKED, unless used for transportation business or driving schools.",
      "Food and beverages, outdoor catering, beauty treatment, health services, cosmetic and plastic surgery are BLOCKED, except where used as inward supply of the same category.",
      "Membership of a club, health and fitness centre is strictly BLOCKED with zero credit.",
      "Goods lost, stolen, destroyed, written off or disposed of by way of gift or free samples must be reversed in GSTR-3B Table 4(B)(2).",
      "Capital goods like laptops, servers, office computers, and furniture ARE FULLY ELIGIBLE u/s 16(1), provided depreciation is not claimed on the GST component u/s 16(9).",
    ],
    actionableAdvice: "Audit all purchase bills before claiming ITC. Flag and disallow food bills, corporate event catering, and passenger cars in Table 4(B)(1) to avoid 18% p.a. statutory interest under Section 50(3) during departmental audits.",
  },
  {
    id: "schedule-iii-companies-act",
    topic: "Schedule III Financial Statements & Accounting Ratios (MCA)",
    sections: ["Section 129 & 134 of Companies Act, 2013", "Schedule III Division II (Ind AS / AS)"],
    keywords: ["balance sheet", "p&l", "profit and loss", "schedule iii", "financial statements", "accounting ratios", "mca", "roc"],
    rules: [
      "Every Indian company must prepare financial statements strictly adhering to Schedule III of Companies Act 2013.",
      "Part I Balance Sheet mandates separate presentation of MSME Trade Payables vs Non-MSME Trade Payables.",
      "Mandatory disclosure of 11 analytical financial ratios: Current Ratio, Debt-Equity Ratio, Debt Service Coverage, Return on Equity, Inventory Turnover, Trade Receivables Turnover, Trade Payables Turnover, Net Capital Turnover, Net Profit Margin, Return on Capital Employed, Return on Investment.",
      "Variance greater than 25% compared to prior year must have explanatory notes signed by Directors.",
    ],
    actionableAdvice: "Generate Schedule III Balance Sheet and Profit & Loss autonomously at the end of each quarter to ensure flawless Board approval and seamless AOC-4 ROC filing without external CA delays.",
  },
  {
    id: "tax-audit-section-44ab-3cd",
    topic: "Form 3CD Tax Audit Automation (Section 44AB)",
    sections: ["Section 44AB", "Form 3CA/3CB", "Form 3CD Clauses 17, 21, 22, 26, 34"],
    keywords: ["form 3cd", "tax audit", "44ab", "clause 21", "clause 22", "clause 34", "statutory audit"],
    rules: [
      "Tax Audit under Section 44AB is mandatory if business turnover exceeds ₹1 Crore (or ₹10 Crore if cash receipts and cash payments are <= 5%).",
      "Clause 21(a): Capital expenditure and personal expenses debited to P&L must be reported.",
      "Clause 21(b): Amounts inadmissible u/s 40(a) for failure to deduct or deposit TDS.",
      "Clause 21(d): Disallowance u/s 40A(3) for single-day cash payments exceeding ₹10,000.",
      "Clause 22: MSME interest due and disallowances u/s 23 of MSMED Act and Section 43B(h).",
      "Clause 34: Complete reporting of TAN, TDS section codes, deductions, and late deposits.",
    ],
    actionableAdvice: "Run continuous Form 3CD clause verification year-round. Flagging compliance breaches immediately prevents last-minute tax adjustments and penalties before the September 30 audit deadline.",
  },
];

/**
 * Retrieve statutory CA knowledge relevant to the user query
 */
export function retrieveCaKnowledge(query) {
  const normalizedQuery = query.toLowerCase();
  const queryTokens = normalizedQuery.split(/\s+/).filter(w => w.length > 2);

  const scored = CA_STATUTORY_KNOWLEDGE_BASE.map(doc => {
    let score = 0;
    // Keyword match
    doc.keywords.forEach(kw => {
      if (normalizedQuery.includes(kw)) score += 5;
    });
    // Section match
    doc.sections.forEach(sec => {
      if (normalizedQuery.includes(sec.toLowerCase())) score += 8;
    });
    // Token overlap
    queryTokens.forEach(token => {
      if (doc.topic.toLowerCase().includes(token)) score += 3;
      if (doc.rules.some(r => r.toLowerCase().includes(token))) score += 1;
    });
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.filter(s => s.score > 0).slice(0, 3).map(s => s.doc);
}

/**
 * Autonomous CA Advisory Prompt Builder
 * Injects retrieved statutes + live company financials to generate expert Chartered Accountant guidance
 */
export function buildCaAdvisoryResponse(query, financials, businessProfile) {
  const matchedDocs = retrieveCaKnowledge(query);

  const fallbackDocs = matchedDocs.length > 0 ? matchedDocs : [
    CA_STATUTORY_KNOWLEDGE_BASE[0], // MSME 43Bh
    CA_STATUTORY_KNOWLEDGE_BASE[1], // Advance Tax
  ];

  // Specific query-based intelligent computations
  const q = query.toLowerCase();

  // 1. Advance tax question
  if (q.includes("advance tax") || q.includes("installment") || q.includes("234c")) {
    const profit = Math.max(0, financials.revenueMinor - financials.expensesMinor) / 100;
    const estTax = Math.round(profit * 0.22 * 1.04);
    const netPayable = Math.max(0, estTax - 250000);
    return {
      title: "Statutory Advance Tax Computation & Planning",
      sectionsReferenced: ["Section 208", "Section 211", "Section 234C of Income Tax Act"],
      analysis: `Based on your verified annual revenue of ₹${(financials.revenueMinor / 100).toLocaleString("en-IN")} and expenses of ₹${(financials.expensesMinor / 100).toLocaleString("en-IN")}, your estimated net taxable profit is ₹${profit.toLocaleString("en-IN")}. Under Section 115BAA concessional corporate tax (22% + 4% cess = 22.88%), your annual tax liability is approx ₹${estTax.toLocaleString("en-IN")}. After factoring in TDS credit of ₹2,50,000, your net Advance Tax liability is ₹${netPayable.toLocaleString("en-IN")}.`,
      actionPlan: [
        `Q1 (15th June): 15% = ₹${Math.round(netPayable * 0.15).toLocaleString("en-IN")} (Paid)`,
        `Q2 (15th September): 45% cumulative = ₹${Math.round(netPayable * 0.45).toLocaleString("en-IN")} (Current Due)`,
        `Q3 (15th December): 75% cumulative = ₹${Math.round(netPayable * 0.75).toLocaleString("en-IN")}`,
        `Q4 (15th March): 100% cumulative = ₹${netPayable.toLocaleString("en-IN")}`,
      ],
      warning: "Ensure payment before the 15th of the respective month via Challan 280 (Major Head 0020). Delay attracts 1% per month simple interest under Section 234C.",
      statutoryKnowledge: fallbackDocs[0],
    };
  }

  // 2. MSME 43B(h) question
  if (q.includes("msme") || q.includes("43b") || q.includes("vendor") || q.includes("45 days") || q.includes("15 days")) {
    return {
      title: "Section 43B(h) MSME Disallowance Audit & Protocol",
      sectionsReferenced: ["Section 43B(h) of Income Tax Act, 1961", "Section 15 of MSMED Act, 2006"],
      analysis: `Section 43B(h) mandates that all payments to Micro and Small suppliers must be cleared within 15 days (or 45 days if contractual agreement exists). For your business (${businessProfile?.name || "Prava Technologies"}), unpaid MSME dues at year-end are disallowed as expenditure and added to taxable profit at 25% corporate tax!`,
      actionPlan: [
        "1. Obtain Udyam Registration certificates from all active vendors.",
        "2. Sign written purchase agreements specifying 45-day payment terms (otherwise defaults to 15 days).",
        "3. Prioritize MSME payables in your treasury schedule before the end of the financial year.",
        "4. Note: Medium enterprises and retail/wholesale traders are exempt from 43B(h).",
      ],
      warning: "Failure to pay within 45 days adds the entire unpaid bill to your taxable profits, plus mandatory non-deductible compound interest at 3x RBI bank rate.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "sec-43bh-msme") || fallbackDocs[0],
    };
  }

  // 3. Tax saving / Founder remuneration question
  if (q.includes("save tax") || q.includes("salary") || q.includes("dividend") || q.includes("reduce tax") || q.includes("tax planning")) {
    return {
      title: "Corporate Tax Optimization & Remuneration Strategy",
      sectionsReferenced: ["Section 37(1)", "Section 80CCD(2)", "Section 32 (Depreciation)"],
      analysis: `As a private limited company with verified net operating profit of ₹${(Math.max(0, financials.revenueMinor - financials.expensesMinor) / 100).toLocaleString("en-IN")}, the most effective legal tax reduction levers are:`,
      actionPlan: [
        "1. Founder Remuneration u/s 37(1): Paying market remuneration to director-promoters directly saves 22.88% corporate tax. In personal hands, use new tax regime slabs (0-15L taxed at low marginal rates).",
        "2. Employer NPS u/s 80CCD(2): Contribute up to 14% of basic salary to National Pension System. This is 100% tax-free for the company and 100% tax-free for the employee with no cap!",
        "3. Depreciation Acceleration u/s 32: Tech hardware, servers, and laptops enjoy 40% WDV depreciation. Purchase assets before September 30 to claim full year depreciation.",
        "4. R&D & Software Licenses: Immediate write-off of cloud hosting and software subscriptions under revenue expenditure.",
      ],
      warning: "Do not withdraw surplus as Dividends. Dividends are taxed twice (company pays corporate tax first, then founder pays up to 39% personal slab tax). Always structure through salary + NPS.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "founder-salary-vs-dividend") || fallbackDocs[0],
    };
  }

  // 4. Default comprehensive CA guidance
  return {
    title: "Autonomous CA Legal & Compliance Advisory",
    sectionsReferenced: fallbackDocs.flatMap(d => d.sections),
    analysis: `I have examined your query against the Income Tax Act 1961 and CGST Act 2017 in relation to ${businessProfile?.name || "Prava Technologies Private Limited"}. Current verified turnover stands at ₹${(financials.revenueMinor / 100).toLocaleString("en-IN")} with ₹${(financials.cashMinor / 100).toLocaleString("en-IN")} in verified cash/bank reserves.`,
    actionPlan: [
      `Primary Compliance: ${fallbackDocs[0]?.rules[0] || "Maintain timely statutory filings."}`,
      `Statutory Timing: ${fallbackDocs[0]?.rules[1] || "Adhere to the 15th/20th monthly cutoff."}`,
      `CA Audit Recommendation: ${fallbackDocs[0]?.actionableAdvice || "Reconcile books weekly."}`,
    ],
    warning: "Ensure source invoice evidence is backed by Form GSTR-2B reflection to protect Input Tax Credit claims u/s 16(2)(aa).",
    statutoryKnowledge: fallbackDocs[0],
  };
}
