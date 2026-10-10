/**
 * Prava Financial Operations Guardrail Engine
 * Protects the AI chatbot against out-of-concept / out-of-scope inquiries.
 * Strictly confines responses to business finances, accounting, taxation (GST, TDS, Advance Tax),
 * invoices, cashflow, compliance (MSME 43B(h), Presumptive 44AD/ADA), and Prava operations.
 */

// 1. Conversational Greetings & Platform Capabilities
const GREETING_PATTERNS = [
  /^(hi|hello|hey|hiya|hola|namaste|greetings|good\s+(morning|afternoon|evening|day))[\s!.]*$/i,
  /^(who\s+are\s+you|what\s+are\s+you|what\s+is\s+prava|how\s+can\s+you\s+help|what\s+can\s+you\s+do|help(\s+me)?|capabilities|menu)[\s!?.]*$/i,
];

// 2. Creative writing / joke requests (always out of scope, even if mentioning finance)
const CREATIVE_ENTERTAINMENT_PATTERNS = [
  /\b(write\s+a\s+(poem|poetry|song|lyrics|story|fiction|love\s+letter)|tell\s+(me\s+)?a\s+(joke|riddle|funny\s+story)|bedtime\s+story|roast\s+me|flirt|sing\s+a\s+song)\b/i,
];

// 3. Out-of-Scope non-finance domains
const OUT_OF_SCOPE_DOMAINS = [
  {
    name: "sports and gaming",
    regex: /\b(cricket|football|fifa|soccer|basketball|nba|ipl|tennis|olympic|olympics|messi|ronaldo|virat|dhoni|wicket|batting|bowling|gaming|playstation|xbox|pubg|fortnite|minecraft|gta|esports|gameplay)\b/i,
  },
  {
    name: "entertainment, cinema, and pop culture",
    regex: /\b(movie|movies|film|films|actor|actress|cinema|bollywood|hollywood|netflix|marvel|dc\s+universe|batman|superman|spiderman|anime|song|songs|singer|album|celebrity|oscar|grammy)\b/i,
  },
  {
    name: "cooking, food, and recipes",
    regex: /\b(recipe|recipes|bake|baking|cake|pastry|pizza|burger|pasta|curry|dessert|ingredient|ingredients|kitchen|cook\s+food|make\s+food|dish\s+recipe|chocolate\s+cake)\b/i,
  },
  {
    name: "general knowledge, astronomy, and trivia",
    regex: /\b(capital\s+of|president\s+of|prime\s+minister\s+of|speed\s+of\s+light|solar\s+system|dinosaur|dinosaurs|weather|temperature|forecast|climate|mount\s+everest|who\s+discovered|who\s+invented|continent|galaxy|universe|planet|planets|mars|jupiter|moon)\b/i,
  },
  {
    name: "general software programming and non-financial code",
    regex: /\b(write\s+(a\s+)?python|python\s+(code|script)|c\+\+|java\s+code|javascript\s+(code|function)|binary\s+search|quicksort|bubble\s+sort|leetcode|reverse\s+(a\s+)?(string|linked\s+list)|css\s+flexbox|center\s+a\s+div|docker\s+container|kubernetes|react\s+component)\b/i,
  },
  {
    name: "health, lifestyle, and medical advice",
    regex: /\b(symptom|symptoms|headache|fever|cough|medicine|doctor|diagnosis|workout\s+routine|lose\s+weight|weight\s+loss|diet\s+plan|gym\s+exercises|horoscope|zodiac|astrology)\b/i,
  },
];

// 4. Legitimate Business, Financial, Tax & Prava Terms
const IN_SCOPE_TERMS = [
  // Financial metrics & money
  /\b(revenue|sales|turnover|income|earning|earnings|profit|profits|loss|losses|margin|margins|expense|expenses|expenditure|spending|spend|cost|costs|cash|cashflow|cash\s*flow|bank|banking|balance|funds|runway|burn\s*rate|debt|loan|credit|debit|money|financials?)\b/i,

  // Receivables, payables, accounting entries
  /\b(receivable|receivables|payable|payables|debtor|debtors|creditor|creditors|ledger|journal|balance\s*sheet|p&l|profit\s+and\s+loss|trial\s*balance|accounting|bookkeeping|reconcil|reconciliation|unreconciled|mismatch|difference)\b/i,

  // Invoices, bills, vendors, clients
  /\b(invoice|invoices|bill|bills|billing|receipt|receipts|voucher|vouchers|vendor|vendors|supplier|suppliers|customer|customers|client|clients|purchase\s*order|po|quotation|proforma|payment|payments|payout|payouts|due|dues|overdue|unpaid)\b/i,

  // Tax, GST, Statutory laws
  /\b(tax|taxes|taxation|gst|cgst|sgst|igst|itc|input\s+tax\s+credit|gstr|gstr-?1|gstr-?2b|gstr-?3b|gstin|tds|tcs|advance\s*tax|income\s*tax|corporate\s*tax|e-?way|eway|hsn|sac|pan|challan|form\s*26q|26as|ais|tis|audit|auditor|audits)\b/i,

  // Indian statutory sections & compliance
  /\b(43b|43b\(h\)|43bh|44ad|44ada|40a|40a\(3\)|40a3|194c|194j|194i|194q|80ccd|section\s+\d+|msme|udyam|presumptive|disallowance)\b/i,

  // CA & professional review
  /\b(\bca\b|\bcas\b|chartered\s+accountant|advisor|advisory|tax\s+saving|save\s+tax|tax\s+deduction|deduction|exemption|slab|rates|penalty|interest\s+234[bc]?|refund|compliance|statutory)\b/i,

  // Prava platform & operations
  /\b(prava|workspace|dashboard|health\s*score|health\s*grade|action\s*item|action\s*items|task|tasks|document|documents|upload|ocr|extraction|checklist|review|authorization)\b/i,

  // Business status & operational inquiries
  /\b(how\s+are\s+we\s+doing|how\s+is\s+(our\s+|the\s+|my\s+)?business|business(\s+doing|\s+performance|\s+health)?|company|enterprise|what\s+should\s+i\s+do|what\s+needs\s+attention|attention|any\s+updates|overview|summary|status|today'?s?\s+(action|task)|pending|to\s*do|what\s+do\s+we\s+have|business\s+situation)\b/i,

  // Payroll & company remuneration
  /\b(salary|salaries|payroll|wages|director\s+remuneration|remuneration|dividend|dividends|reimbursement)\b/i,

  // Capital & asset management
  /\b(working\s+capital|share\s+capital|capital\s+goods|capital\s+gain|capital\s+expenditure|capex|asset|assets|liability|liabilities|depreciation)\b/i,
];

// Strong business tax/accounting intent indicators that can override domain false-positives
const STRONG_FINANCIAL_INTENT = [
  /\b(tax\s+deductible|business\s+expense|claim\s+(itc|gst|deduction)|gst\s+rate|tds\s+rate|company\s+expense|depreciation\s+rate|invoice\s+for|billing\s+for|company\s+tax)\b/i,
];

/**
 * Evaluates whether a query is within Prava's financial operations domain.
 * @param {string} query
 * @returns {{ isOutOfScope: boolean, isGreeting: boolean, detectedDomain?: string, reason?: string }}
 */
export function evaluateQueryScope(query) {
  if (!query || typeof query !== "string") {
    return { isOutOfScope: true, isGreeting: false, reason: "empty query" };
  }

  const clean = query.trim();
  if (clean.length === 0) {
    return { isOutOfScope: true, isGreeting: false, reason: "empty query" };
  }

  // Check 1: Greeting or platform capability inquiry
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(clean)) {
      return { isOutOfScope: false, isGreeting: true };
    }
  }

  // Check 2: Creative writing / joke requests (even if mentioning tax or money)
  for (const pattern of CREATIVE_ENTERTAINMENT_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        isOutOfScope: true,
        isGreeting: false,
        detectedDomain: "creative writing and entertainment",
        reason: "creative entertainment request",
      };
    }
  }

  // Check 3: Explicit out-of-scope domain match
  for (const domain of OUT_OF_SCOPE_DOMAINS) {
    if (domain.regex.test(clean)) {
      // Check if overridden by strong business/financial intent
      const hasStrongFinancialIntent = STRONG_FINANCIAL_INTENT.some((p) => p.test(clean));
      if (!hasStrongFinancialIntent) {
        return {
          isOutOfScope: true,
          isGreeting: false,
          detectedDomain: domain.name,
          reason: `query matches ${domain.name}`,
        };
      }
    }
  }

  // Check 4: Check if query contains legitimate business/financial terms
  const hasInScopeTerm = IN_SCOPE_TERMS.some((pattern) => pattern.test(clean));
  if (hasInScopeTerm) {
    return { isOutOfScope: false, isGreeting: false };
  }

  // Check 5: If it has neither in-scope terms nor greeting terms, it's out of concept
  return {
    isOutOfScope: true,
    isGreeting: false,
    reason: "unrelated to business finances, accounting, or Prava operations",
  };
}

/**
 * Builds standard markdown response and action buttons for out-of-scope questions.
 */
export function buildOutOfScopeResponse(workspace, detectedDomain) {
  const domainNote = detectedDomain
    ? ` *(detected topic: ${detectedDomain})*`
    : "";

  const answer = `### ⚠️ Question Not Related to Business Finances

I noticed your question${domainNote} is outside the scope of **Ask Prava**.

I am your dedicated **AI Financial Operations & Statutory Co-Pilot** for **${workspace.name}**. To ensure absolute financial accuracy and regulatory compliance, I only answer questions related to your company's finances, accounting, and taxation:

- **📊 Financial Health & Cashflow:** Revenue, expenses, bank cash balances, receivables, and payables.
- **📄 Invoices & Transactions:** Uploaded bills, vendor dues, client invoicing status, and extracted data.
- **🏛️ GST & Indian Taxation:** GST liabilities, GSTR-1 / 3B / 2B reconciliation, ITC eligibility, TDS, and Advance Tax.
- **⚖️ Statutory Compliance & CA Advisory:** MSME Section 43B(h) payment deadlines, presumptive taxation (44AD/ADA), and audit prep.
- **✅ Operational Tasks & Ledger Workflows:** Daily action items, unmatched banking entries, and CA review authorizations.

Please ask a question related to your business finances, taxes, or invoices!`;

  return {
    answer,
    actions: [
      { label: "View Money & Cashflow", path: "/money", variant: "default" },
      { label: "Check GST & Tax Hub", path: "/tax", variant: "default" },
      { label: "Command Center", path: "/dashboard", variant: "outline" },
    ],
    sources: undefined,
    isOutOfScope: true,
  };
}

/**
 * Builds standard markdown response and suggested prompts for greetings.
 */
export function buildGreetingResponse(workspace) {
  const answer = `### 👋 Hello! How can I assist with your finances today?

I am **Ask Prava**, the intelligent financial operations and statutory co-pilot for **${workspace.name}**.

I monitor your double-entry ledger, invoice extractions, and statutory tax obligations in real-time. Here are a few things you can ask me:

- **"What is my revenue and expense breakdown this month?"**
- **"What is our estimated GST liability and Input Tax Credit?"**
- **"Are any vendor invoices overdue or missing?"**
- **"Explain the MSME 45-day payment rule (Section 43B(h))"**
- **"What action items require my attention today?"**

How can I help you with your business accounts or tax compliance today?`;

  return {
    answer,
    actions: [
      { label: "View Money Breakdown", path: "/money", variant: "default" },
      { label: "Open Tax Hub", path: "/tax", variant: "default" },
      { label: "View Tasks & Checklist", path: "/tasks", variant: "default" },
    ],
    sources: undefined,
    isOutOfScope: false,
  };
}
