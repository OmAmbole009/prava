import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock3, FileSearch, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import ApprovalStatusBadge from "./ApprovalStatusBadge";
import ApprovalHistory from "./ApprovalHistory";
import EvidenceReviewPanel from "./EvidenceReviewPanel";
import ReviewActionDialog from "./ReviewActionDialog";

const ATTENTION = new Set(["awaiting_ca_review", "under_ca_review", "changes_requested", "approval_invalidated"]);

const FILTERS = [
  { id: "needs_attention", label: "Needs attention" },
  { id: "all", label: "All assigned" },
  { id: "approved", label: "Approved" },
  { id: "completed", label: "Completed" },
];

/**
 * The reviewer's working list. Every row and every figure comes from the same
 * persisted records the business owner sees.
 */
export default function CaApprovalQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("needs_attention");
  const [inspectingId, setInspectingId] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);

  const queue = useQuery({ queryKey: ["ca", "approvalQueue"], queryFn: () => api.ca.approvalQueue(), retry: false });

  const evidence = useQuery({
    queryKey: ["ca", "task", inspectingId],
    queryFn: () => api.ca.task({ taskId: inspectingId }),
    enabled: Number(inspectingId) > 0,
    retry: false,
  });

  const items = queue.data?.items ?? [];
  const counts = queue.data?.counts ?? {};

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "approved") return items.filter(item => item.approvalStatus === "approved" || item.approvalStatus === "authorized_for_execution");
    if (filter === "completed") return items.filter(item => item.approvalStatus === "completed");
    return items.filter(item => ATTENTION.has(item.approvalStatus));
  }, [items, filter]);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["ca"] });
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
  };

  if (queue.isLoading) {
    return (
      <div className="prava-panel flex items-center gap-2 p-6 text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        Loading your review queue…
      </div>
    );
  }

  if (queue.error) {
    return (
      <div className="prava-panel border border-red-500/20 bg-red-500/10 p-6 text-xs text-red-700 dark:text-red-300">
        <p className="font-semibold">The review queue could not be loaded.</p>
        <p className="mt-1">{queue.error.message}</p>
        <p className="mt-2 text-[11px]">
          Only an active, verified professional with an assignment can see client work.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="prava-panel border border-slate-200/80 p-5 dark:border-white/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Approval queue</h2>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              Tasks across your assigned workspaces, derived from stored approval records.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => queue.refetch()}
            disabled={queue.isFetching}
            className="text-[11px]"
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${queue.isFetching ? "animate-spin" : ""}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 sm:grid-cols-4 dark:border-white/[0.06]">
          {[
            { label: "Awaiting review", value: (counts.awaiting_ca_review || 0) + (counts.under_ca_review || 0), tone: "text-amber-600 dark:text-amber-400" },
            { label: "Changes requested", value: counts.changes_requested || 0, tone: "text-amber-600 dark:text-amber-400" },
            { label: "Invalidated approvals", value: counts.approval_invalidated || 0, tone: "text-red-600 dark:text-red-400" },
            { label: "Approved / authorized", value: (counts.approved || 0) + (counts.authorized_for_execution || 0), tone: "text-emerald-600 dark:text-emerald-400" },
          ].map(stat => (
            <div key={stat.label}>
              <dt className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-slate-400">{stat.label}</dt>
              <dd className={`prava-mono mt-0.5 text-xl font-bold ${stat.tone}`}>{stat.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            aria-pressed={filter === item.id}
            className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
              filter === item.id
                ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/[0.06]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="prava-panel border border-dashed border-slate-300 p-8 text-center dark:border-white/10">
          <p className="text-xs font-semibold text-slate-900 dark:text-white">Nothing in this view.</p>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
            {filter === "needs_attention"
              ? "No assigned task is awaiting a professional decision or correction."
              : "No task matches the selected filter."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map(item => (
            <li key={item.taskId} className="prava-panel border border-slate-200/80 p-4 dark:border-white/10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-800 dark:bg-white/[0.08] dark:text-slate-200">
                      {item.businessName || `Business #${item.businessId}`}
                    </span>
                    <ApprovalStatusBadge status={item.approvalStatus} label={item.approvalStatusLabel} tone={item.tone} />
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {String(item.type).replaceAll("_", " ")}
                    {item.periodStart ? ` · ${new Date(item.periodStart).toLocaleDateString(undefined, { year: "numeric", month: "short" })}` : ""}
                    {item.evidenceReference ? ` · evidence ${item.evidenceReference}` : ""}
                  </p>
                  {item.invalidationReason && (
                    <p className="mt-1 flex items-start gap-1 text-[10px] text-red-600 dark:text-red-400">
                      <ShieldAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      {item.invalidationReason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {item.waitingDays > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <Clock3 className="size-3" aria-hidden="true" />
                      {item.waitingDays}d since update
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setInspectingId(item.taskId)}
                    className="text-[11px]"
                  >
                    <FileSearch className="mr-1.5 size-3.5" aria-hidden="true" />
                    Inspect evidence
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={Number(inspectingId) > 0} onOpenChange={open => { if (!open) setInspectingId(null); }}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0F1620] dark:text-white">
          <DialogHeader>
            <DialogTitle className="text-base">Evidence review</DialogTitle>
            <DialogDescription className="text-[11px] text-slate-600 dark:text-slate-400">
              {evidence.data?.task?.title || "Loading task…"}
              {evidence.data?.task?.businessName ? ` · ${evidence.data.task.businessName}` : ""}
            </DialogDescription>
          </DialogHeader>

          {evidence.isLoading ? (
            <p className="flex items-center gap-2 py-6 text-xs text-slate-500 dark:text-slate-400">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading documents and calculation…
            </p>
          ) : evidence.error ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              <p className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="size-3.5" aria-hidden="true" />
                Evidence could not be opened.
              </p>
              <p className="mt-1">{evidence.error.message}</p>
            </div>
          ) : evidence.data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ApprovalStatusBadge
                  status={evidence.data.approvalStatus}
                  label={evidence.data.approvalStatusLabel}
                  tone={evidence.data.tone}
                />
                <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  Evidence {evidence.data.evidenceReference || "—"}
                </span>
              </div>

              {!evidence.data.canDecide && (
                <p className="rounded border border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
                  This task is in a state where a new professional decision cannot be recorded. The server will reject
                  one if attempted.
                </p>
              )}

              <EvidenceReviewPanel
                documents={evidence.data.documents ?? []}
                preparation={evidence.data.preparation}
                requirements={evidence.data.requirements ?? []}
                currency="INR"
                locale="en-IN"
              />

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Decision history
                </p>
                <div className="mt-2">
                  <ApprovalHistory history={evidence.data.history ?? []} />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3 dark:border-white/[0.06]">
                <Button size="sm" variant="outline" onClick={() => setInspectingId(null)} className="text-xs">
                  Close
                </Button>
                <Button
                  size="sm"
                  disabled={!evidence.data.canDecide}
                  onClick={() => {
                    setReviewTarget({
                      taskId: evidence.data.task.id,
                      businessId: evidence.data.task.businessId,
                      title: evidence.data.task.title,
                      evidenceReference: evidence.data.evidenceReference,
                    });
                  }}
                  className="text-xs"
                >
                  Record decision
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {reviewTarget && (
        <ReviewActionDialog
          open={Boolean(reviewTarget)}
          onOpenChange={open => { if (!open) setReviewTarget(null); }}
          task={reviewTarget}
          onSubmitted={() => {
            setReviewTarget(null);
            setInspectingId(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
