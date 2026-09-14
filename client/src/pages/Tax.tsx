import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { GstSpreadsheetWorkbench } from "@/components/GstSpreadsheetWorkbench";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  Building2,
  Calculator,
  CheckCircle2,
  ChevronRight,
  FileCheck,
  FileText,
  Landmark,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useLocation } from "wouter";

export default function Tax() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;
  const taxSystem = business?.taxSystem ?? "GST / Sales Tax";

  const tasks = trpc.tasks.list.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const gstTask = tasks.data?.find((t) => t.type === "gst_return_preparation");
  const incomeTaxTask = tasks.data?.find((t) => t.type === "income_tax_preparation");

  const gstTaskDetail = trpc.tasks.get.useQuery(
    { taskId: gstTask?.id ?? 0 },
    { enabled: !!gstTask }
  );

  const createGstTask = trpc.tasks.create.useMutation({
    onSuccess: (task) => {
      setLocation(`/tasks/${task.id}`);
    },
  });

  const createIncomeTaxTask = trpc.tasks.create.useMutation({
    onSuccess: (task) => {
      setLocation(`/tasks/${task.id}`);
    },
  });

  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";
  const fmt = (minor: number) => formatMinorAmount(minor, currency, locale);

  const prep = gstTaskDetail.data?.preparation;
  const reqs = gstTaskDetail.data?.requirements ?? [];
  const incompleteReqs = reqs.filter((r) => !r.isCompleted);

  const gstStatusLabel = () => {
    if (!gstTask) return "Not Started";
    if (gstTask.status === "submitted") return "Submitted";
    if (gstTask.status === "submission_pending") return "CA Approved & Ready";
    if (gstTask.status === "professional_review") return "CA Reviewing";
    if (prep?.status === "prepared" && incompleteReqs.length === 0) return "Ready for CA Review";
    return "Action Required";
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-slate-200/80 dark:border-white/[0.06] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-tag">Compliance & Statutory Engine</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              {taxSystem} & <em className="italic font-normal">Statutory Tax Filing</em>
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">
              Automated sales tax aggregation, 2B input credit reconciliation, and certified CA review desk.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava about Tax
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/ca-review")}
              className="rounded-xl border-slate-300 bg-white/80 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-100 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <UserCheck className="mr-1.5 size-3.5 text-purple-600 dark:text-purple-400" />
              CA Review Desk
            </Button>
          </div>
        </div>

        {/* Accountability Banner */}
        <div className="prava-panel p-5 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Accountable 5-Step Pipeline
            </span>
          </div>
          <h2 className="mt-2 text-base sm:text-lg font-bold text-slate-900 dark:text-white">
            01 Ingest Records → 02 Reconcile ITC → 03 Calculate Net Tax → 04 CA Inspection → 05 Final Authorization
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            Tax returns are never filed automatically without human oversight. Prava compiles the numbers, highlights missing supplier filings, and requires explicit owner approval.
          </p>
        </div>

        {/* ── HIGH-TECH CA GST FILING & INVOICE RAG SPREADSHEET WORKBENCH ─── */}
        <GstSpreadsheetWorkbench businessId={businessId} />

        {/* GST / Sales Tax Preparation Card */}
        <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-5">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Receipt className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{taxSystem} Return Workflow</h3>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-800 dark:bg-white/[0.08] dark:text-white">
                    {gstStatusLabel()}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Monthly sales reconciliation, outward supplies, and input credit claim.
                </p>
              </div>
            </div>

            {gstTask ? (
              <Button
                onClick={() => setLocation(`/tasks/${gstTask.id}`)}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
              >
                Open Return Checklist →
              </Button>
            ) : (
              <Button
                onClick={() =>
                  createGstTask.mutate({
                    businessId,
                    type: "gst_return_preparation",
                    period: new Date().toISOString().slice(0, 7),
                  })
                }
                disabled={createGstTask.isPending}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
              >
                <Plus className="mr-1.5 size-3.5" />
                Initialize {taxSystem} Workflow
              </Button>
            )}
          </div>

          {/* Key Tax Metrics if Available */}
          {prep && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="prava-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Total Taxable Value</span>
                  <p className="prava-mono mt-1 text-lg font-bold text-slate-900 dark:text-white">{fmt(prep.taxableValueMinor)}</p>
                </div>
                <div className="prava-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Output Tax Due</span>
                  <p className="prava-mono mt-1 text-lg font-bold text-slate-900 dark:text-white">{fmt(prep.cgstMinor + prep.sgstMinor + prep.igstMinor)}</p>
                </div>
                <div className="prava-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Input Tax Credit (ITC)</span>
                  <p className="prava-mono mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(prep.inputTaxCreditMinor)}</p>
                </div>
                <div className="prava-card p-4">
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">Net Payable Position</span>
                  <p className="prava-mono mt-1 text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(prep.netTaxPositionMinor)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600 dark:border-white/[0.06] dark:bg-[#0D131A] dark:text-slate-400">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">Pre-filing Requirements Completed</span>
                  <span className="font-mono text-slate-800 dark:text-white font-bold">
                    {reqs.length - incompleteReqs.length} / {reqs.length} Ready
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/[0.08]">
                  <div
                    className="h-full bg-slate-800 dark:bg-white transition-all"
                    style={{
                      width: `${reqs.length ? ((reqs.length - incompleteReqs.length) / reqs.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Income Tax & Advance Tax Preparation Card */}
        <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Calculator className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Income Tax & Advance Tax Estimation</h3>
                <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                  Year-to-date profit & loss aggregation for annual return filing and quarterly advance tax installments.
                </p>
              </div>
            </div>

            {incomeTaxTask ? (
              <Button
                onClick={() => setLocation(`/tasks/${incomeTaxTask.id}`)}
                className="rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
              >
                Open Income Tax Task →
              </Button>
            ) : (
              <Button
                onClick={() =>
                  createIncomeTaxTask.mutate({
                    businessId,
                    type: "income_tax_preparation",
                    period: new Date().getFullYear().toString(),
                  })
                }
                disabled={createIncomeTaxTask.isPending}
                className="rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 hover:bg-slate-100 dark:border-white/15 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/10 shadow-sm"
              >
                <Plus className="mr-1.5 size-3.5" />
                Initialize Income Tax Task
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
