import DashboardLayout from "@/components/DashboardLayout";
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

  // Derive net profit
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
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[#dfd6c4] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-kicker">Money & Finances</span>
            <h1 className="prava-display mt-2 text-4xl text-[#153832]">
              Track what came in, what went out, and what’s next.
            </h1>
            <p className="mt-2 text-sm text-[#65766e]">
              Plain-language overview of {business?.name || "your business"}’s cashflow, unpaid invoices, and tax reserves.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26]"
            >
              <Sparkles className="mr-2 size-4 text-[#d9e8be]" />
              Ask Prava about Money
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/documents")}
              className="rounded-full border-[#cfc4b1] text-[#24473e] hover:bg-[#eee8dc]"
            >
              <Plus className="mr-2 size-4" />
              Upload Invoice or Bill
            </Button>
          </div>
        </div>

        {/* 1. Top Key Figures */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Revenue */}
          <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">
                Money In (Revenue)
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#e5efe1] text-[#2c5847]">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-[#163a34]">{fmt(revenue)}</p>
            <p className="mt-2 text-xs text-[#718279]">
              Verified total from sales invoices and customer receipts.
            </p>
          </div>

          {/* Expenses */}
          <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6146]">
                Money Out (Expenses)
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#fbeef4] text-[#8f402c]">
                <TrendingDown className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-[#163a34]">{fmt(expenses)}</p>
            <p className="mt-2 text-xs text-[#718279]">
              Verified total from supplier bills, utilities, and vendor payouts.
            </p>
          </div>

          {/* Available Cash */}
          <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4f7182]">
                Available Cash in Bank
              </span>
              <span className="flex size-8 items-center justify-center rounded-xl bg-[#e7f1f9] text-[#265377]">
                <Landmark className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-[#163a34]">{fmt(cash)}</p>
            <p className="mt-2 text-xs text-[#718279]">
              Current operating liquidity from reconciled bank statements.
            </p>
          </div>
        </div>

        {/* 2. Secondary Health Metrics */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Receivables */}
          <div className="rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d8076]">
                Money Owed to You
              </p>
              <ArrowDownLeft className="size-4 text-[#2d5c4b]" />
            </div>
            <p className="mt-3 text-xl font-bold text-[#1e463a]">{fmt(receivables)}</p>
            <p className="mt-1 text-xs text-[#75847c]">Unpaid invoices issued to customers</p>
          </div>

          {/* Payables */}
          <div className="rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d8076]">
                Money You Owe
              </p>
              <ArrowUpRight className="size-4 text-[#9b512c]" />
            </div>
            <p className="mt-3 text-xl font-bold text-[#1e463a]">{fmt(payables)}</p>
            <p className="mt-1 text-xs text-[#75847c]">Pending bills from suppliers & vendors</p>
          </div>

          {/* Tax Position */}
          <div className="rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6d8076]">
                Tax to Keep Aside ({business?.taxSystem || "GST"})
              </p>
              <Receipt className="size-4 text-[#916b34]" />
            </div>
            <p className="mt-3 text-xl font-bold text-[#1e463a]">{fmt(taxPosition)}</p>
            <p className="mt-1 text-xs text-[#75847c]">Estimated net liability before deductions</p>
          </div>
        </div>

        {/* 3. Invoices & Bills Explorer */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Customer Invoices */}
          <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#163a34]">Customer Invoices</h2>
                <p className="text-xs text-[#72827a]">Invoices billed to clients</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/documents")}
                className="text-xs text-[#2a5546]"
              >
                View all ({salesInvoices.length})
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
            <div className="mt-4 space-y-2.5">
              {salesInvoices.length ? (
                salesInvoices.slice(0, 4).map((item) => (
                  <div
                    key={item.document.id}
                    onClick={() => setLocation(`/documents/${item.document.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-[#ece4d6] p-3.5 transition hover:bg-[#f8f4eb]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#22463c]">
                        {item.extraction?.vendorName || item.document.originalName}
                      </p>
                      <p className="text-xs text-[#72827a]">
                        {item.extraction?.invoiceNumber || `Doc #${item.document.id}`} ·{" "}
                        {item.extraction?.invoiceDate
                          ? new Date(item.extraction.invoiceDate).toLocaleDateString()
                          : "Date not extracted"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#163a34]">
                        {item.extraction?.totalMinor
                          ? fmt(item.extraction.totalMinor)
                          : "Needs review"}
                      </p>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.document.status === "extracted"
                            ? "bg-[#e5efe1] text-[#2c5847]"
                            : "bg-[#fae7d4] text-[#8e4c19]"
                        }`}
                      >
                        {item.document.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#d9cfbb] p-6 text-center text-xs text-[#718279]">
                  No sales invoices recorded yet. Upload customer invoices in the Documents tab.
                </div>
              )}
            </div>
          </div>

          {/* Supplier Bills */}
          <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#163a34]">Supplier Bills & Expenses</h2>
                <p className="text-xs text-[#72827a]">Vendor costs and business receipts</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/documents")}
                className="text-xs text-[#2a5546]"
              >
                View all ({purchaseBills.length})
                <ChevronRight className="ml-1 size-3.5" />
              </Button>
            </div>
            <div className="mt-4 space-y-2.5">
              {purchaseBills.length ? (
                purchaseBills.slice(0, 4).map((item) => (
                  <div
                    key={item.document.id}
                    onClick={() => setLocation(`/documents/${item.document.id}`)}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-[#ece4d6] p-3.5 transition hover:bg-[#f8f4eb]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#22463c]">
                        {item.extraction?.vendorName || item.document.originalName}
                      </p>
                      <p className="text-xs text-[#72827a]">
                        {item.extraction?.invoiceNumber || `Doc #${item.document.id}`} ·{" "}
                        {item.extraction?.invoiceDate
                          ? new Date(item.extraction.invoiceDate).toLocaleDateString()
                          : "Date not extracted"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-[#163a34]">
                        {item.extraction?.totalMinor
                          ? fmt(item.extraction.totalMinor)
                          : "Needs review"}
                      </p>
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${
                          item.document.status === "extracted"
                            ? "bg-[#e5efe1] text-[#2c5847]"
                            : "bg-[#fae7d4] text-[#8e4c19]"
                        }`}
                      >
                        {item.document.status.replaceAll("_", " ")}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-[#d9cfbb] p-6 text-center text-xs text-[#718279]">
                  No expense bills recorded yet. Upload supplier bills or receipts to track expenses.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Progressive Disclosure: Advanced Ledger for Accountants */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setShowLedgerDetails(!showLedgerDetails)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#698477]">
                Advanced / Accountant Details
              </p>
              <h3 className="text-base font-bold text-[#153832]">
                Detailed General Ledger & Calculation Trace
              </h3>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#efeae0] text-[#335649]">
              <ChevronDown
                className={`size-4 transition-transform ${showLedgerDetails ? "rotate-180" : ""}`}
              />
            </span>
          </button>

          {showLedgerDetails && (
            <div className="mt-5 border-t border-[#ece4d6] pt-5 space-y-4">
              <p className="text-xs text-[#6e7f77]">
                Every financial number in Prava is computed deterministically from verified source records and validated double-entry entries.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e1d8c7] text-[#6d8076]">
                      <th className="pb-2 font-semibold">Account / Category</th>
                      <th className="pb-2 font-semibold">Debit / Credit</th>
                      <th className="pb-2 font-semibold">Verified Status</th>
                      <th className="pb-2 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eee8dc]">
                    <tr>
                      <td className="py-2.5 font-medium text-[#23473e]">Operating Revenue (Sales)</td>
                      <td className="py-2.5 text-[#6b7c73]">Credit</td>
                      <td className="py-2.5">
                        <span className="rounded bg-[#e5efe1] px-2 py-0.5 text-[10px] font-semibold text-[#2c5847]">
                          Verified
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#163a34]">{fmt(revenue)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-[#23473e]">Cost of Goods & Operating Expenses</td>
                      <td className="py-2.5 text-[#6b7c73]">Debit</td>
                      <td className="py-2.5">
                        <span className="rounded bg-[#e5efe1] px-2 py-0.5 text-[10px] font-semibold text-[#2c5847]">
                          Verified
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#163a34]">{fmt(expenses)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-medium text-[#23473e]">Output GST Liability</td>
                      <td className="py-2.5 text-[#6b7c73]">Credit</td>
                      <td className="py-2.5">
                        <span className="rounded bg-[#e5efe1] px-2 py-0.5 text-[10px] font-semibold text-[#2c5847]">
                          Verified
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-[#163a34]">{fmt(taxPosition)}</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 font-bold text-[#163a34]">Net Profit / Margin</td>
                      <td className="py-2.5 text-[#6b7c73]">Summary</td>
                      <td className="py-2.5">
                        <span className="rounded bg-[#e5efe1] px-2 py-0.5 text-[10px] font-semibold text-[#2c5847]">
                          Calculated
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-bold text-[#163a34]">{fmt(netIncome)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
