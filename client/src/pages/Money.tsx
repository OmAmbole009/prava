import DashboardLayout from "@/components/DashboardLayout";
import { AnimatedGrid, AnimatedItem, AnimatedList, AnimatedRow, AnimatedSection, FadeInView } from "@/components/AnimatedPage";
import { TiltCard } from "@/components/TiltCard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  FileText,
  HelpCircle,
  Landmark,
  Plus,
  Receipt,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Money() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const summary = trpc.finance.latestSummary.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const documents = trpc.documents.list.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const [showLedgerDetails, setShowLedgerDetails] = useState(false);

  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";
  const fmt = (minor: number) => formatMinorAmount(minor, currency, locale);

  const summaryData = summary.data;
  const revenue = summaryData?.revenueMinor ?? 0;
  const expenses = summaryData?.expensesMinor ?? 0;
  const cash = summaryData?.cashMinor ?? 0;
  const receivables = summaryData?.receivablesMinor ?? 0;
  const payables = summaryData?.payablesMinor ?? 0;
  const taxPosition = summaryData?.gstPositionMinor ?? 0;
  const netIncome = revenue - expenses;

  // Filter purchase bills vs sales invoices
  const allDocs = documents.data ?? [];
  const salesInvoices = allDocs.filter(
    (d) => d.extraction?.invoiceType === "sales" || d.document.documentType === "invoice"
  );
  const purchaseBills = allDocs.filter(
    (d) => d.extraction?.invoiceType === "purchase" || d.document.documentType === "receipt"
  );

  return (
    <DashboardLayout>
      <div className="relative mx-auto max-w-6xl space-y-7 py-2">
        {/* Decorative orbs */}
        <div className="pointer-events-none absolute -right-32 -top-20 size-80 rounded-full bg-emerald-400/5 blur-3xl float-glow" />
        <div className="pointer-events-none absolute -left-20 top-40 size-60 rounded-full bg-sky-400/5 blur-3xl float-glow-slow" />
        {/* Header */}
        <AnimatedSection className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag">Financial Intelligence &amp; Ledger</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Money, Cashflow &amp; <em className="italic font-normal">Double-Entry Ledger</em>
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              Verified financial signals for {business?.name || "your business"} — cash liquidity, open receivables, and statutory reserves.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 btn-magnetic"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava about Money
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/documents")}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] btn-magnetic"
            >
              <Plus className="mr-1.5 size-3.5 text-sky-500 dark:text-sky-400" />
              Upload Invoice or Bill
            </Button>
          </div>
        </AnimatedSection>

        {/* 1. Top Key Financial Figures */}
        <AnimatedGrid className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatedItem>
            <TiltCard className="prava-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Money In (Revenue)
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="size-3.5" />
                </span>
              </div>
              <p className="prava-mono mt-3 text-2xl font-bold text-slate-900 dark:text-white">{fmt(revenue)}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Verified sales invoices &amp; receipts</p>
            </TiltCard>
          </AnimatedItem>

          <AnimatedItem>
            <TiltCard className="prava-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Money Out (Expenses)
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-red-500/10 text-red-500 dark:text-red-400">
                  <TrendingDown className="size-3.5" />
                </span>
              </div>
              <p className="prava-mono mt-3 text-2xl font-bold text-slate-900 dark:text-white">{fmt(expenses)}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Supplier bills &amp; operating costs</p>
            </TiltCard>
          </AnimatedItem>

          <AnimatedItem>
            <TiltCard className="prava-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Operating Net Profit
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <Wallet className="size-3.5" />
                </span>
              </div>
              <p className="prava-mono mt-3 text-2xl font-bold text-sky-600 dark:text-sky-400">{fmt(netIncome)}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Margin before tax allocations</p>
            </TiltCard>
          </AnimatedItem>

          <AnimatedItem>
            <TiltCard className="prava-card p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Reconciled Liquidity
                </span>
                <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white">
                  <Landmark className="size-3.5" />
                </span>
              </div>
              <p className="prava-mono mt-3 text-2xl font-bold text-slate-900 dark:text-white">{fmt(cash)}</p>
              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Available bank funds</p>
            </TiltCard>
          </AnimatedItem>
        </AnimatedGrid>

        {/* 2. Receivables & Payables Side-by-Side Breakdown */}
        <FadeInView className="grid gap-6 lg:grid-cols-2">
          {/* Customer Receivables */}
          <div className="prava-panel p-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Customer Receivables</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Money Owed To You</h3>
              </div>
              <span className="prava-mono text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(receivables)}</span>
            </div>

            <AnimatedList className="mt-4 space-y-2">
              {salesInvoices.length > 0 ? (
                salesInvoices.slice(0, 4).map((doc) => (
                  <AnimatedRow key={doc.document.id}>
                    <div
                      onClick={() => setLocation(`/documents/${doc.document.id}`)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20 dark:hover:bg-[#0E1520] text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{doc.extraction?.vendorName || doc.document.originalName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{doc.extraction?.invoiceNumber || "INV"} · {doc.document.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="prava-mono font-bold text-slate-900 dark:text-white">{fmt(doc.extraction?.totalMinor || 0)}</p>
                        <span className="text-[10px] font-semibold text-slate-800 dark:text-white">Inspect →</span>
                      </div>
                    </div>
                  </AnimatedRow>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-5 text-center text-xs text-slate-500 dark:text-slate-400">No outstanding receivables currently recorded.</div>
              )}
            </AnimatedList>
          </div>

          {/* Supplier Payables */}
          <div className="prava-panel p-6">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">Supplier Payables</span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Money You Owe</h3>
              </div>
              <span className="prava-mono text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(payables)}</span>
            </div>

            <AnimatedList className="mt-4 space-y-2">
              {purchaseBills.length > 0 ? (
                purchaseBills.slice(0, 4).map((doc) => (
                  <AnimatedRow key={doc.document.id}>
                    <div
                      onClick={() => setLocation(`/documents/${doc.document.id}`)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20 dark:hover:bg-[#0E1520] text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{doc.extraction?.vendorName || doc.document.originalName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">{doc.extraction?.invoiceNumber || "BILL"} · {doc.document.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="prava-mono font-bold text-slate-900 dark:text-white">{fmt(doc.extraction?.totalMinor || 0)}</p>
                        <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">Inspect →</span>
                      </div>
                    </div>
                  </AnimatedRow>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-5 text-center text-xs text-slate-500 dark:text-slate-400">No pending supplier bills recorded.</div>
              )}
            </AnimatedList>
          </div>
        </FadeInView>

        {/* 3. Statutory Tax Reserve Card */}
        <FadeInView className="prava-panel p-6 border border-amber-400/30 bg-gradient-to-r from-amber-500/[0.05] to-transparent shine-on-hover">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
                  <Receipt className="size-4 text-amber-600 dark:text-amber-400" />
                </motion.div>
                <span className="text-xs font-bold text-slate-900 dark:text-white">Statutory {business?.taxSystem || "Tax"} Reserve</span>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Estimated tax liability isolated from operating cash. Do not spend this reserve.</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="prava-mono text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(taxPosition)}</span>
              <Button onClick={() => setLocation("/tax")} size="sm" className="rounded-xl bg-amber-600 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm btn-magnetic">
                Go to Tax Hub →
              </Button>
            </div>
          </div>
        </FadeInView>
      </div>
    </DashboardLayout>
  );
}
