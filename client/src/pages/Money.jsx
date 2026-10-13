import DashboardLayout from "@/components/DashboardLayout";
import { TiltCard } from "@/components/TiltCard";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  Plus,
  Receipt,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

function formatMinor(minor, currency, locale) {
  return formatMinorAmount(minor, currency, locale);
}

// ─── Interactive TDS Calculator Tool ─────────────────────────────────────────
function TdsCalculatorWidget({ currency, locale }) {
  const [amount, setAmount] = useState("");
  const [serviceType, setServiceType] = useState("194J_tech");
  const [hasPan, setHasPan] = useState(true);

  const parsedAmount = parseFloat(amount) || 0;

  // Rate rules
  const rates = {
    "194C_ind": { section: "194C", rate: 1, label: "Contractor / Freelancer (Individual)", threshold: 30000 },
    "194C_co": { section: "194C", rate: 2, label: "Contractor / Transport / Agency (Company)", threshold: 30000 },
    "194J_prof": { section: "194J", rate: 10, label: "CA, Lawyer, Doctor, Consultant", threshold: 30000 },
    "194J_tech": { section: "194J", rate: 2, label: "Software, IT, Technical & Cloud Services", threshold: 30000 },
    "194I_rent": { section: "194I", rate: 10, label: "Office / Commercial Property Rent", threshold: 240000 },
  };

  const selectedRule = rates[serviceType] || rates["194J_tech"];
  const effectiveRate = !hasPan ? 20 : selectedRule.rate;
  const isApplicable = parsedAmount > selectedRule.threshold;
  const tdsAmount = isApplicable ? Math.round((parsedAmount * effectiveRate) / 100) : 0;
  const netPayable = parsedAmount - tdsAmount;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090E] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
      <div className="flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Calculator className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-bold text-white">Quick TDS Deduction Checker</h3>
          <p className="text-xs text-slate-400">
            Calculate exactly how much to pay a vendor and how much tax to deduct before transferring money.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase font-mono">Invoice Bill Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 50000"
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase font-mono">Service / Work Type</label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="194J_tech">Software / Cloud / Technical (2% TDS)</option>
            <option value="194J_prof">CA, Lawyer, Consultant (10% TDS)</option>
            <option value="194C_ind">Individual Contractor / Labour (1% TDS)</option>
            <option value="194C_co">Company Contractor / Transport (2% TDS)</option>
            <option value="194I_rent">Office Rent (10% TDS)</option>
          </select>
        </div>

        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase font-mono">Vendor PAN Card</label>
          <div className="mt-1.5 flex items-center gap-3 pt-1">
            <label className="flex items-center gap-1.5 text-xs text-foreground cursor-pointer font-medium">
              <input
                type="radio"
                name="pan"
                checked={hasPan}
                onChange={() => setHasPan(true)}
                className="accent-primary"
              />
              PAN Available ({selectedRule.rate}%)
            </label>
            <label className="flex items-center gap-1.5 text-xs text-red-500 cursor-pointer font-medium">
              <input
                type="radio"
                name="pan"
                checked={!hasPan}
                onChange={() => setHasPan(false)}
                className="accent-red-500"
              />
              No PAN (20% penalty rate)
            </label>
          </div>
        </div>
      </div>

      {parsedAmount > 0 && (
        <div className="mt-5 rounded-2xl border border-white/[0.08] bg-[#0B0E14] p-4">
          <div className="grid gap-3 sm:grid-cols-3 text-center">
            <div className="rounded-xl bg-[#07090E] border border-white/[0.06] p-3">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Pay to Vendor</p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-400">
                ₹{netPayable.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl bg-[#07090E] border border-white/[0.06] p-3">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-400">
                Deduct & Deposit (TDS)
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-blue-400">
                ₹{tdsAmount.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-xl bg-[#07090E] border border-white/[0.06] p-3">
              <p className="text-[10px] uppercase font-mono font-bold text-slate-400">Section & Due Date</p>
              <p className="mt-1 text-xs font-bold text-foreground">
                Section {selectedRule.section} · Due 7th of next month
              </p>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            {isApplicable
              ? `Transfer ₹${netPayable.toLocaleString("en-IN")} to the vendor. Prava will log the remaining ₹${tdsAmount.toLocaleString("en-IN")} for Challan 281 deposit.`
              : `This payment is under the ₹${selectedRule.threshold.toLocaleString("en-IN")} threshold. Pay full ₹${parsedAmount.toLocaleString("en-IN")} without deduction unless cumulative FY payments cross ₹1,00,000.`}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Money Page ────────────────────────────────────────────────────────
export default function Money() {
  const [, setLocation] = useLocation();
  const [showLedgerDetails, setShowLedgerDetails] = useState(false);

  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const summary = useQuery({
    queryKey: ["finance", "latestSummary", businessId],
    queryFn: () => api.finance.latestSummary({ businessId }),
    enabled: businessId > 0,
  });

  const arQuery = useQuery({
    queryKey: ["intelligence", "ar", businessId],
    queryFn: () => api.intelligence.ar({ businessId }),
    enabled: businessId > 0,
  });

  const apQuery = useQuery({
    queryKey: ["intelligence", "ap", businessId],
    queryFn: () => api.intelligence.ap({ businessId }),
    enabled: businessId > 0,
  });

  const currency = business?.currency ?? "INR";
  const locale = business?.locale ?? "en-IN";
  const fmt = (minor) => formatMinor(minor, currency, locale);

  const summaryData = summary.data;
  const arData = arQuery.data;
  const apData = apQuery.data;

  const revenue = summaryData?.revenueMinor ?? 0;
  const expenses = summaryData?.expensesMinor ?? 0;
  const cash = summaryData?.cashMinor ?? 0;
  const netIncome = revenue - expenses;

  const receivables = arData?.totalOutstandingMinor ?? summaryData?.receivablesMinor ?? 0;
  const overdueReceivables = arData?.totalOverdueMinor ?? 0;

  const payables = apData?.totalOutstandingMinor ?? summaryData?.payablesMinor ?? 0;
  const dueThisMonthPayables = apData?.dueThisMonthMinor ?? 0;

  const arAging = arData?.aging || { current: 0, "1_to_30": 0, "31_to_60": 0, "61_to_90": 0, over_90: 0 };

  return (
    <DashboardLayout>
      <div className="relative mx-auto max-w-6xl space-y-7 py-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-border/60 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag">Money & Working Capital</span>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
              Money In, Money Out & <em className="italic font-normal">Who You Owe</em>
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Track customer receivables, overdue bills, and vendor TDS requirements in clear plain language.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl text-xs font-semibold shadow-md"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava about Money
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/documents")}
              className="rounded-xl text-xs font-semibold"
            >
              <Plus className="mr-1.5 size-3.5 text-sky-500" />
              Upload Invoices
            </Button>
          </div>
        </div>

        {/* ── 1. Top Key Financial Figures in Plain English ────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TiltCard className="prava-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Money In (Earnings)
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <TrendingUp className="size-3.5" />
              </span>
            </div>
            <p className="prava-mono mt-3 text-2xl font-bold text-foreground">{fmt(revenue)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Verified sales invoices & receipts</p>
          </TiltCard>

          <TiltCard className="prava-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Money Out (Expenses)
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <TrendingDown className="size-3.5" />
              </span>
            </div>
            <p className="prava-mono mt-3 text-2xl font-bold text-foreground">{fmt(expenses)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Supplier bills & operational costs</p>
          </TiltCard>

          <TiltCard className="prava-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Net Operating Margin
              </span>
              <span
                className={`flex size-7 items-center justify-center rounded-lg ${
                  netIncome >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                }`}
              >
                <Coins className="size-3.5" />
              </span>
            </div>
            <p
              className={`prava-mono mt-3 text-2xl font-bold ${
                netIncome >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
              }`}
            >
              {fmt(netIncome)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">Income minus verified expenses</p>
          </TiltCard>

          <TiltCard className="prava-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                Available Cash Liquidity
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-500">
                <Landmark className="size-3.5" />
              </span>
            </div>
            <p className="prava-mono mt-3 text-2xl font-bold text-foreground">{fmt(cash)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Verified operating funds available</p>
          </TiltCard>
        </div>

        {/* ── 2. Money Customers Still Owe You (Accounts Receivable) ───────── */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <ArrowDownLeft className="size-4" />
                </span>
                <h2 className="text-lg font-bold text-foreground">Money Customers Still Owe You</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {arData?.summary?.plainEnglish || "Track open customer invoices and see who is late on payments."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase font-bold text-muted-foreground">Total Outstanding</p>
                <p className="font-mono text-xl font-bold text-foreground">{fmt(receivables)}</p>
              </div>
              {overdueReceivables > 0 && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-mono uppercase font-bold text-red-500">Overdue Amount</p>
                  <p className="font-mono text-sm font-bold text-red-600 dark:text-red-400">
                    {fmt(overdueReceivables)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Aging Buckets Grid */}
          <div className="mt-5">
            <h4 className="text-[11px] font-mono uppercase font-bold text-muted-foreground">
              Payment Aging (When was it due?)
            </h4>
            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-5">
              {[
                { label: "Not Yet Due", amount: arAging.current, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "1–30 Days Overdue", amount: arAging["1_to_30"], color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "31–60 Days Overdue", amount: arAging["31_to_60"], color: "text-orange-500", bg: "bg-orange-500/10" },
                { label: "61–90 Days Overdue", amount: arAging["61_to_90"], color: "text-red-400", bg: "bg-red-400/10" },
                { label: "90+ Days Overdue", amount: arAging.over_90, color: "text-red-600", bg: "bg-red-600/15" },
              ].map((bucket, i) => (
                <div key={i} className={`rounded-2xl border border-border/60 ${bucket.bg} p-3 text-center`}>
                  <p className="text-[10px] font-bold text-muted-foreground">{bucket.label}</p>
                  <p className={`font-mono mt-1 text-sm font-bold ${bucket.color}`}>{fmt(bucket.amount)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Customer Invoices List */}
          <div className="mt-6">
            <h4 className="text-[11px] font-mono uppercase font-bold text-muted-foreground">
              Customer Breakdown ({arData?.customers?.length || 0})
            </h4>
            <div className="mt-3 space-y-2.5">
              {!arData?.customers?.length ? (
                <p className="text-xs text-muted-foreground py-2">No open customer invoices.</p>
              ) : (
                arData.customers.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 p-3.5 transition hover:bg-secondary/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-background text-foreground shadow-sm">
                        <Users className="size-4 text-emerald-500" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{c.customerName}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {c.invoiceCount} invoice{c.invoiceCount !== 1 ? "s" : ""} ·{" "}
                          {c.overdueCount > 0 ? (
                            <span className="font-bold text-red-500">{c.overdueCount} overdue</span>
                          ) : (
                            <span className="text-emerald-500">Current</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-foreground">{fmt(c.totalOutstandingMinor)}</p>
                      {c.overdueMinor > 0 && (
                        <p className="font-mono text-[10px] text-red-500 font-semibold">{fmt(c.overdueMinor)} late</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── 3. Bills You Still Need to Pay (Accounts Payable + TDS Flags) ── */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm backdrop-blur-2xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-500">
                  <ArrowUpRight className="size-4" />
                </span>
                <h2 className="text-lg font-bold text-foreground">Bills You Still Need to Pay</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {apData?.summary?.plainEnglish ||
                  "Vendor bills and contractor charges pending payment. Deduct TDS where required before payment."}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-mono uppercase font-bold text-muted-foreground">Total Bills Pending</p>
                <p className="font-mono text-xl font-bold text-foreground">{fmt(payables)}</p>
              </div>
              {dueThisMonthPayables > 0 && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-right">
                  <p className="text-[10px] font-mono uppercase font-bold text-amber-500">Due This Month</p>
                  <p className="font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                    {fmt(dueThisMonthPayables)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Vendor Bills List with TDS Flags */}
          <div className="mt-5 space-y-3">
            {!apData?.vendors?.length ? (
              <p className="text-xs text-muted-foreground py-2">No pending vendor bills.</p>
            ) : (
              apData.vendors.map((v, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border/60 bg-secondary/30 p-4 transition hover:bg-secondary/60"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-foreground">{v.vendorName}</h4>
                        {v.tdsApplicable && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-300 border border-blue-500/20">
                            <ShieldAlert className="size-3" /> TDS Deduction Required
                          </span>
                        )}
                        {v.overdueCount > 0 && (
                          <span className="rounded-md bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-400 border border-red-500/20">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-400">
                        {v.billCount} bill{v.billCount !== 1 ? "s" : ""} · GST: {v.vendorGstin || "Unregistered"}
                      </p>
                      {v.tdsApplicable && (
                        <p className="mt-1.5 text-[11px] font-semibold text-blue-300">
                          ⚠️ Make sure to deduct applicable TDS before paying! Prava tracks cumulative threshold for
                          this vendor.
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-xs font-bold text-foreground">{fmt(v.totalOutstandingMinor)}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation("/documents")}
                        className="mt-2 h-7 rounded-xl text-[10px] font-semibold"
                      >
                        View Bills →
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── 4. Interactive TDS Deduction Calculator ─────────────────────── */}
        <TdsCalculatorWidget currency={currency} locale={locale} />

        {/* ── 5. Technical Double-Entry Accounting (Expandable) ────────────── */}
        <div className="rounded-3xl border border-border/60 bg-secondary/20 p-5">
          <div
            className="flex cursor-pointer items-center justify-between"
            onClick={() => setShowLedgerDetails(!showLedgerDetails)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase text-muted-foreground">
                Technical Double-Entry Ledger (For CAs & Accountants)
              </span>
            </div>
            <button className="text-xs font-semibold text-primary hover:underline">
              {showLedgerDetails ? "Hide" : "Show Details"}
            </button>
          </div>

          <AnimatePresence>
            {showLedgerDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mt-4 border-t border-border/60 pt-4 overflow-hidden text-xs font-mono text-muted-foreground leading-relaxed"
              >
                <p>• General Ledger Accounts active: 1000 Cash, 1200 Accounts Receivable, 2000 Accounts Payable</p>
                <p>• Sales Journal: Credit Sales Revenue, Debit Accounts Receivable Control</p>
                <p>• Purchases Journal: Debit Expense / Input ITC, Credit Accounts Payable Control</p>
                <p>• TDS Subledger: Account 2100 TDS Payable under Section 194C/J/I/Q</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </DashboardLayout>
  );
}
