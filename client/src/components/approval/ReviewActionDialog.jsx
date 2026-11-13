import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

const DECISIONS = [
  { value: "approved", label: "Approve this version" },
  { value: "needs_revision", label: "Request changes" },
  { value: "rejected", label: "Reject the task" },
];

/**
 * A professional decision requires explicit confirmation that the underlying
 * evidence was inspected. Errors from the server are surfaced verbatim.
 */
export default function ReviewActionDialog({ open, onOpenChange, task, onSubmitted }) {
  const queryClient = useQueryClient();
  const [decision, setDecision] = useState("approved");
  const [observationTitle, setObservationTitle] = useState("");
  const [detailedNotes, setDetailedNotes] = useState("");
  const [certificateReference, setCertificateReference] = useState("");
  const [evidenceReviewed, setEvidenceReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDecision("approved");
    setObservationTitle("");
    setDetailedNotes("");
    setCertificateReference("");
    setEvidenceReviewed(false);
    setConfirmed(false);
  }, [open]);

  const submit = useMutation({
    mutationFn: () =>
      api.ca.submitDecision({
        taskId: task.taskId,
        businessId: task.businessId,
        decision,
        observationTitle: observationTitle.trim(),
        detailedNotes: detailedNotes.trim(),
        certificateReference: certificateReference.trim() || undefined,
      }),
    onSuccess: result => {
      toast.success(
        decision === "approved"
          ? `Approval recorded (${result.certificateReference}).`
          : `Decision "${decision.replaceAll("_", " ")}" recorded.`,
      );
      queryClient.invalidateQueries({ queryKey: ["ca"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      onOpenChange(false);
      onSubmitted?.(result);
    },
    onError: error => {
      // Never show success when the backend rejected the decision.
      toast.error(error.message || "The decision could not be recorded.");
    },
  });

  const notesValid = detailedNotes.trim().length >= 10;
  const titleValid = observationTitle.trim().length >= 3;
  const consequential = decision !== "needs_revision";
  const canSubmit = notesValid && titleValid && evidenceReviewed && (!consequential || confirmed) && !submit.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0F1620] dark:text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            Record professional decision
          </DialogTitle>
          <DialogDescription className="text-[11px] text-slate-600 dark:text-slate-400">
            {task?.title || "Task"} · Evidence ref {task?.evidenceReference || "pending"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="ca-decision" className="text-[11px]">Decision</Label>
            <select
              id="ca-decision"
              value={decision}
              onChange={event => {
                setDecision(event.target.value);
                setConfirmed(false);
              }}
              className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
            >
              {DECISIONS.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="ca-title" className="text-[11px]">Observation title</Label>
            <Input
              id="ca-title"
              value={observationTitle}
              onChange={event => setObservationTitle(event.target.value)}
              maxLength={200}
              placeholder="e.g. GSTR-3B computation and ITC cross-checked"
              className="mt-1 h-9 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="ca-notes" className="text-[11px]">Review notes (minimum 10 characters)</Label>
            <Textarea
              id="ca-notes"
              value={detailedNotes}
              onChange={event => setDetailedNotes(event.target.value)}
              maxLength={3000}
              rows={4}
              placeholder="What did you inspect, and what did you conclude?"
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="ca-cert" className="text-[11px]">Certificate reference (optional)</Label>
            <Input
              id="ca-cert"
              value={certificateReference}
              onChange={event => setCertificateReference(event.target.value)}
              maxLength={128}
              placeholder="Auto-generated when left blank"
              className="mt-1 h-9 font-mono text-xs"
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={evidenceReviewed}
              onChange={event => setEvidenceReviewed(event.target.checked)}
              className="mt-0.5 size-4 accent-slate-900 dark:accent-white"
            />
            <span>I inspected the source documents and the prepared calculation for this exact version.</span>
          </label>

          {consequential && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
              <p className="flex items-start gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                A recorded decision is attributable and permanent. Later changes to this evidence will invalidate the
                approval rather than overwrite it.
              </p>
              <label className="mt-2 flex items-start gap-2 text-[11px] font-medium text-amber-900 dark:text-amber-100">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={event => setConfirmed(event.target.checked)}
                  className="mt-0.5 size-4 accent-slate-900 dark:accent-white"
                />
                <span>I confirm this decision for the evidence shown.</span>
              </label>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submit.isPending} className="text-xs">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            className="text-xs"
          >
            {submit.isPending ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden="true" />
                Recording…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-1.5 size-3.5" aria-hidden="true" />
                Record decision
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
