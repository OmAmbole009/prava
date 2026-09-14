import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, FileSearch, Loader2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type Draft = {
  vendorName: string;
  gstin: string;
  invoiceNumber: string;
  invoiceDate: string;
  taxableValue: string;
  cgst: string;
  sgst: string;
  igst: string;
  total: string;
  placeOfSupply: string;
  invoiceType: "sales" | "purchase" | "unknown";
};

function rupeeText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : (value / 100).toFixed(2);
}
function isoDate(value: Date | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : "";
}

export default function DocumentReview() {
  const [, params] = useRoute("/documents/:documentId");
  const [, setLocation] = useLocation();
  const documentId = Number(params?.documentId ?? 0);
  const detail = trpc.documents.get.useQuery({ documentId }, { enabled: documentId > 0, retry: false });
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const currency = business?.currency ?? "USD";
  const [draft, setDraft] = useState<Draft | null>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!detail.data?.extraction) return;
    const extraction = detail.data.extraction;
    setDraft({
      vendorName: extraction.vendorName ?? "",
      gstin: extraction.gstin ?? "",
      invoiceNumber: extraction.invoiceNumber ?? "",
      invoiceDate: isoDate(extraction.invoiceDate),
      taxableValue: rupeeText(extraction.taxableValueMinor),
      cgst: rupeeText(extraction.cgstMinor),
      sgst: rupeeText(extraction.sgstMinor),
      igst: rupeeText(extraction.igstMinor),
      total: rupeeText(extraction.totalMinor),
      placeOfSupply: extraction.placeOfSupply ?? "",
      invoiceType:
        extraction.invoiceType === "sales" || extraction.invoiceType === "purchase"
          ? extraction.invoiceType
          : "unknown",
    });
  }, [detail.data?.document.id]);

  const review = trpc.documents.review.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.extraction?.status === "extracted"
          ? "Document approved and recorded in the audit trail."
          : "Corrections saved for further review."
      );
      utils.documents.get.invalidate({ documentId });
      if (data.document.taskId) utils.tasks.get.invalidate({ taskId: data.document.taskId });
      utils.actions.list.invalidate({ businessId: data.document.businessId });
    },
    onError: (error) => toast.error(error.message),
  });

  if (detail.isLoading || !draft)
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 size-4 animate-spin text-slate-700 dark:text-white" />
          Loading source record…
        </div>
      </DashboardLayout>
    );
  if (detail.error || !detail.data || !detail.data.extraction)
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-slate-900 dark:text-white">
          <AlertCircle className="size-5 text-red-500 dark:text-red-400" />
          <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-lg font-bold">This source record cannot be reviewed.</h1>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
            {detail.error?.message ?? "The record does not have an invoice extraction."}
          </p>
          <Button
            className="mt-5 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            onClick={() => setLocation("/tasks")}
          >
            Back to Workflows
          </Button>
        </div>
      </DashboardLayout>
    );

  const { document, extraction, sourceUrl } = detail.data;
  let reviewReasons: string[] = [];
  try {
    reviewReasons = (JSON.parse(extraction.extractedData) as { reviewReasons?: string[] }).reviewReasons ?? [];
  } catch {
    reviewReasons = ["Extraction metadata could not be read."];
  }
  const submit = (decision: "approve" | "save_for_review") =>
    review.mutate({ documentId, decision, ...draft });
  const returnPath = document.taskId ? `/tasks/${document.taskId}` : "/tasks";
  const field = (
    key: keyof Pick<
      Draft,
      | "vendorName"
      | "gstin"
      | "invoiceNumber"
      | "invoiceDate"
      | "taxableValue"
      | "cgst"
      | "sgst"
      | "igst"
      | "total"
      | "placeOfSupply"
    >,
    label: string,
    type = "text"
  ) => (
    <div className="grid gap-2">
      <Label htmlFor={key} className="text-xs text-slate-700 dark:text-slate-300">
        {label}
      </Label>
      <Input
        id={key}
        type={type}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        className="border-slate-200 bg-white text-xs text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#0A0F16] dark:text-white"
      />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        <button
          onClick={() => setLocation(returnPath)}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white hover:underline"
        >
          <ArrowLeft className="size-4" />
          Return to Workflow
        </button>

        <header className="flex flex-col gap-5 border-b border-slate-200/80 dark:border-white/[0.06] pb-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="prava-tag">Document Verification</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Verify source data <em className="italic font-normal">before it becomes trusted</em>.
            </h1>
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Corrections are logged in the audit trail. Approval requires consistent totals and required tax fields.
            </p>
          </div>
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white/80 px-4 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            <ExternalLink className="mr-2 size-4 text-slate-700 dark:text-white" />
            Open original
          </a>
        </header>

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="prava-panel p-6 shadow-md space-y-5">
            <div className="flex items-center gap-3">
              <FileSearch className="size-5 text-slate-700 dark:text-white" />
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Review Context</p>
                <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{document.originalName}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/[0.06] dark:bg-[#0A0F16]">
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Status</p>
              <p className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-white">{document.status.replaceAll("_", " ")}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Extraction confidence:{" "}
                {extraction.confidenceBps ? `${(extraction.confidenceBps / 100).toFixed(0)}%` : "not assessed"}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Review Reasons</p>
              <div className="mt-3 space-y-2">
                {reviewReasons.length ? (
                  reviewReasons.map((reason) => (
                    <div
                      key={reason}
                      className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-5 text-amber-600 dark:text-amber-400"
                    >
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

            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-slate-700 dark:border-white/[0.06] dark:bg-[#0A0F16] dark:text-slate-300">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
                Review Boundary
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">
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
              <Label className="text-xs text-slate-700 dark:text-slate-300">Invoice Direction</Label>
              <Select
                value={draft.invoiceType}
                onValueChange={(value) => setDraft({ ...draft, invoiceType: value as Draft["invoiceType"] })}
              >
                <SelectTrigger className="border-slate-200 bg-white text-xs text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#0A0F16] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-900 shadow-xl dark:border-white/10 dark:bg-[#0D131A] dark:text-white">
                  <SelectItem value="sales">Sales Invoice</SelectItem>
                  <SelectItem value="purchase">Purchase Invoice</SelectItem>
                  <SelectItem value="unknown">Needs Classification</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-slate-200/80 dark:border-white/[0.06] pt-5 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                disabled={review.isPending}
                onClick={() => submit("save_for_review")}
                className="rounded-xl border-slate-300 bg-white/80 text-xs text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              >
                <Save className="mr-2 size-4 text-sky-500 dark:text-sky-400" />
                Save Corrections for Review
              </Button>
              <Button
                disabled={review.isPending}
                onClick={() => submit("approve")}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              >
                <CheckCircle2 className="mr-2 size-4" />
                {review.isPending ? "Saving…" : "Approve validated document"}
              </Button>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
