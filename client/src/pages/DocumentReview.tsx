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

type Draft = { vendorName: string; gstin: string; invoiceNumber: string; invoiceDate: string; taxableValue: string; cgst: string; sgst: string; igst: string; total: string; placeOfSupply: string; invoiceType: "sales" | "purchase" | "unknown" };

function rupeeText(value: number | null | undefined) { return value === null || value === undefined ? "" : (value / 100).toFixed(2); }
function isoDate(value: Date | null | undefined) { return value ? new Date(value).toISOString().slice(0, 10) : ""; }

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
    setDraft({ vendorName: extraction.vendorName ?? "", gstin: extraction.gstin ?? "", invoiceNumber: extraction.invoiceNumber ?? "", invoiceDate: isoDate(extraction.invoiceDate), taxableValue: rupeeText(extraction.taxableValueMinor), cgst: rupeeText(extraction.cgstMinor), sgst: rupeeText(extraction.sgstMinor), igst: rupeeText(extraction.igstMinor), total: rupeeText(extraction.totalMinor), placeOfSupply: extraction.placeOfSupply ?? "", invoiceType: extraction.invoiceType === "sales" || extraction.invoiceType === "purchase" ? extraction.invoiceType : "unknown" });
  }, [detail.data?.document.id]);

  const review = trpc.documents.review.useMutation({
    onSuccess: data => {
      toast.success(data.extraction?.status === "extracted" ? "Document approved and recorded in the audit trail." : "Corrections saved for further review.");
      utils.documents.get.invalidate({ documentId });
      if (data.document.taskId) utils.tasks.get.invalidate({ taskId: data.document.taskId });
      utils.actions.list.invalidate({ businessId: data.document.businessId });
    },
    onError: error => toast.error(error.message),
  });

  if (detail.isLoading || !draft) return <DashboardLayout><div className="grid min-h-[60vh] place-items-center text-sm text-[#708078]"><Loader2 className="mr-2 size-4 animate-spin"/>Loading source record…</div></DashboardLayout>;
  if (detail.error || !detail.data || !detail.data.extraction) return <DashboardLayout><div className="mx-auto mt-16 max-w-xl rounded-2xl border border-[#edc8bb] bg-[#fff7f4] p-7"><AlertCircle className="size-5 text-[#b7523d]"/><h1 className="mt-3 text-lg font-semibold text-[#5c241c]">This source record cannot be reviewed.</h1><p className="mt-2 text-sm text-[#7b5249]">{detail.error?.message ?? "The record does not have an invoice extraction."}</p><Button className="mt-5 rounded-full" onClick={() => setLocation("/tasks")}>Back to workflows</Button></div></DashboardLayout>;

  const { document, extraction, sourceUrl } = detail.data;
  let reviewReasons: string[] = [];
  try { reviewReasons = (JSON.parse(extraction.extractedData) as { reviewReasons?: string[] }).reviewReasons ?? []; } catch { reviewReasons = ["Extraction metadata could not be read."]; }
  const submit = (decision: "approve" | "save_for_review") => review.mutate({ documentId, decision, ...draft });
  const returnPath = document.taskId ? `/tasks/${document.taskId}` : "/tasks";
  const field = (key: keyof Pick<Draft, "vendorName" | "gstin" | "invoiceNumber" | "invoiceDate" | "taxableValue" | "cgst" | "sgst" | "igst" | "total" | "placeOfSupply">, label: string, type = "text") => <div className="grid gap-2"><Label htmlFor={key}>{label}</Label><Input id={key} type={type} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.value })}/></div>;

  return <DashboardLayout><div className="mx-auto max-w-6xl py-2"><button onClick={() => setLocation(returnPath)} className="inline-flex items-center gap-2 text-sm font-semibold text-[#46675b] hover:text-[#163a34]"><ArrowLeft className="size-4" />Return to workflow</button><header className="mt-5 flex flex-col gap-5 border-b border-[#ddd3c1] pb-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Document review</p><h1 className="prava-display mt-2 text-4xl text-[#153832]">Verify source data before it becomes trusted.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6b7a72]">Corrections are saved with an audit event. Approval is allowed only when required invoice fields and deterministic total checks are valid.</p></div><a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center rounded-full border border-[#d8ceb9] bg-[#fffdf8] px-4 text-sm font-semibold text-[#315b4c] hover:bg-[#f7f3e9]"><ExternalLink className="mr-2 size-4" />Open original</a></header><div className="mt-7 grid gap-5 lg:grid-cols-[0.72fr_1.28fr]"><aside className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex items-center gap-3"><FileSearch className="size-5 text-[#b77a43]" /><div><p className="text-sm font-semibold text-[#153832]">Review context</p><p className="text-xs text-[#75847c]">{document.originalName}</p></div></div><div className="mt-5 rounded-xl border border-[#ece4d6] p-4"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a887c]">Current status</p><p className="mt-2 text-sm font-semibold text-[#24473e]">{document.status.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-[#748078]">Extraction confidence: {extraction.confidenceBps ? `${(extraction.confidenceBps / 100).toFixed(0)}%` : "not assessed"}</p></div><div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6a887c]">Review reasons</p><div className="mt-3 space-y-2">{reviewReasons.length ? reviewReasons.map(reason => <div key={reason} className="flex gap-2 rounded-lg bg-[#fff5e8] p-3 text-xs leading-5 text-[#8b571f]"><AlertCircle className="mt-0.5 size-3.5 shrink-0" />{reason}</div>) : <div className="flex gap-2 rounded-lg bg-[#edf4e8] p-3 text-xs leading-5 text-[#315b4c]"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />No automated exceptions were recorded. You may still correct source fields before approval.</div>}</div></div><div className="mt-5 rounded-xl bg-[#163a34] p-4 text-[#f7f1e4]"><ShieldCheck className="size-4 text-[#cfe4ad]" /><p className="mt-2 text-xs font-semibold">Review boundary</p><p className="mt-1 text-xs leading-5 text-[#c5d2c9]">Approving a document confirms its extracted fields for this workspace. It does not file or submit any return.</p></div></aside><section className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="grid gap-4 sm:grid-cols-2">{field("vendorName", "Vendor or customer")}{field("gstin", "Tax ID / GSTIN")}{field("invoiceNumber", "Invoice number")}{field("invoiceDate", "Invoice date", "date")}{field("taxableValue", `Taxable value (${currency})`)}{field("total", `Invoice total (${currency})`)}{field("cgst", `Local / State Tax 1 (${currency})`)}{field("sgst", `Local / State Tax 2 (${currency})`)}{field("igst", `Integrated / Combined Tax (${currency})`)}{field("placeOfSupply", "Place of supply / Jurisdiction")}</div><div className="mt-4 grid gap-2"><Label>Invoice direction</Label><Select value={draft.invoiceType} onValueChange={value => setDraft({ ...draft, invoiceType: value as Draft["invoiceType"] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sales">Sales invoice</SelectItem><SelectItem value="purchase">Purchase invoice</SelectItem><SelectItem value="unknown">Needs classification</SelectItem></SelectContent></Select></div><div aria-live="polite" className="mt-5 min-h-5 text-xs text-[#627269]">{review.isPending ? "Saving your review decision and updating the audit trail…" : "Review actions stay disabled only while the current decision is being saved."}</div><div className="mt-3 flex flex-col gap-3 border-t border-[#e7dece] pt-5 sm:flex-row sm:justify-end"><Button variant="outline" disabled={review.isPending} onClick={() => submit("save_for_review")} className="rounded-full"><Save className="mr-2 size-4" />Save corrections for review</Button><Button disabled={review.isPending} onClick={() => submit("approve")} className="rounded-full bg-[#163a34] text-[#f7f1e4]"><CheckCircle2 className="mr-2 size-4" />{review.isPending ? "Saving…" : "Approve validated document"}</Button></div></section></div></div></DashboardLayout>;
}
