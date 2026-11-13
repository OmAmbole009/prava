import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, KeyRound, Lock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { api } from "@/lib/api";
import ApprovalStatusBadge from "./ApprovalStatusBadge";

/**
 * Client authorization is deliberately separate from professional approval.
 * Nothing here can execute a filing; it records the owner's authorization and
 * the independent approval required before a configured provider may dispatch.
 */
export default function ClientAuthorizationPanel({ taskId, approvalView, onChanged }) {
  const { user } = useAuth();
  const [acknowledged, setAcknowledged] = useState(false);
  const [note, setNote] = useState("");

  const requestAuthorization = useMutation({
    mutationFn: () => api.tasks.requestAuthorizedSubmission({ taskId, acknowledgement: true }),
    onSuccess: () => {
      toast.success("Authorization request recorded. An independent workspace administrator must confirm it.");
      setAcknowledged(false);
      onChanged?.();
    },
    onError: error => toast.error(error.message),
  });

  const approveAuthorization = useMutation({
    mutationFn: () => api.tasks.approveAuthorizedSubmission({ taskId, reviewerNote: note.trim() }),
    onSuccess: () => {
      toast.success("Authorization approved. No filing occurs until a configured provider confirms dispatch.");
      setNote("");
      onChanged?.();
    },
    onError: error => toast.error(error.message),
  });

  const status = approvalView?.approvalStatus;
  const approval = approvalView?.currentApproval;
  const submission = approvalView?.submissionRequest;
  const valid = approvalView?.approvalValid;

  if (status !== "approved" && status !== "awaiting_client_authorization" && status !== "authorized_for_execution") {
    return null;
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/70 p-4 dark:border-white/[0.08] dark:bg-[#0A0F16]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          <KeyRound className="size-3.5" aria-hidden="true" />
          Client authorization
        </p>
        <ApprovalStatusBadge status={status} label={approvalView?.approvalStatusLabel} tone={approvalView?.tone} />
      </div>

      {status === "approved" && (
        <>
          <p className="mt-2 text-xs leading-5 text-slate-700 dark:text-slate-300">
            {approval?.caName || "Your assigned CA"} approved this task for the current evidence on{" "}
            {approval?.createdAt ? new Date(approval.createdAt).toLocaleString() : "a recorded date"}. Authorization
            is a separate decision that only you (or an authorised workspace administrator) can make.
          </p>
          <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/10 p-2.5">
            <p className="flex items-start gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Approving authorization does not file anything. Without a configured authorised provider the task stops
              at &ldquo;authorized for execution&rdquo;; no acknowledgement will be invented.
            </p>
          </div>
          <label className="mt-3 flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={event => setAcknowledged(event.target.checked)}
              className="mt-0.5 size-4 accent-slate-900 dark:accent-white"
            />
            <span>I have reviewed the prepared figures and authorise Prava to proceed with this submission.</span>
          </label>
          <button
            type="button"
            disabled={!acknowledged || requestAuthorization.isPending}
            onClick={() => requestAuthorization.mutate()}
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
          >
            <Send className="size-3.5" aria-hidden="true" />
            {requestAuthorization.isPending ? "Recording…" : "Request authorization"}
          </button>
        </>
      )}

      {status === "awaiting_client_authorization" && (
        <>
          <dl className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Professional approval</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {approval?.caName || "Reviewed"} · Ref {approvalView?.evidenceReference || "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Requested by</dt>
              <dd className="text-slate-900 dark:text-white">User #{submission?.requestedByUserId ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500 dark:text-slate-400">Approval still valid</dt>
              <dd className={valid ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                {valid ? "Yes" : "No — evidence changed"}
              </dd>
            </div>
          </dl>

          {!valid ? (
            <p className="mt-2 rounded border border-red-500/30 bg-red-500/10 p-2 text-[11px] text-red-700 dark:text-red-300">
              The professional approval behind this request is no longer valid, so execution actions stay locked. A
              fresh review is required.
            </p>
          ) : user && Number(submission?.requestedByUserId) === Number(user.id) ? (
            <p className="mt-2 flex items-center gap-1.5 rounded border border-slate-300 bg-slate-50 p-2 text-[11px] text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
              <Lock className="size-3.5" aria-hidden="true" />
              You requested this authorization. A different workspace administrator must confirm it.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={event => setNote(event.target.value)}
                minLength={8}
                maxLength={1000}
                placeholder="Independent reviewer note (minimum 8 characters)"
                className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
              />
              <button
                type="button"
                disabled={note.trim().length < 8 || approveAuthorization.isPending}
                onClick={() => approveAuthorization.mutate()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black"
              >
                <KeyRound className="size-3.5" aria-hidden="true" />
                {approveAuthorization.isPending ? "Recording…" : "Confirm authorization"}
              </button>
            </div>
          )}
        </>
      )}

      {status === "authorized_for_execution" && (
        <p className="mt-2 text-[11px] leading-5 text-slate-700 dark:text-slate-300">
          Authorization is recorded{submission?.approvedAt ? ` on ${new Date(submission.approvedAt).toLocaleString()}` : ""}.{" "}
          {submission?.providerName
            ? `Provider ${submission.providerName} is handling dispatch.`
            : "No authorised filing provider is configured, so nothing has been transmitted and no acknowledgement exists."}
        </p>
      )}
    </div>
  );
}
