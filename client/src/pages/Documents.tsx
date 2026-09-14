import DashboardLayout from "@/components/DashboardLayout";
import { AnimatedList, AnimatedRow, AnimatedSection, FadeInView } from "@/components/AnimatedPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileCheck,
  FileSearch,
  FileText,
  FileUp,
  Filter,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type DocType = "all" | "invoice" | "receipt" | "bank_statement";
type StatusFilter = "all" | "extracted" | "needs_review" | "uploaded";

function fileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

export default function Documents() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";
  const fmt = (minor: number) => formatMinorAmount(minor, currency, locale);

  const docsQuery = trpc.documents.list.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocType>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [uploadDocType, setUploadDocType] = useState<
    "invoice" | "credit_note" | "debit_note" | "bank_statement"
  >("invoice");

  const upload = trpc.documents.upload.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === "extracted"
          ? "Document extracted successfully. Double-entry ledger generated."
          : "Document uploaded and flagged for review."
      );
      docsQuery.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !businessId) return;

    if (
      !["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      toast.error("Please upload a PDF, JPG, PNG, or WebP document.");
      return;
    }

    try {
      upload.mutate({
        businessId,
        originalName: file.name,
        mimeType: file.type as any,
        documentType: uploadDocType,
        base64: await fileBase64(file),
      });
    } catch {
      toast.error("The selected file could not be read.");
    }
    event.target.value = "";
  };

  const rawDocs = docsQuery.data ?? [];

  const filteredDocs = rawDocs.filter((row) => {
    const nameMatch =
      row.document.originalName.toLowerCase().includes(search.toLowerCase()) ||
      (row.extraction?.vendorName &&
        row.extraction.vendorName.toLowerCase().includes(search.toLowerCase())) ||
      (row.extraction?.invoiceNumber &&
        row.extraction.invoiceNumber.toLowerCase().includes(search.toLowerCase()));

    const typeMatch =
      typeFilter === "all" ||
      row.document.documentType === typeFilter ||
      (typeFilter === "invoice" && row.document.documentType === "invoice") ||
      (typeFilter === "receipt" &&
        (row.document.documentType === "receipt" ||
          row.extraction?.invoiceType === "purchase"));

    const statusMatch =
      statusFilter === "all" || row.document.status === statusFilter;

    return nameMatch && typeMatch && statusMatch;
  });

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag">Document Intelligence Vault</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Documents, Invoices & <em className="italic font-normal">Source Evidence</em>
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              Automated OCR ingestion for PDFs, receipts, and bank statements linked directly to your active ledger.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava about Docs
            </Button>
          </div>
        </div>

        {/* Upload Station Dropzone */}
        <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Drop or Select Document for Ingestion</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Instant extraction of vendor names, tax IDs (GSTIN), invoice numbers, and line-item totals.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Label htmlFor="doc-type" className="text-xs text-slate-700 dark:text-slate-300">Type:</Label>
                <select
                  id="doc-type"
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value as any)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
                >
                  <option value="invoice">Supplier / Sales Invoice</option>
                  <option value="receipt">Expense Receipt</option>
                  <option value="credit_note">Credit Note</option>
                  <option value="bank_statement">Bank Statement</option>
                </select>
              </div>

              <Label
                htmlFor="file-upload"
                className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 cursor-pointer ${
                  upload.isPending ? "opacity-50 pointer-events-none" : ""
                }`}
              >
                {upload.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Extracting…
                  </>
                ) : (
                  <>
                    <FileUp className="size-4" />
                    Upload File
                  </>
                )}
              </Label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={onFile}
                disabled={upload.isPending}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor, invoice number, or file name…"
              className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:border-slate-400 dark:border-white/10 dark:bg-[#0D131A] dark:text-white dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as DocType)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
            >
              <option value="all">All Document Types</option>
              <option value="invoice">Invoices</option>
              <option value="receipt">Receipts</option>
              <option value="bank_statement">Bank Statements</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="extracted">Extracted & Linked</option>
              <option value="needs_review">Needs Review</option>
              <option value="uploaded">Uploaded</option>
            </select>
          </div>
        </div>

        {/* Documents Table */}
        <div className="prava-panel overflow-hidden">
          {docsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="mr-2 size-4 animate-spin text-slate-700 dark:text-white" />
              Loading documents vault…
            </div>
          ) : filteredDocs.length > 0 ? (
            <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06]">
              {filteredDocs.map((row) => {
                const doc = row.document;
                const ext = row.extraction;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setLocation(`/documents/${doc.id}`)}
                    className="flex cursor-pointer items-center justify-between p-4 transition hover:bg-slate-50 dark:hover:bg-white/[0.03] text-xs"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/[0.05] dark:text-white">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white truncate max-w-sm">
                            {ext?.vendorName || doc.originalName}
                          </p>
                          {ext?.invoiceNumber && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-700 dark:bg-white/[0.08] dark:text-slate-300">
                              #{ext.invoiceNumber}
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                          {doc.documentType.toUpperCase()} · Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {ext?.totalMinor !== undefined && ext?.totalMinor !== null && (
                        <div className="text-right">
                          <p className="prava-mono font-bold text-slate-900 dark:text-white">
                            {fmt(ext.totalMinor)}
                          </p>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">Total Amount</span>
                        </div>
                      )}

                      <div className="text-right">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 font-mono text-[10px] font-bold ${
                            doc.status === "extracted"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                          }`}
                        >
                          {doc.status.toUpperCase()}
                        </span>
                      </div>

                      <ExternalLink className="size-4 text-slate-400" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 dark:text-slate-400">
              <FileSearch className="mx-auto size-8 text-slate-400 mb-2" />
              No documents matched the selected filters.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
