import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
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
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Landmark,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRoundCheck,
} from "lucide-react";
import { ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";

type DocumentType = "invoice" | "credit_note" | "debit_note" | "bank_statement";
const optionalRequirements = new Set(["credit_notes", "debit_notes", "bank_transactions"]);

function fileBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.readAsDataURL(file);
  });
}

function StatusPill({ status }: { status: string }) {
  const isGood =
    status === "matched" ||
    status === "complete" ||
    status === "resolved" ||
    status === "approved" ||
    status === "submitted";
  const isPending =
    status === "needs_review" ||
    status === "awaiting_review" ||
    status === "professional_review";

  return (
    <span
      className={`w-fit rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
        isGood
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
          : isPending
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300 border border-slate-200 dark:border-white/10"
      }`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

export default function TaskDetail() {
  const [, params] = useRoute("/tasks/:taskId");
  const [, setLocation] = useLocation();
  const taskId = Number(params?.taskId ?? 0);
  const task = trpc.tasks.get.useQuery({ taskId }, { enabled: taskId > 0, retry: false });
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";
  const taxName = business?.taxSystem ?? "Tax";

  const documents = trpc.documents.list.useQuery(
    { businessId: task.data?.businessId ?? 0, taskId },
    { enabled: !!task.data }
  );
  const reconciliation = trpc.reconciliation.list.useQuery({ taskId }, { enabled: !!task.data });
  const [documentType, setDocumentType] = useState<DocumentType>("invoice");
  const isCashReconciliation = task.data?.type === "cash_reconciliation";
  const selectedDocumentType: DocumentType = isCashReconciliation ? "bank_statement" : documentType;

  const upload = trpc.documents.upload.useMutation({
    onSuccess: (result) => {
      toast.success(
        result.status === "uploaded"
          ? "Bank statement staged as source evidence. No transaction values were inferred."
          : result.status === "extracted"
          ? "Document extracted. Review the result before proceeding."
          : "Document saved for review."
      );
      documents.refetch();
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const prepareGst = trpc.tasks.prepareGst.useMutation({
    onSuccess: () => {
      toast.success(`${taxName} preparation updated. Review required items before any next step.`);
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const prepareCash = trpc.tasks.prepareCashReconciliation.useMutation({
    onSuccess: () => {
      toast.success("Bank-statement intake prepared for review. No transactions or balances were inferred.");
      reconciliation.refetch();
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const reconcileGst = trpc.tasks.reconcileGst.useMutation({
    onSuccess: () => {
      toast.success(`${taxName} reconciliation items are ready for review.`);
      reconciliation.refetch();
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const requestReview = trpc.tasks.requestProfessionalReview.useMutation({
    onSuccess: () => {
      toast.success("Professional review has been requested.");
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const [submissionAcknowledged, setSubmissionAcknowledged] = useState(false);
  const [submissionNote, setSubmissionNote] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  const requestAuthorizedSubmission = trpc.tasks.requestAuthorizedSubmission.useMutation({
    onSuccess: () => {
      toast.success("Authorized submission requested. Ready for independent approval.");
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const approveAuthorizedSubmission = trpc.tasks.approveAuthorizedSubmission.useMutation({
    onSuccess: () => {
      toast.success("Authorized submission approved by independent reviewer.");
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const resolveReconciliation = trpc.reconciliation.resolve.useMutation({
    onSuccess: () => {
      toast.success("Reconciliation resolution recorded.");
      reconciliation.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const skipRequirement = trpc.tasks.resolveRequirement.useMutation({
    onSuccess: () => {
      toast.success("Requirement marked resolved.");
      task.refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !task.data) return;

    try {
      upload.mutate({
        businessId: task.data.businessId,
        taskId,
        originalName: file.name,
        mimeType: file.type as any,
        documentType: selectedDocumentType,
        base64: await fileBase64(file),
      });
    } catch {
      toast.error("The selected file could not be read.");
    }
    event.target.value = "";
  };

  if (task.isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="size-6 animate-spin text-slate-700 dark:text-white" />
          <span>Opening workflow telemetry…</span>
        </div>
      </DashboardLayout>
    );
  }

  if (task.error || !task.data) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center">
          <AlertCircle className="mx-auto size-6 text-red-500 dark:text-red-400" />
          <h1 className="mt-3 text-base font-bold text-slate-900 dark:text-white">This task could not be opened.</h1>
          <Button onClick={() => setLocation("/tasks")} className="mt-5 rounded-xl bg-slate-900 text-xs font-semibold text-white dark:bg-white dark:text-black">
            Back to workflows
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const preparation = task.data.preparation;
  const submissionRequest = task.data.submissionRequest;
  const cashStatements = documents.data?.filter((row) => row.document.documentType === "bank_statement") ?? [];
  const executePreparation = () =>
    isCashReconciliation ? prepareCash.mutate({ taskId }) : prepareGst.mutate({ taskId });
  const isPreparing = isCashReconciliation ? prepareCash.isPending : prepareGst.isPending;
  const executeReconciliation = () =>
    isCashReconciliation ? prepareCash.mutate({ taskId }) : reconcileGst.mutate({ taskId });
  const isReconciling = isCashReconciliation ? prepareCash.isPending : reconcileGst.isPending;

  const formatAmount = (minor: number) => formatMinorAmount(minor, currency, locale);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        <button
          onClick={() => setLocation("/tasks")}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          All workflows
        </button>

        {/* Workflow Header Banner */}
        <div className="prava-panel flex flex-col gap-4 p-6 border border-slate-200/80 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {task.data.type.replaceAll("_", " ")}
              </span>
            </div>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">{task.data.title}</h1>
            <p className="mt-1.5 max-w-2xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {isCashReconciliation
                ? "Prava stages bank statements as source evidence and surfaces review work. It does not parse transactions, infer a cash balance, or claim a completed reconciliation without an activated data pathway."
                : "Prava prepares work from source evidence and flags exceptions. Official tax filing is never represented as submitted without an authorized official confirmation."}
            </p>
          </div>
          <StatusPill status={task.data.status} />
        </div>

        {/* Requirements & Documents Split Grid */}
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          {/* Requirements Checklist */}
          <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/[0.06] pb-3">
              <Sparkles className="size-4 text-slate-700 dark:text-white" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">What Prava still needs</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Evidence-based checklist, updated as records are processed.</p>
              </div>
            </div>

            <div className="space-y-3">
              {task.data.requirements.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white/70 p-3.5 text-xs shadow-sm dark:border-white/[0.06] dark:bg-[#0A0F16]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {item.status === "complete" ? (
                        <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{item.note}</p>
                    </div>
                  </div>
                  {item.status !== "complete" && optionalRequirements.has(item.requirementKey) && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={skipRequirement.isPending}
                      onClick={() =>
                        skipRequirement.mutate({
                          taskId,
                          requirementKey: item.requirementKey,
                          resolution: "skipped",
                        })
                      }
                      className="mt-2 h-7 rounded-lg border-slate-200 text-[10px] text-slate-600 dark:border-white/10 dark:text-slate-400"
                    >
                      Not applicable
                    </Button>
                  )}
                  {item.status !== "complete" && item.requirementKey === "business_gstin" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation("/onboarding")}
                      className="mt-2 h-7 rounded-lg border-slate-200 text-[10px] text-slate-900 dark:border-white/10 dark:text-white font-semibold"
                    >
                      Update business profile
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Attached Source Documents */}
          <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {isCashReconciliation ? "Bank-statement source evidence" : "Financial source documents"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isCashReconciliation
                    ? "Upload one statement at a time. The file is retained as source evidence only; statement transaction extraction, categorisation, cash balances, and matching remain deliberately inactive."
                    : "Upload invoices, credit notes, and debit notes for the selected task. Each document is structured for review before it can shape a preparation."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {!isCashReconciliation && (
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
                  >
                    <option value="invoice">Invoice</option>
                    <option value="credit_note">Credit note</option>
                    <option value="debit_note">Debit note</option>
                  </select>
                )}
                <Label
                  htmlFor="source-document"
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
                >
                  <FileUp className="size-3.5" />
                  {upload.isPending ? "Staging…" : "Upload"}
                </Label>
                <input
                  id="source-document"
                  className="hidden"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={upload.isPending}
                  onChange={onFile}
                />
              </div>
            </div>

            <div className="space-y-2">
              {documents.isLoading ? (
                <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Loading source records…</div>
              ) : documents.data?.length ? (
                documents.data.map((row) => (
                  <button
                    key={row.document.id}
                    type="button"
                    onClick={() => row.extraction ? setLocation(`/documents/${row.document.id}`) : undefined}
                    className={`flex w-full items-start justify-between rounded-xl border border-slate-200 bg-white/70 p-3 text-left shadow-sm transition hover:border-slate-300 hover:bg-white dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20 text-xs ${
                      row.extraction ? "cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <FileUp className="size-4 text-slate-700 dark:text-white mt-0.5" />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{row.document.originalName}</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {row.document.status.replaceAll("_", " ")}
                          {row.extraction?.invoiceNumber ? ` · ${row.extraction.invoiceNumber}` : ""}
                        </p>
                        {row.document.documentType === "bank_statement" ? (
                          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            Source evidence staged. Transaction-level extraction is not activated.
                          </p>
                        ) : row.extraction?.status === "needs_review" ? (
                          <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                            This record requires review; open it to correct or approve its fields.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300 uppercase">
                      {row.document.documentType.replaceAll("_", " ")}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                  {isCashReconciliation
                    ? "No bank statement is attached. Upload a source statement to stage this reconciliation for review."
                    : "No documents attached yet. Upload invoices to begin evidence-based preparation."}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Calculation & CA Review Submission Panel */}
        <section className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isCashReconciliation ? <Landmark className="size-4 text-slate-700 dark:text-white" /> : <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />}
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  {isCashReconciliation ? "Cash-reconciliation boundary" : `${taxName} preparation boundary`}
                </span>
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                {isCashReconciliation ? "Stage evidence. Keep financial values unasserted." : "Prepare, validate, then review."}
              </h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                {isCashReconciliation
                  ? "This preparation creates a reviewable statement-intake record only. It does not calculate a cash balance, classify transactions, reconcile entries, or assert any amount from the uploaded file."
                  : "The summary is calculated deterministically from extracted records. It is a preparation artifact, not a filed return."}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPreparing}
                onClick={executePreparation}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
              >
                {isPreparing ? "Preparing…" : isCashReconciliation ? "Prepare intake review" : `Prepare ${taxName} summary`}
              </Button>
              <Button
                variant="outline"
                disabled={requestReview.isPending}
                onClick={() => requestReview.mutate({ taskId })}
                className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              >
                <UserRoundCheck className="mr-1.5 size-3.5 text-purple-600 dark:text-purple-400" />
                Send to CA for review
              </Button>
            </div>
          </div>

          {preparation && !isCashReconciliation && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="prava-card p-4">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Sales Inflow</span>
                <p className="prava-mono mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatAmount(preparation.salesMinor)}</p>
              </div>
              <div className="prava-card p-4">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Taxable value</span>
                <p className="prava-mono mt-1 text-lg font-bold text-slate-900 dark:text-white">{formatAmount(preparation.taxableValueMinor)}</p>
              </div>
              <div className="prava-card p-4">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Input tax credit</span>
                <p className="prava-mono mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(preparation.inputTaxCreditMinor)}</p>
              </div>
              <div className="prava-card p-4">
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Estimated net tax</span>
                <p className="prava-mono mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{formatAmount(preparation.netTaxPositionMinor)}</p>
              </div>
            </div>
          )}
        </section>

        {/* Authorized Submission Gate */}
        {!isCashReconciliation && (
          <section className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
            <div className="flex items-start gap-3">
              <Send className="size-5 text-slate-700 dark:text-white mt-1" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Authorized submission gate
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Independent approval before provider dispatch.
                </h3>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                  Approval creates an audit record and moves this preparation to a provider-ready state. It does not transmit data to a tax portal and never means the return has been filed.
                </p>
              </div>
            </div>

            {!submissionRequest ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-5 space-y-3">
                <p className="text-xs font-bold text-slate-900 dark:text-white">No authorized submission request exists.</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">This option unlocks only after evidence and review boundaries are resolved.</p>
                {task.data.status === "prepared" && (
                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={submissionAcknowledged}
                        onChange={(e) => setSubmissionAcknowledged(e.target.checked)}
                        className="mt-0.5 size-4 accent-slate-900 dark:accent-white"
                      />
                      <span>I confirm this is a request for independent review, not a government submission.</span>
                    </label>
                    <textarea
                      value={submissionNote}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      maxLength={1000}
                      placeholder="Optional context for the independent reviewer"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none shadow-sm dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
                    />
                    <Button
                      disabled={!submissionAcknowledged || requestAuthorizedSubmission.isPending}
                      onClick={() =>
                        requestAuthorizedSubmission.mutate({
                          taskId,
                          acknowledgement: true,
                          note: submissionNote || undefined,
                        })
                      }
                      className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
                    >
                      <Send className="mr-1.5 size-3.5" />
                      {requestAuthorizedSubmission.isPending ? "Requesting review…" : "Send to CA for review"}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 space-y-3 dark:border-white/[0.06] dark:bg-[#0A0F16]">
                <div className="flex items-center gap-3">
                  <StatusPill status={submissionRequest.status} />
                  <p className="text-xs font-bold text-slate-900 dark:text-white">
                    {submissionRequest.status === "awaiting_review"
                      ? "Awaiting an independent workspace administrator or CA."
                      : submissionRequest.status === "approved"
                      ? "Approved by CA. Waiting for authorized filing dispatch."
                      : submissionRequest.status === "dispatching"
                      ? "Provider dispatch is in progress; confirmation is still pending."
                      : submissionRequest.status === "submitted"
                      ? "An authorized provider recorded a reference."
                      : "This request needs attention."}
                  </p>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {submissionRequest.status === "approved"
                    ? "No official tax provider is connected yet, so Prava cannot dispatch or claim an official filing."
                    : "The current state is auditable and does not by itself establish a government filing."}
                </p>
                {submissionRequest.status === "awaiting_review" && (task.data as any).workspaceRole === "admin" && (
                  <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-white/[0.06]">
                    <textarea
                      value={reviewerNote}
                      onChange={(e) => setReviewerNote(e.target.value)}
                      minLength={8}
                      maxLength={1000}
                      placeholder="Independent reviewer note (minimum 8 characters)"
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-900 outline-none shadow-sm dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
                    />
                    <Button
                      disabled={reviewerNote.trim().length < 8 || approveAuthorizedSubmission.isPending}
                      onClick={() => approveAuthorizedSubmission.mutate({ taskId, reviewerNote })}
                      className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
                    >
                      <UserRoundCheck className="mr-1.5 size-3.5" />
                      {approveAuthorizedSubmission.isPending ? "Recording approval…" : "Approve as CA / independent reviewer"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Reconciliation Items Section */}
        <section className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isCashReconciliation ? "Payment Matching Review" : `Tax & ${taxName} Reconciliation`}
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Fix unmatched items & exceptions.</h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                {isCashReconciliation
                  ? "We check your source statement evidence for unmatched items and documents needing human attention."
                  : "Checks uploaded evidence for duplicates, missing requirements, extraction exceptions, and inconsistent totals."}
              </p>
            </div>
            <Button
              disabled={isReconciling}
              onClick={executeReconciliation}
              className="rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10 shadow-sm"
            >
              <RefreshCw className={`mr-1.5 size-3.5 ${isReconciling ? "animate-spin" : ""}`} />
              {isReconciling ? "Checking…" : isCashReconciliation ? "Check payments" : "Run reconciliation"}
            </Button>
          </div>

          <div className="space-y-3">
            {reconciliation.isLoading ? (
              <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">Checking items…</div>
            ) : reconciliation.data?.length ? (
              reconciliation.data.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 sm:flex-row sm:items-center justify-between text-xs shadow-sm dark:border-white/[0.06] dark:bg-[#0A0F16]"
                >
                  <div className="flex items-center gap-3">
                    <StatusPill status={item.status} />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.reference ?? item.itemType}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.reason}</p>
                    </div>
                  </div>
                  {!["matched", "resolved", "ignored"].includes(item.status) && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolveReconciliation.isPending}
                        onClick={() =>
                          resolveReconciliation.mutate({
                            reconciliationId: item.id,
                            resolution: "ignored",
                          })
                        }
                        className="rounded-lg border-slate-200 text-xs text-slate-700 dark:border-white/10 dark:text-slate-300"
                      >
                        Ignore
                      </Button>
                      <Button
                        size="sm"
                        disabled={resolveReconciliation.isPending}
                        onClick={() =>
                          resolveReconciliation.mutate({
                            reconciliationId: item.id,
                            resolution: "resolved",
                          })
                        }
                        className="rounded-lg bg-slate-900 text-white font-semibold text-xs dark:bg-white dark:text-black shadow-sm"
                      >
                        Fix & resolve
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                {isCashReconciliation
                  ? "Upload a bank statement to verify payments and match records."
                  : "Upload documents to check for unmatched payments and tax discrepancies."}
              </div>
            )}
          </div>
        </section>

        {/* Failed Dispatch Notice */}
        {!isCashReconciliation && submissionRequest?.status === "failed" && (
          <section className="rounded-2xl border border-red-500/20 bg-red-500/10 p-6 text-xs text-red-600 dark:text-red-300 space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-500 dark:text-red-400" />
              <span className="font-mono uppercase font-bold text-red-600 dark:text-red-400">Provider dispatch failed</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No return was filed.</h3>
            <p className="text-slate-700 dark:text-[#CBD5E1]">
              The provider failure was recorded without changing this return to submitted. Once an authorized provider is configured and the source issue is resolved, create a fresh request for independent approval before any new dispatch attempt.
            </p>
            {submissionRequest.failureCode && (
              <p className="font-mono text-[11px] text-red-600 dark:text-red-400">
                Provider code: {submissionRequest.failureCode}
              </p>
            )}
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
