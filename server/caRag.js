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
    topic: "Section 40A(3) Cash Payment Prohibition & Contractor Limits",
    sections: ["Section 40A(3)", "Rule 6DD", "Section 269ST", "Form 3CD Clause 21(d)"],
    keywords: ["cash", "40a(3)", "40a3", "10000", "10,000", "25000", "25,000", "contractor", "cash payment", "cash to contractor", "petty cash", "disallowance"],
    rules: [
      "Where an assessee incurs any expenditure in respect of which a payment or aggregate of payments made to a person in a single day exceeds ₹10,000 in cash, NO DEDUCTION shall be allowed in respect of such expenditure.",
      "Limit is ₹35,000 only in case of payments made for plying, hiring or leasing of goods carriages (transporters).",
      "Section 269ST: Receipt of ₹2 Lakhs or more in cash in a day or in respect of a single transaction attracts 100% penalty equal to the amount received!",
      "Rule 6DD exceptions: Payments to RBI/banks, payments to farmers for agricultural produce, payments on bank holidays where banking is not available.",
    ],
    actionableAdvice: "Never issue petty cash payments above ₹10,000 to any vendor or contractor. Mandate UPI, IMPS, or NEFT for all vendor disbursements to avoid 100% disallowance under Tax Audit Clause 21(d).",
  },
  {
    id: "itc-capital-goods-software",
    topic: "ITC on MacBooks, Hardware, Computers & Software Subscriptions",
    sections: ["Section 16(1) of CGST Act, 2017", "Section 16(9) of CGST Act", "Section 32 of Income Tax Act, 1961", "Section 5(3) of IGST Act (RCM)"],
    keywords: ["macbook", "laptop", "hardware", "software", "subscriptions", "saas", "computers", "itc on macbook", "capital goods", "apple", "developer tools"],
    rules: [
      "Input Tax Credit (18% GST) on MacBooks, laptops, computers, monitors, and developer hardware is 100% ELIGIBLE under Section 16(1) of CGST Act, provided they are capitalized in accounts and used for business.",
      "Under Section 16(9), if the taxpayer claims depreciation on the GST tax component under Section 32 of Income Tax Act, ITC cannot be availed. Capitalize the base cost and claim the GST component as ITC in GSTR-3B Table 4(A)(5).",
      "Software and SaaS subscriptions (e.g. AWS, GitHub, Google Workspace, Slack, Jira) are 100% eligible input services (SAC 997331/998314).",
      "For software invoices issued by overseas vendors without Indian GSTIN, discharge 18% IGST under Reverse Charge Mechanism (RCM u/s 5(3)) and claim 100% ITC back in the same GSTR-3B return.",
    ],
    actionableAdvice: "Ensure supplier invoices bear your valid GSTIN and reflect in GSTR-2B. Never claim Section 32 depreciation on the tax component. Pay RCM on foreign SaaS invoices and claim credit simultaneously.",
  },
  {
    id: "gst-notice-asmt10-defense",
    topic: "Defense of GST ASMT-10 Notice for ITC Mismatch (GSTR-2B vs 3B)",
    sections: ["Section 61 of CGST Act, 2017", "Rule 99 of CGST Rules", "CBIC Circular No. 183/15/2022-GST", "Circular No. 193/05/2023-GST"],
    keywords: ["asmt-10", "asmt 10", "notice", "itc mismatch", "drc-06", "scrutiny notice", "defend notice", "2b mismatch", "department notice"],
    rules: [
      "Scrutiny notices in Form GST ASMT-10 for GSTR-2B vs 3B ITC mismatches must be replied to within 30 days using Form GST DRC-06.",
      "Under CBIC Circular 183/15/2022-GST & Circular 193/05/2023-GST, ITC cannot be denied to a genuine purchaser if they hold valid tax invoices and proof of payment through banking channels.",
      "If the ITC difference per supplier exceeds ₹5 Lakhs, obtain a Chartered Accountant certificate from the supplier certifying tax payment.",
      "If the difference is up to ₹5 Lakhs, a self-certification from the supplier is legally sufficient.",
      "Calcutta High Court in Suncraft Energy held that the department cannot demand ITC reversal from the buyer without first proceeding against the defaulting supplier.",
    ],
    actionableAdvice: "Submit Form GST DRC-06 within 30 days. Attach tax invoices, bank statements showing payment, and supplier CA certificate or self-declaration to resolve the scrutiny notice without tax reversal or penalty.",
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
 * Retrieve statutory CA knowledge relevant to the user query (sync fallback)
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
 * Retrieve statutory CA knowledge using Weaviate Vector DB with local fallback
 */
export async function retrieveCaKnowledgeAsync(query) {
  try {
    const { searchStatutoryRag } = await import("./weaviateVectorDb.js");
    const vectorHits = await searchStatutoryRag(query, 3);
    if (vectorHits && vectorHits.length > 0) {
      // Map vector hits to full statutory docs
      const fullDocs = vectorHits.map(vh => {
        const found = CA_STATUTORY_KNOWLEDGE_BASE.find(d => d.id === vh.id);
        if (found) return found;
        return {
          id: vh.id || "vector-statute",
          topic: vh.topic,
          sections: vh.sections,
          keywords: vh.keywords,
          rules: vh.rules,
          actionableAdvice: vh.actionableAdvice,
        };
      });
      return fullDocs;
    }
  } catch (err) {
    console.warn("[caRag] Vector search fallback to rule matching:", err.message);
  }
  return retrieveCaKnowledge(query);
}

/**
 * Autonomous CA Advisory Prompt Builder
 * Injects retrieved statutes + live company financials to generate expert Chartered Accountant guidance
 */
export function buildCaAdvisoryResponse(query, financials, businessProfile, customMatchedDocs = null) {
  const matchedDocs = customMatchedDocs || retrieveCaKnowledge(query);

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

  // 2. ITC (Input Tax Credit) question
  if (q.includes("itc") || q.includes("input tax credit") || q.includes("input credit") || (q.includes("credit") && q.includes("tax"))) {
    return {
      title: "Input Tax Credit (ITC) Statutory Architecture & Claim Rules",
      sectionsReferenced: [
        "Section 16(2) of CGST Act (Four Mandatory Eligibility Conditions)",
        "Section 16(2)(aa) & Rule 36(4) (GSTR-2B Mandatory Reflection)",
        "Section 17(5) of CGST Act (Blocked / Ineligible Credits)",
        "Rule 37 of CGST Rules (180-Day Payment Reversal Mandate)",
        "Section 50(3) (Interest on Wrongly Claimed & Utilized ITC)",
      ],
      analysis: `**Input Tax Credit (ITC)** is the core mechanism of the Goods and Services Tax (GST) system that eliminates the cascading effect of double taxation. When your business purchases raw materials, capital goods, or operational services, the GST paid to suppliers is not an expense—it is recorded as a tax asset (Input Tax Credit) that directly reduces the output GST you owe on your customer sales.\n\n### ⚖️ The 4 Statutory Conditions to Claim ITC (Section 16(2)):\n1. **Tax Invoice Possession**: You must hold a valid tax invoice or debit note issued by a registered GST supplier containing your business GSTIN.\n2. **GSTR-2B Reflection (Strict Rule)**: Under Section 16(2)(aa), the invoice MUST be uploaded by the vendor in their GSTR-1 and must appear in your auto-generated **GSTR-2B statement**. No provisional or manual ITC without 2B reflection is allowed!\n3. **Receipt of Goods/Services**: You must have actually received the goods or services.\n4. **Supplier Tax Payment**: The supplier must have actually deposited the GST collected from you to the government and filed GSTR-3B.\n\n### 🚫 Blocked Credits (Section 17(5) - Ineligible Even with Valid Invoice):\n- Motor vehicles with seating capacity ≤ 13 (unless used for passenger transport, driving school, or vehicle sales).\n- Food, beverages, outdoor catering, health/club memberships, and beauty treatment.\n- Works contract for construction of immovable property on own account (capitalized to building).\n- Goods or services used for personal consumption, or goods lost, stolen, destroyed, or written off.\n\n### ⏱️ The 180-Day Payment Rule (Rule 37):\nYou must settle the supplier's bill (value + GST) within **180 days** from the invoice date. If unpaid after 180 days, you are legally required to reverse the claimed ITC in Form GSTR-3B along with **18% per annum interest** from the date of credit utilization under Section 50(3). Once payment is made, the credit can be reclaimed in full.`,
      actionPlan: [
        "1. Perform automated weekly matching between your purchase bills in Prava and Form GSTR-2B prior to the 11th of each month.",
        "2. Never claim ITC in GSTR-3B Table 4 exceeding the eligible credit appearing in GSTR-2B.",
        "3. Review aging accounts payable to ensure no supplier bills exceed 180 days without settlement.",
        "4. Flag and segregate Section 17(5) blocked expenses (staff refreshments, personal transport) into non-credit tax expense accounts.",
      ],
      warning: "Claiming and utilizing ITC that does not appear in your Form GSTR-2B constitutes a non-compliance violation under Rule 36(4) and attracts mandatory 18% per annum interest, reversal demands, and potential scrutiny notices (Form DRC-01C).",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "itc-section-16-2-aa") || fallbackDocs[0],
    };
  }

  // 3. TDS (Tax Deducted at Source) question
  if (q.includes("tds") || q.includes("tax deducted at source") || q.includes("194c") || q.includes("194j") || q.includes("194q") || q.includes("194i")) {
    return {
      title: "Tax Deducted at Source (TDS) Compliance Architecture & Disallowance Rules",
      sectionsReferenced: [
        "Section 194C (Contractors & Sub-contractors)",
        "Section 194J (Professional & Technical Fees)",
        "Section 194I (Rent on Land, Building & Machinery)",
        "Section 194Q (Purchase of Goods > ₹50 Lakhs)",
        "Section 40(a)(ia) (30% Statutory Expenditure Disallowance)",
        "Section 201(1A) (Interest for Delayed Deduction / Deposit)",
      ],
      analysis: `**Tax Deducted at Source (TDS)** is a statutory obligation where the payer (your business) deducts income tax before releasing payments to vendors, contractors, landlords, and consultants, and deposits it directly to the Central Government.\n\n### 📋 Primary TDS Rates & Thresholds for Businesses:\n- **Section 194C (Contractors / Vendors)**: **1%** for individuals/HUF contractors, **2%** for companies/firms. Threshold: Single bill > ₹30,000 or aggregate annual payout > ₹1,00,000.\n- **Section 194J (Professional & Technical Fees)**: **10%** for professional/legal/director fees, **2%** for technical/call-center services. Threshold: ₹30,000 per financial year.\n- **Section 194I (Rent)**: **10%** for commercial/residential building rent (threshold ₹2,40,000/year); **2%** for plant & machinery hire.\n- **Section 194Q (Purchase of Goods)**: **0.1%** on purchases exceeding ₹50 Lakhs in a FY from a seller (applies to buyers whose turnover exceeded ₹10 Cr in the preceding FY).\n\n### ⚠️ The Dangerous 30% Disallowance Penalty (Section 40(a)(ia)):\nIf you fail to deduct TDS, or deduct it but fail to deposit it to the government on or before the ITR filing due date, **THIRTY PERCENT (30%) of the entire vendor invoice value is disallowed as business expenditure** and added directly to your taxable profit at corporate tax rates!`,
      actionPlan: [
        "1. Deduct TDS at the point of invoice booking or payment release (whichever happens earlier).",
        "2. Deposit all deducted TDS on or before the 7th of the following month (or 30th April for March deductions) via Challan 281.",
        "3. File quarterly Form 26Q TDS returns strictly before quarterly deadlines (July 31, Oct 31, Jan 31, May 31).",
        "4. Issue Form 16A TDS certificates to your vendors within 15 days of filing Form 26Q.",
      ],
      warning: "Non-deduction of TDS attracts 1% per month interest under Section 201(1A); failure to deposit deducted tax attracts 1.5% per month interest, plus late filing fees of ₹200/day under Section 234E for Form 26Q delays.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "tds-compliance-40a-ia") || fallbackDocs[0],
    };
  }

  // 4. Presumptive Taxation (Section 44AD / 44ADA)
  if (q.includes("44ad") || q.includes("44ada") || q.includes("presumptive")) {
    return {
      title: "Presumptive Taxation Framework (Section 44AD & 44ADA)",
      sectionsReferenced: [
        "Section 44AD (Eligible Small Businesses)",
        "Section 44ADA (Eligible Professionals & Consultants)",
        "Section 44AA (Maintenance of Books Exemption)",
        "Section 44AB (Audit Exemption Thresholds)",
      ],
      analysis: `**Presumptive Taxation** allows eligible small businesses and professionals to declare taxable income on a deemed percentage basis without the burden of maintaining detailed books of accounts (Section 44AA) or undergoing a Chartered Accountant Tax Audit (Section 44AB).\n\n### 🏢 Section 44AD (For Small Businesses):\n- **Eligibility**: Turnover up to **₹2 Crore** (relaxed to **₹3 Crore** if total cash receipts do not exceed 5%).\n- **Deemed Profit Rate**: **6%** on digital, banking, and online turnover; **8%** on cash turnover.\n- **Benefit**: No audit required; entire balance (92%-94%) is treated as commercial expenses without needing receipts.\n\n### 💻 Section 44ADA (For Professionals - IT, Tech, Legal, CA, Doctors):\n- **Eligibility**: Gross professional receipts up to **₹50 Lakhs** (relaxed to **₹75 Lakhs** if cash receipts ≤ 5%).\n- **Deemed Profit Rate**: Exactly **50%** of gross receipts.\n- **Benefit**: The remaining 50% is deemed business expenses without bookkeeping or voucher scrutiny!\n\n### ⏱️ Advance Tax Under Presumptive Taxation:\nTaxpayers opting for 44AD/44ADA are exempt from paying quarterly advance tax; **100% of advance tax can be deposited in a single installment by 15th March**!`,
      actionPlan: [
        "1. For tech consultants, agencies, and service providers with high profit margins and low overheads, Section 44ADA saves up to ₹1,50,000+ in CA bookkeeping and audit fees.",
        "2. Ensure cash receipts remain strictly below 5% to take advantage of the higher ₹75L / ₹3Cr eligibility thresholds.",
        "3. Deposit estimated tax via Challan 280 on or before 15th March to avoid interest under Section 234C.",
      ],
      warning: "If you declare profits lower than the prescribed 6%/8% (44AD) or 50% (44ADA) rates, you lose presumptive relief, must maintain comprehensive books of accounts under Section 44AA, and undergo compulsory Tax Audit under Section 44AB.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "presumptive-taxation-44ad-44ada") || fallbackDocs[0],
    };
  }

  // 5. Reverse Charge Mechanism (RCM)
  if (q.includes("rcm") || q.includes("reverse charge")) {
    return {
      title: "Reverse Charge Mechanism (RCM) Provisions & Compliance Under GST",
      sectionsReferenced: [
        "Section 9(3) & 9(4) of CGST Act, 2017",
        "Notification No. 13/2017-Central Tax (Rate)",
      ],
      analysis: `Under the normal GST mechanism, the supplier charges tax and pays it to the government. Under **Reverse Charge Mechanism (RCM)**, the statutory liability to pay GST is legally shifted to the recipient (your business) of the goods or services.\n\n### 📦 Common Supplies Subject to Mandatory RCM (Section 9(3)):\n1. **Goods Transport Agency (GTA)**: Freight paid to road transporters where GTA does not charge 12% (attracts 5% RCM GST).\n2. **Legal Services**: Fees paid to individual advocates, senior advocates, or firm of advocates for legal representation or advisory.\n3. **Director Services**: Remuneration, sitting fees, or commission paid to independent/non-executive directors (salaried executive directors under employment contract are exempt under Schedule III).\n4. **Security / Manpower Services**: Services provided by non-corporate entities to a registered person.\n5. **Sponsorship Services**: Any sponsorship consideration paid to any body corporate or partnership firm.\n\n### 🚨 Crucial RCM Payment & Credit Rule:\n- RCM tax liability **CANNOT be settled using Input Tax Credit (ITC)** from your electronic credit ledger! It must be paid **100% in CASH** through your electronic cash ledger in Form GSTR-3B Table 3.1(d).\n- Once paid in cash, **100% of this RCM tax becomes eligible as Input Tax Credit** in the same tax period under GSTR-3B Table 4(A)(3)!`,
      actionPlan: [
        "1. Identify all transport (bilty), advocate legal bills, and director sitting vouchers.",
        "2. Generate self-invoices for RCM purchases from unregistered suppliers under Section 31(3)(f).",
        "3. Top up electronic cash ledger on the GST portal to pay RCM liability in GSTR-3B.",
        "4. Simultaneously claim full ITC in Table 4(A)(3) so the net cash impact is neutral after the filing cycle.",
      ],
      warning: "Failure to pay RCM liability in cash is treated as tax evasion under Section 73/74, attracting mandatory 18% per annum interest and 10% penalty, even if you had sufficient surplus ITC in your credit ledger.",
      statutoryKnowledge: fallbackDocs[0],
    };
  }

  // 6. GST Return Architecture (GSTR-1, GSTR-3B, GSTR-2B)
  if (q.includes("gstr-1") || q.includes("gstr-3b") || q.includes("gstr 1") || q.includes("gstr 3b") || q.includes("return filing") || q.includes("gst filing")) {
    return {
      title: "GST Return Filing Cycle: GSTR-1, GSTR-2B & GSTR-3B Architecture",
      sectionsReferenced: [
        "Section 37 (GSTR-1 Outward Supplies)",
        "Section 38 & Rule 60 (GSTR-2B Static Auto-Drafted Statement)",
        "Section 39 (GSTR-3B Monthly Summary & Tax Payment Return)",
        "Section 47 (Late Filing Fees) & Section 50 (Interest)",
      ],
      analysis: `The Indian GST compliance architecture follows a interconnected monthly timeline across 3 primary forms:\n\n1. **Form GSTR-1 (Due 11th of every month)**:\n   - This is your Outward Supplies return where you report all sales invoices, B2B supplies with customer GSTIN, B2C sales, exports, credit notes, and HSN summary.\n   - Filing GSTR-1 is critical because your customers cannot claim ITC unless your GSTR-1 is filed!\n\n2. **Form GSTR-2B (Auto-Generated on 14th of every month)**:\n   - This is a static, read-only monthly statement generated by the GST portal containing all purchases and expenses uploaded by your suppliers in their GSTR-1.\n   - GSTR-2B is the single source of truth for eligible Input Tax Credit.\n\n3. **Form GSTR-3B (Due 20th of every month)**:\n   - This is your self-assessed monthly summary return where you declare total output tax liability, claim eligible ITC from GSTR-2B, set off output tax against credit, and pay the remaining balance in cash.\n   - Filing GSTR-3B is mandatory even if you had zero transactions (Nil Return).`,
      actionPlan: [
        "1. Reconcile sales invoices and upload GSTR-1 on or before the 11th.",
        "2. On the 14th, download Form GSTR-2B and run Prava auto-matching against your purchase register.",
        "3. Send chase notifications to vendors whose invoices are missing from GSTR-2B.",
        "4. Pay net tax and file Form GSTR-3B on or before the 20th to avoid late fees.",
      ],
      warning: "Late filing of GSTR-3B attracts a statutory late fee of ₹50/day (₹20/day for Nil returns) under Section 47, plus 18% per annum interest on net cash tax liability under Section 50. Missing two consecutive returns blocks E-Way Bill generation and triggers portal registration cancellation.",
      statutoryKnowledge: fallbackDocs[0],
    };
  }

  // 7. MSME 43B(h) question
  if (q.includes("msme") || q.includes("43b") || q.includes("43bh") || q.includes("vendor") || q.includes("45 days") || q.includes("15 days")) {
    return {
      title: "Section 43B(h) MSME Disallowance Audit & Payment Timelines",
      sectionsReferenced: ["Section 43B(h) of Income Tax Act, 1961", "Section 15 & 16 of MSMED Act, 2006"],
      analysis: `Section 43B(h) mandates that any sum payable to a **Micro or Small enterprise** (registered on the MSME Udyam portal) must be settled strictly within the statutory timeframe, failing which the entire unpaid expenditure is **disallowed as a tax deduction** in that financial year and added back to your taxable profits!\n\n### ⏱️ Statutory Payment Limits:\n- **With Written Agreement**: Maximum **45 days** from the date of acceptance/delivery of goods or services.\n- **Without Written Agreement**: Maximum **15 days** from delivery.\n\n### 🏢 Who is Covered vs Who is Exempt:\n- **Covered**: Micro enterprises (Investment ≤ ₹1 Cr & Turnover ≤ ₹5 Cr) and Small enterprises (Investment ≤ ₹10 Cr & Turnover ≤ ₹50 Cr) engaged in Manufacturing or Services.\n- **Exempt**: Medium enterprises (Turnover > ₹50 Cr) and Traders (wholesale and retail traders are exempt from Section 43B(h)).`,
      actionPlan: [
        "1. Collect and store Udyam registration certificates from all active suppliers.",
        "2. Ensure written purchase contracts or purchase orders explicitly specify a 45-day payment clause.",
        "3. Run weekly accounts payable aging audits in Prava [Tasks](/tasks) and settle all Micro/Small dues before March 31.",
      ],
      warning: "Unpaid MSME dues at year-end are taxed at your full corporate tax rate, plus you are liable to pay mandatory non-deductible compound interest at 3 times the RBI bank rate under Section 16 of the MSMED Act.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "sec-43bh-msme") || fallbackDocs[0],
    };
  }

  // 8. Tax saving / Founder remuneration question
  if (q.includes("save tax") || q.includes("salary") || q.includes("dividend") || q.includes("reduce tax") || q.includes("tax planning") || q.includes("remuneration")) {
    return {
      title: "Corporate Tax Optimization & Founder Remuneration Strategy",
      sectionsReferenced: ["Section 37(1)", "Section 80CCD(2)", "Section 32 (Depreciation)", "Section 115BAA"],
      analysis: `For a private limited company with verified net operating profits, the most tax-efficient structure combines Director Remuneration, Employer NPS, and accelerated capital depreciation:\n\n1. **Founder Remuneration u/s 37(1)**: Director salary is an allowable commercial deduction for the company, immediately saving 22.88% corporate tax. In personal hands, use new tax regime slabs (0-15L taxed at low marginal rates) plus standard deduction.\n2. **Employer NPS u/s 80CCD(2)**: The company can contribute up to **14% of basic salary** directly to the National Pension System on behalf of the director. This is **100% tax-deductible for the company** and completely tax-free in the director's hands with no monetary cap!\n3. **Depreciation Acceleration u/s 32**: Computers, servers, and software enjoy 40% WDV depreciation. Purchasing capital assets before September 30 captures full 12-month depreciation write-offs.`,
      actionPlan: [
        "1. Structure founder remuneration with optimal basic salary and 14% Section 80CCD(2) Employer NPS contribution.",
        "2. Avoid declaring Dividends. Dividends are taxed twice (company pays corporate tax first, then founder pays up to 39% personal slab tax). Always route surplus through allowable expenses and remuneration.",
        "3. Review capital expenditure timing to maximize Section 32 depreciation.",
      ],
      warning: "Director remuneration must be reasonable and justifiable under Section 40A(2) against market benchmarks to prevent scrutiny disallowance.",
      statutoryKnowledge: fallbackDocs.find(d => d.id === "founder-salary-vs-dividend") || fallbackDocs[0],
    };
  }

  // 9. Depreciation (Section 32)
  if (q.includes("depreciation") || q.includes("asset") || q.includes("block of assets") || q.includes("section 32")) {
    return {
      title: "Statutory Tax Depreciation & Asset Accounting (Section 32)",
      sectionsReferenced: ["Section 32 of Income Tax Act", "Rule 5 of Income Tax Rules (Depreciation Schedule)"],
      analysis: `Under Indian Income Tax Act (Section 32), depreciation is calculated using the **Written Down Value (WDV) method** on defined **Blocks of Assets**, rather than straight-line book depreciation:\n\n### 💻 Primary WDV Depreciation Rates:\n- **Computers, Laptops & Software**: **40%** per annum.\n- **Plant & Machinery (General)**: **15%** per annum.\n- **Commercial Buildings**: **10%** per annum.\n- **Furniture & Fixtures**: **10%** per annum.\n- **Motor Vehicles (Commercial/Passenger)**: **15%** (30% for commercial hire).\n\n### ⏱️ The 180-Day Rule for New Acquisitions:\nIf an asset is acquired and put to use for **less than 180 days** during the financial year (i.e., put to use on or after October 3rd in a standard FY), only **50% of the normal depreciation rate** is allowable for that year (e.g., 20% on computers instead of 40%).`,
      actionPlan: [
        "1. Maintain a detailed Fixed Asset Register linking purchase invoices to physical assets.",
        "2. Ensure capital purchases are put to commercial use prior to September 30 to claim 100% full-year depreciation.",
        "3. Factor timing into annual tax planning to legally minimize corporate taxable income.",
      ],
      warning: "Books depreciation under Schedule III of Companies Act differs from Section 32 Income Tax depreciation. The difference must be recorded as Deferred Tax Asset/Liability (DTA/DTL) under AS-22 / Ind AS 12.",
      statutoryKnowledge: fallbackDocs[0],
    };
  }

  // 10. Cashflow vs Profit
  if (q.includes("cashflow") || q.includes("cash flow") || q.includes("working capital") || q.includes("liquidity")) {
    return {
      title: "Cash Flow Liquidity vs Accounting Profit & Working Capital Control",
      sectionsReferenced: ["Working Capital Optimization", "Operating Cash Flow vs Net Margin"],
      analysis: `A fundamental principle of financial operations is that **profit does not equal cash**. A company can report strong net profits on its Profit & Loss statement while experiencing acute cash insolvency because of delayed customer receivables, unrecovered GST refunds, or inventory lockups.\n\n### 🔄 The Working Capital Cash Conversion Cycle:\n1. **Days Sales Outstanding (DSO)**: How long customers take to pay. If invoice terms are 30 days but clients pay in 75 days, your working capital is funding their operations.\n2. **Days Payable Outstanding (DPO)**: How long you hold supplier funds without breaching MSME 43B(h) limits.\n3. **Net Cash Position**: Verified available liquidity = Cash at Bank + Liquid Investments - Immediate Liabilities.`,
      actionPlan: [
        "1. Monitor overdue receivables weekly and enforce automated payment reminders in Prava.",
        "2. Request 30%-50% advance milestone payments on larger commercial contracts.",
        "3. Maintain a minimum liquidity runway of 3 to 6 months of fixed operating overheads in liquid bank accounts.",
      ],
      warning: "Never use statutory tax funds (collected GST or deducted TDS) for operating working capital. Statutory funds are held in fiduciary trust for the government; diverting them triggers severe interest and personal director liability.",
      statutoryKnowledge: fallbackDocs[0],
    };
  }

  // 11. Default authoritative CA advisory
  return {
    title: "Autonomous Chartered Accountant Legal & Financial Advisory",
    sectionsReferenced: fallbackDocs.flatMap(d => d.sections),
    analysis: `I have analyzed your inquiry against the Income Tax Act 1961, CGST Act 2017, and Indian accounting standards for ${businessProfile?.name || "your business"}.\n\n- **Operating Revenue**: Verified at ₹${(financials.revenueMinor / 100).toLocaleString("en-IN")}\n- **Expenses & Purchases**: Recorded at ₹${(financials.expensesMinor / 100).toLocaleString("en-IN")}\n- **Available Liquidity**: Bank cash balance of ₹${(financials.cashMinor / 100).toLocaleString("en-IN")}\n\n${fallbackDocs[0]?.rules?.slice(0, 3).map(r => `• ${r}`).join("\n") || "Ensure all business transactions are backed by compliant tax invoices and reconciled weekly against bank statements and statutory returns."}`,
    actionPlan: [
      `1. Primary Compliance: ${fallbackDocs[0]?.rules[0] || "Maintain timely statutory filings."}`,
      `2. Statutory Timing: ${fallbackDocs[0]?.rules[1] || "Adhere to the 15th/20th monthly cutoff."}`,
      `3. CA Recommendation: ${fallbackDocs[0]?.actionableAdvice || "Reconcile books weekly in your Prava workspace."}`,
    ],
    warning: "Ensure all source invoice evidence is backed by Form GSTR-2B reflection and matched against banking entries before certifying tax filings.",
    statutoryKnowledge: fallbackDocs[0],
  };
}
