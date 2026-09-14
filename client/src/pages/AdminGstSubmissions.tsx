import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Search, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SubmissionStatus =
  | "all"
  | "awaiting_review"
  | "approved"
  | "rejected"
  | "dispatching"
  | "submitted"
  | "failed"
  | "cancelled";

const statusLabel: Record<SubmissionStatus, string> = {
  all: "All statuses",
  awaiting_review: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  dispatching: "Dispatching",
  submitted: "Official reference recorded",
  failed: "Provider failed",
  cancelled: "Cancelled",
};

function safePrint(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export default function AdminGstSubmissions() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubmissionStatus>("all");
  const [workspace, setWorkspace] = useState("");
  const [provider, setProvider] = useState("");
  const [period, setPeriod] = useState("");
  const [rejectingTaskId, setRejectingTaskId] = useState<number | null>(null);
  const [reviewerNote, setReviewerNote] = useState("");
  const input = useMemo(
    () => ({
      search: search.trim() || undefined,
      workspace: workspace.trim() || undefined,
      provider: provider.trim() || undefined,
      period: period || undefined,
      status,
      limit: 100,
    }),
    [search, workspace, provider, period, status]
  );
  const submissions = trpc.admin.gstSubmissions.useQuery(input);
  const exportQuery = trpc.admin.exportGstSubmissions.useQuery(input, { enabled: false });
  const utils = trpc.useUtils();
  const reject = trpc.admin.rejectGstSubmission.useMutation({
    onSuccess: async () => {
      toast.success("Submission request rejected and the requester was notified in-app.");
      setRejectingTaskId(null);
      setReviewerNote("");
      await utils.admin.gstSubmissions.invalidate();
    },
    onError: (error) => toast.error(error.message),
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
    toast.success("CSV export downloaded.");
  };

  const printExport = () => {
    const windowRef = window.open("", "_blank", "noopener,noreferrer");
    if (!windowRef) return toast.error("Allow pop-ups to prepare the print view.");
    const body = rows
      .map(
        (row) =>
          `<tr><td>${row.request.id}</td><td>${safePrint(row.businessName)}</td><td>${safePrint(
            row.taskTitle
          )}</td><td>${safePrint(row.request.status)}</td><td>${safePrint(
            row.requesterEmail ?? row.requesterName ?? ""
          )}</td><td>${safePrint(row.request.providerName ?? "Not configured")}</td><td>${safePrint(
            row.preparation?.officialReference ?? "Not filed"
          )}</td></tr>`
      )
      .join("");
    windowRef.document.write(
      `<!doctype html><title>Prava GST submission register</title><style>body{font:12px system-ui;margin:28px;color:#173d35}h1{font-size:20px}p{color:#526b60}table{width:100%;border-collapse:collapse;margin-top:18px}th,td{border:1px solid #cdd8cf;padding:8px;text-align:left;vertical-align:top}th{background:#e8f0e2}@media print{button{display:none}}</style><h1>Prava GST submission register</h1><p>Generated ${new Date().toLocaleString()}</p><table><thead><tr><th>ID</th><th>Workspace</th><th>Task</th><th>Status</th><th>Requester</th><th>Provider</th><th>Official reference</th></tr></thead><tbody>${body}</tbody></table><script>window.print()</script>`
    );
    windowRef.document.close();
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-card/90 p-7 shadow-xl backdrop-blur-xl sm:p-9">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Administrator Register
              </span>
              <h1 className="font-serif mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Statutory GST & Tax <span className="italic font-normal text-muted-foreground">Submission Log</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Search independent-review decisions and verified workflow metadata. A recorded official reference is
                required before treating a return as submitted.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button
                onClick={exportCsv}
                disabled={exportQuery.isFetching}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                <Download className="mr-1.5 size-3.5" />
                CSV Export
              </Button>
              <Button
                variant="outline"
                onClick={printExport}
                className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
              >
                <FileText className="mr-1.5 size-3.5" />
                Print / Save PDF
              </Button>
            </div>
          </div>
        </section>

        {/* Filter Bar */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-4 shadow-sm backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="relative block lg:col-span-2">
              <span className="sr-only">Search GST submissions</span>
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search requester, task, or status…"
                className="border-border/60 bg-background/50 pl-9 text-xs text-foreground"
              />
            </label>
            <Input
              value={workspace}
              onChange={(event) => setWorkspace(event.target.value)}
              placeholder="Workspace"
              className="border-border/60 bg-background/50 text-xs text-foreground"
            />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as SubmissionStatus)}
              className="h-10 w-full rounded-xl border border-border/60 bg-background/50 px-3 text-xs text-foreground outline-none transition-colors focus:border-ring"
            >
              {Object.entries(statusLabel).map(([value, label]) => (
                <option key={value} value={value} className="bg-popover text-popover-foreground">
                  {label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Submissions Table */}
        <section className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-sm backdrop-blur-xl">
          <div className="border-b border-border/60 px-5 py-4">
            <p className="text-sm font-semibold text-foreground">
              {rows.length} visible submission request{rows.length === 1 ? "" : "s"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Official references recorded with statutory audit verification.
            </p>
          </div>

          {submissions.isLoading ? (
            <div className="p-8 text-xs text-muted-foreground">Loading submission metadata…</div>
          ) : submissions.error ? (
            <div className="p-8 text-xs text-destructive">Unable to load submissions: {submissions.error.message}</div>
          ) : rows.length === 0 ? (
            <div className="p-8 text-xs text-muted-foreground">No GST submission requests match these filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-xs">
                <thead className="border-b border-border/60 bg-secondary/20 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Workspace & Task</th>
                    <th className="px-5 py-3 font-semibold">Requester</th>
                    <th className="px-5 py-3 font-semibold">Decision</th>
                    <th className="px-5 py-3 font-semibold">Provider / Evidence</th>
                    <th className="px-5 py-3 font-semibold">Requested</th>
                    <th className="px-5 py-3 font-semibold">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {rows.map((row) => (
                    <tr key={row.request.id} className="align-top transition-colors hover:bg-secondary/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-foreground">{row.businessName}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {row.taskTitle} · Request #{row.request.id}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {row.requesterEmail ?? row.requesterName ?? "Protected User"}
                      </td>
                      <td className="px-5 py-4">
                        <Badge
                          variant="secondary"
                          className="border-border/60 bg-secondary/80 text-xs font-medium text-foreground"
                        >
                          {statusLabel[row.request.status as SubmissionStatus] ?? row.request.status}
                        </Badge>
                        {row.request.reviewerNote ? (
                          <p className="mt-2 max-w-56 text-[11px] leading-relaxed text-muted-foreground">
                            {row.request.reviewerNote}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-foreground">{row.request.providerName ?? "In-House CA Network"}</p>
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {row.preparation?.officialReference
                            ? `Ref: ${row.preparation.officialReference}`
                            : "No official filing reference"}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-muted-foreground">
                        {new Date(row.request.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        {row.request.status === "awaiting_review" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setRejectingTaskId(rejectingTaskId === row.request.taskId ? null : row.request.taskId)
                            }
                            className="rounded-lg border-destructive/30 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20"
                          >
                            <XCircle className="mr-1.5 size-3.5" />
                            Reject
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">No action</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
