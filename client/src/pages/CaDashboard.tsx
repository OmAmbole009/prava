import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileText,
  HelpCircle,
  History,
  Layers,
  Loader2,
  Receipt,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CaDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const dashboardQuery = trpc.ca.dashboard.useQuery(undefined, { retry: false });
  const workspacesQuery = trpc.ca.workspaces.useQuery(undefined, { retry: false });
  const queueQuery = trpc.ca.reviewQueue.useQuery(undefined, { retry: false });

  // Audit Modal State
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<{
    taskId: number;
    businessId: number;
    businessName: string;
    taskTitle: string;
    gstPreparation?: {
      salesMinor: number;
      taxableValueMinor: number;
      cgstMinor: number;
      sgstMinor: number;
      igstMinor: number;
      inputTaxCreditMinor: number;
      netTaxPositionMinor: number;
    };
  } | null>(null);

  const [decision, setDecision] = useState<"approved" | "needs_revision" | "rejected">("approved");
  const [observationTitle, setObservationTitle] = useState("");
  const [detailedNotes, setDetailedNotes] = useState("");
  const [certificateReference, setCertificateReference] = useState("");

  const submitDecision = trpc.ca.submitDecision.useMutation({
    onSuccess: (data) => {
      toast.success(
        data.decision === "approved"
          ? `CA Approval & Audit Certificate ${data.certificateReference} issued successfully!`
          : `Review decision "${data.decision}" recorded and sent to client.`
      );
      setIsAuditModalOpen(false);
      resetAuditForm();
      utils.ca.dashboard.invalidate();
      utils.ca.reviewQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetAuditForm = () => {
    setSelectedTask(null);
    setDecision("approved");
    setObservationTitle("");
    setDetailedNotes("");
    setCertificateReference("");
  };

  const handleOpenAuditModal = (task: {
    taskId: number;
    businessId: number;
    businessName: string;
    taskTitle: string;
    gstPreparation?: {
      salesMinor: number;
      taxableValueMinor: number;
      cgstMinor: number;
      sgstMinor: number;
      igstMinor: number;
      inputTaxCreditMinor: number;
      netTaxPositionMinor: number;
    };
  }) => {
    setSelectedTask(task);
    setDecision("approved");
    setObservationTitle("Statutory Tax Computation & ITC Verification Verified");
    setDetailedNotes(
      "All sales invoices and claimed input tax credits have been audited against statutory criteria and supplier filings. Net tax position is reconciled."
    );
    setCertificateReference(
      `CA-CERT-${new Date().getFullYear()}-Q3-${Math.floor(1000 + Math.random() * 9000)}`
    );
    setIsAuditModalOpen(true);
  };

  const handleAuditSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !observationTitle || !detailedNotes) return;
    submitDecision.mutate({
      taskId: selectedTask.taskId,
      businessId: selectedTask.businessId,
      decision,
      observationTitle,
      detailedNotes,
      certificateReference: certificateReference || undefined,
    });
  };

  const caProfile = dashboardQuery.data?.caProfile;
  const reviewQueue = queueQuery.data?.reviewRequests ?? [];
  const gstSubmissions = queueQuery.data?.gstSubmissions ?? [];
  const historicalObservations = queueQuery.data?.historicalObservations ?? [];
  const assignedWorkspaces = workspacesQuery.data ?? [];

  const formatCurrency = (minor: number) => {
    return `₹${(minor / 100).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* CA Hero Header */}
        <section className="prava-panel relative overflow-hidden p-7 sm:p-9 border border-purple-400/30 bg-gradient-to-r from-purple-500/[0.08] to-transparent">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="prava-tag-purple">Prava In-House Chartered Accountant</span>
              <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
                {caProfile?.fullName || "Chartered Accountant"} <em className="italic font-normal">Review Desk</em>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {caProfile?.membershipNumber || "ICAI #409212"}
                </span>
                <span>·</span>
                <span>{caProfile?.firmName || "Verma & Associates CA"}</span>
                <span>·</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">{caProfile?.specialization || "GST & Direct Tax Audit"}</span>
              </div>
              <p className="mt-3 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {caProfile?.bio ||
                  "Senior Fellow Chartered Accountant authorized to perform statutory audit reviews, reconcile supplier tax invoices, and issue formal filing certificates."}
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <span className="rounded-xl border border-purple-400/30 bg-purple-500/10 px-3.5 py-1.5 text-center font-mono text-xs font-bold text-purple-700 dark:text-purple-300">
                Verified Partner Status: Active
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-slate-200/80 dark:border-white/[0.08] pt-6">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Assigned Workspaces</p>
              <p className="prava-mono mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                {dashboardQuery.data?.assignedBusinessesCount ?? 1}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-amber-600 dark:text-amber-400">Awaiting CA Review</p>
              <p className="prava-mono mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {reviewQueue.length + gstSubmissions.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Certified Sign-Offs</p>
              <p className="prava-mono mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {dashboardQuery.data?.completedReviewsCount ?? historicalObservations.length}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-sky-600 dark:text-sky-400">Statutory Clearance</p>
              <p className="prava-mono mt-1 text-2xl font-bold text-slate-900 dark:text-white">100% Verified</p>
            </div>
          </div>
        </section>

        {/* Tabbed Navigation */}
        <Tabs defaultValue="review-queue" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-[#0D131A] p-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 shadow-sm">
            <TabsTrigger
              value="review-queue"
              className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            >
              <FileCheck2 className="mr-2 size-4" />
              Review Queue ({reviewQueue.length + gstSubmissions.length})
            </TabsTrigger>
            <TabsTrigger
              value="assigned-clients"
              className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            >
              <Building2 className="mr-2 size-4" />
              Assigned Clients ({assignedWorkspaces.length})
            </TabsTrigger>
            <TabsTrigger
              value="certificates"
              className="rounded-xl data-[state=active]:bg-slate-900 data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black"
            >
              <History className="mr-2 size-4" />
              Audit Sign-Offs ({historicalObservations.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Review Queue */}
          <TabsContent value="review-queue" className="mt-6 space-y-6">
            <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
                <div>
                  <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-normal text-slate-900 dark:text-white">Tax Returns & Compliance Workflows</h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Examine client return computations, verify ITC documentation, and submit statutory certifications.
                  </p>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.08] px-3 py-1 text-xs font-bold text-slate-900 dark:text-white">
                  {reviewQueue.length} Returns In Review
                </span>
              </div>

              {reviewQueue.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto size-9 text-emerald-500 dark:text-emerald-400" />
                  <p className="mt-3 text-sm font-bold text-slate-900 dark:text-white">Review desk is clear!</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    No client return workflows are pending CA examination.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {reviewQueue.map((item) => (
                    <div
                      key={item.id}
                      className="prava-card p-5 border border-slate-200 dark:border-white/[0.08]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-slate-100 dark:bg-white/[0.08] px-2 py-0.5 text-[11px] font-bold text-slate-900 dark:text-white">
                              {item.businessName || "Acme Global Solutions"}
                            </span>
                            <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              Submitted {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.taskTitle}</h3>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                            {item.note || "Client requested professional CA verification for this tax period."}
                          </p>
                        </div>

                        <Button
                          onClick={() =>
                            handleOpenAuditModal({
                              taskId: item.taskId,
                              businessId: item.businessId,
                              businessName: item.businessName || "Acme Global Solutions",
                              taskTitle: item.taskTitle,
                              gstPreparation: (item as any).gstPreparation,
                            })
                          }
                          className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shrink-0"
                        >
                          <ShieldCheck className="mr-1.5 size-4" />
                          Audit & Certify Return
                        </Button>
                      </div>

                      {/* Summary Figures Box if present */}
                      {(item as any).gstPreparation && (
                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-white/[0.06] dark:bg-[#080B0F] p-3 sm:grid-cols-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Total Sales</span>
                            <p className="prava-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency((item as any).gstPreparation.salesMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Output Tax</span>
                            <p className="prava-mono font-bold text-slate-900 dark:text-white">
                              {formatCurrency((item as any).gstPreparation.cgstMinor + (item as any).gstPreparation.sgstMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">Eligible ITC</span>
                            <p className="prava-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {formatCurrency((item as any).gstPreparation.inputTaxCreditMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-mono text-amber-600 dark:text-amber-400">Net Tax Liability</span>
                            <p className="prava-mono font-bold text-amber-600 dark:text-amber-400">
                              {formatCurrency((item as any).gstPreparation.netTaxPositionMinor)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 2: Assigned Clients */}
          <TabsContent value="assigned-clients" className="mt-6">
            <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 shadow-md">
              <div className="border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-normal text-slate-900 dark:text-white">Assigned Client Businesses</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Workspaces designated to you by Prava Administration for continuous accounting & statutory oversight.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {assignedWorkspaces.map((biz) => (
                  <div
                    key={biz.id}
                    className="prava-card p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white">
                        <Building2 className="size-5" />
                      </div>
                      <span className="rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/[0.08] px-2.5 py-0.5 text-[11px] font-bold text-slate-800 dark:text-white">
                        {biz.gstStatus.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{biz.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        {biz.businessType} · {biz.industry}
                      </p>
                    </div>

                    <div className="border-t border-slate-200 dark:border-white/[0.06] pt-2.5 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                      <p>
                        <strong className="text-slate-900 dark:text-white">GSTIN / Tax ID:</strong> {biz.gstin || "US-TAX-98765"}
                      </p>
                      <p>
                        <strong className="text-slate-900 dark:text-white">Jurisdiction & Currency:</strong> {biz.country} ({biz.currency})
                      </p>
                      {biz.assignmentNotes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          "{biz.assignmentNotes}"
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: Audit Sign-Off Certificates */}
          <TabsContent value="certificates" className="mt-6">
            <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 shadow-md">
              <div className="border-b border-slate-200/80 dark:border-white/[0.06] pb-4">
                <h2 className="font-['Playfair_Display',Georgia,serif] text-lg font-normal text-slate-900 dark:text-white">Issued CA Audit Observations & Certificates</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Record of certified returns and professional observations registered on the platform.
                </p>
              </div>

              {historicalObservations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 dark:text-slate-400">
                  No audit observations recorded yet.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {historicalObservations.map((obs) => (
                    <div
                      key={obs.id}
                      className="prava-card p-5 space-y-2.5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              obs.decision === "approved"
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {obs.decision.toUpperCase()}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">{obs.observationTitle}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
                          Ref: {obs.certificateReference || "CA-CERT-2026-01"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {obs.detailedNotes}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        Signed off by CA on {new Date(obs.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* AUDIT & CERTIFICATION MODAL */}
      <Dialog open={isAuditModalOpen} onOpenChange={setIsAuditModalOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-[#0F1620] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-['Playfair_Display',Georgia,serif] text-lg font-normal text-slate-900 dark:text-white">
                  Chartered Accountant Statutory Review & Sign-Off
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
                  {selectedTask?.businessName} · {selectedTask?.taskTitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAuditSubmit} className="space-y-4 py-2">
            {/* Financial Summary Box */}
            {selectedTask?.gstPreparation && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-[#080B0F] p-4 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/[0.06] pb-2">
                  <span>Computed Tax Summary</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">Quarterly GSTR-3B Return</span>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Taxable Sales</span>
                    <p className="prava-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(selectedTask.gstPreparation.taxableValueMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Output CGST</span>
                    <p className="prava-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(selectedTask.gstPreparation.cgstMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-slate-500 dark:text-slate-400">Output SGST</span>
                    <p className="prava-mono font-bold text-slate-900 dark:text-white">
                      {formatCurrency(selectedTask.gstPreparation.sgstMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-mono text-emerald-600 dark:text-emerald-400">Eligible ITC</span>
                    <p className="prava-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(selectedTask.gstPreparation.inputTaxCreditMinor)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">CA Audit Decision *</Label>
                <Select value={decision} onValueChange={(val: any) => setDecision(val)}>
                  <SelectTrigger className="rounded-xl border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-[#0D131A] dark:text-white">
                    <SelectItem value="approved">Approve & Issue Certificate</SelectItem>
                    <SelectItem value="needs_revision">Request Revision from Client</SelectItem>
                    <SelectItem value="rejected">Reject Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Certificate / Reference Code</Label>
                <Input
                  value={certificateReference}
                  onChange={(e) => setCertificateReference(e.target.value)}
                  className="rounded-xl border-slate-200 bg-white text-xs font-mono text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Observation Title *</Label>
              <Input
                value={observationTitle}
                onChange={(e) => setObservationTitle(e.target.value)}
                required
                className="rounded-xl border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Detailed CA Audit Notes & Remarks *</Label>
              <Textarea
                rows={4}
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value)}
                required
                placeholder="Enter statutory verification findings, ITC reconciliation remarks, and compliance notes…"
                className="rounded-xl border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#080B0F] dark:text-white shadow-sm"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-xl border-slate-300 bg-white/80 text-xs text-slate-800 hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitDecision.isPending || !observationTitle || !detailedNotes}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              >
                {submitDecision.isPending ? "Submitting Sign-Off…" : "Submit CA Sign-Off & Certificate"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
