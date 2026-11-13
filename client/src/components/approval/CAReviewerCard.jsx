import { BadgeCheck, UserRoundCheck, UserRoundX } from "lucide-react";

/**
 * Shows the assigned professional exactly as recorded on the server. When no
 * assignment exists it says so rather than presenting a placeholder identity.
 */
export default function CAReviewerCard({ assignedCa, compact = false }) {
  if (!assignedCa) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-4 dark:border-white/10">
        <div className="flex items-start gap-2.5">
          <UserRoundX className="mt-0.5 size-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">No Chartered Accountant assigned</p>
            <p className="mt-0.5 text-[11px] leading-5 text-slate-600 dark:text-slate-400">
              A Prava administrator assigns a professional to this workspace. Review cannot begin until an
              assignment exists, so this task cannot be approved by anyone else.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/[0.08] dark:bg-[#0A0F16]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300">
            <UserRoundCheck className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{assignedCa.fullName}</p>
            <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
              {assignedCa.firmName || "Independent practice"}
              {assignedCa.specialization ? ` · ${assignedCa.specialization}` : ""}
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
          <BadgeCheck className="size-3" aria-hidden="true" />
          Active assignment
        </span>
      </div>

      {!compact && (
        <dl className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-200 pt-3 text-[11px] sm:grid-cols-2 dark:border-white/[0.06]">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Membership number</dt>
            <dd className="font-mono font-semibold text-slate-900 dark:text-white">{assignedCa.membershipNumber}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Assigned since</dt>
            <dd className="text-slate-900 dark:text-white">
              {assignedCa.assignedAt ? new Date(assignedCa.assignedAt).toLocaleDateString() : "Not recorded"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500 dark:text-slate-400">Contact</dt>
            <dd className="truncate text-slate-900 dark:text-white">{assignedCa.email}</dd>
          </div>
        </dl>
      )}

      <p className="mt-3 text-[10px] leading-4 text-slate-500 dark:text-slate-400">
        Prava records membership details after a documented manual check. This is not an ICAI verification claim.
      </p>
    </div>
  );
}
