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
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[#dfd6c4] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-kicker">Professional Verification</span>
            <h1 className="prava-display mt-2 text-4xl text-[#153832]">
              Chartered Accountant & Professional Review
            </h1>
            <p className="mt-2 text-sm text-[#65766e]">
              Track the progress of financial returns, audit questions, and tax filings currently in review with your designated in-house CA.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26]"
            >
              <Sparkles className="mr-2 size-4 text-[#d9e8be]" />
              Ask Prava
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/tasks")}
              className="rounded-full border-[#cfc4b1] text-[#24473e] hover:bg-[#eee8dc]"
            >
              <FileText className="mr-2 size-4" />
              View Tasks Checklist
            </Button>
          </div>
        </div>

        {/* Assigned Chartered Accountant Card */}
        <div className="overflow-hidden rounded-2xl border border-[#cfe0c8] bg-[#f2f8f0] p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-[#163a34] text-[#d9e8be] shadow-sm">
                <UserCheck className="size-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#163a34] px-2.5 py-0.5 text-[11px] font-bold text-[#d9e8be]">
                    Assigned Prava CA
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-[#275344]">
                    <BadgeCheck className="size-3.5" />
                    {assignedCa?.membershipNumber || "ICAI #409212"}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-[#143831]">
                  {assignedCa?.fullName || "CA Rajesh Verma, FCA"}
                </h2>
                <p className="text-xs text-[#527063]">
                  {assignedCa?.firmName || "Verma & Associates Chartered Accountants"} ·{" "}
                  <span className="font-medium text-[#1c473b]">
                    {assignedCa?.specialization || "GST Filings, Direct Tax & Corporate Audit"}
                  </span>
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#4a6b5c] max-w-2xl">
                  {assignedCa?.bio ||
                    "Designated In-House Chartered Accountant assigned by Prava Administration for statutory verification, input tax credit audits, and official filing certifications."}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 text-xs text-[#3f6354] shrink-0 border-t sm:border-t-0 sm:border-l border-[#d3e3cd] sm:pl-5 pt-3 sm:pt-0">
              <span className="font-bold text-[#163a34]">Direct CA Coordination</span>
              {assignedCa?.email && (
                <div className="flex items-center gap-1.5 text-xs text-[#2c5344]">
                  <Mail className="size-3.5" />
                  <span>{assignedCa.email}</span>
                </div>
              )}
              {assignedCa?.phone && (
                <div className="flex items-center gap-1.5 text-xs text-[#2c5344]">
                  <Phone className="size-3.5" />
                  <span>{assignedCa.phone}</span>
                </div>
              )}
              <span className="mt-1 text-[11px] text-[#69887b]">
                Status: <strong>Active & Designated</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 1. Items in Review with CA */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ece4d6] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#163a34]">Workflows Submitted to CA</h2>
              <p className="text-xs text-[#718279]">
                Returns and statements sent for professional examination
              </p>
            </div>
            <span className="rounded-full bg-[#e5efe1] px-3 py-1 text-xs font-bold text-[#2b5847]">
              {professionalReviews.length} in progress
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {professionalReviews.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#72837b]">
                <Clock className="mx-auto mb-2 size-6 text-[#9bb3a6]" />
                No items are currently in CA review. When you finish a tax preparation checklist, you can click "Request advisor review" to send it here.
              </div>
            ) : (
              professionalReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-[#ece4d6] bg-white p-5 transition hover:border-[#a8c0b2]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#193d33]">{rev.taskTitle}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            rev.status === "completed"
                              ? "bg-[#e5efe1] text-[#2c5847]"
                              : rev.status === "declined"
                              ? "bg-[#fae7d4] text-[#8e4c19]"
                              : "bg-[#eaf4fc] text-[#1f5682]"
                          }`}
                        >
                          {rev.status === "in_review"
                            ? "CA Reviewing"
                            : rev.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#708078]">
                        Submitted for review on{" "}
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setLocation(`/tasks/${rev.taskId}`)}
                      className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
                    >
                      Open Task Details
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </div>

                  {rev.note && (
                    <div className="mt-4 rounded-lg bg-[#f8f5ec] p-3 text-xs text-[#4c6d61] flex items-start gap-2">
                      <MessageSquare className="mt-0.5 size-3.5 shrink-0 text-[#b77a43]" />
                      <span>
                        <strong>CA Review Request Note:</strong> {rev.note}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 2. Official CA Audit Observations & Sign-off Certificates */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ece4d6] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#163a34]">Official CA Audit Observations & Certificates</h2>
              <p className="text-xs text-[#718279]">
                Professional examination findings and statutory sign-offs issued by your assigned Chartered Accountant.
              </p>
            </div>
            <span className="rounded-full bg-[#e5efe1] px-3 py-1 text-xs font-bold text-[#2b5847]">
              {caObservations.length} Certified Records
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {caObservations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#72837b]">
                <FileCheck className="mx-auto mb-2 size-6 text-[#9bb3a6]" />
                No statutory audit observations recorded yet. Observations will appear once your CA approves or reviews a return.
              </div>
            ) : (
              caObservations.map((obs: any) => (
                <div
                  key={obs.id}
                  className="rounded-xl border border-[#d8e5d3] bg-[#f4f9f2] p-5 space-y-2.5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          obs.decision === "approved"
                            ? "bg-[#163a34] text-[#d9e8be]"
                            : "bg-[#fae7d4] text-[#8e4c19]"
                        }`}
                      >
                        {obs.decision.toUpperCase()}
                      </span>
                      <span className="font-bold text-sm text-[#143831]">{obs.observationTitle}</span>
                    </div>
                    {obs.certificateReference && (
                      <span className="font-mono text-xs font-semibold text-[#255845] bg-[#e4f0e0] px-2.5 py-0.5 rounded-full">
                        Cert Ref: {obs.certificateReference}
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-[#3a5d4e]">{obs.detailedNotes}</p>
                  <p className="text-[11px] text-[#6d8a7c]">
                    Issued by Assigned Chartered Accountant on {new Date(obs.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 3. Authorized Submissions & Sign-offs */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ece4d6] pb-4">
            <div>
              <h2 className="text-lg font-bold text-[#163a34]">Authorized Filings & Final Sign-Offs</h2>
              <p className="text-xs text-[#718279]">
                Returns approved by independent reviewer ready for dispatch authorization
              </p>
            </div>
            <span className="rounded-full bg-[#fae7d4] px-3 py-1 text-xs font-bold text-[#8e4c19]">
              {submissionAuthorizations.length} authorization records
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {submissionAuthorizations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#72837b]">
                <FileCheck className="mx-auto mb-2 size-6 text-[#9bb3a6]" />
                No returns awaiting authorized submission. Once a return is prepared and approved, authorization records appear here.
              </div>
            ) : (
              submissionAuthorizations.map((sub) => (
                <div
                  key={sub.id}
                  className="rounded-xl border border-[#ece4d6] bg-white p-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[#193d33]">{sub.taskTitle}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            sub.status === "approved" || sub.status === "submitted"
                              ? "bg-[#e5efe1] text-[#2c5847]"
                              : "bg-[#fae7d4] text-[#8e4c19]"
                          }`}
                        >
                          {sub.status.replaceAll("_", " ")}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#708078]">
                        Requested on {new Date(sub.createdAt).toLocaleDateString()}
                        {sub.approvedAt
                          ? ` · Approved on ${new Date(sub.approvedAt).toLocaleDateString()}`
                          : ""}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => setLocation(`/tasks/${sub.taskId}`)}
                      className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
                    >
                      Review & Authorize
                      <ArrowRight className="ml-1.5 size-3.5" />
                    </Button>
                  </div>

                  {sub.reviewerNote && (
                    <div className="mt-3 rounded-lg bg-[#f0f7ee] p-3 text-xs text-[#2b5847]">
                      <strong>Reviewer Feedback:</strong> {sub.reviewerNote}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

