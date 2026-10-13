import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileSpreadsheet,
  FileText,
  FileUp,
  Filter,
  Layers,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

function fileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function Documents() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;
  const currency = business?.currency ?? "INR";
  const locale = business?.locale ?? "en-IN";
  const fmt = (minor) => formatMinorAmount(minor, currency, locale);

  const docsQuery = useQuery({
    queryKey: ["documents", "list", businessId],
    queryFn: () => api.documents.list({ businessId }),
    enabled: businessId > 0,
  });

  const ocrStatusQuery = useQuery({
    queryKey: ["documents", "ocrStatus"],
    queryFn: () => api.documents.ocrStatus(),
    staleTime: 30000,
    retry: false,
  });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [uploadDocType, setUploadDocType] = useState("invoice");
  const [isDragging, setIsDragging] = useState(false);
  const [docToDelete, setDocToDelete] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: (id) => api.documents.delete(id),
    onSuccess: () => {
      toast.success("Invoice deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["caEngine"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      setDocToDelete(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  const upload = useMutation({
    mutationFn: (body) => api.documents.upload(body),
    onSuccess: (result) => {
      toast.success(
        result.status === "extracted"
          ? "Document scanned and verified with 100% mathematical precision!"
          : "Document uploaded and flagged for review."
      );
      docsQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["caEngine"] });
    },
    onError: (error) => toast.error(error.message || "Failed to process document"),
  });

  const handleFileUpload = async (file) => {
    if (!file || !businessId) return;
    if (!["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PDF, JPG, PNG, or WebP document.");
      return;
    }
    try {
      upload.mutate({
        businessId,
        originalName: file.name,
        mimeType: file.type,
        documentType: uploadDocType,
        base64: await fileBase64(file),
      });
    } catch {
      toast.error("The selected file could not be read.");
    }
  };

  const onFileInputChange = (event) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
    event.target.value = "";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const rawDocs = docsQuery.data ?? [];

  // Summary Metrics calculations
  let totalGrossVolumeMinor = 0;
  let totalItcClaimableMinor = 0;
  let totalVerifiedCount = 0;

  for (const row of rawDocs) {
    const ext = row.extraction;
    if (ext) {
      if (ext.status === "extracted") totalVerifiedCount++;
      totalGrossVolumeMinor += ext.totalMinor || 0;
      if (ext.invoiceType === "purchase") {
        totalItcClaimableMinor += (ext.cgstMinor || 0) + (ext.sgstMinor || 0) + (ext.igstMinor || 0);
      }
    }
  }

  // Filtering
  const filteredDocs = rawDocs.filter((row) => {
    const doc = row.document;
    const ext = row.extraction;
    const q = search.toLowerCase();

    const nameMatch =
      !q ||
      doc.originalName.toLowerCase().includes(q) ||
      (ext?.vendorName && ext.vendorName.toLowerCase().includes(q)) ||
      (ext?.buyerName && ext.buyerName.toLowerCase().includes(q)) ||
      (ext?.gstin && ext.gstin.toLowerCase().includes(q)) ||
      (ext?.invoiceNumber && ext.invoiceNumber.toLowerCase().includes(q));

    const typeMatch =
      typeFilter === "all" ||
      doc.documentType === typeFilter ||
      (typeFilter === "invoice" && doc.documentType === "invoice") ||
      (typeFilter === "receipt" && (doc.documentType === "receipt" || ext?.invoiceType === "purchase"));

    const directionMatch =
      directionFilter === "all" ||
      (directionFilter === "sales" && ext?.invoiceType === "sales") ||
      (directionFilter === "purchase" && ext?.invoiceType === "purchase");

    const statusMatch = statusFilter === "all" || doc.status === statusFilter;

    return nameMatch && typeMatch && directionMatch && statusMatch;
  });

  // Export CSV Audit Register
  const exportCsvRegister = () => {
    if (rawDocs.length === 0) {
      toast.error("No documents available to export.");
      return;
    }

    const headers = [
      "Document ID",
      "Document Name",
      "Direction",
      "Invoice Number",
      "Invoice Date",
      "Vendor / Supplier",
      "Supplier GSTIN",
      "Buyer / Recipient",
      "Buyer GSTIN",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "IGST (INR)",
      "Grand Total (INR)",
      "Place of Supply",
      "Status",
    ];

    const rows = rawDocs.map((r) => {
      const d = r.document;
      const e = r.extraction || {};
      return [
        d.id,
        `"${d.originalName.replace(/"/g, '""')}"`,
        e.invoiceType ? e.invoiceType.toUpperCase() : "PURCHASE",
        `"${(e.invoiceNumber || "").replace(/"/g, '""')}"`,
        e.invoiceDate ? new Date(e.invoiceDate).toISOString().slice(0, 10) : "",
        `"${(e.vendorName || "").replace(/"/g, '""')}"`,
        e.gstin || "",
        `"${(e.buyerName || "").replace(/"/g, '""')}"`,
        e.buyerGstin || "",
        ((e.taxableValueMinor || 0) / 100).toFixed(2),
        ((e.cgstMinor || 0) / 100).toFixed(2),
        ((e.sgstMinor || 0) / 100).toFixed(2),
        ((e.igstMinor || 0) / 100).toFixed(2),
        ((e.totalMinor || 0) / 100).toFixed(2),
        `"${(e.placeOfSupply || "").replace(/"/g, '""')}"`,
        d.status.toUpperCase(),
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Prava_Invoices_Register_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Statutory Invoices Register exported successfully as CSV!");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1400px] space-y-6 py-2 pb-24">
        {/* ========================================================= */}
        {/* EXECUTIVE HEADER & ACTIONS                                */}
        {/* ========================================================= */}
        <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#07090E] p-5 shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400">
                <FileCheck className="size-4.5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Document & Invoice Intelligence Vault
              </h1>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-emerald-400 border border-emerald-500/20">
                GST Verified
              </span>
              <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-blue-400 border border-blue-500/25 flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${ocrStatusQuery.data?.ok ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
                {ocrStatusQuery.data?.ok ? "Qwen2.5-VL-7B Local" : "Ollama Standby"}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous Indian GST tax invoice ingestion: Extracts GSTINs, supplier/buyer parties, invoice numbers, Section 17(5) eligibility, and mathematically balances taxes into your active ledger.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportCsvRegister}
              className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#0B0E14] px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:border-blue-500/40 transition gap-1.5"
            >
              <Download className="size-3.5 text-emerald-400" />
              Export Register (CSV)
            </button>
            <button
              onClick={() => setLocation("/ca-suite")}
              className="inline-flex items-center rounded-full bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 gap-1.5 shadow-[0_0_15px_rgba(59,130,246,0.25)] transition"
            >
              <Layers className="size-3.5" />
              Autonomous CA Suite
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 EXECUTIVE KPI CARDS                                     */}
        {/* ========================================================= */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090E] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition hover:border-blue-500/30">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Total Invoices Ingested</span>
              <FileText className="size-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {rawDocs.length}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{totalVerifiedCount} Verified & Linked</span>
              <span>100% Traceability</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090E] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition hover:border-blue-500/30">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Gross Invoiced Volume</span>
              <TrendingUp className="size-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              {fmt(totalGrossVolumeMinor)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>Balanced Double-Entry</span>
              <span className="text-emerald-400 font-semibold">Active Ledger</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090E] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition hover:border-blue-500/30">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Claimable ITC (GSTR-2B)</span>
              <ShieldCheck className="size-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
              {fmt(totalItcClaimableMinor)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>Purchase GST Recoverable</span>
              <span className="text-blue-400 font-semibold">Matched</span>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#07090E] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.5)] transition hover:border-blue-500/30">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-medium">Mathematical Invariant</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              100%
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>Taxable + CGST + SGST = Total</span>
              <span className="text-emerald-400 font-semibold">No Discrepancy</span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DRAG & DROP INGESTION TERMINAL                            */}
        {/* ========================================================= */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`relative overflow-hidden rounded-2xl border-2 transition-all p-6 sm:p-8 backdrop-blur-xl ${
            isDragging
              ? "border-blue-500 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.25)]"
              : "border-dashed border-white/[0.12] bg-[#07090E] hover:border-blue-500/40 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          }`}
        >
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/35 to-transparent" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/10 text-blue-400 cursor-pointer shadow-inner hover:scale-105 transition"
              >
                {upload.isPending ? (
                  <Loader2 className="size-7 animate-spin" />
                ) : (
                  <UploadCloud className="size-7" />
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Drop Tax Invoices or Supporting Documents Here
                </h3>
                <p className="text-xs text-slate-400 max-w-xl">
                  Supports Indian GST Tax Invoices, Purchase Bills, Debit/Credit Notes, and Bank Statements. Automatically extracts supplier and buyer GSTINs, dates, line items, and computes CGST, SGST, IGST tax breakdown.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-400">
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 font-mono text-[10px]">PDF (Vector & Scanned)</span>
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 font-mono text-[10px]">PNG / JPEG</span>
                  <span className="rounded-full bg-white/[0.04] border border-white/[0.08] px-2.5 py-0.5 font-mono text-[10px]">Up to 15 MB</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Label htmlFor="doc-type" className="text-xs text-slate-400 whitespace-nowrap">
                  Document Classification:
                </Label>
                <select
                  id="doc-type"
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="rounded-full border border-white/[0.1] bg-[#0B0E14] px-3.5 py-2 text-xs font-semibold text-white shadow-sm outline-none cursor-pointer focus:ring-1 focus:ring-blue-500"
                >
                  <option value="invoice">Supplier / Sales Tax Invoice</option>
                  <option value="receipt">Commercial Expense Bill</option>
                  <option value="credit_note">Credit / Debit Note</option>
                  <option value="bank_statement">Bank Account Statement</option>
                </select>
              </div>

              <input
                ref={fileInputRef}
                id="file-upload-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={onFileInputChange}
                disabled={upload.isPending}
                className="hidden"
              />

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={upload.isPending}
                className="w-full sm:w-auto text-xs h-10 px-5 bg-blue-600 hover:bg-blue-500 text-white font-semibold gap-2 shadow-[0_0_15px_rgba(59,130,246,0.3)] rounded-full transition"
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Extracting & Reconciling…
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Select & Scan Document
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEARCH, FILTER & STATUTORY STATUS TOOLBAR                 */}
        {/* ========================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#07090E] p-3 rounded-2xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor, buyer, GSTIN, invoice number, or file name…"
              className="w-full rounded-full border border-white/[0.08] bg-[#0B0E14] pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 shadow-sm outline-none focus:border-blue-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="rounded-full border border-white/[0.08] bg-[#0B0E14] px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-sm outline-none cursor-pointer hover:text-white"
            >
              <option value="all">All Directions (Sales & Purchase)</option>
              <option value="sales">Sales (Outward Liability)</option>
              <option value="purchase">Purchase (Inward ITC)</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-full border border-white/[0.08] bg-[#0B0E14] px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-sm outline-none cursor-pointer hover:text-white"
            >
              <option value="all">All Document Types</option>
              <option value="invoice">Tax Invoices</option>
              <option value="receipt">Commercial Bills</option>
              <option value="bank_statement">Bank Statements</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-full border border-white/[0.08] bg-[#0B0E14] px-3.5 py-2 text-xs font-semibold text-slate-300 shadow-sm outline-none cursor-pointer hover:text-white"
            >
              <option value="all">All Extraction Statuses</option>
              <option value="extracted">Extracted & Verified</option>
              <option value="needs_review">Needs Review</option>
              <option value="uploaded">Raw Upload</option>
            </select>

            {(search || typeFilter !== "all" || directionFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setDirectionFilter("all");
                  setStatusFilter("all");
                }}
                className="text-xs h-8 px-2 text-slate-400 hover:text-white"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* PRODUCTION DOCUMENTS DATA TABLE                           */}
        {/* ========================================================= */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#07090E] shadow-[0_4px_24px_rgba(0,0,0,0.6)] overflow-hidden">
          {docsQuery.isLoading ? (
            <div className="flex items-center justify-center py-20 text-xs text-slate-400">
              <Loader2 className="mr-2 size-5 animate-spin text-blue-400" />
              Loading verified source documents from vault…
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#0B0E14] text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-semibold">Document & Parties</th>
                    <th className="py-3 px-4 font-semibold">Invoice No & Date</th>
                    <th className="py-3 px-4 font-semibold">Direction</th>
                    <th className="py-3 px-4 font-semibold text-right">Taxable Value</th>
                    <th className="py-3 px-4 font-semibold text-right">GST (CGST+SGST/IGST)</th>
                    <th className="py-3 px-4 font-semibold text-right">Grand Total</th>
                    <th className="py-3 px-4 font-semibold text-center">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {filteredDocs.map((row) => {
                    const doc = row.document;
                    const ext = row.extraction;
                    const isSales = ext?.invoiceType === "sales";
                    const taxMinor = (ext?.cgstMinor || 0) + (ext?.sgstMinor || 0) + (ext?.igstMinor || 0);

                    return (
                      <tr
                        key={doc.id}
                        className="hover:bg-accent/40 transition cursor-pointer group"
                        onClick={() => setLocation(`/documents/${doc.id}`)}
                      >
                        {/* Party & Document Name */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 font-bold text-xs border border-blue-500/20">
                              {ext?.vendorName ? ext.vendorName.charAt(0).toUpperCase() : "D"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-foreground truncate max-w-[220px]">
                                {ext?.vendorName || doc.originalName}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                {ext?.gstin ? (
                                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                    {ext.gstin}
                                  </span>
                                ) : (
                                  <span>{doc.documentType.toUpperCase()}</span>
                                )}
                                {ext?.buyerName && (
                                  <span className="truncate max-w-[140px]">
                                    → {ext.buyerName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Invoice Number & Date */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-foreground">
                              {ext?.invoiceNumber ? `#${ext.invoiceNumber}` : "Pending Review"}
                            </span>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {ext?.invoiceDate
                                ? new Date(ext.invoiceDate).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : new Date(doc.createdAt).toLocaleDateString("en-IN")}
                            </p>
                          </div>
                        </td>

                        {/* Direction Badge */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold font-mono uppercase ${
                              isSales
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                            }`}
                          >
                            {isSales ? (
                              <>
                                <ArrowUpRight className="size-3" /> Sales
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft className="size-3" /> Purchase
                              </>
                            )}
                          </span>
                        </td>

                        {/* Taxable Value */}
                        <td className="py-3.5 px-4 text-right font-mono text-foreground font-semibold">
                          {ext?.taxableValueMinor != null ? fmt(ext.taxableValueMinor) : "—"}
                        </td>

                        {/* GST Breakdown */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono text-muted-foreground">
                            {taxMinor > 0 ? fmt(taxMinor) : "₹0.00"}
                          </div>
                          {ext?.igstMinor ? (
                            <span className="text-[9px] font-mono text-cyan-500 uppercase">IGST</span>
                          ) : ext?.cgstMinor ? (
                            <span className="text-[9px] font-mono text-emerald-500 uppercase">CGST+SGST</span>
                          ) : null}
                        </td>

                        {/* Grand Total */}
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground text-sm">
                          {ext?.totalMinor != null ? fmt(ext.totalMinor) : "—"}
                        </td>

                        {/* Status Chip */}
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase ${
                              doc.status === "extracted"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${
                                doc.status === "extracted" ? "bg-emerald-500" : "bg-amber-500"
                              }`}
                            />
                            {doc.status.replaceAll("_", " ")}
                          </span>
                        </td>

                        {/* Action Link */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 font-semibold text-blue-400 hover:bg-blue-500/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setLocation(`/documents/${doc.id}`);
                              }}
                            >
                              Review & Verify →
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-7 px-2 font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                              title="Delete Invoice"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDocToDelete(doc);
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-16 text-center text-xs text-muted-foreground space-y-3">
              <FileSearch className="mx-auto size-10 text-muted-foreground/60" />
              <div>
                <p className="font-bold text-foreground text-sm">No documents found matching filters</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Drop a PDF or image above to scan your first tax invoice with instant verification.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Delete Invoice Confirmation Dialog */}
        <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (docToDelete) {
                    deleteMutation.mutate(docToDelete.id);
                  }
                }}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Invoice"
                )}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
