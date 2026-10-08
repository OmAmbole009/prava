import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { GstSpreadsheetWorkbench } from "@/components/GstSpreadsheetWorkbench";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Info,
  Plus,
  Receipt,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";

function formatMinor(minor, currency, locale) {
  return formatMinorAmount(minor, currency, locale);
}

export default function Tax() {
  const [, setLocation] = useLocation();
  const [showCalculationDetails, setShowCalculationDetails] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const tasks = useQuery({
    queryKey: ["tasks", "list", businessId],
    queryFn: () => api.tasks.list({ businessId }),
    enabled: businessId > 0,
  });
  const gstTask = tasks.data?.find((t) => t.type === "gst_return_preparation");

  const gstTaskDetail = useQuery({
    queryKey: ["tasks", "get", gstTask?.id],
    queryFn: () => api.tasks.get({ taskId: gstTask?.id ?? 0 }),
    enabled: !!gstTask,
  });

  const tdsComplianceQuery = useQuery({
    queryKey: ["intelligence", "tds", businessId],
    queryFn: () => api.intelligence.tds({ businessId }),
    enabled: businessId > 0,
  });

  const complianceCalendarQuery = useQuery({
    queryKey: ["caEngine", "complianceCalendar"],
    queryFn: () => api.caEngine.complianceCalendar(),
  });

  const currency = business?.currency ?? "INR";
  const locale = business?.locale ?? "en-IN";
  const fmt = (minor) => formatMinor(minor, currency, locale);

  const prep = gstTaskDetail.data?.preparation;
  const tdsData = tdsComplianceQuery.data?.analysis;
  const calendarData = complianceCalendarQuery.data?.statutoryEvents || [];

  const salesTaxMinor = prep?.salesTaxMinor ?? 0;
  const inputCreditMinor = prep?.inputTaxCreditMinor ?? 0;
  const netTaxMinor = prep?.netTaxPositionMinor ?? Math.max(0, salesTaxMinor - inputCreditMinor);

  const totalTdsMinor = tdsData?.totalTdsRequiredMinor ?? 0;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag">Taxes & Statutory Obligations</span>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              Taxes, GST & <em className="italic font-normal">What You Need to Pay</em>
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Plain-English calculation of your GST position, TDS deduction obligations, and certified CA review desk.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl text-xs font-semibold shadow-md"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava about Tax
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/ca-review")}
              className="rounded-xl text-xs font-semibold"
            >
              <UserCheck className="mr-1.5 size-3.5 text-purple-600 dark:text-purple-400" />
              CA Review Desk
            </Button>
          </div>
        </div>

        {/* ── 1. Top Plain-English Tax Summary Cards ──────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* GST Position Card */}
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">Estimated GST to Pay</span>
              <span className="rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                GSTR-3B
              </span>
            </div>
            <p className="font-mono mt-3 text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(netTaxMinor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Net tax liability after claiming your input credit on purchase bills.
            </p>
            <button
              onClick={() => setShowCalculationDetails(!showCalculationDetails)}
              className="mt-3 flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400"
            >
              {showCalculationDetails ? "Hide breakdown" : "See how this is calculated"} →
            </button>
          </div>

          {/* TDS Obligation Card */}
          <div className="rounded-3xl border border-purple-500/30 bg-purple-500/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">
                TDS Deductions Pending
              </span>
              <span className="rounded-md bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-600 dark:text-purple-400">
                Challan 281
              </span>
            </div>
            <p className="font-mono mt-3 text-2xl font-bold text-purple-600 dark:text-purple-400">{fmt(totalTdsMinor)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tdsData?.vendorsWithTdsObligation
                ? `Required for ${tdsData.vendorsWithTdsObligation} vendor${tdsData.vendorsWithTdsObligation !== 1 ? "s" : ""}. Deposit by 7th of next month.`
                : "No pending TDS deductions identified on current payments."}
            </p>
            <button
              onClick={() => setLocation("/money")}
              className="mt-3 flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:underline dark:text-purple-400"
            >
              Check vendor payments →
            </button>
          </div>

          {/* Advance Tax Card */}
          <div className="rounded-3xl border border-sky-500/30 bg-sky-500/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase font-bold text-muted-foreground">
                Advance Income Tax
              </span>
              <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                Quarterly
              </span>
            </div>
            <p className="font-mono mt-3 text-2xl font-bold text-sky-600 dark:text-sky-400">Estimated on Profits</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Due on 15th Jun, 15th Sep, 15th Dec, 15th Mar if yearly tax exceeds ₹10,000.
            </p>
            <button
              onClick={() => setLocation("/ca-suite")}
              className="mt-3 flex items-center gap-1 text-[11px] font-bold text-sky-600 hover:underline dark:text-sky-400"
            >
              Run Advance Tax estimate →
            </button>
          </div>
        </div>

        {/* ── 2. Three-Level Disclosure on GST Calculation ────────────────── */}
        <AnimatePresence>
          {showCalculationDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                    <Info className="size-4" />
                  </span>
                  <h3 className="text-sm font-bold text-foreground">How Prava Calculates Your GST</h3>
                </div>
                <button
                  onClick={() => setShowCalculationDetails(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Close
                </button>
              </div>

              {/* Step by step */}
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                    Step 1: GST You Collected
                  </p>
                  <p className="font-mono mt-1 text-lg font-bold text-foreground">{fmt(salesTaxMinor)}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Tax charged to customers on outward sales invoices.
                  </p>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                  <p className="text-[10px] font-mono font-bold uppercase text-muted-foreground">
                    Step 2: GST You Can Claim Back
                  </p>
                  <p className="font-mono mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    - {fmt(inputCreditMinor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Input Tax Credit (ITC) paid to registered vendors on business purchases.
                  </p>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-[10px] font-mono font-bold uppercase text-amber-600 dark:text-amber-400">
                    Step 3: What You Actually Pay
                  </p>
                  <p className="font-mono mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">
                    = {fmt(netTaxMinor)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Collected tax minus claimed purchase credit.
                  </p>
                </div>
              </div>

              {/* Expandable Technical Statutory Details */}
              <div className="mt-4 pt-3 border-t border-border/60">
                <button
                  onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                >
                  {showTechnicalDetails ? "Hide technical accounting details" : "Show technical accounting details (For CAs)"}
                  {showTechnicalDetails ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                </button>

                {showTechnicalDetails && (
                  <div className="mt-3 rounded-2xl bg-secondary/40 p-4 font-mono text-xs text-muted-foreground leading-relaxed">
                    <p>• Output Tax: GSTR-3B Table 3.1(a) Outward Taxable Supplies</p>
                    <p>• Input Tax Credit: GSTR-3B Table 4(A)(5) All Other ITC</p>
                    <p>• Ineligible / Blocked Credits: Filtered per Section 17(5) of CGST Act</p>
                    <p>• Reconciled Against: GSTR-2B monthly supplier auto-populated return</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 3. Live TDS Compliance Status ────────────────────────────────── */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  <Receipt className="size-4" />
                </span>
                <h2 className="text-lg font-bold text-foreground">Tax Deducted at Source (TDS) Status</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                TDS must be deducted from vendor payments and deposited to the government by the 7th of each month.
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-mono uppercase font-bold text-muted-foreground">Monthly Deposit Deadline</p>
              <p className="font-mono text-sm font-bold text-purple-600 dark:text-purple-400">7th of Next Month</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                section: "194C",
                name: "Contractors & Transport",
                rate: "1% / 2%",
                threshold: "₹30,000 single / ₹1,00,000 yr",
              },
              { section: "194J", name: "Professional & Technical", rate: "10% / 2%", threshold: "₹30,000 yearly" },
              { section: "194I", name: "Commercial Office Rent", rate: "10%", threshold: "₹2,40,000 yearly" },
              { section: "194Q", name: "Goods Purchases > 50L", rate: "0.1%", threshold: "₹50,00,000 yearly" },
            ].map((sec, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">Section {sec.section}</span>
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary font-mono">
                    {sec.rate}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{sec.name}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">Threshold: {sec.threshold}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 4. Statutory Compliance Calendar ─────────────────────────────── */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
                <Calendar className="size-4" />
              </span>
              <h3 className="text-base font-bold text-foreground">Upcoming Statutory Filing Deadlines</h3>
            </div>
            <span className="text-xs text-muted-foreground">Next 30 Days</span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                date: "11th of every month",
                title: "GSTR-1 Outward Supplies",
                desc: "Upload all customer sales invoices so buyers can claim input credits.",
              },
              {
                date: "20th of every month",
                title: "GSTR-3B Summary Return",
                desc: "Pay net GST balance and finalize monthly statutory filing.",
              },
              {
                date: "7th of every month",
                title: "TDS Deposit (Challan 281)",
                desc: "Pay tax deducted from contractors and professionals to income tax department.",
              },
            ].map((event, i) => (
              <div key={i} className="rounded-2xl border border-border/60 bg-secondary/30 p-4">
                <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                  {event.date}
                </span>
                <h4 className="mt-2 text-xs font-bold text-foreground">{event.title}</h4>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{event.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── 5. Full CA GST Filing & Invoice Workbench (Spreadsheet) ──────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground font-mono uppercase tracking-wider">
              GSTR-1 & 3B Invoice Spreadsheet Workbench
            </h3>
            <span className="text-xs text-muted-foreground">Interactive line-item audit</span>
          </div>
          <GstSpreadsheetWorkbench businessId={businessId} />
        </div>
      </div>
    </DashboardLayout>
  );
}
