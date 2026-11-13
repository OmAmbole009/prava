import {
  AlertTriangle,
  CheckCheck,
  CheckCircle2,
  Circle,
  Clock4,
  FileCheck2,
  KeyRound,
  PauseCircle,
  Send,
  ShieldAlert,
  XCircle,
} from "lucide-react";

const TONE_CLASSES = {
  neutral: "border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  danger: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_ICONS = {
  not_submitted: Circle,
  awaiting_ca_review: Clock4,
  under_ca_review: FileCheck2,
  changes_requested: AlertTriangle,
  approved: CheckCircle2,
  approval_invalidated: ShieldAlert,
  awaiting_client_authorization: KeyRound,
  authorized_for_execution: Send,
  submitted: FileCheck2,
  completed: CheckCheck,
  rejected: XCircle,
  on_hold: PauseCircle,
};

const STATUS_LABELS = {
  not_submitted: "Not submitted",
  awaiting_ca_review: "Awaiting CA review",
  under_ca_review: "Under CA review",
  changes_requested: "Changes requested",
  approved: "Approved",
  approval_invalidated: "Approval invalidated",
  awaiting_client_authorization: "Awaiting client authorization",
  authorized_for_execution: "Authorized for execution",
  submitted: "Submitted",
  completed: "Completed",
  rejected: "Rejected",
  on_hold: "On hold",
};

/**
 * Status is always conveyed by icon and text, never colour alone.
 */
export default function ApprovalStatusBadge({ status, label, tone = "neutral", className = "" }) {
  const Icon = STATUS_ICONS[status] ?? Circle;
  const text = label || STATUS_LABELS[status] || String(status ?? "Unknown").replaceAll("_", " ");
  const toneClass = TONE_CLASSES[tone] ?? TONE_CLASSES.neutral;

  return (
    <span
      data-approval-status={status}
      className={`inline-flex w-fit items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-semibold ${toneClass} ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {text}
    </span>
  );
}
