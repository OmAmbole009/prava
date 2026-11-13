import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

const DECISION_STYLES = {
  approved: {
    label: "Approved",
    classes: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    Icon: CheckCircle2,
  },
  needs_revision: {
    label: "Changes requested",
    classes: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    Icon: Clock3,
  },
  rejected: {
    label: "Rejected",
    classes: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    Icon: XCircle,
  },
};

/**
 * Append-only professional decision history. Historical approvals are always
 * shown with their invalidation state so they can never read as current.
 */
export default function ApprovalHistory({ history = [], emptyMessage }) {
  if (!history.length) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-4 text-[11px] text-slate-600 dark:border-white/10 dark:text-slate-400">
        {emptyMessage || "No professional decision has been recorded for this task yet."}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {history.map(item => {
        const style = DECISION_STYLES[item.decision] ?? DECISION_STYLES.needs_revision;
        const { Icon } = style;
        const invalidated = Boolean(item.invalidatedAt) || item.stale;
        return (
          <li key={item.id} className="rounded-lg border border-slate-200 bg-white/70 p-3 dark:border-white/[0.06] dark:bg-[#0A0F16]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold ${style.classes}`}>
                  <Icon className="size-3" aria-hidden="true" />
                  {style.label}
                </span>
                {invalidated && (
                  <span className="inline-flex items-center gap-1 rounded border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:text-red-400">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    No longer valid
                  </span>
                )}
              </div>
              <time className="text-[10px] text-slate-500 dark:text-slate-400" dateTime={item.createdAt}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Unknown time"}
              </time>
            </div>

            <p className="mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">{item.observationTitle}</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">{item.detailedNotes}</p>

            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[10px] dark:border-white/[0.06]">
              <div>
                <dt className="inline text-slate-500 dark:text-slate-400">Reviewer: </dt>
                <dd className="inline text-slate-900 dark:text-white">
                  {item.caName || `User #${item.caUserId}`}
                  {item.membershipNumber ? ` · ${item.membershipNumber}` : ""}
                </dd>
              </div>
              {item.evidenceReference && (
                <div>
                  <dt className="inline text-slate-500 dark:text-slate-400">Evidence ref: </dt>
                  <dd className="inline font-mono text-slate-900 dark:text-white">{item.evidenceReference}</dd>
                </div>
              )}
              {item.certificateReference && (
                <div>
                  <dt className="inline text-slate-500 dark:text-slate-400">Certificate: </dt>
                  <dd className="inline font-mono text-slate-900 dark:text-white">{item.certificateReference}</dd>
                </div>
              )}
              {item.invalidatedAt && (
                <div>
                  <dt className="inline text-slate-500 dark:text-slate-400">Invalidated: </dt>
                  <dd className="inline text-red-600 dark:text-red-400">
                    {item.invalidationReason || new Date(item.invalidatedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {!item.invalidatedAt && item.stale && (
                <div>
                  <dt className="inline text-slate-500 dark:text-slate-400">Reason: </dt>
                  <dd className="inline text-red-600 dark:text-red-400">Reviewed evidence has changed since this decision.</dd>
                </div>
              )}
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
