import { Check, Circle, X } from "lucide-react";

const STEPS = [
  { key: "submitted", label: "Work prepared", reachedBy: ["awaiting_ca_review", "under_ca_review", "changes_requested", "approved", "approval_invalidated", "awaiting_client_authorization", "authorized_for_execution", "submitted", "completed"] },
  { key: "review", label: "CA review", reachedBy: ["under_ca_review", "changes_requested", "approved", "approval_invalidated", "awaiting_client_authorization", "authorized_for_execution", "submitted", "completed"] },
  { key: "decision", label: "Professional decision", reachedBy: ["approved", "approval_invalidated", "awaiting_client_authorization", "authorized_for_execution", "submitted", "completed", "changes_requested"] },
  { key: "authorization", label: "Client authorization", reachedBy: ["awaiting_client_authorization", "authorized_for_execution", "submitted", "completed"] },
  { key: "filing", label: "Provider submission", reachedBy: ["submitted", "completed"] },
];

/**
 * A compact, non-decorative progress indicator. It reports which lifecycle
 * stages the stored records show, and marks the stage that needs attention.
 */
export default function ApprovalTimeline({ status }) {
  const failed = ["rejected", "approval_invalidated"].includes(status);
  const currentIndex = (() => {
    if (status === "approval_invalidated") return 2;
    if (status === "changes_requested") return 2;
    if (status === "approved") return 2;
    if (status === "awaiting_client_authorization") return 3;
    if (status === "authorized_for_execution") return 4;
    if (status === "submitted" || status === "completed") return 5;
    if (status === "under_ca_review") return 1;
    if (status === "awaiting_ca_review") return 1;
    return 0;
  })();

  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-1" aria-label="Approval progress">
      {STEPS.map((step, index) => {
        const done = STEPS[index].reachedBy.includes(status) && index < currentIndex;
        const active = index === currentIndex && status !== "not_submitted";
        const isFailure = failed && index === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5">
            <span className="flex items-center gap-2 sm:w-full">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  isFailure
                    ? "border-red-500/40 bg-red-500/15 text-red-600 dark:text-red-400"
                    : done
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : active
                        ? "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300"
                        : "border-slate-300 bg-white text-slate-400 dark:border-white/15 dark:bg-transparent dark:text-slate-500"
                }`}
              >
                {isFailure ? <X className="size-3" aria-hidden="true" /> : done ? <Check className="size-3" aria-hidden="true" /> : <Circle className="size-2.5" aria-hidden="true" />}
              </span>
              <span
                className={`text-[11px] font-medium ${
                  isFailure
                    ? "text-red-600 dark:text-red-400"
                    : done || active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                }`}
              >
                {step.label}
                <span className="sr-only">{done ? " (completed)" : active ? " (current stage)" : " (not started)"}</span>
              </span>
            </span>
            {index < STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`hidden h-px flex-1 sm:block ${
                  done ? "bg-emerald-500/40" : "bg-slate-200 dark:bg-white/10"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
