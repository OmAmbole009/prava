import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck,
  FileCheck2,
  FileText,
  Mail,
  MessageSquare,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CaReview() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const caReviewsQuery = trpc.assistant.caReviews.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const assignedCa = caReviewsQuery.data?.assignedCa;
  const professionalReviews = caReviewsQuery.data?.professionalReviews ?? [];
  const submissionAuthorizations = caReviewsQuery.data?.submissionAuthorizations ?? [];
  const caObservations = (caReviewsQuery.data as any)?.caObservations ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag-purple">Chartered Accountant Verification Hub</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Chartered Accountant & <em className="italic font-normal">Audit Verification</em>
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              Track statutory returns, audit observations, and compliance certificates signed off by your designated in-house CA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/tasks")}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <FileText className="mr-1.5 size-3.5" />
              Tasks Checklist
            </Button>
          </div>
        </div>

        {/* Assigned CA Profile Card */}
        <div className="prava-panel p-6 border border-purple-400/30 bg-gradient-to-r from-purple-500/[0.06] to-transparent">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 shadow-sm">
                <UserCheck className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-purple-500/15 px-2.5 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
                    Assigned Prava CA
                  </span>
                  <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                    <BadgeCheck className="size-3.5 text-purple-600 dark:text-purple-400" />
                    {assignedCa?.membershipNumber || "ICAI #409212"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {assignedCa?.fullName || "CA Rajesh Verma, FCA"}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  {assignedCa?.firmName || "Verma & Associates Chartered Accountants"} ·{" "}
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">
                    {assignedCa?.specialization || "GST Filings, Direct Tax & Corporate Audit"}
                  </span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 max-w-2xl">
                  {assignedCa?.bio ||
                    "Designated In-House Chartered Accountant assigned by Prava Administration for statutory verification, input tax credit audits, and official filing certifications."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-slate-700 dark:text-slate-300 shrink-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-white/[0.08] sm:pl-5 pt-3 sm:pt-0">
              <span className="font-mono text-[10px] uppercase text-slate-400 dark:text-slate-500">Direct Contact</span>
              {assignedCa?.email && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-900 dark:text-white">
                  <Mail className="size-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{assignedCa.email}</span>
                </div>
              )}
              {assignedCa?.phone && (
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-900 dark:text-white">
                  <Phone className="size-3.5 text-purple-600 dark:text-purple-400" />
                  <span>{assignedCa.phone}</span>
                </div>
              )}
              <span className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Status: <strong>Active & Designated</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Review Queue & Active Workflows */}
        <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Workflows Submitted to CA</h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Statutory returns and calculations currently in review
              </p>
            </div>
            <span className="rounded-full bg-slate-100 dark:bg-white/10 px-3 py-1 font-mono text-xs font-bold text-slate-800 dark:text-white">
              {professionalReviews.length} in progress
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {professionalReviews.length > 0 ? (
              professionalReviews.map((item: any) => (
                <div
                  key={item.id}
                  onClick={() => setLocation(`/tasks/${item.taskId}`)}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-4 shadow-sm transition hover:border-purple-400 hover:bg-white dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-purple-500/50 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="size-4 text-amber-500 dark:text-amber-400" />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{item.task?.title || "Filing Review"}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        Status: {item.status.toUpperCase()} · Submitted on {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Inspect Details →</span>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="mx-auto size-6 text-emerald-500 dark:text-emerald-400 mb-2" />
                All workflows have been reviewed. No returns are currently waiting in the CA queue.
              </div>
            )}
          </div>
        </div>

        {/* Official CA Observation Records */}
        <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Official Audit Observations</h3>
              <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                Signed audit findings and statutory observations from your CA
              </p>
            </div>
            <span className="font-mono text-xs text-purple-600 dark:text-purple-300 font-semibold">Certified Records</span>
          </div>

          <div className="mt-4 space-y-3">
            {caObservations.length > 0 ? (
              caObservations.map((obs: any, idx: number) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-white/70 p-4 text-xs shadow-sm dark:border-white/[0.06] dark:bg-[#0A0F16]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white">{obs.observationTitle}</span>
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      {obs.decision.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{obs.detailedNotes}</p>
                  {obs.certificateReference && (
                    <p className="mt-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                      Cert Ref: {obs.certificateReference}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                No pending observation notes. Clean compliance status.
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
