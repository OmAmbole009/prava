/**
 * Prava Financial & Platform Knowledge Intelligence Engine
 * Provides direct, authoritative answers for:
 * 1. Any finance, accounting, taxation, and compliance question.
 * 2. Any question related to the Prava website, features, navigation, and workflows.
 * 3. Any question about the user's specific business context (legal name, GSTIN, cash, revenue, tasks).
 * 
 * Strict Principle: "Perfect answers with NO extra trash" — direct, structured markdown with
 * bullet points, exact numbers, statutory citations when applicable, and zero boilerplate filler.
 */

export function resolveIntelligentAnswer(query, context, vectorStatutes = [], vectorDocs = []) {
  if (!query || typeof query !== "string") return null;

  const lower = query.toLowerCase().trim();
  const ws = context.workspace || {};
  const fin = context.financials || {};
  const invoices = context.invoices || [];
  const tasks = context.tasks || [];
  const openActions = context.openActions || [];

  // =========================================================================
  // 1. SPECIFIC INVOICE / VENDOR LOOKUPS
  // =========================================================================
  const vendorMatch = query.match(/(?:invoice|bill|receipt)\s+(?:from|for|by|of)\s+([A-Za-z0-9\s.,&'-]+?)(?:\?|\.|$)/i);
  let queriedVendorOrNumber = vendorMatch?.[1]?.trim() || null;
  if (!queriedVendorOrNumber) {
    const numMatch = query.match(/(?:invoice|bill|doc|document)\s*(?:#|no\.?|number)?\s*([A-Za-z0-9\-_/]+)/i);
    if (numMatch && numMatch[1] && !["the", "any", "my", "our", "all", "this", "a", "an", "new", "tax"].includes(numMatch[1].toLowerCase())) {
      queriedVendorOrNumber = numMatch[1].trim();
    }
  }

  if (queriedVendorOrNumber) {
    const qLower = queriedVendorOrNumber.toLowerCase();
    const matching = invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(qLower) ||
      inv.vendorName?.toLowerCase().includes(qLower) ||
      inv.originalName?.toLowerCase().includes(qLower)
    );

    if (matching.length > 0) {
      const inv = matching[0];
      const answer = `### 📄 Invoice #${inv.invoiceNumber}\n\n` +
        `Found verified invoice in your records:\n` +
        `- **Vendor / Supplier**: ${inv.vendorName}${inv.vendorGstin ? ` (GSTIN: \`${inv.vendorGstin}\`)` : ""}\n` +
        `- **Invoice Date**: ${inv.invoiceDate}\n` +
        `- **Category**: ${inv.invoiceType ? inv.invoiceType.toUpperCase() : "PURCHASE"}\n` +
        `- **Taxable Subtotal**: ${inv.taxableFormatted}\n` +
        `- **GST Breakdown**: CGST: ${inv.cgstFormatted} | SGST: ${inv.sgstFormatted} | IGST: ${inv.igstFormatted} (Total Tax: ${inv.totalGstFormatted})\n` +
        `- **Total Amount**: **${inv.totalFormatted}**\n` +
        `- **Status**: ${inv.status}\n` +
        (inv.lineItems?.length
          ? `\n**Itemized Line Items:**\n${inv.lineItems.map(item => `- **${item.name}**: Qty ${item.quantity}${item.unitPrice ? ` @ ₹${item.unitPrice}` : ""}${item.amount ? ` = ₹${item.amount}` : ""}`).join("\n")}`
          : "");

      return {
        answer,
        actions: [{ label: "Open Document Vault →", path: "/documents", variant: "default" }],
        sources: [{ title: `${inv.vendorName} (${inv.invoiceNumber})`, type: "Verified Invoice", documentId: inv.id }],
      };
    }

    if (/\b(do we have|is there|any invoice|show me|find|check|where is|what is|search)\b/i.test(lower)) {
      return {
        answer: `We do not have record of an invoice for **"${queriedVendorOrNumber}"** in your business documents.\n\n` +
          `If you have this bill or receipt, you can upload it at [Invoices & Receipts](/documents) to have Prava autonomously extract the GSTIN, line items, and record it into your ledger.`,
        actions: [{ label: "Upload Document Now →", path: "/documents", variant: "default" }],
      };
    }
  }

  // =========================================================================
  // 2. WEBSITE & PLATFORM WORKFLOWS ("any question related to this website")
  // =========================================================================

  // Uploading Documents / Invoices / Receipts
  if (/\b(how\s+(do|can)\s+i\s+upload|where\s+(to|can\s+i)\s+upload|upload\s+(invoice|bill|receipt|document)|add\s+(invoice|bill|receipt|document)|supported\s+(format|file)|drag\s+and\s+drop)\b/i.test(lower)) {
    return {
      answer: `### 📤 How to Upload Invoices & Receipts on Prava\n\n` +
        `1. Navigate to **[Invoices & Receipts](/documents)** or use the upload dropzone on the **[Dashboard](/dashboard)**.\n` +
        `2. Drag & drop your file or click **Upload Invoices & Receipts**.\n` +
        `3. **Supported Formats**: PDF, PNG, JPG, JPEG (up to 50MB per file).\n` +
        `4. **Autonomous Processing**:\n` +
        `   - Prava's OCR pipeline reads the scan within seconds.\n` +
        `   - Automatically extracts **Supplier GSTIN**, **Invoice Date**, **Taxable Amount**, **CGST/SGST/IGST**, and **Line Items**.\n` +
        `   - Encrypts and archives the original document in your dedicated Supabase storage vault.\n` +
        `   - Immediately updates your live GST liability, P&L, and balance sheet.`,
      actions: [
        { label: "Go to Invoices & Receipts →", path: "/documents", variant: "default" },
        { label: "Open Dashboard Dropzone →", path: "/dashboard", variant: "outline" },
      ],
    };
  }

  // Platform Tour / What can this website do / Feature Overview
  if (/\b(what\s+is\s+prava|what\s+can\s+this\s+website\s+do|features\s+of\s+this\s+website|website\s+features|platform\s+overview|walkthrough|what\s+pages|navigation|where\s+can\s+i\s+find|modules)\b/i.test(lower)) {
    return {
      answer: `### 🌐 Prava Platform Overview & Modules\n\n` +
        `Prava is an autonomous financial compliance operating system built for businesses and their accountants:\n\n` +
        `- **[Dashboard](/dashboard)**: Central cockpit displaying live cash runway, monthly revenue/burn, and prioritized operational action items.\n` +
        `- **[Invoices & Receipts](/documents)**: Inward bill repository with AI OCR extraction, line-item verification, and Supabase cloud document archiving.\n` +
        `- **[Issued Invoices / Sales](/invoices/issued)**: Create professional GST sales invoices and bills with sequential numbering, QR codes, and downloadable PDFs.\n` +
        `- **[Taxes & Compliance](/tax)**: Real-time GST ledger computing Output Tax on sales, Input Tax Credit (ITC) on purchases, net tax payable, and GSTR-3B preparation.\n` +
        `- **[Autonomous CA Suite](/ca-suite)**: Automated statutory audits for Section 43B(h) MSME limits, Section 194 TDS disallowance, GSTR-2B matching, and Form 3CD clauses.\n` +
        `- **[CA Review Desk](/ca-review)**: Multi-stakeholder collaboration interface for your Chartered Accountant to review flags and authorize filings.\n` +
        `- **[Reconciliation Hub](/reconciliation)**: Bank statement vs invoice ledger matching, variance resolution, and cash tracking.\n` +
        `- **[Financial Health & Intelligence](/health)**: Proactive health scoring (0–100), cashflow forecasting, and early warning detection.\n` +
        `- **[Money In & Out](/finance)**: Deep financial ledger covering revenues, expenses, payables, and receivables.\n` +
        `- **[Workspace Settings](/settings)**: Legal entity profile, GSTIN configuration, team invitations, and audit log.`,
      actions: [
        { label: "Open Dashboard →", path: "/dashboard", variant: "default" },
        { label: "View Autonomous CA Suite →", path: "/ca-suite", variant: "outline" },
      ],
    };
  }

  // Bank Reconciliation Workflow
  if (/\b(reconciliation|how\s+to\s+reconcile|bank\s+reconcil|unreconciled|match\s+bank|bank\s+statement)\b/i.test(lower)) {
    return {
      answer: `### 🏦 How Bank Reconciliation Works in Prava\n\n` +
        `1. Go to **[Reconciliation Hub](/reconciliation)**.\n` +
        `2. Prava automatically matches bank transactions against verified purchase invoices and sales receipts based on **Amount**, **Date window**, and **Reference/UTR number**.\n` +
        `3. **One-Click Settlement**: Review suggested matches and click **Approve** to mark entries as reconciled.\n` +
        `4. **Exception Handling**: Unmatched items are flagged as uncredited deposits or unpresented cheques so your cash balance matches your bank statement exactly.\n` +
        `5. Reconciled entries are sealed in your permanent audit trail.`,
      actions: [
        { label: "Open Reconciliation Hub →", path: "/reconciliation", variant: "default" },
      ],
    };
  }

  // Taxes, GST Preparation & Filing
  if (/\b(how\s+to\s+file\s+gst|gst\s+preparation|prepare\s+gst|gstr-?3b|file\s+return|tax\s+filing|how\s+gst\s+works)\b/i.test(lower)) {
    return {
      answer: `### 📋 GST Preparation & Filing Workflow\n\n` +
        `1. Open **[Taxes & Compliance](/tax)**.\n` +
        `2. **Automatic Output Tax Calculation**: Gathers total outward taxable supplies from your issued invoices.\n` +
        `3. **Input Tax Credit (ITC)**: Calculates eligible GST paid on verified supplier invoices that qualify under Section 16(2)(aa).\n` +
        `4. **Net Tax Position**: Automatically computes \`Net GST Payable = Output Tax - Eligible ITC\`.\n` +
        `5. **CA Authorization**: Review the generated **GSTR-3B Summary** and click **Send to CA for Sign-Off** or download the draft for statutory portal upload.`,
      actions: [
        { label: "Open Taxes & Compliance →", path: "/tax", variant: "default" },
        { label: "View CA Review Desk →", path: "/ca-review", variant: "outline" },
      ],
    };
  }

  // Autonomous CA Suite & Audit Checks
  if (/\b(what\s+is\s+ca\s+suite|autonomous\s+ca|how\s+does\s+ca\s+suite\s+work|audit\s+checks|ca\s+audit)\b/i.test(lower)) {
    return {
      answer: `### ⚖️ Autonomous CA Suite Capabilities\n\n` +
        `The **[Autonomous CA Suite](/ca-suite)** performs continuous, real-time statutory audits:\n\n` +
        `- **Section 43B(h) MSME Audit**: Tracks payable aging to Micro and Small enterprises to prevent 100% tax disallowance.\n` +
        `- **Section 194 TDS Compliance**: Monitors contract and professional payments exceeding ₹30k/₹100k thresholds to ensure TDS deduction.\n` +
        `- **GSTR-2B vs 3B ITC Reconciliation**: Audits purchase register against supplier GSTR-2B filings to flag ineligible credits.\n` +
        `- **Section 40A(3) Cash Audit**: Flags any single-day cash payment exceeding ₹10,000.\n` +
        `- **Schedule III Ratios**: Computes MCA-mandated ratios (Current Ratio, Debt-Equity, Net Profit Margin) with variance analysis.\n` +
        `- **Form 3CD Clause Generator**: Generates draft audit clauses for your Chartered Accountant's review.`,
      actions: [
        { label: "Open Autonomous CA Suite →", path: "/ca-suite", variant: "default" },
      ],
    };
  }

  // Creating Sales Invoices / Billing Customers
  if (/\b(how\s+to\s+create\s+(an?\s+)?invoice|issue\s+invoice|sales\s+invoice|create\s+bill|make\s+an?\s+invoice)\b/i.test(lower)) {
    return {
      answer: `### 🧾 How to Issue GST Sales Invoices\n\n` +
        `1. Open **[Issued Invoices](/invoices/issued)**.\n` +
        `2. Click **Create New Invoice**.\n` +
        `3. Fill in customer details, GSTIN, and place of supply (automatically applies intra-state CGST+SGST or inter-state IGST).\n` +
        `4. Add item descriptions, HSN/SAC codes, quantity, and unit rate.\n` +
        `5. Click **Issue Document**: Generates sequential numbering (e.g. \`INV-2026-0001\`) and a downloadable, branded PDF ready to email to your client.`,
      actions: [
        { label: "Open Invoicing Hub →", path: "/invoices/issued", variant: "default" },
      ],
    };
  }

  // Inviting Team Members / Chartered Accountant
  if (/\b(invite|add\s+member|add\s+ca|invite\s+accountant|permissions|roles|team\s+access)\b/i.test(lower)) {
    return {
      answer: `### 👥 Inviting Team Members & Chartered Accountants\n\n` +
        `1. Go to **[Workspace Settings](/settings)** and select the **Members & Access** tab.\n` +
        `2. Enter the user's work email address.\n` +
        `3. Select their access role:\n` +
        `   - **Owner**: Complete administration, billing, and financial authority.\n` +
        `   - **Accountant / CA**: Audit access, tax filing review, and reconciliation approvals.\n` +
        `   - **Viewer**: Read-only access to invoices and high-level reports.\n` +
        `4. Click **Send Invitation**: They will receive an email invitation to join this workspace.`,
      actions: [
        { label: "Open Workspace Settings →", path: "/settings", variant: "default" },
      ],
    };
  }

  // Security, Privacy & Data Isolation
  if (/\b(security|privacy|data\s+safe|where\s+stored|who\s+can\s+see|tenant\s+isolation|encryption)\b/i.test(lower)) {
    return {
      answer: `### 🔒 Prava Security & Data Privacy Architecture\n\n` +
        `- **Cryptographic Tenant Isolation**: Your business records, invoices, bank balances, and ledgers are strictly partitioned by \`businessId\` and authenticated user sessions.\n` +
        `- **Storage Vault**: Documents are archived in private Supabase cloud buckets with timed, signed URLs.\n` +
        `- **Zero Unauthorized Access**: Platform administrators cannot view raw invoice contents or confidential customer contracts.\n` +
        `- **Two-Step Authentication**: Every session is protected by password validation and verified 6-digit OTP dispatch.`,
      actions: [
        { label: "View Audit Log in Settings →", path: "/settings", variant: "default" },
      ],
    };
  }

  // =========================================================================
  // 3. QUESTIONS ABOUT THE USER'S OWN BUSINESS ("their business")
  // =========================================================================

  // Business Profile / Identity / Legal Name / GSTIN
  if (/\b(my\s+business|our\s+business|my\s+company|our\s+company|company\s+name|legal\s+name|who\s+are\s+we|business\s+details|about\s+my\s+business|what\s+is\s+my\s+business)\b/i.test(lower)) {
    return {
      answer: `### 🏢 Business Entity Profile\n\n` +
        `- **Operating Name**: **${ws.name || "Prava Technologies Private Limited"}**\n` +
        `- **Legal Name**: **${ws.legalName || ws.name || "Prava Technologies Private Limited"}**\n` +
        `- **Entity Type**: ${ws.businessType || "Private Limited Company"}\n` +
        `- **Industry**: ${ws.industry || "Financial Technology & Cloud Software"}\n` +
        `- **GSTIN**: \`${ws.gstin || "27AABCP8821F1Z2"}\` (${ws.gstStatus === "registered" ? "Registered (Active)" : "Unregistered"})\n` +
        `- **Registered Location**: ${ws.city || "Mumbai"}, ${ws.state || "Maharashtra"} (${ws.country || "IN"})\n` +
        `- **Currency & Tax System**: ${ws.currency || "INR"} (${ws.taxSystem || "GST & Indian Direct Tax"})\n` +
        `- **Contact Email**: ${ws.email || "demo@prava.io"}\n` +
        `- **Contact Phone**: ${ws.phone || "+91 98200 12345"}`,
      actions: [
        { label: "Edit Business Settings →", path: "/settings", variant: "default" },
      ],
    };
  }

  // GST Number / GSTIN Inquiry
  if (/\b(what\s+is\s+(my|our)\s+gst(in)?|what('s|\s+is)\s+our\s+gst\s+number|show\s+(my|our)\s+gstin)\b/i.test(lower)) {
    return {
      answer: `### 🆔 Registered GSTIN\n\n` +
        `- **GSTIN**: **\`${ws.gstin || "27AABCP8821F1Z2"}\`**\n` +
        `- **Legal Name**: ${ws.legalName || ws.name}\n` +
        `- **Jurisdiction State**: 27 (Maharashtra)\n` +
        `- **Status**: Registered & Active for GST compliance.\n\n` +
        `This GSTIN is automatically applied to all your issued sales invoices and GSTR-3B filings.`,
      actions: [
        { label: "View Taxes & GST Position →", path: "/tax", variant: "default" },
        { label: "Edit Entity Profile →", path: "/settings", variant: "outline" },
      ],
    };
  }

  // Bank Balance & Cash on Hand
  if (/\b(bank\s+balance|cash\s+balance|how\s+much\s+(cash|money)\s+(do\s+we\s+have|in\s+(the\s+)?bank)|available\s+cash|current\s+balance)\b/i.test(lower)) {
    return {
      answer: `### 🏦 Available Bank Cash & Liquidity\n\n` +
        `- **Available Cash in Bank**: **${fin.cashFormatted || "₹0.00"}**\n` +
        `- **Account Type**: Operating Business Current Account\n` +
        `- **Status**: Live ledger balance synchronized with verified bank transactions.\n\n` +
        `To inspect unreconciled bank statements or match deposits against invoices, visit [Reconciliation Hub](/reconciliation).`,
      actions: [
        { label: "View Money & Cashflow →", path: "/money", variant: "default" },
        { label: "Open Reconciliation Hub →", path: "/reconciliation", variant: "outline" },
      ],
    };
  }

  // Receivables (Money Owed to You)
  if (/\b(receivable|receivables|who\s+owes\s+us|money\s+owed\s+to\s+us|unpaid\s+customer\s+bills|outstanding\s+sales)\b/i.test(lower)) {
    return {
      answer: `### 📈 Accounts Receivable (Money Owed to You)\n\n` +
        `- **Total Outstanding Receivables**: **${fin.receivablesFormatted || "₹0.00"}**\n` +
        `- **Status**: Customer invoices billed but pending bank receipt.\n\n` +
        `You can generate new GST-compliant sales invoices or track payment collections at [Issued Invoices](/invoices/issued).`,
      actions: [
        { label: "View Issued Invoices →", path: "/invoices/issued", variant: "default" },
        { label: "Inspect Financial Position →", path: "/money", variant: "outline" },
      ],
    };
  }

  // Payables (Money You Owe)
  if (/\b(payable|payables|who\s+do\s+we\s+owe|money\s+we\s+owe|vendor\s+dues|unpaid\s+vendor\s+bills|vendor\s+payments)\b/i.test(lower)) {
    return {
      answer: `### 📉 Accounts Payable (Money You Owe)\n\n` +
        `- **Total Outstanding Payables**: **${fin.payablesFormatted || "₹0.00"}**\n` +
        `- **Status**: Vendor invoices verified into your ledger awaiting settlement.\n\n` +
        `Prava continuously tracks Section 43B(h) 45-day payment deadlines for micro and small suppliers to safeguard your tax deductions.`,
      actions: [
        { label: "Inspect Document Ledger →", path: "/documents", variant: "default" },
        { label: "Check MSME 43B(h) in CA Suite →", path: "/ca-suite", variant: "outline" },
      ],
    };
  }

  // Estimated Net GST / Tax Liability
  if (/\b(gst\s+position|net\s+gst|gst\s+liability|how\s+much\s+gst|tax\s+payable|how\s+much\s+tax\s+do\s+we\s+owe|our\s+tax\s+liability)\b/i.test(lower)) {
    return {
      answer: `### 🏛️ Net GST Position & Liability\n\n` +
        `- **Estimated Net GST to Pay**: **${fin.gstPositionFormatted || "₹0.00"}**\n` +
        `- **Registered GSTIN**: \`${ws.gstin || "27AABCP8821F1Z2"}\`\n` +
        `- **Computation**: \`Output GST (Sales) - Eligible Input Tax Credit (Verified Purchases)\`\n\n` +
        `Review auto-generated GSTR-3B monthly drafts and send for your Chartered Accountant's review at [Taxes & Compliance](/tax).`,
      actions: [
        { label: "Open Taxes & Compliance →", path: "/tax", variant: "default" },
        { label: "Open CA Review Desk →", path: "/ca-review", variant: "outline" },
      ],
    };
  }

  // Live Financial Overview / Revenue / Expenses / Cash / Profit
  if (/\b(how\s+much\s+(did\s+we\s+earn|revenue|money\s+do\s+we\s+have|cash|profit)|financial\s+status|how\s+is\s+(my|our)\s+business\s+doing|financial\s+overview|money\s+situation)\b/i.test(lower)) {
    return {
      answer: `### 📊 Live Financial Position for ${ws.name || "Your Business"}\n\n` +
        `- **Total Revenue (Earned)**: **${fin.revenueFormatted || "₹0.00"}**\n` +
        `- **Total Expenses (Spent)**: **${fin.expensesFormatted || "₹0.00"}**\n` +
        `- **Available Cash in Bank**: **${fin.cashFormatted || "₹0.00"}**\n` +
        `- **Money Owed to You (Receivables)**: **${fin.receivablesFormatted || "₹0.00"}**\n` +
        `- **Money You Owe (Payables)**: **${fin.payablesFormatted || "₹0.00"}**\n` +
        `- **Estimated Net GST Payable**: **${fin.gstPositionFormatted || "₹0.00"}**\n\n` +
        `You have **${invoices.length}** verified invoices and **${openActions.length}** open action items requiring review.`,
      actions: [
        { label: "Open Financial Cockpit →", path: "/dashboard", variant: "default" },
        { label: "View Full Money Overview →", path: "/finance", variant: "outline" },
      ],
    };
  }

  // How many invoices do we have / Document count
  if (/\b(how\s+many\s+invoices|total\s+invoices|list\s+(all\s+)?invoices|show\s+(all\s+)?documents)\b/i.test(lower)) {
    if (invoices.length === 0) {
      return {
        answer: `### 📄 Invoices & Documents Summary\n\n` +
          `You currently have **0 invoices** in this workspace.\n\n` +
          `Your document vault and ledger are ready for clean testing. You can upload purchase bills, vendor invoices, or receipts at [Invoices & Receipts](/documents).`,
        actions: [
          { label: "Upload Document Now →", path: "/documents", variant: "default" },
        ],
      };
    }

    return {
      answer: `### 📄 Verified Invoices (${invoices.length} total)\n\n` +
        invoices.slice(0, 5).map((inv, idx) =>
          `${idx + 1}. **Invoice #${inv.invoiceNumber}** — **${inv.vendorName}** (${inv.invoiceDate})\n` +
          `   Total: **${inv.totalFormatted}** (Taxable: ${inv.taxableFormatted}, GST: ${inv.totalGstFormatted}) | Status: ${inv.status}`
        ).join("\n\n") +
        (invoices.length > 5 ? `\n\n*...and ${invoices.length - 5} more invoices.*` : ""),
      actions: [
        { label: "View All Documents →", path: "/documents", variant: "default" },
      ],
    };
  }

  // Tasks & Action Items
  if (/\b(what\s+are\s+my\s+tasks|pending\s+tasks|action\s+items|what\s+to\s+do\s+today|checklist|pending\s+actions)\b/i.test(lower)) {
    const actionsList = openActions.length > 0
      ? openActions.map((a, i) => `${i + 1}. **[${a.priority.toUpperCase()}] ${a.title}**: ${a.description}`).join("\n")
      : "✅ **No urgent action items!** Your records and compliance checks are currently up to date.";

    return {
      answer: `### 📋 Active Action Items & Tasks (${openActions.length} items)\n\n` +
        `${actionsList}\n\n` +
        `You have **${tasks.length}** workflow task(s) logged in your pipeline.`,
      actions: [
        { label: "Open Tasks Hub →", path: "/tasks", variant: "default" },
      ],
    };
  }

  // =========================================================================
  // 4. ANY FINANCE & ACCOUNTING CONCEPT ("any finance question")
  // =========================================================================

  // COGS (Cost of Goods Sold)
  if (/\b(cogs|cost\s+of\s+goods\s+sold)\b/i.test(lower)) {
    return {
      answer: `### 📦 COGS (Cost of Goods Sold)\n\n` +
        `- **Definition**: The direct costs attributable to the production or procurement of goods and services sold by a company.\n` +
        `- **Formula**: \`COGS = Beginning Inventory + Purchases (Direct Material/Subcontractor Costs) - Ending Inventory\`\n` +
        `- **What It Includes**: Raw materials, freight-in, direct factory wages, and direct cloud compute/hosting for digital software delivery.\n` +
        `- **What It Excludes**: Indirect expenses such as marketing, sales commissions, office rent, and corporate management salaries.\n` +
        `- **Key Role**: Directly determines **Gross Profit = Revenue - COGS**.`,
      actions: [
        { label: "View Money & Expenses →", path: "/finance", variant: "default" },
      ],
    };
  }

  // ARR & MRR
  if (/\b(arr|mrr|annual\s+recurring\s+revenue|monthly\s+recurring\s+revenue)\b/i.test(lower)) {
    return {
      answer: `### 📊 ARR & MRR (Recurring Revenue Metrics)\n\n` +
        `- **MRR (Monthly Recurring Revenue)**: The predictable, normalized subscription revenue earned by a business in a single calendar month.\n` +
        `- **ARR (Annual Recurring Revenue)**: The annualized run rate of subscription software contracts: \`ARR = MRR × 12\`.\n` +
        `- **Key Components**:\n` +
        `  - **New MRR**: Revenue added from newly onboarded customers.\n` +
        `  - **Expansion MRR**: Upgrades or additional licenses from existing clients.\n` +
        `  - **Churn MRR**: Lost revenue from cancellations.\n` +
        `- **Significance**: The gold-standard growth and valuation metric for SaaS and recurring business models.`,
      actions: [
        { label: "View Live Dashboard →", path: "/dashboard", variant: "default" },
      ],
    };
  }

  // Equity vs Debt & Valuation
  if (/\b(equity\s+vs\s+debt|debt\s+vs\s+equity|valuation|how\s+is\s+valuation\s+calculated|enterprise\s+value)\b/i.test(lower)) {
    return {
      answer: `### ⚖️ Equity vs. Debt & Valuation Fundamentals\n\n` +
        `- **Equity Financing**: Raising capital by selling company ownership shares. No mandatory monthly repayment obligation; investors share in future upside and dividends.\n` +
        `- **Debt Financing**: Borrowing capital from banks or lenders that must be repaid with interest (e.g. term loans, working capital overdrafts). You retain 100% company ownership.\n\n` +
        `- **Valuation Metrics**:\n` +
        `  - **Enterprise Value (EV)**: \`Market Cap + Total Debt - Cash & Cash Equivalents\`.\n` +
        `  - **Common Multiples**: EV / EBITDA (profitable companies) or EV / Revenue (high-growth software startups).`,
      actions: [
        { label: "View Financial Health →", path: "/health", variant: "default" },
      ],
    };
  }

  // EBITDA
  if (/\b(ebitda|operating\s+profit\s+before\s+d&a)\b/i.test(lower)) {
    return {
      answer: `### 📈 EBITDA (Earnings Before Interest, Taxes, Depreciation & Amortization)\n\n` +
        `- **Definition**: A primary metric used to evaluate a company's core operational profitability without the distortion of financing choices, accounting policies (depreciation schedules), or tax jurisdictions.\n` +
        `- **Formula**:\n` +
        `  \`EBITDA = Net Income + Interest + Taxes + Depreciation + Amortization\`\n` +
        `  *Or simply:* \`EBITDA = Operating Revenue - Operating Expenses (excluding D&A)\`\n` +
        `- **Why It Matters**:\n` +
        `  - Reflects the pure cash-generating power of day-to-day business operations.\n` +
        `  - Used by investors and lenders to calculate debt service coverage and company valuation multiples (e.g. EV/EBITDA).`,
      actions: [
        { label: "View Financial Overview →", path: "/finance", variant: "default" },
      ],
    };
  }

  // Gross Margin vs Net Margin
  if (/\b(gross\s+margin|net\s+margin|profit\s+margin|gross\s+profit\s+vs\s+net\s+profit)\b/i.test(lower)) {
    return {
      answer: `### ⚖️ Gross Margin vs. Net Margin\n\n` +
        `- **Gross Profit Margin**:\n` +
        `  - **Formula**: \`((Revenue - COGS) / Revenue) × 100\`\n` +
        `  - Measures production efficiency and product pricing after direct manufacturing or service delivery costs (COGS).\n\n` +
        `- **Net Profit Margin**:\n` +
        `  - **Formula**: \`(Net Profit after all expenses, taxes, and interest / Revenue) × 100\`\n` +
        `  - The true bottom line: what percentage of each rupee earned turns into actual profit for the business.\n\n` +
        `- **Key Difference**: Gross margin reflects unit economics; Net margin reflects total company viability including overheads, marketing, payroll, and taxes.`,
      actions: [
        { label: "View Money & Margins →", path: "/finance", variant: "default" },
      ],
    };
  }

  // Working Capital & Current Ratio
  if (/\b(working\s+capital|current\s+ratio|liquidity\s+ratio)\b/i.test(lower)) {
    return {
      answer: `### 💧 Working Capital & Current Ratio\n\n` +
        `- **Working Capital**:\n` +
        `  - **Formula**: \`Working Capital = Current Assets - Current Liabilities\`\n` +
        `  - The operational capital required to fund daily business activities (inventory, supplier payments, payroll) while waiting for customer receivables.\n\n` +
        `- **Current Ratio**:\n` +
        `  - **Formula**: \`Current Assets / Current Liabilities\`\n` +
        `  - **Benchmark**: A ratio between **1.5x and 2.0x** is generally considered healthy. Below 1.0x indicates potential cashflow distress; above 3.0x may indicate idle, uninvested capital.`,
      actions: [
        { label: "Check Financial Health →", path: "/health", variant: "default" },
      ],
    };
  }

  // Cash Flow vs Profit
  if (/\b(cash\s+flow\s+vs\s+profit|profit\s+vs\s+cash\s+flow|difference\s+between\s+profit\s+and\s+cash)\b/i.test(lower)) {
    return {
      answer: `### 🔄 Cash Flow vs. Profit\n\n` +
        `- **Profit (Accrual Accounting)**: Recognizes revenue when an invoice is issued and expenses when billed, regardless of whether the money has arrived in your bank account.\n` +
        `- **Cash Flow**: Tracks the physical movement of money into and out of your bank account.\n\n` +
        `- **Why Businesses Fail While Showing "Profit"**:\n` +
        `  If your business issues ₹50 Lakhs in invoices (showing a ₹15 Lakhs profit on paper), but your clients delay payment for 90 days, you will have **zero cash** to pay staff salaries, vendor bills, or GST. Cash flow is what keeps the doors open.`,
      actions: [
        { label: "Inspect Live Cash Runway →", path: "/dashboard", variant: "default" },
      ],
    };
  }

  // Double Entry Bookkeeping / Debit & Credit
  if (/\b(double\s+entry|debit\s+and\s+credit|debit\s+vs\s+credit|accounting\s+equation|golden\s+rules\s+of\s+accounting)\b/i.test(lower)) {
    return {
      answer: `### 📖 Double Entry Bookkeeping & The Golden Rules\n\n` +
        `- **Core Accounting Equation**: \`Assets = Liabilities + Equity\`\n` +
        `- Every transaction affects at least two accounts in equal and opposite measure (Total Debits = Total Credits).\n\n` +
        `- **The 3 Golden Rules of Accounting**:\n` +
        `  1. **Personal Accounts**: *Debit the Receiver, Credit the Giver* (e.g. Debtors & Creditors).\n` +
        `  2. **Real Accounts**: *Debit what comes in, Credit what goes out* (e.g. Cash, Machinery, Inventory).\n` +
        `  3. **Nominal Accounts**: *Debit all expenses & losses, Credit all income & gains* (e.g. Rent, Sales).`,
      actions: [
        { label: "View Verified Ledger →", path: "/finance", variant: "default" },
      ],
    };
  }

  // Depreciation: SLM vs WDV
  if (/\b(depreciation|slm\s+vs\s+wdv|written\s+down\s+value|straight\s+line\s+method)\b/i.test(lower)) {
    return {
      answer: `### 📉 Depreciation Methods: SLM vs. WDV\n\n` +
        `- **Straight Line Method (SLM)**: Spreads the asset cost evenly across its estimated useful life. Equal depreciation charged every year.\n` +
        `- **Written Down Value (WDV)**: Applies a fixed percentage to the reducing opening balance each year. Results in higher depreciation in early years and lower in later years.\n\n` +
        `- **Statutory Tax Rule (Income Tax Act, 1961)**:\n` +
        `  Under **Section 32**, depreciation for income tax computation in India is **strictly mandatory under the WDV method** on asset blocks (e.g., Computers/Laptops: 40%, Plant & Machinery: 15%, Furniture: 10%).`,
      actions: [
        { label: "Review Asset Accounting in CA Suite →", path: "/ca-suite", variant: "default" },
      ],
    };
  }

  // Capex vs Opex
  if (/\b(capex\s+vs\s+opex|capital\s+expenditure|operating\s+expense)\b/i.test(lower)) {
    return {
      answer: `### 🏗️ Capex vs. Opex\n\n` +
        `- **Capex (Capital Expenditure)**: Money spent on long-term assets that provide multi-year economic value (e.g. MacBooks, servers, office leasehold improvements). Recorded on the **Balance Sheet** and expensed gradually via annual depreciation.\n` +
        `- **Opex (Operating Expenditure)**: Day-to-day ongoing business operating costs (e.g. AWS hosting, Google Workspace, office rent, staff salaries). Expensed **100% immediately** against current-year revenue in the **Profit & Loss statement**.\n\n` +
        `- **Tax Impact**: Opex gives an immediate 100% tax write-off in the current financial year; Capex is written off over several years via Section 32 depreciation blocks.`,
      actions: [
        { label: "View Expenses Breakdown →", path: "/finance", variant: "default" },
      ],
    };
  }

  // Burn Rate & Runway
  if (/\b(burn\s+rate|runway|cash\s+runway|how\s+many\s+months\s+of\s+cash)\b/i.test(lower)) {
    return {
      answer: `### 🔥 Cash Burn Rate & Runway\n\n` +
        `- **Net Monthly Burn Rate**: Total cash outgoing minus total cash incoming per month.\n` +
        `- **Runway Formula**: \`Available Cash Balance / Monthly Net Burn = Months of Runway\`\n\n` +
        `- **Your Live Metrics**:\n` +
        `  - Available Cash: **${fin.cashFormatted || "₹0.00"}**\n` +
        `  - Monthly Expenses: **${fin.expensesFormatted || "₹0.00"}**\n` +
        `  - Monthly Revenue: **${fin.revenueFormatted || "₹0.00"}**\n` +
        `  - Prava tracks your burn rate continuously and triggers proactive alerts when runway drops below 3 months.`,
      actions: [
        { label: "View Health & Runway Cockpit →", path: "/health", variant: "default" },
      ],
    };
  }

  // Balance Sheet / P&L
  if (/\b(balance\s+sheet|p&l|profit\s+and\s+loss|income\s+statement)\b/i.test(lower)) {
    return {
      answer: `### 📑 Financial Statements Overview\n\n` +
        `- **Balance Sheet**: A snapshot of what your business **owns** (Assets) and **owes** (Liabilities & Owner's Equity) at a specific moment in time.\n` +
        `  \`Assets = Liabilities + Equity\`\n` +
        `- **Profit & Loss (P&L)**: Measures financial performance over a period (e.g. monthly or annual).\n` +
        `  \`Net Profit = Revenue - Cost of Goods Sold - Operating Expenses - Depreciation - Taxes\`\n\n` +
        `- **Live Position for ${ws.name}**:\n` +
        `  - Revenue: **${fin.revenueFormatted || "₹0.00"}**\n` +
        `  - Expenses: **${fin.expensesFormatted || "₹0.00"}**\n` +
        `  - Cash on Hand: **${fin.cashFormatted || "₹0.00"}**`,
      actions: [
        { label: "View Live Financials →", path: "/finance", variant: "default" },
        { label: "Generate Schedule III P&L in CA Suite →", path: "/ca-suite", variant: "outline" },
      ],
    };
  }

  // =========================================================================
  // 5. STATUTORY INDIAN TAX & COMPLIANCE QUESTIONS
  // =========================================================================

  // Section 43B(h) MSME
  if (/\b(43b|43b\(h\)|43bh|msme\s+45\s+days|udyam\s+rule|msme\s+payment\s+rule)\b/i.test(lower)) {
    return {
      answer: `### ⚖️ Section 43B(h) — MSME 45-Day Payment Rule\n\n` +
        `- **Statutory Rule**: Any amount payable to a **Micro or Small Enterprise** registered on Udyam must be paid within the agreed timeline, not exceeding:\n` +
        `  - **45 days** if there is a written contract.\n` +
        `  - **15 days** in the absence of a written agreement.\n` +
        `- **Consequence of Delay**:\n` +
        `  1. **100% Tax Disallowance**: The entire invoice amount is added back to taxable corporate profit and taxed in that financial year.\n` +
        `  2. **Mandatory Compound Interest**: Attracts penal compound interest at **3 times the RBI bank rate** under Section 16 of the MSMED Act (which is strictly non-deductible).\n` +
        `- **Exemptions**: Medium enterprises (>₹50 Cr turnover) and wholesale/retail traders are exempt from Section 43B(h).`,
      actions: [
        { label: "Open MSME 43B(h) Audit Desk →", path: "/ca-suite", variant: "default" },
      ],
    };
  }

  // Section 44AD / 44ADA Presumptive Taxation
  if (/\b(44ad|44ada|presumptive\s+tax(ation)?)\b/i.test(lower)) {
    return {
      answer: `### 💼 Presumptive Taxation (Sections 44AD & 44ADA)\n\n` +
        `- **Section 44ADA (Professionals & Consultants — IT, Tech, Legal, Accounting)**:\n` +
        `  - **Gross Receipts Limit**: Up to **₹75 Lakhs** (if cash receipts <= 5%, otherwise ₹50L).\n` +
        `  - **Deemed Profit**: Exactly **50% of gross receipts** is treated as taxable profit. The remaining 50% is deemed business expenses without needing bills or receipts!\n` +
        `  - **Benefits**: No mandatory books of accounts u/s 44AA and zero tax audit u/s 44AB.\n\n` +
        `- **Section 44AD (Eligible Businesses & Agencies)**:\n` +
        `  - **Turnover Limit**: Up to **₹3 Crore** (if cash receipts <= 5%, otherwise ₹2Cr).\n` +
        `  - **Deemed Profit**: **6%** on digital/banking turnover; **8%** on cash turnover.\n` +
        `- **Advance Tax**: Can be paid in a single 100% installment on or before **15th March**.`,
      actions: [
        { label: "Calculate Tax in Taxes Hub →", path: "/tax", variant: "default" },
      ],
    };
  }

  // Input Tax Credit & GSTR-2B Mismatch (Section 16(2)(aa))
  if (/\b(itc|input\s+tax\s+credit|gstr-?2b|section\s+16\(2\)|2b\s+vs\s+3b|claim\s+itc)\b/i.test(lower)) {
    return {
      answer: `### 📥 Input Tax Credit (ITC) & GSTR-2B Rules\n\n` +
        `- **Section 16(2)(aa) Statutory Rule**: You can **only** claim ITC if the supplier has filed Form GSTR-1 and the invoice is reflected in your auto-populated **Form GSTR-2B**.\n` +
        `- **0% Provisional Credit**: Effective January 1, 2022, provisional or manual excess ITC claims in GSTR-3B are illegal.\n` +
        `- **Penalty**: Claiming and utilizing unreflected ITC attracts **18% per annum statutory interest** under Section 50(3).\n` +
        `- **Resolution Protocol**: Prava matches all uploaded vendor bills against your GSTR-2B automatically and flags defaulting suppliers before you file GSTR-3B.`,
      actions: [
        { label: "Open Taxes & Compliance →", path: "/tax", variant: "default" },
        { label: "View CA Suite 2B Audit →", path: "/ca-suite", variant: "outline" },
      ],
    };
  }

  // Section 17(5) Blocked Credit
  if (/\b(blocked\s+itc|17\(5\)|ineligible\s+itc|itc\s+on\s+car|itc\s+on\s+food)\b/i.test(lower)) {
    return {
      answer: `### 🚫 Section 17(5) Ineligible & Blocked ITC\n\n` +
        `GST paid on the following expenses **cannot be claimed as ITC** (must be reversed in GSTR-3B Table 4(B)):\n` +
        `1. **Motor Vehicles**: Passenger vehicles with seating capacity <= 13 persons.\n` +
        `2. **Food, Beverages & Catering**: Office snacks, client dinners, and outdoor catering.\n` +
        `3. **Club & Gym Memberships**: Health, fitness, and recreational club dues.\n` +
        `4. **Personal Consumption & Free Gifts**: Goods lost, stolen, destroyed, or given as free samples.\n\n` +
        `✅ **Eligible Capital Goods**: Laptops, MacBooks, servers, office furniture, and developer SaaS (AWS, Slack) are **100% eligible** u/s 16(1), provided depreciation is not claimed on the GST component.`,
      actions: [
        { label: "Review Document Extractions →", path: "/documents", variant: "default" },
      ],
    };
  }

  // TDS Rates & Section 40(a)(ia) Disallowance
  if (/\b(tds|194c|194j|194i|194q|40\(a\)\(ia\)|tax\s+deducted\s+at\s+source)\b/i.test(lower)) {
    return {
      answer: `### ✂️ TDS Rates & Disallowance Rules\n\n` +
        `- **Key Commercial TDS Sections**:\n` +
        `  - **194C (Contractors)**: 1% for Individuals/HUF, 2% for Companies/LLPs (Threshold: ₹30k single / ₹1L aggregate).\n` +
        `  - **194J (Professional / Technical)**: 10% for professional services; 2% for technical/call centre services (Threshold: ₹30k).\n` +
        `  - **194I (Rent)**: 10% for land/building; 2% for plant/machinery (Threshold: ₹2.4 Lakhs p.a.).\n` +
        `  - **194Q (Purchase of Goods)**: 0.1% on purchases exceeding ₹50 Lakhs if buyer turnover > ₹10 Crore.\n\n` +
        `- **Section 40(a)(ia) 30% Penalty**:\n` +
        `  If TDS is not deducted or deducted but not deposited before the ITR filing due date, **30% of the entire expense is disallowed** and taxed at the corporate tax rate!`,
      actions: [
        { label: "Review TDS Clauses in CA Suite →", path: "/ca-suite", variant: "default" },
      ],
    };
  }

  // Advance Tax Installments
  if (/\b(advance\s+tax|due\s+dates\s+for\s+tax|234b|234c)\b/i.test(lower)) {
    return {
      answer: `### 🗓️ Advance Tax Installments & Deadlines\n\n` +
        `Applicable if your estimated net tax liability (after TDS) is **₹10,000 or more** in a financial year:\n\n` +
        `- **1st Installment (15th June)**: Minimum **15%** of estimated tax.\n` +
        `- **2nd Installment (15th September)**: Minimum **45%** of estimated tax.\n` +
        `- **3rd Installment (15th December)**: Minimum **75%** of estimated tax.\n` +
        `- **4th Installment (15th March)**: **100%** of estimated tax.\n\n` +
        `- **Penalties for Shortfall**:\n` +
        `  - **Section 234C**: 1% per month simple interest on quarterly deferment.\n` +
        `  - **Section 234B**: 1% per month from 1st April if less than 90% of assessed tax is paid by 31st March.`,
      actions: [
        { label: "Estimate Tax in Taxes Hub →", path: "/tax", variant: "default" },
      ],
    };
  }

  // Reverse Charge Mechanism (RCM)
  if (/\b(rcm|reverse\s+charge(\s+mechanism)?)\b/i.test(lower)) {
    return {
      answer: `### 🔄 Reverse Charge Mechanism (RCM)\n\n` +
        `- **Definition**: Under Section 9(3) of CGST Act and 5(3) of IGST Act, the statutory liability to pay GST shifts from the supplier to the **recipient** of goods or services.\n` +
        `- **Common Inward Supplies Attracting RCM**:\n` +
        `  - Legal services supplied by an Advocate or Senior Advocate.\n` +
        `  - Goods Transport Agency (GTA) freight services.\n` +
        `  - Director services provided to the company.\n` +
        `  - Import of services (e.g. foreign software/SaaS without Indian GSTIN).\n\n` +
        `- **Accounting & Credit Protocol**:\n` +
        `  1. Deposit the tax through the **Electronic Cash Ledger** in GSTR-3B Table 3.1(d).\n` +
        `  2. Claim **100% Input Tax Credit** simultaneously in Table 4(A)(3) of the same return.`,
      actions: [
        { label: "Open Taxes & Compliance →", path: "/tax", variant: "default" },
      ],
    };
  }

  // Founder Salary vs Dividend
  if (/\b(founder\s+salary|director\s+salary|salary\s+vs\s+dividend|remuneration\s+vs\s+dividend|save\s+corporate\s+tax)\b/i.test(lower)) {
    return {
      answer: `### 💰 Founder Remuneration vs. Dividend Strategy\n\n` +
        `- **Director / Founder Remuneration**:\n` +
        `  - 100% deductible business expense for the company under Section 37(1), directly reducing company taxable profit and saving **22.88% corporate tax**.\n` +
        `  - Eligible for **Section 80CCD(2) Employer NPS** (up to 14% of salary completely tax-free) and standard deduction (₹75k).\n\n` +
        `- **Dividends (Avoid if possible)**:\n` +
        `  - Paid from post-tax company profit (company pays 22.88% first) and then taxed **again** in the founder's hands at personal slab rates (up to 39% with surcharge).\n` +
        `  - Results in severe **double taxation**.\n\n` +
        `- **Optimal Strategy**: Draw reasonable market salary with employer NPS to optimize corporate profit down, reinvesting surplus cash into business operations.`,
      actions: [
        { label: "View CA Strategy in CA Suite →", path: "/ca-suite", variant: "default" },
      ],
    };
  }

  // Section 40A(3) Cash Payment Limit
  if (/\b(cash\s+limit|40a\(3\)|40a3|petty\s+cash\s+limit|cash\s+payment\s+to\s+contractor|10000\s+cash)\b/i.test(lower)) {
    return {
      answer: `### 💵 Section 40A(3) Cash Payment Prohibition\n\n` +
        `- **Statutory Limit**: Single-day payments made in cash to a single person/vendor exceeding **₹10,000** are **100% disallowed** as an expense under Section 40A(3).\n` +
        `- **Transport Exception**: The limit is raised to **₹35,000** only for payments made to goods carriage operators (transporters).\n` +
        `- **Section 269ST Penalty**: Accepting ₹2 Lakhs or more in cash in a day attracts a **100% penalty** equal to the amount received.\n` +
        `- **Prava Enforcement**: Always execute vendor payments via banking channels (IMPS/NEFT/UPI) to protect your tax deductions.`,
      actions: [
        { label: "Review Cash Entries in Reconciliation →", path: "/reconciliation", variant: "default" },
      ],
    };
  }

  // Only match statutory RAG if the query actually mentions the topic, section, or keywords
  if (vectorStatutes.length > 0) {
    const matched = vectorStatutes.find(s =>
      (s.topic && lower.includes(s.topic.toLowerCase())) ||
      s.sections?.some(sec => lower.includes(sec.toLowerCase())) ||
      s.keywords?.some(kw => lower.includes(kw.toLowerCase()))
    );
    if (matched) {
      return {
        answer: `### ⚖️ ${matched.topic}\n\n` +
          `- **Statutory Reference**: ${matched.sections?.join(", ") || "Indian Statutory Law"}\n` +
          `- **Key Rules**:\n${matched.rules?.map(r => `  * ${r}`).join("\n") || "  * Refer to applicable provisions."}\n` +
          `- **Actionable Guidance**: ${matched.actionableAdvice || "Audit your current ledger entries and verify compliance with your CA."}`,
        actions: [
          { label: "Open Autonomous CA Suite →", path: "/ca-suite", variant: "default" },
        ],
        sources: [{ title: matched.topic, type: "Statutory Law" }],
      };
    }
  }

  return null;
}
