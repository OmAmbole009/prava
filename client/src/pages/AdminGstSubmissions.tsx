import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Search, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SubmissionStatus = "all" | "awaiting_review" | "approved" | "rejected" | "dispatching" | "submitted" | "failed" | "cancelled";

const statusLabel: Record<SubmissionStatus, string> = { all: "All statuses", awaiting_review: "Awaiting review", approved: "Approved", rejected: "Rejected", dispatching: "Dispatching", submitted: "Official reference recorded", failed: "Provider failed", cancelled: "Cancelled" };

function safePrint(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

export default function AdminGstSubmissions() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("all");
  const [workspace, setWorkspace] = useState("");
  const [provider, setProvider] = useState("");
  const [period, setPeriod] = useState("");
  const [rejectingTaskId, setRejectingTaskId] = useState<number | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");
  const input = useMemo(() => ({ search: search.trim() || undefined, workspace: workspace.trim() || undefined, provider: provider.trim() || undefined, period: period || undefined, status, limit: 100 }), [search, workspace, provider, period, status]);
  const submissions = trpc.admin.gstSubmissions.useQuery(input);
  const exportQuery = trpc.admin.exportGstSubmissions.useQuery(input, { enabled: false });
  const utils = trpc.useUtils();
  const reject = trpc.admin.rejectGstSubmission.useMutation({
    onSuccess: async () => { toast.success("Submission request rejected and the requester was notified in-app."); setRejectingTaskId(null); setReviewerNote(""); await utils.admin.gstSubmissions.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const rows = submissions.data ?? [];

  const exportCsv = async () => {
    const result = await exportQuery.refetch();
    if (!result.data) return toast.error("The export could not be prepared.");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([result.data.csv], { type: "text/csv;charset=utf-8" }));
    link.download = result.data.filename;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success("CSV export downloaded. It excludes source files and provider payloads.");
  };
  const printExport = () => {
    const windowRef = window.open("", "_blank", "noopener,noreferrer");
    if (!windowRef) return toast.error("Allow pop-ups to prepare the print view.");
    const body = rows.map(row => `<tr><td>${row.request.id}</td><td>${safePrint(row.businessName)}</td><td>${safePrint(row.taskTitle)}</td><td>${safePrint(row.request.status)}</td><td>${safePrint(row.requesterEmail ?? row.requesterName ?? "")}</td><td>${safePrint(row.request.providerName ?? "Not configured")}</td><td>${safePrint(row.preparation?.officialReference ?? "Not filed")}</td></tr>`).join("");
    windowRef.document.write(`<!doctype html><title>Prava GST submission register</title><style>body{font:12px system-ui;margin:28px;color:#173d35}h1{font-size:20px}p{color:#526b60}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #cdd8cf;padding:8px;text-align:left;vertical-align:top}th{background:#e8f0e2}@media print{button{display:none}}</style><h1>Prava GST submission register</h1><p>Generated ${new Date().toLocaleString()} · Records are workflow metadata, not proof of government filing. An official reference is required before treating a return as submitted.</p><table><thead><tr><th>ID</th><th>Workspace</th><th>Task</th><th>Status</th><th>Requester</th><th>Provider</th><th>Official reference</th></tr></thead><tbody>${body}</tbody></table><script>window.print()</script>`);
    windowRef.document.close();
  };

  return <DashboardLayout><main id="workspace-content" className="min-h-screen bg-[#f7f3e9] px-4 py-6 sm:px-7 lg:px-10"><div className="mx-auto max-w-7xl space-y-5">
    <section className="rounded-[28px] bg-[#153b34] px-5 py-6 text-[#f8f3e7] shadow-sm sm:px-7"><div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#bed5ae]"><ShieldCheck className="size-4" /> Administrator workspace</div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">GST submission register</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#d5e1d1]">Search independent-review decisions and safe workflow metadata. A recorded official reference is the only submission evidence shown here; no source documents or provider payloads are exported.</p></div><div className="flex flex-wrap gap-2"><Button onClick={exportCsv} disabled={exportQuery.isFetching} className="bg-[#c9975b] text-[#173d35] hover:bg-[#d8ac74]"><Download className="mr-2 size-4" />CSV export</Button><Button variant="outline" onClick={printExport} className="border-[#789781] bg-transparent text-[#f8f3e7] hover:bg-[#244b42] hover:text-white"><FileText className="mr-2 size-4" />Print / Save PDF</Button></div></div></section>
    <section className="rounded-2xl border border-[#d8dfd4] bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-4"><label className="relative block lg:col-span-2"><span className="sr-only">Search GST submissions</span><Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#698177]" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search requester, task, or status" className="pl-9" /></label><label><span className="sr-only">Workspace filter</span><Input value={workspace} onChange={event => setWorkspace(event.target.value)} placeholder="Workspace" /></label><label><span className="sr-only">Provider filter</span><Input value={provider} onChange={event => setProvider(event.target.value)} placeholder="Provider" /></label><label><span className="sr-only">Reporting period filter</span><Input type="month" value={period} onChange={event => setPeriod(event.target.value)} aria-label="Reporting period" /></label><label className="text-sm font-medium text-[#294b42]"><span className="sr-only">Status</span><select value={status} onChange={event => setStatus(event.target.value as SubmissionStatus)} className="h-10 w-full rounded-md border border-input bg-background px-3">{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div></section>
    <section className="overflow-hidden rounded-2xl border border-[#d8dfd4] bg-white shadow-sm"><div className="border-b border-[#e4e9e1] px-5 py-4"><p className="text-sm font-semibold text-[#21463c]">{rows.length} visible submission request{rows.length === 1 ? "" : "s"}</p><p className="mt-1 text-xs text-[#6c8176]">Email records are suppressed until an authenticated sending integration is configured; no email is claimed as sent.</p></div>{submissions.isLoading ? <div className="p-8 text-sm text-[#61766b]">Loading protected submission metadata…</div> : submissions.error ? <div className="p-8 text-sm text-red-700">Unable to load submissions: {submissions.error.message}</div> : rows.length === 0 ? <div className="p-8 text-sm text-[#61766b]">No GST submission requests match these filters.</div> : <div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left text-sm"><thead className="bg-[#f1f5ee] text-xs uppercase tracking-[0.08em] text-[#60776b]"><tr><th className="px-5 py-3">Workspace & task</th><th className="px-5 py-3">Requester</th><th className="px-5 py-3">Decision</th><th className="px-5 py-3">Provider / evidence</th><th className="px-5 py-3">Requested</th><th className="px-5 py-3">Review</th></tr></thead><tbody className="divide-y divide-[#e6ebe4]">{rows.map(row => <><tr key={row.request.id} className="align-top"><td className="px-5 py-4"><p className="font-semibold text-[#20463b]">{row.businessName}</p><p className="mt-1 text-xs text-[#6c8176]">{row.taskTitle} · {row.periodStart ? new Date(row.periodStart).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "No period"} · Request #{row.request.id}</p></td><td className="px-5 py-4 text-[#3e5a50]">{row.requesterEmail ?? row.requesterName ?? "Protected user"}</td><td className="px-5 py-4"><Badge variant="outline" className="border-[#b9cab8] bg-[#f5f8f2] text-[#335c4c]">{statusLabel[row.request.status as SubmissionStatus] ?? row.request.status}</Badge>{row.request.reviewerNote ? <p className="mt-2 max-w-56 text-xs leading-5 text-[#687c72]">{row.request.reviewerNote}</p> : null}</td><td className="px-5 py-4"><p className="text-[#3e5a50]">{row.request.providerName ?? "Not configured"}</p><p className="mt-1 text-xs text-[#6c8176]">{row.preparation?.officialReference ? `Reference: ${row.preparation.officialReference}` : "No official filing reference"}</p></td><td className="px-5 py-4 text-xs text-[#526b60]">{new Date(row.request.createdAt).toLocaleString()}</td><td className="px-5 py-4">{row.request.status === "awaiting_review" ? <Button size="sm" variant="outline" onClick={() => setRejectingTaskId(rejectingTaskId === row.request.taskId ? null : row.request.taskId)}><XCircle className="mr-1.5 size-3.5" />Reject</Button> : <span className="text-xs text-[#718378]">No action</span>}</td></tr>{rejectingTaskId === row.request.taskId ? <tr key={`${row.request.id}-reject`} className="bg-[#fffaf3]"><td colSpan={6} className="px-5 py-4"><div className="flex flex-col gap-3 md:flex-row md:items-end"><label className="flex-1 text-xs font-semibold text-[#5a4031]">Reviewer note (shared with requester)<Textarea value={reviewerNote} onChange={event => setReviewerNote(event.target.value)} placeholder="Explain what must be corrected before a fresh request." className="mt-1.5 bg-white" /></label><div className="flex gap-2"><Button variant="outline" onClick={() => setRejectingTaskId(null)}>Cancel</Button><Button onClick={() => reject.mutate({ taskId: row.request.taskId, reviewerNote })} disabled={reviewerNote.trim().length < 8 || reject.isPending} className="bg-[#9e4f37] hover:bg-[#873f2b]">Confirm rejection</Button></div></div></td></tr> : null}</>)}</tbody></table></div>}</section>
  </div></main></DashboardLayout>;
}
