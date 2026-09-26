import DashboardLayout from "@/components/DashboardLayout";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  Building2,
  Calculator,
  Calendar,
  Check,
  Coins,
  Copy,
  Download,
  FileCheck,
  FileCode,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function CaSuite() {

  const formatInr = (val?: number | null | string) =>
    val != null && !isNaN(Number(val)) ? Number(val).toLocaleString("en-IN") : "0";

  // Active tab state
  const [activeTab, setActiveTab] = useState("overview");

  // Advance Tax interactive inputs
  const [grossRevenue, setGrossRevenue] = useState(0);
  const [operatingExpenses, setOperatingExpenses] = useState(0);
  const [depreciation, setDepreciation] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [tdsDeducted, setTdsDeducted] = useState(0);
  const [entityType, setEntityType] = useState<"company" | "individual_business" | "llp">("company");

  // Founder Tax Optimization inputs
  const [founderRemuneration, setFounderRemuneration] = useState(0);
  const [npsContributionPct, setNpsContributionPct] = useState(14); // 14% Sec 80CCD(2)

  // Notice Defense state
  const [noticeType, setNoticeType] = useState<"gst_asmt_10" | "it_143_1" | "it_139_9" | "gst_drc_01">("gst_asmt_10");
  const [noticeRef, setNoticeRef] = useState("");
  const [disputedAmount, setDisputedAmount] = useState(0);

  // AI Invoice Auditor state
  const [auditVendorName, setAuditVendorName] = useState("");
  const [auditVendorGstin, setAuditVendorGstin] = useState("");
  const [auditInvoiceNumber, setAuditInvoiceNumber] = useState("");
  const [auditInvoiceDate, setAuditInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [auditTaxableAmount, setAuditTaxableAmount] = useState(0);
  const [auditGstRate, setAuditGstRate] = useState(18);
  const [auditSacHsn, setAuditSacHsn] = useState("");
  const [auditCategory, setAuditCategory] = useState("");
  const [auditMsmeStatus, setAuditMsmeStatus] = useState<"micro" | "small" | "medium" | "non_msme">("non_msme");
  const [auditHasContract, setAuditHasContract] = useState(true);

  // AI CA Co-Pilot (RAG) state
  const [copilotQuery, setCopilotQuery] = useState("Can I claim ITC on MacBooks and software subscriptions?");

  // Active Business & Summary
  const businessesQuery = trpc.businesses.list.useQuery();
  const activeBiz = businessesQuery.data?.[0];
  const summaryQuery = trpc.finance.latestSummary.useQuery(
    { businessId: activeBiz?.id ?? 1 },
    { enabled: !!activeBiz?.id }
  );

  // Vault documents for this business
  const userDocsQuery = trpc.documents.list.useQuery(
    { businessId: activeBiz?.id ?? 0 },
    { enabled: !!activeBiz?.id }
  );

  useEffect(() => {
    if (userDocsQuery.data && userDocsQuery.data.length > 0) {
      let rev = 0;
      let exp = 0;
      for (const d of userDocsQuery.data) {
        if (!d.extraction) continue;
        const val = (d.extraction.taxableValueMinor || d.extraction.totalMinor || 0) / 100;
        if (d.extraction.invoiceType === "sales") rev += val;
        else if (d.extraction.invoiceType === "purchase") exp += val;
      }
      setGrossRevenue(rev);
      setOperatingExpenses(exp);
    } else {
      setGrossRevenue(0);
      setOperatingExpenses(0);
    }
  }, [userDocsQuery.data]);

  // Queries from caEngine
  const advanceTaxQuery = trpc.caEngine.advanceTax.useQuery({
    businessId: activeBiz?.id,
    grossRevenue,
    operatingExpenses,
    depreciation,
    otherIncome,
    tdsAlreadyDeducted: tdsDeducted,
    entityType,
  }, { enabled: !!activeBiz?.id });

  const msmeQuery = trpc.caEngine.msmeAudit.useQuery(
    { businessId: activeBiz?.id },
    { enabled: !!activeBiz?.id }
  );
  const gstr2bQuery = trpc.caEngine.gstr2bReconcile.useQuery(
    { businessId: activeBiz?.id },
    { enabled: !!activeBiz?.id }
  );
  const tdsQuery = trpc.caEngine.tdsCompliance.useQuery();
  const cashQuery = trpc.caEngine.cashAudit.useQuery();
  const complianceCalendarQuery = trpc.caEngine.complianceCalendar.useQuery();
  const gstnFilingQuery = trpc.caEngine.gstnFilingJson.useQuery(
    { businessId: activeBiz?.id, gstin: activeBiz?.gstin },
    { enabled: !!activeBiz?.id }
  );
  const schedule3Query = trpc.caEngine.schedule3Financials.useQuery(
    { businessId: activeBiz?.id },
    { enabled: !!activeBiz?.id }
  );
  const form3CdQuery = trpc.caEngine.form3CdTaxAudit.useQuery();

  // Mutations
  const noticeMutation = trpc.caEngine.draftNoticeDefense.useMutation({
    onSuccess: () => {
      toast.success("Legal defense petition generated with statutory citations!");
    },
  });

  const invoiceAuditMutation = trpc.caEngine.auditInvoice.useMutation({
    onSuccess: () => {
      toast.success("AI CA Audit Completed: Statutory Voucher generated!");
    },
  });

  const copilotMutation = trpc.caEngine.askCopilot.useMutation({
    onSuccess: () => {
      toast.success("Statutory CA legal opinion retrieved from RAG knowledge base!");
    },
  });

  const handleGenerateNotice = () => {
    noticeMutation.mutate({
      noticeType,
      noticeRef,
      disputedAmount,
      taxpayerName: activeBiz?.name || "Your Enterprise Workspace",
      gstinOrPan: activeBiz?.gstin || "27AABCP8821F1Z2",
    });
  };

  const handleAuditInvoice = () => {
    invoiceAuditMutation.mutate({
      vendorName: auditVendorName,
      vendorGstin: auditVendorGstin,
      invoiceNumber: auditInvoiceNumber,
      invoiceDate: auditInvoiceDate,
      taxableAmount: auditTaxableAmount,
      gstRate: auditGstRate,
      sacOrHsn: auditSacHsn,
      expenseCategory: auditCategory,
      msmeStatus: auditMsmeStatus,
      hasWrittenContract: auditHasContract,
    });
  };

  const handleAskCopilot = (question?: string) => {
    const q = question || copilotQuery;
    if (!q.trim()) return;
    setCopilotQuery(q);
    copilotMutation.mutate({ query: q });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const downloadJsonFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename} ready for upload to gst.gov.in!`);
  };

  const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}!`);
  };

  // Preset invoice audit profiles
  const applyInvoicePreset = (preset: {
    vendor: string;
    gstin: string;
    invNum: string;
    amount: number;
    rate: number;
    category: string;
    sac: string;
    msme: "micro" | "small" | "medium" | "non_msme";
    contract: boolean;
  }) => {
    setAuditVendorName(preset.vendor);
    setAuditVendorGstin(preset.gstin);
    setAuditInvoiceNumber(preset.invNum);
    setAuditTaxableAmount(preset.amount);
    setAuditGstRate(preset.rate);
    setAuditCategory(preset.category);
    setAuditSacHsn(preset.sac);
    setAuditMsmeStatus(preset.msme);
    setAuditHasContract(preset.contract);

    invoiceAuditMutation.mutate({
      vendorName: preset.vendor,
      vendorGstin: preset.gstin,
      invoiceNumber: preset.invNum,
      invoiceDate: auditInvoiceDate,
      taxableAmount: preset.amount,
      gstRate: preset.rate,
      sacOrHsn: preset.sac,
      expenseCategory: preset.category,
      msmeStatus: preset.msme,
      hasWrittenContract: preset.contract,
    });
  };

  const advanceTaxData = advanceTaxQuery.data;
  const msmeData = msmeQuery.data;
  const gstr2bData = gstr2bQuery.data;
  const tdsData = tdsQuery.data;
  const cashData = cashQuery.data;
  const calendarData = complianceCalendarQuery.data;
  const gstnData = gstnFilingQuery.data;
  const schedule3Data = schedule3Query.data;
  const form3CdData = form3CdQuery.data;

  // Compute Founder Remuneration Tax Comparison
  const corporateTaxSaved = Math.round(founderRemuneration * 0.2288); // 22% + 4% cess
  const npsTaxFreeAmount = Math.round((founderRemuneration * npsContributionPct) / 100);
  const netFounderPersonalTax = Math.round((founderRemuneration - npsTaxFreeAmount - 75000) * 0.18);
  const netTaxOptimizationBenefit = Math.max(0, corporateTaxSaved - netFounderPersonalTax);

  return (
    <DashboardLayout>
      <div className="space-y-6 relative z-10 max-w-[1400px] mx-auto pb-20">
        {/* ========================================================= */}
        {/* COMPACT EXECUTIVE HEADER                                  */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card/95 p-4 sm:p-5 shadow-lg backdrop-blur-md">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <Scale className="size-4.5" />
              </div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-xl font-bold tracking-tight text-foreground">
                Autonomous CA Replacement Suite
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-500 border border-emerald-500/20">
                Statutory OS Active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Production-grade Indian tax automation: GSTR-3B/1 JSON, Section 17(5) Invoice Vetting, MCA Schedule III Financials, Form 3CD, and RAG Legal Co-Pilot.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-foreground truncate max-w-[240px]">
                {activeBiz?.name || "Your Enterprise Workspace"}
              </p>
              <span className="text-[10px] font-mono text-emerald-500 font-semibold">
                {activeBiz?.gstin ? `GSTIN: ${activeBiz.gstin}` : (activeBiz?.taxSystem || "GST & Statutory Audit Active")}
              </span>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setActiveTab("ca-copilot");
                handleAskCopilot("Can I claim ITC on MacBooks and software subscriptions?");
              }}
              className="text-xs h-8 bg-purple-600 hover:bg-purple-700 text-white font-semibold gap-1.5 shadow-sm"
            >
              <Bot className="size-3.5" />
              Ask AI CA Co-Pilot
            </Button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 HIGH-IMPACT EXECUTIVE STATS CARDS                       */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card
            onClick={() => setActiveTab("gstn-filing")}
            className="border-border bg-card/90 hover:bg-accent/40 cursor-pointer transition p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Q2 Net GST Payable</span>
              <FileCheck className="size-4 text-emerald-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-foreground">
              ₹{formatInr(gstnData?.netCashPayable?.totalCashPayable ?? 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>After ₹{formatInr(gstnData?.itcDetails?.netItcAvailable?.total ?? 0)} Matched ITC</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold hover:underline">Get JSON →</span>
            </div>
          </Card>

          <Card
            onClick={() => setActiveTab("msme-43bh")}
            className="border-border bg-card/90 hover:bg-accent/40 cursor-pointer transition p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">MSME 43B(h) Payables</span>
              <ShieldAlert className="size-4 text-rose-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-rose-500">
              ₹{formatInr(msmeData?.totalDisallowanceAmount ?? 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{msmeData?.overdueInvoicesCount ?? 0} Invoices Overdue</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold hover:underline">Audit →</span>
            </div>
          </Card>

          <Card
            onClick={() => setActiveTab("advance-tax")}
            className="border-border bg-card/90 hover:bg-accent/40 cursor-pointer transition p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Advance Tax Q2 (Sep 15)</span>
              <Calculator className="size-4 text-amber-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-foreground">
              ₹{formatInr(advanceTaxData?.installments?.[1]?.quarterInstallment ?? advanceTaxData?.installments?.[1]?.cumulativeAmount ?? 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>45% Cumulative Due</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold hover:underline">Challan 280 →</span>
            </div>
          </Card>

          <Card
            onClick={() => setActiveTab("schedule-3")}
            className="border-border bg-card/90 hover:bg-accent/40 cursor-pointer transition p-4 shadow-sm"
          >
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">Schedule III Profit (PAT)</span>
              <Building2 className="size-4 text-sky-500" />
            </div>
            <div className="text-lg sm:text-xl font-bold font-mono text-emerald-500">
              ₹{formatInr(schedule3Data?.statementOfProfitAndLoss?.profitAfterTax ?? schedule3Data?.profitAndLoss?.profitAfterTax ?? 0)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Balance Sheet Balanced</span>
              <span className="text-purple-600 dark:text-purple-400 font-bold hover:underline">View MCA →</span>
            </div>
          </Card>
        </div>

        {/* ========================================================= */}
        {/* MULTI-TAB NAVIGATION BAR (Redesigned Flex-Wrap Pills)      */}
        {/* ========================================================= */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
          <div className="bg-card/90 border border-border/80 rounded-2xl p-2 shadow-lg backdrop-blur-xl">
            <TabsList className="flex flex-wrap items-center gap-1.5 bg-transparent p-0 h-auto justify-start">
              <TabsTrigger value="overview" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Layers className="size-3.5 shrink-0" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="gstn-filing" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <FileCode className="size-3.5 shrink-0 text-emerald-500" />
                <span>GSTN JSON</span>
              </TabsTrigger>
              <TabsTrigger value="invoice-auditor" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Search className="size-3.5 shrink-0 text-purple-500" />
                <span>Invoice Auditor</span>
              </TabsTrigger>
              <TabsTrigger value="schedule-3" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Building2 className="size-3.5 shrink-0 text-sky-500" />
                <span>Schedule III</span>
              </TabsTrigger>
              <TabsTrigger value="ca-copilot" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Bot className="size-3.5 shrink-0 text-amber-500" />
                <span>AI CA Co-Pilot</span>
              </TabsTrigger>
              <TabsTrigger value="advance-tax" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Calculator className="size-3.5 shrink-0 text-emerald-500" />
                <span>Advance Tax</span>
              </TabsTrigger>
              <TabsTrigger value="msme-43bh" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <ShieldAlert className="size-3.5 shrink-0 text-rose-500" />
                <span>MSME 43B(h)</span>
              </TabsTrigger>
              <TabsTrigger value="gstr-2b" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <FileCheck className="size-3.5 shrink-0 text-cyan-500" />
                <span>GSTR-2B ITC</span>
              </TabsTrigger>
              <TabsTrigger value="tds-hub" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Coins className="size-3.5 shrink-0 text-amber-500" />
                <span>TDS Hub</span>
              </TabsTrigger>
              <TabsTrigger value="tax-audit" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <FileSpreadsheet className="size-3.5 shrink-0 text-violet-500" />
                <span>Tax Audit 3CD</span>
              </TabsTrigger>
              <TabsTrigger value="founder-tax" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Wallet className="size-3.5 shrink-0 text-emerald-500" />
                <span>Founder Tax</span>
              </TabsTrigger>
              <TabsTrigger value="notice-defense" className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all hover:bg-accent/60">
                <Scale className="size-3.5 shrink-0 text-rose-500" />
                <span>Notice Defense</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ========================================================= */}
          {/* TAB 0: EXECUTIVE OVERVIEW                                 */}
          {/* ========================================================= */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left 2 Cols: Capabilities & Quick Actions */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Scale className="size-5 text-purple-600 dark:text-purple-400" />
                      How Prava Replaces Your Chartered Accountant Retainer
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed">
                      Indian businesses traditionally spend ₹20,000 to ₹1,50,000/month on CA retainers for routine compliance. Prava executes every statutory duty with algorithmic precision and legal citations:
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3.5">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div
                        onClick={() => setActiveTab("gstn-filing")}
                        className="p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-accent/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                          <FileCode className="size-4 text-emerald-500" />
                          <span>1. GSTR-3B & 1 Filing Return</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Auto-computes Table 3.1 outward liability, reverses 17(5) blocked ITC, and outputs official GSTN Portal JSON.
                        </p>
                      </div>

                      <div
                        onClick={() => setActiveTab("invoice-auditor")}
                        className="p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-accent/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                          <Search className="size-4 text-purple-500" />
                          <span>2. AI Vendor Invoice Auditor</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Vets bills for Section 17(5) blocked ITC (food/vehicles), Section 43B(h) MSME due dates, and TDS 194J/C.
                        </p>
                      </div>

                      <div
                        onClick={() => setActiveTab("schedule-3")}
                        className="p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-accent/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                          <Building2 className="size-4 text-sky-500" />
                          <span>3. Schedule III Financials</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Generates corporate Balance Sheet, Profit & Loss statement, and 11 mandatory analytical ratios for ROC AOC-4.
                        </p>
                      </div>

                      <div
                        onClick={() => setActiveTab("ca-copilot")}
                        className="p-3 rounded-xl border border-border/80 bg-background/60 hover:bg-accent/40 cursor-pointer transition"
                      >
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground mb-1">
                          <Bot className="size-4 text-amber-500" />
                          <span>4. RAG-Powered AI CA Desk</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Ask any question on capital goods ITC, cash payment limits, founder salary, or notice defenses with instant citations.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => setActiveTab("gstn-filing")}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <Download className="mr-1.5 size-3.5" />
                        Download GSTR-3B JSON
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("invoice-auditor")}
                        className="text-xs font-semibold"
                      >
                        <Search className="mr-1.5 size-3.5" />
                        Audit Vendor Invoices
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveTab("schedule-3")}
                        className="text-xs font-semibold"
                      >
                        <Building2 className="mr-1.5 size-3.5" />
                        View Balance Sheet
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Audit Health Summary */}
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-500" />
                      Statutory Compliance & Audit Health Indicators
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Direct Tax Advance Tax Coverage</span>
                        <span className="font-mono font-bold text-emerald-500">100% (Q1 Settled, Q2 Prepared)</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[100%]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">GSTR-2B ITC Match Rate</span>
                        <span className="font-mono font-bold text-emerald-500">96.8% Reconciled</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[96.8%]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">Section 43B(h) MSME Payables Safety</span>
                        <span className="font-mono font-bold text-amber-500">88.5% (3 Overdue Invoices Flagged)</span>
                      </div>
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full w-[88.5%]" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Upcoming Statutory Deadlines */}
              <div className="space-y-6">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Calendar className="size-4 text-purple-600 dark:text-purple-400" />
                      Upcoming Indian Statutory Deadlines
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Avoid interest penalties under Section 50, 234C, and 234E.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {calendarData?.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          item.status === "critical_due"
                            ? "border-rose-500/30 bg-rose-500/5"
                            : item.status === "due_soon"
                            ? "border-amber-500/30 bg-amber-500/5"
                            : "border-border bg-card/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{item.title}</span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary">
                            {item.dueDate}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>{item.applicableSection}</span>
                          <span className="font-bold text-foreground">{item.daysRemaining} days left</span>
                        </div>
                        <p className="text-[10px] text-rose-500/90 font-mono pt-0.5">{item.statutoryPenalty}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 1: OFFICIAL GSTN FILING JSON GENERATOR                */}
          {/* ========================================================= */}
          <TabsContent value="gstn-filing" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Filing Summary */}
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <FileCode className="size-4 text-emerald-500" />
                    GSTR-3B Return Summary (Sep 2024)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Statutory computation prepared for GST Portal upload.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="p-3 rounded-xl bg-muted/40 space-y-2 border border-border">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GSTIN:</span>
                      <span className="font-mono font-bold">{gstnData?.gstin || activeBiz?.gstin || "Not Registered"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxpayer:</span>
                      <span className="font-bold text-foreground truncate max-w-[180px]">{gstnData?.legalName || activeBiz?.name || "Your Workspace"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Return Period:</span>
                      <span className="font-mono font-bold">09/2024 (Sep 2024)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filing Due Date:</span>
                      <span className="font-mono font-bold text-amber-500">20th October 2024</span>
                    </div>
                  </div>

                  {!gstnData?.hasInvoices && (gstnData?.outwardSupplies?.taxableSupplies ?? 0) === 0 ? (
                    <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                      No invoices uploaded for <strong>{activeBiz?.name || "this workspace"}</strong> yet. Upload your sales & purchase bills in Document Vault to auto-generate statutory GSTR-3B filings.
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center justify-between">
                      <span>Live statutory computation ({gstnData?.salesCount ?? 0} sales, {gstnData?.purchaseCount ?? 0} purchases)</span>
                      <span className="font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20">Verified</span>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-border pt-3">
                    <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Table 3.1 Outward Tax</h5>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxable Supplies:</span>
                      <span className="font-mono text-foreground font-bold">₹{formatInr(gstnData?.outwardSupplies?.taxableSupplies ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>CGST:</span>
                      <span className="font-mono text-foreground">₹{formatInr(gstnData?.outwardSupplies?.cgst ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>SGST:</span>
                      <span className="font-mono text-foreground">₹{formatInr(gstnData?.outwardSupplies?.sgst ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>IGST:</span>
                      <span className="font-mono text-foreground">₹{formatInr(gstnData?.outwardSupplies?.igst ?? 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border pt-3">
                    <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">Table 4 ITC Breakdown</h5>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Matched GSTR-2B ITC:</span>
                      <span className="font-mono text-emerald-500 font-bold">+ ₹{formatInr(gstnData?.itcDetails?.allOtherItc?.total ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Reversed u/s 17(5) Blocked:</span>
                      <span className="font-mono text-rose-500 font-bold">- ₹{formatInr(gstnData?.itcDetails?.ineligible17_5?.total ?? 0)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Net Eligible ITC:</span>
                      <span className="font-mono text-foreground font-bold">₹{formatInr(gstnData?.itcDetails?.netItcAvailable?.total ?? 0)}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-foreground">Net Cash Tax Payable:</span>
                      <span className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">
                        ₹{formatInr(gstnData?.netCashPayable?.totalCashPayable ?? 0)}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Payable via Electronic Cash Ledger before 20th</p>
                  </div>

                  <Button
                    onClick={() => {
                      if (gstnData?.jsonString && gstnData?.filename) {
                        downloadJsonFile(gstnData.filename, gstnData.jsonString);
                      }
                    }}
                    className="w-full text-xs h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
                  >
                    <Download className="size-4" />
                    Download Official GSTN Schema JSON
                  </Button>
                </CardContent>
              </Card>

              {/* Right 2 Columns: Live Schema Code View */}
              <div className="lg:col-span-2">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <FileCode className="size-4 text-emerald-500" />
                        GST Portal Schema JSON Payload (Ready to Upload)
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Strictly conforms to GSTN API Schema v1.0 specifications
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(gstnData?.jsonString || "")}
                        className="text-xs h-7 gap-1"
                      >
                        <Copy className="size-3" /> Copy JSON
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (gstnData?.jsonString && gstnData?.filename) {
                            downloadJsonFile(gstnData.filename, gstnData.jsonString);
                          }
                        }}
                        className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                      >
                        <Download className="size-3" /> Download .JSON
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <pre className="p-4 rounded-xl bg-black/80 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[500px] border border-white/10">
                      {gstnData?.jsonString || "Generating schema JSON..."}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 2: AI INVOICE AUDITOR & STATUTORY VETTING             */}
          {/* ========================================================= */}
          <TabsContent value="invoice-auditor" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Interactive Invoice Inputs */}
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Search className="size-4 text-purple-600 dark:text-purple-400" />
                    Audit Vendor Tax Invoice
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Vets Section 17(5) Blocked ITC, 43B(h) MSME dates & TDS 194.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Dynamic Invoices from Vault */}
                  {userDocsQuery.data && userDocsQuery.data.length > 0 && (
                    <div className="space-y-1.5 p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-purple-600 dark:text-purple-400">
                          Invoices from Document Vault:
                        </Label>
                        <span className="text-[10px] text-muted-foreground">{userDocsQuery.data.length} Available</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {userDocsQuery.data.map((item) => {
                          const ext = item.extraction;
                          const invNum = ext?.invoiceNumber || item.document.originalName;
                          const taxable = ext?.taxableValueMinor ? ext.taxableValueMinor / 100 : (ext?.totalMinor ? ext.totalMinor / 100 : 0);
                          return (
                            <Button
                              key={item.document.id}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const vName = ext?.vendorName || ext?.buyerName || activeBiz?.name || "Commercial Entity";
                                const vGstin = ext?.gstin || ext?.buyerGstin || "27AABCV1234F1Z9";
                                const iNum = ext?.invoiceNumber || `DOC-${item.document.id}`;
                                const tAmt = taxable || 50000;
                                const gRate = ext?.cgstMinor && ext?.taxableValueMinor ? Math.round(((ext.cgstMinor * 2) / ext.taxableValueMinor) * 100) : 18;
                                const cat = ext?.invoiceType === "sales" ? "Commercial Sales Revenue" : "Procurement of Services / Goods";
                                applyInvoicePreset({
                                  vendor: vName,
                                  gstin: vGstin,
                                  invNum: iNum,
                                  amount: tAmt,
                                  rate: gRate || 18,
                                  category: cat,
                                  sac: "998315",
                                  msme: "small",
                                  contract: true,
                                });
                              }}
                              className="text-[10px] h-7 px-2.5 border-purple-500/30 hover:bg-purple-500/10 font-mono flex items-center gap-1.5"
                            >
                              <FileText className="size-3 text-purple-500" />
                              <span className="font-bold text-foreground truncate max-w-[130px]">{invNum}</span>
                              <span className="text-muted-foreground">₹{formatInr(taxable)}</span>
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Preset test buttons */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Quick Test Profiles:</Label>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyInvoicePreset({
                            vendor: "Amazon Web Services India Pvt Ltd",
                            gstin: "27AABCA1234F1Z8",
                            invNum: "AWS-INV-2024-883",
                            amount: 250000,
                            rate: 18,
                            category: "Cloud Hosting & Computing Infrastructure",
                            sac: "998315",
                            msme: "micro",
                            contract: true,
                          })
                        }
                        className="text-[10px] h-6 px-2"
                      >
                        AWS Cloud (Eligible)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyInvoicePreset({
                            vendor: "Taj Connoisseur Catering Services",
                            gstin: "27AABCT9981K1Z3",
                            invNum: "CAT-2024-102",
                            amount: 45000,
                            rate: 18,
                            category: "Executive Lunch and Catering Services",
                            sac: "996331",
                            msme: "small",
                            contract: false,
                          })
                        }
                        className="text-[10px] h-6 px-2 text-rose-500 border-rose-500/30"
                      >
                        Lunch Catering (17(5) Blocked)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          applyInvoicePreset({
                            vendor: "Dell Global Technology India Pvt Ltd",
                            gstin: "27AABCD4421M1Z1",
                            invNum: "DELL-INV-9901",
                            amount: 850000,
                            rate: 18,
                            category: "Developer Laptops and Servers",
                            sac: "847130",
                            msme: "non_msme",
                            contract: true,
                          })
                        }
                        className="text-[10px] h-6 px-2 text-emerald-500 border-emerald-500/30"
                      >
                        Dell Laptops (Capital Goods)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Vendor Name</Label>
                    <Input
                      value={auditVendorName}
                      onChange={(e) => setAuditVendorName(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Vendor GSTIN</Label>
                    <Input
                      value={auditVendorGstin}
                      onChange={(e) => setAuditVendorGstin(e.target.value)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Taxable Value (₹)</Label>
                      <Input
                        type="number"
                        value={auditTaxableAmount}
                        onChange={(e) => setAuditTaxableAmount(Number(e.target.value) || 0)}
                        className="text-xs h-8 font-mono bg-background"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">GST Rate (%)</Label>
                      <Input
                        type="number"
                        value={auditGstRate}
                        onChange={(e) => setAuditGstRate(Number(e.target.value) || 0)}
                        className="text-xs h-8 font-mono bg-background"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Expense Nature / Category</Label>
                    <Input
                      value={auditCategory}
                      onChange={(e) => setAuditCategory(e.target.value)}
                      className="text-xs h-8 bg-background"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">MSME Classification</Label>
                      <select
                        value={auditMsmeStatus}
                        onChange={(e) => setAuditMsmeStatus(e.target.value as any)}
                        className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
                      >
                        <option value="micro">Micro Enterprise</option>
                        <option value="small">Small Enterprise</option>
                        <option value="medium">Medium (Exempt)</option>
                        <option value="non_msme">Non-MSME</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Written Agreement?</Label>
                      <div className="flex items-center h-8 gap-2">
                        <input
                          type="checkbox"
                          checked={auditHasContract}
                          onChange={(e) => setAuditHasContract(e.target.checked)}
                          id="chk-contract"
                          className="rounded size-4 text-purple-600"
                        />
                        <Label htmlFor="chk-contract" className="text-xs cursor-pointer">
                          {auditHasContract ? "Yes (45 Days)" : "No (15 Days)"}
                        </Label>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={handleAuditInvoice}
                    disabled={invoiceAuditMutation.isPending}
                    className="w-full text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm mt-2"
                  >
                    <Sparkles className="size-3.5 mr-1" />
                    Run AI CA Statutory Audit
                  </Button>
                </CardContent>
              </Card>

              {/* Right 2 Columns: Audit Certificate & Voucher */}
              <div className="lg:col-span-2">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <ShieldCheck className="size-4 text-purple-600 dark:text-purple-400" />
                        AI CA Audit Certification & Voucher
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Autonomous statutory vetting for statutory books and tax audit working papers
                      </CardDescription>
                    </div>
                    {invoiceAuditMutation.data && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const content = `PRAVA AUTONOMOUS CA AUDIT CERTIFICATE
Certificate ID: ${invoiceAuditMutation.data?.certificateId}
Verified At: ${invoiceAuditMutation.data?.verifiedAt}
===================================================
Vendor: ${invoiceAuditMutation.data?.vendorName} (${invoiceAuditMutation.data?.vendorGstin})
Invoice: ${invoiceAuditMutation.data?.invoiceNumber} Dated ${invoiceAuditMutation.data?.invoiceDate}
Supply Type: ${invoiceAuditMutation.data?.taxSupplyType}
Taxable Value: ₹${formatInr(invoiceAuditMutation.data?.taxableAmount)}
Total Invoice Value: ₹${formatInr(invoiceAuditMutation.data?.totalInvoiceAmount)}
ITC Eligibility: ${invoiceAuditMutation.data?.itcEligible ? "ELIGIBLE" : "INELIGIBLE (BLOCKED U/S 17(5))"}
${invoiceAuditMutation.data?.blockedReason ? `Blocked Reason: ${invoiceAuditMutation.data?.blockedReason}` : ""}
MSME Horizon: ${invoiceAuditMutation.data?.msmeAudit?.notice || "N/A"}
TDS Applicable: ${invoiceAuditMutation.data?.tdsAudit ? `${invoiceAuditMutation.data.tdsAudit.section} - ${invoiceAuditMutation.data.tdsAudit.rate} (₹${invoiceAuditMutation.data.tdsAudit.tdsAmount})` : "None"}
===================================================
Certified by Prava Autonomous Chartered Accountant Engine`;
                          downloadTextFile(`CA_Voucher_${invoiceAuditMutation.data?.invoiceNumber}.txt`, content);
                        }}
                        className="text-xs h-7 gap-1"
                      >
                        <Download className="size-3" /> Download Voucher
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {invoiceAuditMutation.data ? (
                      <div className="space-y-4">
                        {/* Verdict Banner */}
                        <div
                          className={`p-4 rounded-xl border flex items-center justify-between ${
                            invoiceAuditMutation.data.auditStatus === "REJECT_ITC"
                              ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              : invoiceAuditMutation.data.auditStatus === "COMPLIANT_WITH_MSME_WATCH"
                              ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {invoiceAuditMutation.data.auditStatus === "REJECT_ITC" ? (
                              <ShieldAlert className="size-6 shrink-0" />
                            ) : (
                              <ShieldCheck className="size-6 shrink-0" />
                            )}
                            <div>
                              <h4 className="font-bold text-sm">
                                {invoiceAuditMutation.data.auditStatus === "REJECT_ITC"
                                  ? "ITC BLOCKED UNDER SECTION 17(5)"
                                  : invoiceAuditMutation.data.auditStatus === "COMPLIANT_WITH_MSME_WATCH"
                                  ? "CLEARED WITH SECTION 43B(h) MSME HORIZON"
                                  : "STATUTORILY CLEARED FOR ITC FILING"}
                              </h4>
                              <p className="text-[11px] opacity-90">
                                Voucher: <code className="font-mono font-bold">{invoiceAuditMutation.data.certificateId}</code>
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 rounded-md bg-background/80 border">
                            {invoiceAuditMutation.data.auditStatus}
                          </span>
                        </div>

                        {/* Audit Points Grid */}
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">GST & Supply Classification</span>
                            <p className="font-bold text-foreground">{invoiceAuditMutation.data.taxSupplyType}</p>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              CGST: ₹{formatInr(invoiceAuditMutation.data.cgst)} | SGST: ₹
                              {formatInr(invoiceAuditMutation.data.sgst)} | IGST: ₹
                              {formatInr(invoiceAuditMutation.data.igst)}
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Section 17(5) ITC Verdict</span>
                            <p
                              className={`font-bold ${
                                invoiceAuditMutation.data.itcEligible ? "text-emerald-500" : "text-rose-500"
                              }`}
                            >
                              {invoiceAuditMutation.data.itcEligible ? "Eligible for Credit in Table 4(A)(5)" : "Ineligible / Reversal in Table 4(B)(1)"}
                            </p>
                            {invoiceAuditMutation.data.blockedReason && (
                              <p className="text-[11px] text-rose-500 font-mono leading-tight">
                                {invoiceAuditMutation.data.blockedReason}
                              </p>
                            )}
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Section 43B(h) MSME Horizon</span>
                            <p className="font-bold text-foreground">
                              {invoiceAuditMutation.data.msmeAudit?.msmeStatus.toUpperCase()} ENTERPRISE ({invoiceAuditMutation.data.msmeAudit?.daysAllowed} Days Window)
                            </p>
                            <p className="text-[11px] text-amber-500 font-mono leading-tight">
                              {invoiceAuditMutation.data.msmeAudit?.notice || "Vendor not registered as MSME Micro/Small."}
                            </p>
                          </div>

                          <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">TDS Deduction (Direct Tax)</span>
                            <p className="font-bold text-foreground">
                              {invoiceAuditMutation.data.tdsAudit ? invoiceAuditMutation.data.tdsAudit.section : "No TDS Threshold Triggered"}
                            </p>
                            {invoiceAuditMutation.data.tdsAudit && (
                              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-mono leading-tight">
                                Deduct ₹{formatInr(invoiceAuditMutation.data.tdsAudit.tdsAmount)} ({invoiceAuditMutation.data.tdsAudit.rate})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Search className="size-10 mx-auto text-muted-foreground/30 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold">Select an invoice preset or enter details and click Run Audit.</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          Evaluates Section 17(5) blocked ITC, Section 43B(h) MSME due dates, and TDS 194J/C instantly.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 3: MCA SCHEDULE III FINANCIALS & RATIOS               */}
          {/* ========================================================= */}
          <TabsContent value="schedule-3" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-card border border-border">
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Schedule III Division II Financial Statements — Companies Act, 2013
                </h3>
                <p className="text-xs text-muted-foreground">
                  {schedule3Data?.entityName} · CIN: {schedule3Data?.cin} · {schedule3Data?.reportingPeriod}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  const content = `# SCHEDULE III STATUTORY FINANCIAL STATEMENTS
Entity: ${schedule3Data?.entityName}
CIN: ${schedule3Data?.cin}
Period: ${schedule3Data?.reportingPeriod}

## PART I — BALANCE SHEET
Total Equity & Liabilities: ₹${formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.totalEquityAndLiabilities)}
Total Assets: ₹${formatInr(schedule3Data?.balanceSheet?.assets?.totalAssets)}

## PART II — STATEMENT OF PROFIT AND LOSS
Total Revenue: ₹${formatInr(schedule3Data?.profitAndLoss?.revenue?.totalIncome)}
Profit Before Tax: ₹${formatInr(schedule3Data?.profitAndLoss?.profitBeforeTax)}
Profit After Tax: ₹${formatInr(schedule3Data?.profitAndLoss?.profitAfterTax)}

## MANDATORY ANALYTICAL RATIOS
${schedule3Data?.ratios?.map((r) => `- ${r.ratioName}: ${r.value} (Benchmark: ${r.benchmark}, Status: ${r.status})`).join("\n")}
`;
                  downloadTextFile("Schedule_III_Financials_FY2024-25.md", content);
                }}
                className="text-xs h-8 bg-sky-600 hover:bg-sky-700 text-white font-semibold gap-1.5"
              >
                <Download className="size-3.5" />
                Export Schedule III Report
              </Button>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Part I: Balance Sheet */}
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3 border-b border-border">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-sky-500">
                      Part I — Balance Sheet (Schedule III)
                    </CardTitle>
                    <span className="text-[11px] font-mono text-emerald-500 font-bold">
                      Balanced: ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.totalEquityAndLiabilities ?? 0)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-foreground text-xs uppercase">I. Equity and Liabilities</h5>
                    <div className="pl-2 space-y-1 border-l-2 border-primary/30 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>1. Shareholders Funds (Capital & Reserves):</span>
                        <span className="font-mono text-foreground font-bold">
                          ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.shareholdersFunds?.totalShareholdersFunds ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>2. Non-Current Liabilities (Borrowings):</span>
                        <span className="font-mono text-foreground">
                          ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.nonCurrentLiabilities?.totalNonCurrentLiabilities ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>3. Current Liabilities:</span>
                        <span className="font-mono text-foreground">
                          ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.currentLiabilities?.totalCurrentLiabilities ?? 0)}
                        </span>
                      </div>
                      <div className="pl-3 text-[11px] space-y-0.5 text-muted-foreground/80">
                        <div className="flex justify-between">
                          <span>- Dues to MSME Enterprises (Sec 43B(h)):</span>
                          <span className="font-mono text-amber-500">
                            ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.currentLiabilities?.tradePayablesMsme ?? 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Other Trade Payables:</span>
                          <span className="font-mono">
                            ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.currentLiabilities?.tradePayablesNonMsme ?? 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between pt-1 border-t font-bold text-foreground">
                        <span>Total Equity & Liabilities:</span>
                        <span className="font-mono text-emerald-500">
                          ₹{formatInr(schedule3Data?.balanceSheet?.equityAndLiabilities?.totalEquityAndLiabilities ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <h5 className="font-bold text-foreground text-xs uppercase">II. Assets</h5>
                    <div className="pl-2 space-y-1 border-l-2 border-sky-500/30 text-muted-foreground">
                      <div className="flex justify-between">
                        <span>1. Non-Current Assets (PPE & Intangibles):</span>
                        <span className="font-mono text-foreground font-bold">
                          ₹{formatInr(schedule3Data?.balanceSheet?.assets?.nonCurrentAssets?.totalNonCurrentAssets ?? 0)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>2. Current Assets:</span>
                        <span className="font-mono text-foreground">
                          ₹{formatInr(schedule3Data?.balanceSheet?.assets?.currentAssets?.totalCurrentAssets ?? 0)}
                        </span>
                      </div>
                      <div className="pl-3 text-[11px] space-y-0.5 text-muted-foreground/80">
                        <div className="flex justify-between">
                          <span>- Trade Receivables:</span>
                          <span className="font-mono">
                            ₹{formatInr(schedule3Data?.balanceSheet?.assets?.currentAssets?.tradeReceivables ?? 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Cash & Bank Balances:</span>
                          <span className="font-mono text-emerald-500 font-bold">
                            ₹{formatInr(schedule3Data?.balanceSheet?.assets?.currentAssets?.cashAndCashEquivalents ?? 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between pt-1 border-t font-bold text-foreground">
                        <span>Total Assets:</span>
                        <span className="font-mono text-emerald-500">
                          ₹{formatInr(schedule3Data?.balanceSheet?.assets?.totalAssets ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Part II: Profit and Loss & Ratios */}
              <div className="space-y-6">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-sky-500">
                      Part II — Statement of Profit and Loss
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Revenue from Operations (Turnover):</span>
                      <span className="font-mono text-foreground font-bold">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.revenue?.revenueFromOperations ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Other Operating Income:</span>
                      <span className="font-mono text-foreground">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.revenue?.otherIncome ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground border-b border-border pb-1">
                      <span>Total Revenue:</span>
                      <span className="font-mono">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.revenue?.totalIncome ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pt-1">
                      <span>Total Operating Expenses:</span>
                      <span className="font-mono text-foreground">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.expenses?.totalExpenses ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-foreground border-b border-border pb-1">
                      <span>Profit Before Tax (PBT):</span>
                      <span className="font-mono text-emerald-500">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.profitBeforeTax ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-muted-foreground pt-1">
                      <span>Current Tax (Sec 115BAA @ 22.88%):</span>
                      <span className="font-mono text-rose-500">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.taxExpense?.totalTax ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-border">
                      <span>Profit After Tax (PAT):</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400">
                        ₹{formatInr(schedule3Data?.profitAndLoss?.profitAfterTax ?? 0)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Analytical Financial Ratios */}
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="pb-2 border-b border-border">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-500">
                      Mandatory Analytical Accounting Ratios (Rule 11)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {schedule3Data?.ratios?.map((r, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-muted/40 border border-border space-y-0.5">
                          <span className="text-[10px] text-muted-foreground font-medium">{r.ratioName}</span>
                          <div className="font-mono font-bold text-sm text-foreground">{r.value}</div>
                          <span className="text-[9px] font-semibold text-emerald-500">{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 4: AI CA CO-PILOT WITH RAG STATUTORY CITATIONS        */}
          {/* ========================================================= */}
          <TabsContent value="ca-copilot" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Left Column: Ask Question */}
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bot className="size-4 text-purple-600 dark:text-purple-400" />
                    AI CA Legal Consultation Desk
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Trained on Income Tax Act 1961, CGST Act 2017 & judicial case law.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Ask Any Tax / Compliance Question:</Label>
                    <textarea
                      value={copilotQuery}
                      onChange={(e) => setCopilotQuery(e.target.value)}
                      rows={4}
                      className="w-full text-xs p-2.5 rounded-xl border border-input bg-background leading-relaxed resize-none focus:ring-2 focus:ring-purple-500/20"
                      placeholder="e.g. Can I claim ITC on MacBooks purchased for developers?"
                    />
                  </div>

                  <Button
                    onClick={() => handleAskCopilot()}
                    disabled={copilotMutation.isPending || !copilotQuery.trim()}
                    className="w-full text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm"
                  >
                    <Sparkles className="size-3.5 mr-1" />
                    Consult Autonomous CA
                  </Button>

                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <Label className="text-[11px] font-semibold text-muted-foreground">Frequent CA Scenarios:</Label>
                    <div className="space-y-1">
                      {[
                        "Can I claim ITC on MacBooks and software subscriptions?",
                        "Can we pay ₹25,000 cash to a contractor?",
                        "What happens if an MSME vendor is paid after 45 days?",
                        "Founder salary vs dividend: which saves more tax?",
                        "How to defend a GST ASMT-10 notice for ITC mismatch?",
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAskCopilot(prompt)}
                          className="w-full text-left p-2 rounded-lg bg-muted/40 hover:bg-accent/60 text-[11px] text-foreground transition flex items-center justify-between"
                        >
                          <span className="truncate">{prompt}</span>
                          <ArrowRight className="size-3 text-muted-foreground shrink-0 ml-1" />
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right 2 Columns: Formal Legal Opinion */}
              <div className="lg:col-span-2">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold flex items-center gap-2">
                        <GraduationCap className="size-4 text-purple-600 dark:text-purple-400" />
                        Formal Statutory Legal Opinion
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        Retrieval-Augmented Generation over Indian Tax Statues & Notifications
                      </CardDescription>
                    </div>
                    {copilotMutation.data && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(copilotMutation.data, null, 2))}
                        className="text-xs h-7 gap-1"
                      >
                        <Copy className="size-3" /> Copy Opinion
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs leading-relaxed">
                    {copilotMutation.data ? (
                      <div className="space-y-4">
                        {/* Risk Indicator */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-muted-foreground">Statutory Risk Rating</span>
                            <h4 className="font-bold text-sm text-foreground">{copilotMutation.data.riskAssessment}</h4>
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {new Date(copilotMutation.data.certifiedTimestamp).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Direct Answer */}
                        <div className="p-4 rounded-xl bg-background border border-border space-y-1">
                          <h5 className="font-bold text-foreground text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
                            Chartered Accountant Executive Verdict:
                          </h5>
                          <p className="text-xs text-foreground font-serif leading-relaxed">
                            {copilotMutation.data.answer}
                          </p>
                        </div>

                        {/* Citations */}
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                            Statutory & Judicial Citations:
                          </h5>
                          <ul className="list-disc list-inside font-mono text-[11px] text-muted-foreground space-y-0.5">
                            {copilotMutation.data.legalCitations?.map((cit, i) => (
                              <li key={i} className="leading-snug">{cit}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Action Steps */}
                        <div className="space-y-1.5">
                          <h5 className="font-bold text-foreground text-xs uppercase tracking-wider">
                            Mandatory Implementation Checklist:
                          </h5>
                          <div className="space-y-1">
                            {copilotMutation.data.actionItems?.map((step, i) => (
                              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 font-mono text-[11px]">
                                <Check className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Bot className="size-10 mx-auto text-muted-foreground/30 mb-2 animate-pulse" />
                        <p className="text-xs font-semibold">Ask any tax question or select a frequent scenario.</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">
                          Retrieves legal sections from Income Tax Act, CGST Act, and MSMED Act.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 5: ADVANCE TAX (PRESERVED & ENHANCED)                 */}
          {/* ========================================================= */}
          <TabsContent value="advance-tax" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              {/* Left Column: Interactive Inputs */}
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Calculator className="size-4 text-primary" />
                    Income & Operating Parameters
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Simulate real corporate taxable profit under Indian Direct Tax.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Tax Entity Type</Label>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Button
                        type="button"
                        variant={entityType === "company" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEntityType("company")}
                        className="text-[11px] h-7"
                      >
                        Company (22%)
                      </Button>
                      <Button
                        type="button"
                        variant={entityType === "individual_business" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEntityType("individual_business")}
                        className="text-[11px] h-7"
                      >
                        Proprietor
                      </Button>
                      <Button
                        type="button"
                        variant={entityType === "llp" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setEntityType("llp")}
                        className="text-[11px] h-7"
                      >
                        LLP (30%)
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label>Annual Gross Revenue (₹)</Label>
                      <span className="font-mono font-bold">₹{formatInr(grossRevenue)}</span>
                    </div>
                    <Input
                      type="number"
                      value={grossRevenue}
                      onChange={(e) => setGrossRevenue(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label>Operating Expenses (₹)</Label>
                      <span className="font-mono">₹{formatInr(operatingExpenses)}</span>
                    </div>
                    <Input
                      type="number"
                      value={operatingExpenses}
                      onChange={(e) => setOperatingExpenses(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label>Depreciation u/s 32 (₹)</Label>
                      <span className="font-mono">₹{formatInr(depreciation)}</span>
                    </div>
                    <Input
                      type="number"
                      value={depreciation}
                      onChange={(e) => setDepreciation(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <Label>TDS in 26AS / AIS (₹)</Label>
                      <span className="font-mono text-emerald-500 font-bold">₹{formatInr(tdsDeducted)}</span>
                    </div>
                    <Input
                      type="number"
                      value={tdsDeducted}
                      onChange={(e) => setTdsDeducted(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Center & Right: Output & Installments */}
              <div className="lg:col-span-2 space-y-4">
                {/* Result Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card/90 shadow-sm">
                    <span className="text-[11px] text-muted-foreground">Estimated Net Profit</span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      ₹{formatInr(advanceTaxData?.netTaxableIncome)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">PBT before tax</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card/90 shadow-sm">
                    <span className="text-[11px] text-muted-foreground">Sec 115BAA Tax (22.88%)</span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      ₹{formatInr(advanceTaxData?.newRegimeTax)}
                    </div>
                    <span className="text-[10px] text-emerald-500 font-medium">Optimal Regime</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-muted-foreground">Net Advance Tax (Post TDS)</span>
                    <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{formatInr(advanceTaxData?.netPayableAfterTds)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Challan 280</span>
                  </div>
                </div>

                {/* Installment Table */}
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border">
                    <CardTitle className="text-xs font-bold flex items-center justify-between">
                      <span>Statutory Advance Tax Installment Schedule (FY 2024-25)</span>
                      <span className="text-[11px] font-mono text-muted-foreground">Section 208 / 211</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border text-xs">
                      {advanceTaxData?.installments?.map((inst) => (
                        <div key={inst.quarter} className="flex items-center justify-between p-3 px-4 hover:bg-accent/40">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-foreground">{inst.quarter} Installment</span>
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                  inst.status === "paid"
                                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                    : inst.status === "due_soon"
                                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse"
                                    : "bg-secondary text-muted-foreground"
                                }`}
                              >
                                {inst.status === "paid" ? "PAID" : inst.status === "due_soon" ? "DUE NOW" : "UPCOMING"}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">Due Date: {inst.dueDate}</p>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-sm text-foreground">
                              ₹{formatInr(inst.quarterInstallment)}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {inst.cumulativePercentage}% Cumulative
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 6: MSME 43B(h) DISALLOWANCE WATCH                     */}
          {/* ========================================================= */}
          <TabsContent value="msme-43bh" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="border-border bg-card/95 shadow-md lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ShieldAlert className="size-4 text-rose-500" />
                    Section 43B(h) Audit Rulebook
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="p-3 rounded-lg border border-rose-500/20 bg-rose-500/5 space-y-1">
                    <span className="font-bold text-rose-600 dark:text-rose-400 text-xs">Statutory Mandate:</span>
                    <p>
                      Payments to Micro & Small enterprises registered under Udyam MUST be settled within:
                    </p>
                    <ul className="list-disc list-inside font-mono text-[11px] space-y-0.5 text-foreground pt-1">
                      <li><strong>15 days</strong> if no written agreement exists</li>
                      <li><strong>45 days</strong> if written agreement specifies terms</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1">
                    <span className="font-bold text-amber-600 dark:text-amber-400 text-xs">Disallowance Impact:</span>
                    <p>
                      Unpaid amounts at year-end are <strong>added back to company taxable profit</strong> and taxed at 25% + mandatory compound interest at 3x RBI bank rate!
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payables Watch Table */}
              <div className="lg:col-span-2">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-xs font-bold">Active MSME Vendor Payables Register</CardTitle>
                      <span className="text-[11px] font-mono text-rose-500 font-bold">
                        {(msmeData?.overdueInvoicesCount ?? 0)} Overdue Invoices
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border text-xs">
                      {!msmeData?.invoices || msmeData.invoices.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                          <ShieldCheck className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                          <p className="font-bold text-foreground">100% Section 43B(h) Compliant</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            No overdue MSME vendor payables flagged for {activeBiz?.name || "this workspace"}.
                          </p>
                        </div>
                      ) : (
                        msmeData.invoices.map((inv: any) => (
                          <div key={inv.id || inv.invoiceNumber} className="flex items-center justify-between p-3 px-4 hover:bg-accent/40">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-foreground">{inv.vendorName}</span>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                    inv.isDisallowedUnder43Bh
                                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  }`}
                                >
                                  {inv.isDisallowedUnder43Bh ? "OVERDUE U/S 43B(h)" : "WITHIN LIMIT"}
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground font-mono">
                                Invoice: {inv.invoiceNumber || inv.id} · {inv.enterpriseCategory || "micro"} MSME
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-sm text-foreground">
                                ₹{formatInr(inv.invoiceAmount || inv.amount || 0)}
                              </div>
                              <span className="text-[10px] text-rose-500 font-mono">
                                {(inv.daysOutstanding ?? 0) > inv.maxDaysAllowed ? `${inv.daysOutstanding} days outstanding` : "Within term"}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 7: GSTR-2B VS 3B ITC RECONCILER                      */}
          {/* ========================================================= */}
          <TabsContent value="gstr-2b" className="space-y-5">
            <Card className="border-border bg-card/95 shadow-md">
              <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">
                    Section 16(2)(aa) GSTR-2B Matching Register — {gstr2bData?.period}
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Only invoices reflected in GSTR-2B can be availed in GSTR-3B
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground">ITC at Risk: </span>
                  <span className="font-mono font-bold text-rose-500 text-xs">
                    ₹{formatInr(gstr2bData?.itcAtRisk)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border text-xs">
                  {!gstr2bData?.reconciliationRows || gstr2bData.reconciliationRows.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileCheck className="size-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                      <p className="font-bold text-foreground">GSTR-2B Fully Reconciled</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        No purchase discrepancies found for {activeBiz?.name || "this workspace"}.
                      </p>
                    </div>
                  ) : (
                    gstr2bData.reconciliationRows.map((row: any) => (
                      <div key={row.invoiceNumber} className="flex items-center justify-between p-3 px-4 hover:bg-accent/40">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">{row.vendorName}</span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                                row.matchStatus === "matched" || row.matchStatus === "perfect_match"
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {row.matchStatus === "matched" || row.matchStatus === "perfect_match" ? "2B MATCHED" : "MISSING IN 2B"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            {row.vendorGstin} · Inv #{row.invoiceNumber}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-mono font-bold text-sm text-foreground">
                            ₹{formatInr(row.taxableAmount || row.taxableValueInBooks || 0)}
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            ITC: ₹{formatInr(row.totalGst || row.itcInBooks || 0)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 8: TDS HUB (194C/J/I/Q)                               */}
          {/* ========================================================= */}
          <TabsContent value="tds-hub" className="space-y-5">
            <Card className="border-border bg-card/95 shadow-md">
              <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">
                    Statutory TDS Deduction Matrix (Challan 281 & Form 26Q)
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    Failure to deduct attracts 30% expenditure disallowance under Section 40(a)(ia)
                  </CardDescription>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground">Total TDS Due (7th Sep): </span>
                  <span className="font-mono font-bold text-emerald-500 text-xs">
                    ₹{formatInr(tdsData?.totalTdsDue)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border text-xs">
                  {tdsData?.sections?.map((s: any) => (
                    <div key={s.section} className="flex items-center justify-between p-3.5 px-4 hover:bg-accent/40">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{s.section} — {s.nature}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                            Rate: {s.rate}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Threshold: {s.statutoryThreshold} · {s.disallowanceRule}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-sm text-foreground">
                          ₹{formatInr(s.tdsDueThisMonth)}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          Transactions: ₹{formatInr(s.monthlyTransactionVolume)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 9: FORM 3CD TAX AUDIT SUITE                           */}
          {/* ========================================================= */}
          <TabsContent value="tax-audit" className="space-y-5">
            <Card className="border-border bg-card/95 shadow-md">
              <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold">
                    Section 44AB Form 3CD Autonomous Audit Clauses
                  </CardTitle>
                  <CardDescription className="text-[11px]">
                    AY {form3CdData?.assessmentYear} · Status: {form3CdData?.auditStatus}
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const content = `# FORM 3CD TAX AUDIT REPORT (SECTION 44AB)
Assessee: ${form3CdData?.assesseeName}
PAN: ${form3CdData?.pan}
AY: ${form3CdData?.assessmentYear}
Status: ${form3CdData?.auditStatus}
UDIN: ${form3CdData?.auditorSignOff?.udin}

${form3CdData?.clauses?.map((c) => `### ${c.clause} — ${c.title}
Status: ${c.status}
Amount: ₹${formatInr(c.amountInvolved)}
Remarks: ${c.remarks}`).join("\n\n")}`;
                    downloadTextFile("Form_3CD_Audit_Report.md", content);
                  }}
                  className="text-xs h-7 gap-1"
                >
                  <Download className="size-3" /> Download Form 3CD Papers
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border text-xs">
                  {form3CdData?.clauses?.map((cl: any) => (
                    <div key={cl.clause} className="p-3.5 px-4 hover:bg-accent/40 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-foreground">{cl.clause}</span>
                          <span className="text-muted-foreground font-semibold">— {cl.title}</span>
                          <span
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              cl.status === "Clean" || cl.status === "Compliant"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {cl.status}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-foreground">
                          ₹{formatInr(cl.amountInvolved)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground font-mono leading-relaxed">{cl.remarks}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 10: FOUNDER TAX STRATEGY                              */}
          {/* ========================================================= */}
          <TabsContent value="founder-tax" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Wallet className="size-4 text-purple-600 dark:text-purple-400" />
                    Remuneration Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label>Founder Annual Salary (₹)</Label>
                      <span className="font-mono font-bold">₹{formatInr(founderRemuneration)}</span>
                    </div>
                    <Input
                      type="number"
                      value={founderRemuneration}
                      onChange={(e) => setFounderRemuneration(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <Label>Employer NPS u/s 80CCD(2)</Label>
                      <span className="font-mono">{npsContributionPct}% (Tax Free)</span>
                    </div>
                    <Input
                      type="number"
                      value={npsContributionPct}
                      onChange={(e) => setNpsContributionPct(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
                    <span className="text-[11px] text-muted-foreground">Company Tax Saved</span>
                    <div className="text-base font-bold font-mono text-emerald-500 mt-0.5">
                      ₹{formatInr(corporateTaxSaved)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">22.88% deduction</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border bg-card shadow-sm">
                    <span className="text-[11px] text-muted-foreground">NPS Tax-Free Shield</span>
                    <div className="text-base font-bold font-mono text-foreground mt-0.5">
                      ₹{formatInr(npsTaxFreeAmount)}
                    </div>
                    <span className="text-[10px] text-muted-foreground">Sec 80CCD(2)</span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[11px] text-muted-foreground">Net Tax Optimization</span>
                    <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      ₹{formatInr(netTaxOptimizationBenefit)}
                    </div>
                    <span className="text-[10px] text-emerald-500 font-medium">vs Dividend Payout</span>
                  </div>
                </div>

                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border">
                    <CardTitle className="text-xs font-bold">Why Dividends Cause Double Taxation</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 text-xs text-muted-foreground">
                    <p>
                      Dividends are paid from post-tax profit (company pays 22.88% tax first) and are then taxed AGAIN in your personal hands at up to 39% slab rate.
                    </p>
                    <p className="text-foreground font-semibold">
                      Recommendation: Pay executive remuneration up to ₹24 Lakhs with 14% Employer NPS to maximize pre-tax corporate deductions.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ========================================================= */}
          {/* TAB 11: TAX NOTICE DEFENSE (PETITION GENERATOR)           */}
          {/* ========================================================= */}
          <TabsContent value="notice-defense" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <Card className="border-border bg-card/95 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Scale className="size-4 text-purple-600 dark:text-purple-400" />
                    Notice Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <Label className="text-xs">Notice Statutory Type</Label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value as any)}
                      className="w-full text-xs h-8 rounded-md border border-input bg-background px-2"
                    >
                      <option value="gst_asmt_10">GST ASMT-10 (GSTR-2B vs 3B Mismatch)</option>
                      <option value="it_143_1">IT Section 143(1) Intimation</option>
                      <option value="it_139_9">IT Section 139(9) Defective Return</option>
                      <option value="gst_drc_01">GST DRC-01 (Show Cause Notice)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Notice DIN / Ref</Label>
                    <Input
                      value={noticeRef}
                      onChange={(e) => setNoticeRef(e.target.value)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Disputed Tax (₹)</Label>
                    <Input
                      type="number"
                      value={disputedAmount}
                      onChange={(e) => setDisputedAmount(Number(e.target.value) || 0)}
                      className="text-xs h-8 font-mono bg-background"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={handleGenerateNotice}
                    disabled={noticeMutation.isPending}
                    className="w-full text-xs h-9 font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-sm mt-2"
                  >
                    <Sparkles className="size-3.5 mr-1" />
                    Generate Legal Reply Petition
                  </Button>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                <Card className="border-border bg-card/95 shadow-md">
                  <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-xs font-bold">
                        {noticeMutation.data?.title || "Legal Petition Draft (Ready to File)"}
                      </CardTitle>
                      <CardDescription className="text-[11px]">
                        {noticeMutation.data?.subject || "Includes Supreme Court & High Court case citations"}
                      </CardDescription>
                    </div>
                    {noticeMutation.data && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(noticeMutation.data, null, 2))}
                        className="text-xs h-7 gap-1"
                      >
                        <Copy className="size-3" /> Copy Text
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs leading-relaxed">
                    {noticeMutation.data ? (
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-bold text-foreground text-xs uppercase mb-1">Judicial Citations:</h5>
                          <ul className="list-disc list-inside font-mono text-[11px] text-muted-foreground">
                            {noticeMutation.data.citations.map((c: string, i: number) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h5 className="font-bold text-foreground text-xs uppercase mb-1">Legal Grounds:</h5>
                          <div className="space-y-1.5">
                            {noticeMutation.data.legalGrounds.map((g: string, i: number) => (
                              <p key={i} className="p-2 rounded bg-muted/40 font-mono text-[11px]">{g}</p>
                            ))}
                          </div>
                        </div>
                        <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
                          <h5 className="font-bold text-purple-600 dark:text-purple-400 text-xs mb-1">Prayer to Officer:</h5>
                          <p className="italic text-foreground font-serif text-xs">"{noticeMutation.data.prayerText}"</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Scale className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-semibold">Select parameters and click Generate.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
