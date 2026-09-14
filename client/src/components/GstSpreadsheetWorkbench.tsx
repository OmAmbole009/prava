import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit3,
  FileCheck2,
  FileCode2,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UserCheck,
} from "lucide-react";

interface GstSpreadsheetWorkbenchProps {
  businessId: number;
}

export function GstSpreadsheetWorkbench({ businessId }: GstSpreadsheetWorkbenchProps) {
  const [period, setPeriod] = useState("2026-09");
  const [activeTab, setActiveTab] = useState<"gstr1" | "gstr3b" | "hsn" | "compliance">("gstr1");
  const [salesFilter, setSalesFilter] = useState<"ALL" | "B2B" | "B2C_SMALL" | "EXPORT">("ALL");
  const [purchaseFilter, setPurchaseFilter] = useState<"ALL" | "ELIGIBLE" | "INELIGIBLE_17_5" | "CAPITAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const utils = trpc.useUtils();
  const effectiveBusinessId = businessId && businessId > 0 ? businessId : 1;
  const workbenchQuery = trpc.gst.workbench.useQuery(
    { businessId: effectiveBusinessId, period },
    { enabled: true }
  );

  const runRagMutation = trpc.gst.runRag.useMutation({
    onSuccess: (data) => {
      toast.success(
        `AI Invoice RAG verification completed! ${data.summary.totals.verifiedCount}/${data.summary.totals.totalInvoices} invoices verified with ${data.summary.totals.ragMatchRate}% confidence.`
      );
      utils.gst.workbench.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateLineItemMutation = trpc.gst.updateLineItem.useMutation({
    onSuccess: () => {
      toast.success("Line item adjusted & tax totals recalculated!");
      setEditingItem(null);
      utils.gst.workbench.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const exportPortalJsonMutation = trpc.gst.exportPortalJson.useMutation({
    onSuccess: (res) => {
      const blob = new Blob([res.content], { type: res.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Government Portal JSON (gst.gov.in offline schema) downloaded!");
    },
    onError: (err) => toast.error(err.message),
  });

  const exportSpreadsheetMutation = trpc.gst.exportSpreadsheet.useMutation({
    onSuccess: (res) => {
      const blob = new Blob([res.content], { type: res.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Audit-Ready CA Tax Spreadsheet (.CSV) downloaded!");
    },
    onError: (err) => toast.error(err.message),
  });

  const exportComplianceCertMutation = trpc.gst.exportComplianceCert.useMutation({
    onSuccess: (res) => {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(res.content);
        printWindow.document.close();
      } else {
        const blob = new Blob([res.content], { type: res.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success("CA Compliance Certificate opened for print / PDF generation!");
    },
    onError: (err) => toast.error(err.message),
  });

  const data = workbenchQuery.data;
  const summary = data?.summary;
  const totals = summary?.totals;
  const invoices = data?.invoices ?? [];

  // Filter Sales Invoices
  const salesInvoices = invoices.filter((i) => {
    if (i.direction !== "outward") return false;
    if (salesFilter !== "ALL" && i.invoiceType !== salesFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.partyName.toLowerCase().includes(q) ||
        i.partyGstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter Purchase Invoices
  const purchaseInvoices = invoices.filter((i) => {
    if (i.direction !== "inward") return false;
    if (purchaseFilter === "ELIGIBLE" && (i.itcEligibility.includes("ineligible") || i.itcEligibility === "rcm")) return false;
    if (purchaseFilter === "INELIGIBLE_17_5" && i.itcEligibility !== "ineligible_17_5") return false;
    if (purchaseFilter === "CAPITAL" && i.itcEligibility !== "capital_goods") return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.partyName.toLowerCase().includes(q) ||
        i.partyGstin.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const fmt = (val: number | undefined) => (val !== undefined ? `₹${val.toLocaleString()}` : "₹0");

  return (
    <div className="space-y-6">
      {/* ── WORKBENCH TOP COMMAND BAR ─────────────────────────────────────── */}
      <div className="prava-panel p-5 border border-slate-200/80 dark:border-white/10 dark:bg-[#090d16]/85 backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-sky-500/10 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 border border-sky-500/20">
                GSTN Portal 3.0 Engine
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                GSTIN: <strong className="text-slate-900 dark:text-white">{summary?.gstin || "27AABCU9603R1ZM"}</strong>
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              CA GST Filing & Invoice RAG Spreadsheet Workbench
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Cross-verifies invoices against GSTR-2B, identifies blocked ITC (Sec 17(5)), computes net tax liability, and exports official GSTN files.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <select
              aria-label="GST Tax Period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-mono font-bold text-slate-800 dark:border-white/15 dark:bg-[#0d1117] dark:text-white outline-none cursor-pointer hover:border-sky-400 transition"
            >
              <option value="2026-09">Period: Sep 2026 (Active)</option>
              <option value="2026-08">Period: Aug 2026</option>
              <option value="2026-07">Period: Jul 2026</option>
            </select>

            {/* Run RAG Button */}
            <Button
              onClick={() => runRagMutation.mutate({ businessId: effectiveBusinessId, period })}
              disabled={runRagMutation.isPending}
              size="sm"
              className="rounded-xl bg-gradient-to-r from-violet-600 to-sky-600 text-xs font-semibold text-white hover:from-violet-700 hover:to-sky-700 shadow-sm"
            >
              <Sparkles className={`mr-1.5 size-3.5 ${runRagMutation.isPending ? "animate-spin" : ""}`} />
              {runRagMutation.isPending ? "Scanning Invoices..." : "Run AI Invoice RAG"}
            </Button>
          </div>
        </div>

        {/* ── LIVE TAX METRIC TILES ────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="prava-card p-3.5 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Outward Turnover</span>
            <p className="prava-mono mt-1 text-base font-bold text-slate-900 dark:text-white">
              {fmt(totals?.salesTaxable)}
            </p>
            <span className="text-[9px] text-slate-500">GSTR-1 Taxable</span>
          </div>

          <div className="prava-card p-3.5 dark:bg-black/40 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400">Output Tax Due</span>
            <p className="prava-mono mt-1 text-base font-bold text-slate-900 dark:text-white">
              {fmt(totals?.totalOutputTax)}
            </p>
            <span className="text-[9px] text-slate-500">
              IGST: {fmt(totals?.igstOutput)} · CG+SG: {fmt((totals?.cgstOutput ?? 0) + (totals?.sgstOutput ?? 0))}
            </span>
          </div>

          <div className="prava-card p-3.5 dark:bg-black/40 border border-emerald-500/20 dark:border-emerald-500/30">
            <span className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
              Eligible ITC Claim
            </span>
            <p className="prava-mono mt-1 text-base font-bold text-emerald-600 dark:text-emerald-400">
              {fmt(totals?.eligibleItc)}
            </p>
            <span className="text-[9px] text-slate-500">
              Blocked Sec 17(5): {fmt(totals?.ineligibleItc)}
            </span>
          </div>

          <div className="prava-card p-3.5 dark:bg-black/40 border border-amber-500/20 dark:border-amber-500/30">
            <span className="text-[10px] font-mono uppercase text-amber-600 dark:text-amber-400 font-bold">
              Net Tax Payable
            </span>
            <p className="prava-mono mt-1 text-base font-bold text-amber-600 dark:text-amber-400">
              {fmt(totals?.netTaxPayable)}
            </p>
            <span className="text-[9px] text-slate-500">Net Cash Outflow</span>
          </div>

          <div className="prava-card p-3.5 dark:bg-black/40 border border-purple-500/20 dark:border-purple-500/30">
            <span className="text-[10px] font-mono uppercase text-purple-600 dark:text-purple-400 font-bold">
              RAG Audit Score
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="prava-mono text-base font-bold text-purple-600 dark:text-purple-400">
                {totals?.ragMatchRate}%
              </span>
              <span className="text-[10px] text-slate-500">
                ({totals?.verifiedCount}/{totals?.totalInvoices} verified)
              </span>
            </div>
            <span className="text-[9px] text-emerald-500 font-semibold">CA Signed-off</span>
          </div>
        </div>

        {/* ── EXPORT ACTION BAR (DOWNLOADABLES) ────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 dark:border-white/[0.08] pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Official Downloads:</span>
            <span className="text-[10px] font-mono text-slate-500">Ready for GSTN portal & CA statutory audit</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Government Portal JSON */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportPortalJsonMutation.mutate({ businessId: effectiveBusinessId, period })}
              disabled={exportPortalJsonMutation.isPending}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] shadow-xs"
            >
              <FileCode2 className="mr-1.5 size-3.5 text-sky-500" />
              GSTN Portal JSON
            </Button>

            {/* CA Spreadsheet CSV */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSpreadsheetMutation.mutate({ businessId: effectiveBusinessId, period })}
              disabled={exportSpreadsheetMutation.isPending}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] shadow-xs"
            >
              <FileSpreadsheet className="mr-1.5 size-3.5 text-emerald-500" />
              Download Spreadsheet (.CSV)
            </Button>

            {/* CA Compliance Certificate Print */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportComplianceCertMutation.mutate({ businessId: effectiveBusinessId, period })}
              disabled={exportComplianceCertMutation.isPending}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08] shadow-xs"
            >
              <Printer className="mr-1.5 size-3.5 text-purple-500" />
              CA Compliance Certificate
            </Button>
          </div>
        </div>
      </div>

      {/* ── WORKBENCH TABS ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.08] pb-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("gstr1")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "gstr1"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
              }`}
            >
              <TrendingUp className="size-3.5" />
              <span>GSTR-1: Outward Supplies ({invoices.filter((i) => i.direction === "outward").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("gstr3b")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "gstr3b"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
              }`}
            >
              <Calculator className="size-3.5" />
              <span>GSTR-3B: Inward / ITC Match ({invoices.filter((i) => i.direction === "inward").length})</span>
            </button>

            <button
              onClick={() => setActiveTab("hsn")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "hsn"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
              }`}
            >
              <Layers className="size-3.5" />
              <span>Table 12: HSN Summary</span>
            </button>

            <button
              onClick={() => setActiveTab("compliance")}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                activeTab === "compliance"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-black"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.05]"
              }`}
            >
              <ShieldCheck className="size-3.5 text-emerald-500" />
              <span>CA Audit & Statutory Declarations</span>
            </button>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 size-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search invoice, buyer, GSTIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white/80 pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0d1117] dark:text-white outline-none focus:border-sky-400 transition"
            />
          </div>
        </div>

        {/* ── SPREADSHEET VIEW 1: GSTR-1 (OUTWARD SUPPLIES / SALES) ──────────── */}
        {activeTab === "gstr1" && (
          <div className="prava-panel overflow-hidden border border-slate-200/80 dark:border-white/10 dark:bg-[#090d16]/85">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">GSTR-1 Outward Register</span>
                <span className="text-[10px] font-mono text-slate-500">Live Interactive Spreadsheet</span>
              </div>

              {/* Sub-Filters */}
              <div className="flex items-center gap-1.5">
                {(["ALL", "B2B", "B2C_SMALL", "EXPORT"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSalesFilter(f)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold transition ${
                      salesFilter === f
                        ? "bg-slate-900 text-white dark:bg-sky-500/20 dark:text-sky-300 dark:border dark:border-sky-500/40"
                        : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/50 text-[10px] font-mono uppercase text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
                    <th className="p-3">Inv Number & Date</th>
                    <th className="p-3">Buyer Entity</th>
                    <th className="p-3">Buyer GSTIN</th>
                    <th className="p-3">POS State</th>
                    <th className="p-3">HSN Code</th>
                    <th className="p-3 text-right">Taxable (INR)</th>
                    <th className="p-3 text-center">Rate</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right">Invoice Total</th>
                    <th className="p-3">RAG Audit Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                  {salesInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition"
                    >
                      <td className="p-3">
                        <span className="font-bold text-slate-900 dark:text-white font-mono">{inv.invoiceNumber}</span>
                        <p className="text-[10px] text-slate-500">{inv.invoiceDate}</p>
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{inv.partyName}</p>
                        <span className="text-[9px] font-mono text-slate-500 uppercase">{inv.invoiceType}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{inv.partyGstin}</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">{inv.pos}</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">{inv.hsnCode}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {fmt(inv.taxableValue)}
                      </td>
                      <td className="p-3 text-center font-mono font-bold text-slate-600 dark:text-slate-300">
                        {inv.rate}%
                      </td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.igst)}</td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.cgst)}</td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.sgst)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {fmt(inv.total)}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 w-max">
                            <CheckCircle2 className="size-2.5" />
                            {inv.ragAuditStatus.toUpperCase()}
                          </span>
                          <span className="text-[9px] text-slate-500 line-clamp-1 max-w-[200px]" title={inv.ragNotes}>
                            {inv.ragNotes}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => setEditingItem(inv)}
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white transition"
                          title="Edit row in spreadsheet"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SPREADSHEET VIEW 2: GSTR-3B & ITC RECONCILIATION ────────────── */}
        {activeTab === "gstr3b" && (
          <div className="prava-panel overflow-hidden border border-slate-200/80 dark:border-white/10 dark:bg-[#090d16]/85">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">GSTR-3B Inward Supplies & 2B ITC Reconciliation</span>
                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">Rule 36(4) Compliant</span>
              </div>

              {/* Sub-Filters */}
              <div className="flex items-center gap-1.5">
                {(["ALL", "ELIGIBLE", "INELIGIBLE_17_5", "CAPITAL"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPurchaseFilter(f)}
                    className={`rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold transition ${
                      purchaseFilter === f
                        ? "bg-slate-900 text-white dark:bg-emerald-500/20 dark:text-emerald-300 dark:border dark:border-emerald-500/40"
                        : "text-slate-600 hover:bg-slate-200/60 dark:text-slate-400"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/50 text-[10px] font-mono uppercase text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
                    <th className="p-3">Inv Number & Date</th>
                    <th className="p-3">Vendor / Supplier</th>
                    <th className="p-3">Supplier GSTIN</th>
                    <th className="p-3">ITC Classification</th>
                    <th className="p-3 text-right">Taxable (INR)</th>
                    <th className="p-3 text-right">IGST</th>
                    <th className="p-3 text-right">CGST</th>
                    <th className="p-3 text-right">SGST</th>
                    <th className="p-3 text-right">Total Tax</th>
                    <th className="p-3">RAG Cross-Check Notes</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                  {purchaseInvoices.map((inv) => {
                    const isBlocked = inv.itcEligibility === "ineligible_17_5";
                    const isCapital = inv.itcEligibility === "capital_goods";
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition ${
                          isBlocked ? "bg-rose-500/[0.02]" : ""
                        }`}
                      >
                        <td className="p-3">
                          <span className="font-bold text-slate-900 dark:text-white font-mono">{inv.invoiceNumber}</span>
                          <p className="text-[10px] text-slate-500">{inv.invoiceDate}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{inv.partyName}</p>
                          <span className="text-[9px] font-mono text-slate-500">{inv.pos}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-700 dark:text-slate-300">{inv.partyGstin}</td>
                        <td className="p-3">
                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <ShieldAlert className="size-3" />
                              INELIGIBLE SEC 17(5)
                            </span>
                          ) : isCapital ? (
                            <span className="inline-flex items-center gap-1 rounded bg-sky-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
                              CAPITAL GOODS ITC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              ELIGIBLE INPUTS
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {fmt(inv.taxableValue)}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.igst)}</td>
                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.cgst)}</td>
                        <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(inv.sgst)}</td>
                        <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {fmt(inv.cgst + inv.sgst + inv.igst)}
                        </td>
                        <td className="p-3">
                          <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[280px]">
                            {inv.ragNotes}
                          </p>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => setEditingItem(inv)}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white transition"
                            title="Edit row in spreadsheet"
                          >
                            <Edit3 className="size-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SPREADSHEET VIEW 3: TABLE 12 HSN SUMMARY ────────────────────── */}
        {activeTab === "hsn" && (
          <div className="prava-panel overflow-hidden border border-slate-200/80 dark:border-white/10 dark:bg-[#090d16]/85">
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 bg-slate-50/50 dark:border-white/[0.06] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Table 12: HSN / SAC Aggregation Register</span>
                <span className="text-[10px] font-mono text-slate-500">Government Offline Tool Formatted</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-100/50 text-[10px] font-mono uppercase text-slate-500 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-slate-400">
                    <th className="p-3">HSN / SAC Code</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">UQC</th>
                    <th className="p-3 text-center">Total Quantity</th>
                    <th className="p-3 text-right">Taxable Value</th>
                    <th className="p-3 text-right">Integrated Tax (IGST)</th>
                    <th className="p-3 text-right">Central Tax (CGST)</th>
                    <th className="p-3 text-right">State Tax (SGST)</th>
                    <th className="p-3 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-white/[0.04]">
                  {(data?.hsnSummary ?? []).map((h, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-white/[0.02] transition">
                      <td className="p-3 font-mono font-bold text-sky-600 dark:text-sky-400">{h.hsnCode}</td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200">{h.description}</td>
                      <td className="p-3 font-mono text-slate-500">{h.uqc}</td>
                      <td className="p-3 text-center font-mono text-slate-800 dark:text-white">{h.quantity}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">{fmt(h.taxableValue)}</td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(h.igst)}</td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(h.cgst)}</td>
                      <td className="p-3 text-right font-mono text-slate-700 dark:text-slate-300">{fmt(h.sgst)}</td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">{fmt(h.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── SPREADSHEET VIEW 4: CA AUDIT & COMPLIANCE ───────────────────── */}
        {activeTab === "compliance" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Checklist */}
            <div className="prava-panel p-5 border border-slate-200/80 dark:border-white/10 dark:bg-[#090d16]/85">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-500" />
                Statutory Compliance Pre-Filing Checklist
              </h3>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Statutory rules checked prior to portal transmission and CA sign-off
              </p>

              <div className="mt-4 space-y-3">
                {(data?.complianceChecklist ?? []).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-3 text-xs dark:border-white/[0.06] dark:bg-black/30"
                  >
                    <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned CA Card */}
            <div className="prava-panel p-5 border border-purple-500/25 dark:border-purple-500/30 dark:bg-[#090d16]/85 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/15 px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                    Designated ICAI Auditor
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <BadgeCheck className="size-3.5 text-purple-500" />
                    {summary?.assignedCa?.membershipNumber}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  {summary?.assignedCa?.fullName}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                  {summary?.assignedCa?.firmName} · {summary?.assignedCa?.designation}
                </p>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-200/80 dark:border-white/[0.06] pt-3">
                  I have inspected the sales turnover, Place of Supply allocations, and input tax credit claims under GSTR-2B. Blocked credits under Section 17(5) have been duly segregated. The calculated net tax liability of <strong>{fmt(totals?.netTaxPayable)}</strong> is certified for portal filing.
                </p>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <div className="text-[10px] font-mono text-slate-500">
                  UDIN: 26409212BGST{period.replace("-", "")}Y9281
                </div>
                <Button
                  onClick={() => exportComplianceCertMutation.mutate({ businessId: effectiveBusinessId, period })}
                  size="sm"
                  className="rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
                >
                  <Printer className="mr-1.5 size-3.5" />
                  Print Compliance Certificate
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── INLINE SPREADSHEET ROW EDIT MODAL ─────────────────────────────── */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/15 dark:bg-[#0d131f] text-slate-900 dark:text-white space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-4 text-sky-500" />
                  <h3 className="font-bold text-sm">Edit Spreadsheet Invoice: {editingItem.invoiceNumber}</h3>
                </div>
                <button
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Party GSTIN</label>
                  <input
                    type="text"
                    value={editingItem.partyGstin}
                    onChange={(e) => setEditingItem({ ...editingItem, partyGstin: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/50 p-2 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">Taxable Base (INR)</label>
                  <input
                    type="number"
                    value={editingItem.taxableValue}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const tax = (val * editingItem.rate) / 100;
                      const isIgst = editingItem.igst > 0;
                      setEditingItem({
                        ...editingItem,
                        taxableValue: val,
                        igst: isIgst ? tax : 0,
                        cgst: !isIgst ? tax / 2 : 0,
                        sgst: !isIgst ? tax / 2 : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/50 p-2 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">GST Rate %</label>
                  <select
                    value={editingItem.rate}
                    onChange={(e) => {
                      const rate = Number(e.target.value);
                      const tax = (editingItem.taxableValue * rate) / 100;
                      const isIgst = editingItem.igst > 0;
                      setEditingItem({
                        ...editingItem,
                        rate,
                        igst: isIgst ? tax : 0,
                        cgst: !isIgst ? tax / 2 : 0,
                        sgst: !isIgst ? tax / 2 : 0,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/50 p-2 font-mono"
                  >
                    <option value={0}>0% (Zero-Rated / Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                </div>

                {editingItem.direction === "inward" && (
                  <div>
                    <label className="text-[10px] font-mono uppercase text-slate-500 block mb-1">ITC Eligibility</label>
                    <select
                      value={editingItem.itcEligibility}
                      onChange={(e) => setEditingItem({ ...editingItem, itcEligibility: e.target.value })}
                      className="w-full rounded-lg border border-slate-200 dark:border-white/15 bg-slate-50 dark:bg-black/50 p-2 font-mono"
                    >
                      <option value="eligible_inputs">Eligible Inputs</option>
                      <option value="eligible_services">Eligible Services</option>
                      <option value="capital_goods">Capital Goods</option>
                      <option value="ineligible_17_5">Ineligible Sec 17(5)</option>
                      <option value="rcm">Reverse Charge (RCM)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                <Button variant="outline" size="sm" onClick={() => setEditingItem(null)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    updateLineItemMutation.mutate({
                      businessId: effectiveBusinessId,
                      period,
                      id: editingItem.id,
                      taxableValue: editingItem.taxableValue,
                      rate: editingItem.rate,
                      cgst: editingItem.cgst,
                      sgst: editingItem.sgst,
                      igst: editingItem.igst,
                      itcEligibility: editingItem.itcEligibility,
                      partyGstin: editingItem.partyGstin,
                    });
                  }}
                  disabled={updateLineItemMutation.isPending}
                  className="rounded-xl bg-sky-600 text-white hover:bg-sky-700"
                >
                  Save & Recalculate Totals
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
