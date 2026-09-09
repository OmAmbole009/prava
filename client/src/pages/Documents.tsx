import DashboardLayout from "@/components/DashboardLayout";
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
          ? "Document extracted successfully. Verify the fields to confirm."
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
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[#dfd6c4] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-kicker">Document Intelligence</span>
            <h1 className="prava-display mt-2 text-4xl text-[#153832]">
              Invoices, bills, receipts, and statements in one place.
            </h1>
            <p className="mt-2 text-sm text-[#65766e]">
              Prava extracts vendor names, tax IDs, line items, and totals. Review and approve each document to turn it into trusted business records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={uploadDocType}
              onValueChange={(val: any) => setUploadDocType(val)}
            >
              <SelectTrigger className="w-36 rounded-full border-[#d8ceb9] bg-[#fffdf8] text-xs font-semibold text-[#24473e]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invoice">Sales Invoice</SelectItem>
                <SelectItem value="credit_note">Credit Note</SelectItem>
                <SelectItem value="debit_note">Debit Note</SelectItem>
                <SelectItem value="bank_statement">Bank Statement</SelectItem>
              </SelectContent>
            </Select>

            <Label
              htmlFor="upload-doc-file"
              className="inline-flex h-10 cursor-pointer items-center rounded-full bg-[#163a34] px-5 text-sm font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
            >
              <FileUp className="mr-2 size-4" />
              {upload.isPending ? "Extracting…" : "Upload Document"}
            </Label>
            <input
              id="upload-doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              disabled={upload.isPending}
              onChange={onFile}
              className="sr-only"
            />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#8b9c93]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vendor, invoice #, or file name..."
              className="rounded-full border-[#d8ceb9] bg-[#fffdf8] pl-10 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={typeFilter} onValueChange={(val: any) => setTypeFilter(val)}>
              <SelectTrigger className="w-36 rounded-full border-[#d8ceb9] bg-[#fffdf8] text-xs font-medium text-[#2d5044]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Document Types</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="receipt">Bills & Receipts</SelectItem>
                <SelectItem value="bank_statement">Bank Statements</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-36 rounded-full border-[#d8ceb9] bg-[#fffdf8] text-xs font-medium text-[#2d5044]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="extracted">Extracted & Verified</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="uploaded">Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Documents Grid / Table */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          {docsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#708078]">
              <Loader2 className="mr-2 size-4 animate-spin text-[#62856f]" />
              Loading documents…
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-[#eee8dc] text-[#557b6d]">
                <FileSearch className="size-6" />
              </div>
              <p className="mt-4 text-sm font-semibold text-[#27473f]">
                No documents match your filters.
              </p>
              <p className="mt-1 text-xs text-[#73827a]">
                Upload your business invoices, bills, or bank statements to begin extraction.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((row) => {
                const doc = row.document;
                const ext = row.extraction;
                const isBank = doc.documentType === "bank_statement";

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col gap-3 rounded-xl border border-[#ece4d6] bg-white p-4 transition hover:border-[#a9c1b3] hover:bg-[#faf7ef] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#e5efe1] text-[#244f3f]">
                        {isBank ? <Landmark className="size-5" /> : <FileText className="size-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-bold text-[#1a3d34]">
                            {ext?.vendorName || doc.originalName}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              doc.status === "extracted"
                                ? "bg-[#e5efe1] text-[#2c5847]"
                                : doc.status === "needs_review"
                                ? "bg-[#fae7d4] text-[#8e4c19]"
                                : "bg-[#eee8dc] text-[#697972]"
                            }`}
                          >
                            {doc.status === "extracted"
                              ? "Verified"
                              : doc.status.replaceAll("_", " ")}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-[#708078]">
                          {ext?.invoiceNumber ? `Invoice #${ext.invoiceNumber} · ` : ""}
                          {doc.originalName} · Uploaded{" "}
                          {new Date(doc.createdAt).toLocaleDateString()}
                        </p>

                        {ext?.status === "needs_review" && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#9c591c]">
                            <AlertCircle className="size-3.5 shrink-0" />
                            <span>Needs your verification before financial calculations</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      {ext?.totalMinor !== undefined && ext?.totalMinor !== null && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-[#163a34]">
                            {fmt(ext.totalMinor)}
                          </p>
                          <p className="text-[10px] text-[#718279] uppercase font-semibold">
                            {ext.invoiceType || "Document"}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {ext ? (
                          <Button
                            size="sm"
                            onClick={() => setLocation(`/documents/${doc.id}`)}
                            className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
                          >
                            <FileCheck className="mr-1.5 size-3.5" />
                            Review & Verify
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setLocation(`/documents/${doc.id}`)}
                            className="rounded-full text-xs font-semibold"
                          >
                            View Details
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
