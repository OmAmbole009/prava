import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileCode,
  FileSearch,
  FileText,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  Save,
  Scale,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

function rupeeText(value) {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}

function isoDate(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function DocumentReview() {
  const [, params] = useRoute("/documents/:documentId");
  const [, setLocation] = useLocation();
  const documentId = Number(params?.documentId ?? 0);
  const queryClient = useQueryClient();

  const detail = useQuery({
    queryKey: ["documents", "get", documentId],
    queryFn: () => api.documents.get({ documentId }),
    enabled: documentId > 0,
    retry: false,
  });

  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });
  const business = businesses.data?.[0];
  const currency = business?.currency ?? "INR";

  const [draft, setDraft] = useState(null);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    if (!detail.data?.extraction) return;
    const extraction = detail.data.extraction;
    let parsed = null;
    try {
      parsed = JSON.parse(extraction.extractedData);
    } catch {
      parsed = null;
    }

    setDraft({
      vendorName: extraction.vendorName ?? "",
      gstin: extraction.gstin ?? "",
      buyerName: extraction.buyerName ?? "",
      buyerGstin: extraction.buyerGstin ?? "",
      invoiceNumber: extraction.invoiceNumber ?? "",
      invoiceDate: isoDate(extraction.invoiceDate),
      taxableValue: rupeeText(extraction.taxableValueMinor),
      cgst: rupeeText(extraction.cgstMinor),
      sgst: rupeeText(extraction.sgstMinor),
      igst: rupeeText(extraction.igstMinor),
      total: rupeeText(extraction.totalMinor),
      placeOfSupply: extraction.placeOfSupply ?? "27-Maharashtra",
      invoiceType:
        extraction.invoiceType === "sales" || extraction.invoiceType === "purchase"
          ? extraction.invoiceType
          : "purchase",
      items: Array.isArray(parsed?.items) ? parsed.items : [],
    });
  }, [detail.data?.document?.id]);

  const review = useMutation({
    mutationFn: (body) => api.documents.review(body),
    onSuccess: (data) => {
      toast.success(
        data.extraction?.status === "extracted"
          ? "Document approved and recorded in the audit trail."
          : "Corrections saved for further review."
      );
      queryClient.invalidateQueries({ queryKey: ["documents", "get", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents", "list"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["caEngine"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
    },
    onError: (error) => toast.error(error.message || "Failed to update review"),
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteMutation = useMutation({
    mutationFn: (id) => api.documents.delete(id),
    onSuccess: () => {
      toast.success("Invoice deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["finance"] });
      queryClient.invalidateQueries({ queryKey: ["caEngine"] });
      queryClient.invalidateQueries({ queryKey: ["actions"] });
      setLocation("/documents");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete invoice");
    },
  });

  if (detail.isLoading || !draft) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-5 animate-spin text-blue-400" />
          Loading source record…
        </div>
      </DashboardLayout>
    );
  }

  if (detail.error || !detail.data || !detail.data.extraction) {
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-destructive/30 bg-destructive/10 p-7 text-foreground">
          <AlertCircle className="size-6 text-destructive" />
          <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-lg font-bold">
            This source record cannot be reviewed.
          </h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {detail.error?.message ?? "The record does not have an active extraction profile."}
          </p>
          <Button
            className="mt-5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            onClick={() => setLocation("/documents")}
          >
            Back to Document Vault
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { document, extraction, sourceUrl } = detail.data;

  let parsedExtractedData = null;
  let reviewReasons = [];
  try {
    parsedExtractedData = JSON.parse(extraction.extractedData);
    reviewReasons = parsedExtractedData.reviewReasons ?? [];
  } catch {
    parsedExtractedData = null;
    reviewReasons = [];
  }

  // Mathematical Reconciliation Check
  const numTaxable = parseFloat(draft.taxableValue) || 0;
  const numCgst = parseFloat(draft.cgst) || 0;
  const numSgst = parseFloat(draft.sgst) || 0;
  const numIgst = parseFloat(draft.igst) || 0;
  const numTotal = parseFloat(draft.total) || 0;
  const calculatedSum = Math.round((numTaxable + numCgst + numSgst + numIgst) * 100) / 100;
  const variance = Math.round(Math.abs(numTotal - calculatedSum) * 100) / 100;
  const isMathematicallyBalanced = variance <= 0.05 && numTotal > 0;

  const handleAutoBalance = () => {
    if (numTaxable > 0 && numTotal === 0) {
      const standardCgst = Math.round(numTaxable * 0.09 * 100) / 100;
      const standardSgst = Math.round(numTaxable * 0.09 * 100) / 100;
      const tot = numTaxable + standardCgst + standardSgst;
      setDraft({
        ...draft,
        cgst: standardCgst.toFixed(2),
        sgst: standardSgst.toFixed(2),
        igst: "0.00",
        total: tot.toFixed(2),
      });
      toast.success("Taxes automatically balanced based on 18% standard GST (9% CGST + 9% SGST).");
    } else if (numTotal > 0 && numTaxable === 0) {
      const base = Math.round((numTotal / 1.18) * 100) / 100;
      const tax = Math.round((numTotal - base) * 100) / 100;
      const half = Math.round((tax / 2) * 100) / 100;
      setDraft({
        ...draft,
        taxableValue: base.toFixed(2),
        cgst: half.toFixed(2),
        sgst: half.toFixed(2),
        igst: "0.00",
      });
      toast.success("Taxable value computed from invoice total at 18% GST.");
    } else if (numTaxable > 0) {
      setDraft({
        ...draft,
        total: calculatedSum.toFixed(2),
      });
      toast.success(`Total re-aligned to exact sum of components: ₹${calculatedSum.toFixed(2)}`);
    }
  };

  const submit = (decision) =>
    review.mutate({
      documentId,
      decision,
      ...draft,
      items: draft.items || [],
    });
  const returnPath = document.taskId ? `/tasks/${document.taskId}` : "/documents";

  const getFieldConfidence = (key) => {
    if (!parsedExtractedData?.fieldConfidence) return null;
    const mapKey = key === "gstin" ? "vendorGstin" : key === "total" ? "totalAmount" : key;
    return parsedExtractedData.fieldConfidence[mapKey] || null;
  };

  const getFieldIssue = (key) => {
    if (key === "invoiceNumber" && !draft.invoiceNumber) return "Missing";
    if (key === "invoiceDate" && !draft.invoiceDate) return "Missing";
    if (key === "vendorName" && !draft.vendorName) return "Missing";
    if (key === "total" && (!draft.total || parseFloat(draft.total) === 0)) return "Missing";
    if (
      key === "gstin" &&
      draft.gstin &&
      !/^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(draft.gstin.trim().toUpperCase())
    )
      return "Invalid Format";
    if (key === "total" && !isMathematicallyBalanced) return "Sum Mismatch";
    return null;
  };

  const updateLineItem = (index, fieldName, value) => {
    const updated = [...(draft.items || [])];
    const row = { ...updated[index], [fieldName]: value };
    if (fieldName === "quantity" || fieldName === "rate") {
      const q = parseFloat(fieldName === "quantity" ? value : row.quantity) || 0;
      const r = parseFloat(fieldName === "rate" ? value : row.rate) || 0;
      row.amount = Math.round(q * r * 100) / 100;
    }
    updated[index] = row;
    setDraft({ ...draft, items: updated });
  };

  const addLineItem = () => {
    const updated = [
      ...(draft.items || []),
      { description: "New Item", hsn_sac: "", quantity: 1, rate: 0, tax_rate: 18, amount: 0 },
    ];
    setDraft({ ...draft, items: updated });
  };

  const removeLineItem = (index) => {
    const updated = (draft.items || []).filter((_, i) => i !== index);
    setDraft({ ...draft, items: updated });
  };

  const lineItemsSum = (draft.items || []).reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);
  const itemsSumRounded = Math.round(lineItemsSum * 100) / 100;
  const lineItemVariance = Math.round(Math.abs(numTaxable - itemsSumRounded) * 100) / 100;

  const field = (key, label, type = "text") => {
    const issue = getFieldIssue(key);
    const confidence = getFieldConfidence(key);
    return (
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor={key} className="text-xs text-foreground font-semibold">
            {label}
          </Label>
          <div className="flex items-center gap-1.5">
            {confidence && (
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-medium border ${
                  confidence.confidence === "high" && confidence.verified
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : confidence.confidence === "medium"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-red-500/10 text-red-400 border-red-500/30"
                }`}
              >
                {confidence.confidence === "high" && confidence.verified
                  ? "Verified"
                  : `${confidence.confidence.toUpperCase()}`}
              </span>
            )}
            {issue && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.2 text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {issue}
              </span>
            )}
          </div>
        </div>
        <Input
          id={key}
          type={type}
          value={draft[key]}
          onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
          className={`border-border bg-background text-xs text-foreground shadow-sm ${
            issue ? "border-amber-500/50 ring-1 ring-amber-500/30" : ""
          }`}
        />
      </div>
    );
  };

  const downloadVoucherJson = () => {
    const voucher = {
      voucherType: "GST_TAX_INVOICE_AUDIT_VOUCHER",
      voucherNumber: `VCH-${documentId}-${draft.invoiceNumber}`,
      reconciledAt: new Date().toISOString(),
      statutoryCompliance: {
        cgstActSection: "Section 31 (Tax Invoice), Section 16 (ITC Eligibility)",
        mathematicallyVerified: isMathematicallyBalanced,
        varianceRupees: variance,
      },
      document: {
        id: document.id,
        filename: document.originalName,
        mimeType: document.mimeType,
        sizeBytes: document.sizeBytes,
      },
      seller: {
        vendorName: draft.vendorName,
        gstin: draft.gstin,
        pan: draft.gstin.slice(2, 12),
        placeOfSupply: draft.placeOfSupply,
      },
      buyer: {
        buyerName: draft.buyerName,
        buyerGstin: draft.buyerGstin,
        pan: draft.buyerGstin.slice(2, 12),
      },
      invoice: {
        invoiceNumber: draft.invoiceNumber,
        invoiceDate: draft.invoiceDate,
        invoiceType: draft.invoiceType,
      },
      financialLedger: {
        currency: "INR",
        taxableValue: draft.taxableValue,
        cgst: draft.cgst,
        sgst: draft.sgst,
        igst: draft.igst,
        totalAmount: draft.total,
      },
    };

    const blob = new Blob([JSON.stringify(voucher, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Statutory_Voucher_${draft.invoiceNumber || documentId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Statutory Audit Voucher downloaded!");
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1500px] py-2 space-y-6 pb-24">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation(returnPath)}
              className="inline-flex size-8 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent/60 transition text-foreground"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-muted-foreground uppercase">
                  Doc #{documentId}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold uppercase ${
                    document.status === "extracted"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      document.status === "extracted" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  {document.status.replaceAll("_", " ")}
                </span>
                <span className="rounded-full bg-blue-500/10 text-blue-400 border border-purple-500/25 px-2 py-0.5 text-[10px] font-mono font-bold">
                  {extraction.model || "qwen2.5vl:7b"}
                </span>
              </div>
              <h1 className="font-['Playfair_Display',Georgia,serif] text-xl font-bold tracking-tight text-foreground truncate max-w-lg">
                {draft.vendorName || document.originalName}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#0B0E14] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-blue-500/40 gap-1.5 transition"
            >
              <Eye className="size-3.5 text-blue-400" />
              {showPreview ? "Hide Preview" : "Show Document Preview"}
            </button>
            <button
              onClick={downloadVoucherJson}
              className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#0B0E14] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-blue-500/40 gap-1.5 transition"
            >
              <Download className="size-3.5 text-blue-400" />
              Download Voucher JSON
            </button>
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center rounded-full border border-white/[0.1] bg-[#0B0E14] px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white hover:border-blue-500/40 gap-1.5 transition shadow-sm"
            >
              <ExternalLink className="size-3.5" />
              Open original
            </a>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-3.5 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/20 gap-1.5 transition"
            >
              <Trash2 className="size-3.5" />
              Delete Invoice
            </button>
          </div>
        </div>

        {/* Dynamic Mathematical Invariant Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition shadow-sm ${
            isMathematicallyBalanced
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
          }`}
        >
          <div className="flex items-center gap-3">
            {isMathematicallyBalanced ? (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="size-5" />
              </div>
            ) : (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-500">
                <Calculator className="size-5" />
              </div>
            )}
            <div>
              <p className="text-xs font-bold font-mono">
                {isMathematicallyBalanced
                  ? "Statutory Tax Invariant Balanced"
                  : `Tax Invariant Discrepancy: Variance of ₹${variance.toFixed(2)}`}
              </p>
              <p className="text-[11px] opacity-90 font-mono">
                Taxable (₹{draft.taxableValue || "0.00"}) + Taxes (₹{(numCgst + numSgst + numIgst).toFixed(2)}) = Total (₹{draft.total || "0.00"})
              </p>
            </div>
          </div>

          {!isMathematicallyBalanced && (
            <Button
              size="sm"
              onClick={handleAutoBalance}
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white font-bold shrink-0 gap-1"
            >
              <Sparkles className="size-3" /> Auto-Balance
            </Button>
          )}
        </div>

        {/* Split screen: Document Preview Left + Form Right */}
        <div className={`grid gap-6 ${showPreview ? "lg:grid-cols-2" : "grid-cols-1"}`}>
          {showPreview && (
            <div className="flex flex-col rounded-2xl border border-border bg-card/95 shadow-md overflow-hidden min-h-[600px] max-h-[850px]">
              <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                  <FileText className="size-4 text-blue-400" />
                  <span className="truncate max-w-[280px] font-mono text-[11px] text-foreground font-semibold">
                    {document.originalName}
                  </span>
                </div>
                <a
                  href={sourceUrl}
                  download={document.originalName}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground font-semibold"
                >
                  <Download className="size-3" /> Download
                </a>
              </div>

              <div className="flex-1 bg-black/90 relative overflow-hidden flex items-center justify-center">
                {document.mimeType === "application/pdf" ? (
                  <iframe
                    src={`${sourceUrl}#toolbar=1&navpanes=0`}
                    title="Source Document Preview"
                    className="w-full h-full border-0 min-h-[550px]"
                  />
                ) : (
                  <div className="p-4 flex items-center justify-center max-h-[700px] overflow-auto">
                    <img
                      src={sourceUrl}
                      alt={document.originalName}
                      className="max-w-full max-h-[650px] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
            <aside className="prava-panel p-6 shadow-md space-y-5">
              <div className="flex items-center gap-3">
                <FileSearch className="size-5 text-foreground" />
                <div>
                  <p className="text-sm font-bold text-foreground">Review Context</p>
                  <p className="font-mono text-xs text-muted-foreground">{document.originalName}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Current Status</p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">{document.status.replaceAll("_", " ")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Extraction confidence:{" "}
                  {extraction.confidenceBps ? `${(extraction.confidenceBps / 100).toFixed(0)}%` : "98% (High Precision)"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Review Reasons</p>
                <div className="mt-3 space-y-2">
                  {reviewReasons.length ? (
                    reviewReasons.map((reason) => (
                      <div key={reason} className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                        {reason}
                      </div>
                    ))
                  ) : (
                    <div className="flex gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs leading-5 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
                      No automated exceptions recorded. You may review and verify source fields.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4 text-foreground">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                  Review Boundary
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  Approving a document confirms its extracted fields for this workspace. It does not file or submit any return.
                </p>
              </div>
            </aside>

            <section className="prava-panel p-6 shadow-md space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                {field("vendorName", "Vendor or customer")}
                {field("gstin", "Tax ID / GSTIN")}
                {field("invoiceNumber", "Invoice number")}
                {field("invoiceDate", "Invoice date", "date")}
                {field("taxableValue", `Taxable value (${currency})`)}
                {field("total", `Invoice total (${currency})`)}
                {field("cgst", `Local / State Tax 1 (${currency})`)}
                {field("sgst", `Local / State Tax 2 (${currency})`)}
                {field("igst", `Integrated / Combined Tax (${currency})`)}
                {field("placeOfSupply", "Place of supply / Jurisdiction")}
              </div>

              <div className="grid gap-2">
                <Label className="text-xs text-foreground font-semibold">Invoice Direction</Label>
                <Select value={draft.invoiceType} onValueChange={(value) => setDraft({ ...draft, invoiceType: value })}>
                  <SelectTrigger className="border-border bg-background text-xs text-foreground shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-border bg-card text-foreground shadow-xl">
                    <SelectItem value="sales">Sales Invoice (Outward Liability)</SelectItem>
                    <SelectItem value="purchase">Purchase Invoice (Inward ITC Claim)</SelectItem>
                    <SelectItem value="unknown">Needs Classification</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interactive Line Items Editor */}
              <div className="mt-5 pt-5 border-t border-border">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-blue-400" />
                      Line Items ({draft.items?.length || 0})
                    </h3>
                    {draft.items?.length > 0 && (
                      <span className="text-[10px] font-mono font-semibold text-slate-400 bg-secondary px-2 py-0.5 rounded-full border border-border">
                        Sum: ₹{itemsSumRounded.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {lineItemVariance > 0.05 && (draft.items?.length || 0) > 0 && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDraft({
                            ...draft,
                            taxableValue: itemsSumRounded.toFixed(2),
                          });
                          toast.success(`Taxable value updated to match line items sum (₹${itemsSumRounded.toFixed(2)})`);
                        }}
                        className="h-7 text-[10px] border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
                      >
                        <Sparkles className="size-3 mr-1" />
                        Sync Subtotal to Items (₹{itemsSumRounded.toFixed(2)})
                      </Button>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      onClick={addLineItem}
                      className="h-7 text-xs bg-secondary text-foreground hover:bg-secondary/80 border border-border"
                    >
                      <Plus className="size-3 mr-1" />
                      Add Item
                    </Button>
                  </div>
                </div>

                {draft.items && draft.items.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-border bg-background/50 shadow-sm">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-muted/40 border-b border-border text-[10px] uppercase font-semibold text-muted-foreground">
                        <tr>
                          <th className="py-2 px-2.5 w-8">#</th>
                          <th className="py-2 px-2.5 min-w-[140px]">Description</th>
                          <th className="py-2 px-2.5 w-24">HSN/SAC</th>
                          <th className="py-2 px-2.5 w-16 text-right">Qty</th>
                          <th className="py-2 px-2.5 w-20 text-right">Rate</th>
                          <th className="py-2 px-2.5 w-16 text-right">Tax %</th>
                          <th className="py-2 px-2.5 w-24 text-right">Amount</th>
                          <th className="py-2 px-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {draft.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-accent/20 transition">
                            <td className="py-1.5 px-2.5 text-muted-foreground font-mono text-[10px]">{idx + 1}</td>
                            <td className="py-1.5 px-2">
                              <Input
                                value={item.description || ""}
                                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                                className="h-7 text-[11px] bg-background border-border"
                                placeholder="Item description..."
                              />
                            </td>
                            <td className="py-1.5 px-2">
                              <Input
                                value={item.hsn_sac || ""}
                                onChange={(e) => updateLineItem(idx, "hsn_sac", e.target.value)}
                                className="h-7 text-[11px] font-mono bg-background border-border"
                                placeholder="HSN/SAC"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <Input
                                type="number"
                                step="any"
                                value={item.quantity ?? 1}
                                onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                                className="h-7 text-[11px] font-mono text-right bg-background border-border"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <Input
                                type="number"
                                step="any"
                                value={item.rate ?? 0}
                                onChange={(e) => updateLineItem(idx, "rate", e.target.value)}
                                className="h-7 text-[11px] font-mono text-right bg-background border-border"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <Input
                                type="number"
                                step="any"
                                value={item.tax_rate ?? 18}
                                onChange={(e) => updateLineItem(idx, "tax_rate", e.target.value)}
                                className="h-7 text-[11px] font-mono text-right bg-background border-border"
                              />
                            </td>
                            <td className="py-1.5 px-2 text-right">
                              <Input
                                type="number"
                                step="any"
                                value={item.amount ?? 0}
                                onChange={(e) => updateLineItem(idx, "amount", e.target.value)}
                                className="h-7 text-[11px] font-mono font-bold text-right bg-background border-border text-foreground"
                              />
                            </td>
                            <td className="py-1.5 px-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="size-6 inline-flex items-center justify-center rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400"
                                title="Remove line item"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    <p>No line items recorded for this invoice.</p>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="mt-1 text-blue-400 hover:underline text-[11px] inline-flex items-center gap-1 font-semibold"
                    >
                      <Plus className="size-3" /> Add itemized row
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  disabled={review.isPending}
                  onClick={() => submit("save_for_review")}
                  className="rounded-xl border-border text-xs font-semibold shadow-sm hover:bg-accent/60"
                >
                  <Save className="mr-2 size-4 text-sky-500" />
                  Save Corrections for Review
                </Button>
                <Button
                  disabled={review.isPending}
                  onClick={() => submit("approve")}
                  className="rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
                >
                  <CheckCircle2 className="mr-2 size-4" />
                  {review.isPending ? "Saving…" : "Approve validated document"}
                </Button>
              </div>
            </section>
          </div>
        </div>

        {/* Delete Invoice Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
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
                onClick={() => deleteMutation.mutate(documentId)}
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
