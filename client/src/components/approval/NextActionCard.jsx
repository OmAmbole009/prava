import { ArrowRight, Info } from "lucide-react";
import ApprovalStatusBadge from "./ApprovalStatusBadge";

/**
 * The single most important thing the business owner must do next, derived from
 * the stored approval state. When no owner action is possible the card explains
 * who is responsible instead of offering a disabled mystery button.
 */
export default function NextActionCard({ approvalStatus, label, tone, nextAction, assignedCa, validityReason, onAction, actionLabel }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/[0.08] dark:bg-[#0A0F16]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Next required action</p>
        <ApprovalStatusBadge status={approvalStatus} label={label} tone={tone} />
      </div>

      {nextAction ? (
        <>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{nextAction.label}</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-600 dark:text-slate-400">{nextAction.description}</p>
        </>
      ) : (
        <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">No next action is available for this state.</p>
      )}

      {validityReason && (
        <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] font-medium text-red-700 dark:text-red-300">
          {validityReason}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {nextAction?.allowed && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:bg-white dark:text-black dark:hover:bg-slate-100 dark:focus-visible:outline-white"
          >
            {actionLabel || nextAction.label}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </button>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info className="size-3.5" aria-hidden="true" />
            {assignedCa
              ? `Responsibility sits with ${assignedCa.fullName}.`
              : "No assigned professional is recorded for this workspace."}
          </p>
        )}
      </div>
    </div>
  );
}
