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
        <section className="relative overflow-hidden rounded-3xl bg-[#163a34] p-7 text-[#f7f1e4] sm:p-9 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#244f47] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#cfe4ad]">
                <BadgeCheck className="size-4 text-[#d9e8be]" />
                Prava In-House Chartered Accountant
              </div>
              <h1 className="prava-display mt-3 text-3xl sm:text-4xl">
                {caProfile?.fullName || "Chartered Accountant Review Desk"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[#cad5ce]">
                <span className="font-bold text-[#f4eddf]">
                  {caProfile?.membershipNumber || "ICAI #409212"}
                </span>
                <span>·</span>
                <span>{caProfile?.firmName || "Verma & Associates CA"}</span>
                <span>·</span>
                <span className="text-[#cfe4ad]">{caProfile?.specialization || "GST & Direct Tax Audit"}</span>
              </div>
              <p className="mt-4 max-w-2xl text-xs leading-relaxed text-[#b5c7bd]">
                {caProfile?.bio ||
                  "Senior Fellow Chartered Accountant authorized to perform statutory audit reviews, reconcile supplier tax invoices, and issue formal filing certificates."}
              </p>
            </div>

            <div className="flex flex-col gap-2 shrink-0">
              <span className="rounded-full border border-[#437568] bg-[#1a463e] px-3.5 py-1.5 text-center text-xs font-bold text-[#d9e8be]">
                Verified Partner Status: Active
              </span>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-[#26534b] pt-6">
            <div>
              <p className="text-xs text-[#a3b8ad]">Assigned Workspaces</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">
                {dashboardQuery.data?.assignedBusinessesCount ?? 1}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Awaiting CA Review</p>
              <p className="mt-1 text-2xl font-bold text-[#cfe4ad]">
                {reviewQueue.length + gstSubmissions.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Certified Sign-Offs</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">
                {dashboardQuery.data?.completedReviewsCount ?? historicalObservations.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Statutory Clearance</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">100% Up-To-Date</p>
            </div>
          </div>
        </section>

        {/* Tabbed Navigation */}
        <Tabs defaultValue="review-queue" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-[#eee7d8] p-1.5 text-xs font-semibold text-[#163a34]">
            <TabsTrigger value="review-queue" className="rounded-xl data-[state=active]:bg-[#163a34] data-[state=active]:text-[#f7f1e4]">
              <FileCheck2 className="mr-2 size-4" />
              Review Queue ({reviewQueue.length + gstSubmissions.length})
            </TabsTrigger>
            <TabsTrigger value="assigned-clients" className="rounded-xl data-[state=active]:bg-[#163a34] data-[state=active]:text-[#f7f1e4]">
              <Building2 className="mr-2 size-4" />
              Assigned Clients ({assignedWorkspaces.length})
            </TabsTrigger>
            <TabsTrigger value="certificates" className="rounded-xl data-[state=active]:bg-[#163a34] data-[state=active]:text-[#f7f1e4]">
              <History className="mr-2 size-4" />
              Audit Sign-Offs ({historicalObservations.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Review Queue */}
          <TabsContent value="review-queue" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-[#ece4d6] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-[#163a34]">Tax Returns & Compliance Workflows</h2>
                  <p className="text-xs text-[#718279]">
                    Examine client return computations, verify ITC documentation, and submit statutory certifications.
                  </p>
                </div>
                <span className="rounded-full bg-[#e5efe1] px-3 py-1 text-xs font-bold text-[#2b5847]">
                  {reviewQueue.length} Returns In Review
                </span>
              </div>

              {reviewQueue.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="mx-auto size-9 text-[#528a71]" />
                  <p className="mt-3 text-sm font-semibold text-[#153832]">Review desk is clear!</p>
                  <p className="mt-1 text-xs text-[#6e8076]">
                    No client return workflows are pending CA examination.
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {reviewQueue.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#e4dccb] bg-[#faf7ef] p-5 transition hover:border-[#b4cbb1]"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#163a34] px-2 py-0.5 text-[11px] font-bold text-[#d9e8be]">
                              {item.businessName || "Acme Global Solutions"}
                            </span>
                            <span className="text-xs text-[#718279]">
                              Submitted {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-[#143831]">{item.taskTitle}</h3>
                          <p className="text-xs text-[#52665c] leading-relaxed max-w-2xl">
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
                          className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#0e2723] active:scale-95 shrink-0"
                        >
                          <ShieldCheck className="mr-1.5 size-4 text-[#d9e8be]" />
                          Audit & Certify Return
                        </Button>
                      </div>

                      {/* Summary Figures Box if present */}
                      {(item as any).gstPreparation && (
                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-[#ded5c3] bg-white p-3 sm:grid-cols-4 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#7a8c82]">Total Sales</span>
                            <p className="font-semibold text-[#163a34]">
                              {formatCurrency((item as any).gstPreparation.salesMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#7a8c82]">Output Tax (CGST+SGST)</span>
                            <p className="font-semibold text-[#163a34]">
                              {formatCurrency((item as any).gstPreparation.cgstMinor + (item as any).gstPreparation.sgstMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#7a8c82]">Eligible ITC</span>
                            <p className="font-semibold text-[#2b644e]">
                              {formatCurrency((item as any).gstPreparation.inputTaxCreditMinor)}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-[#7a8c82]">Net Tax Liability</span>
                            <p className="font-bold text-[#8c3527]">
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
            <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
              <div className="border-b border-[#ece4d6] pb-4">
                <h2 className="text-lg font-bold text-[#163a34]">Assigned Client Businesses</h2>
                <p className="text-xs text-[#718279]">
                  Workspaces designated to you by Prava Administration for continuous accounting & statutory oversight.
                </p>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {assignedWorkspaces.map((biz) => (
                  <div
                    key={biz.id}
                    className="rounded-2xl border border-[#dfd6c4] bg-[#faf7ef] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex size-9 items-center justify-center rounded-xl bg-[#163a34] text-[#d9e8be]">
                        <Building2 className="size-5" />
                      </div>
                      <span className="rounded-full bg-[#ebf3e7] px-2.5 py-0.5 text-[11px] font-bold text-[#204a3c]">
                        {biz.gstStatus.toUpperCase()}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-[#153832]">{biz.name}</h3>
                      <p className="text-xs text-[#6e8076]">
                        {biz.businessType} · {biz.industry}
                      </p>
                    </div>

                    <div className="border-t border-[#ebe2d2] pt-2.5 text-xs text-[#4e6459] space-y-1">
                      <p>
                        <strong>GSTIN / Tax ID:</strong> {biz.gstin || "US-TAX-98765"}
                      </p>
                      <p>
                        <strong>Jurisdiction & Currency:</strong> {biz.country} ({biz.currency})
                      </p>
                      {biz.assignmentNotes && (
                        <p className="text-[11px] text-[#71877c] italic">
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
            <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
              <div className="border-b border-[#ece4d6] pb-4">
                <h2 className="text-lg font-bold text-[#163a34]">Issued CA Audit Observations & Certificates</h2>
                <p className="text-xs text-[#718279]">
                  Record of certified returns and professional observations registered on the platform.
                </p>
              </div>

              {historicalObservations.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#75847c]">
                  No audit observations recorded yet.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {historicalObservations.map((obs) => (
                    <div
                      key={obs.id}
                      className="rounded-2xl border border-[#d8e5d3] bg-[#f2f8f0] p-5 space-y-2.5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              obs.decision === "approved"
                                ? "bg-[#163a34] text-[#d9e8be]"
                                : "bg-[#fbe7e4] text-[#933429]"
                            }`}
                          >
                            {obs.decision.toUpperCase()}
                          </span>
                          <span className="font-bold text-sm text-[#143831]">{obs.observationTitle}</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#32614f]">
                          Ref: {obs.certificateReference || "CA-CERT-2026-01"}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed text-[#3c5e50]">
                        {obs.detailedNotes}
                      </p>
                      <p className="text-[11px] text-[#718c7e]">
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
        <DialogContent className="max-w-2xl bg-[#fffdf8] border-[#dfd6c4]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#163a34] text-[#d9e8be]">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#163a34]">
                  Chartered Accountant Statutory Review & Sign-Off
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6e8076]">
                  {selectedTask?.businessName} · {selectedTask?.taskTitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAuditSubmit} className="space-y-4 py-2">
            {/* Financial Summary Box */}
            {selectedTask?.gstPreparation && (
              <div className="rounded-xl border border-[#cfe2cc] bg-[#f0f7ec] p-4 text-xs">
                <div className="flex items-center justify-between font-bold text-[#1c473b] border-b border-[#cfe0cb] pb-2">
                  <span>Computed Tax Summary</span>
                  <span>Quarterly GSTR-3B Return</span>
                </div>
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <span className="text-[10px] uppercase text-[#618073]">Taxable Sales</span>
                    <p className="font-bold text-[#143831]">
                      {formatCurrency(selectedTask.gstPreparation.taxableValueMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#618073]">Output CGST</span>
                    <p className="font-bold text-[#143831]">
                      {formatCurrency(selectedTask.gstPreparation.cgstMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#618073]">Output SGST</span>
                    <p className="font-bold text-[#143831]">
                      {formatCurrency(selectedTask.gstPreparation.sgstMinor)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-[#618073]">Eligible ITC</span>
                    <p className="font-bold text-[#235843]">
                      {formatCurrency(selectedTask.gstPreparation.inputTaxCreditMinor)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">CA Audit Decision *</Label>
                <Select value={decision} onValueChange={(val: any) => setDecision(val)}>
                  <SelectTrigger className="rounded-xl border-[#dcd1be] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approve & Issue Certificate</SelectItem>
                    <SelectItem value="needs_revision">Request Revision from Client</SelectItem>
                    <SelectItem value="rejected">Reject Return</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">Certificate / Reference Code</Label>
                <Input
                  value={certificateReference}
                  onChange={(e) => setCertificateReference(e.target.value)}
                  className="rounded-xl border-[#dcd1be] text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Observation Title *</Label>
              <Input
                value={observationTitle}
                onChange={(e) => setObservationTitle(e.target.value)}
                required
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Detailed CA Audit Notes & Remarks *</Label>
              <Textarea
                rows={4}
                value={detailedNotes}
                onChange={(e) => setDetailedNotes(e.target.value)}
                required
                placeholder="Enter statutory verification findings, ITC reconciliation remarks, and compliance notes…"
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAuditModalOpen(false)}
                className="rounded-full border-[#d8cdba] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitDecision.isPending || !observationTitle || !detailedNotes}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#0f2824]"
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
