import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileCheck2,
  FileText,
  HelpCircle,
  Plus,
  Receipt,
  RotateCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Tax() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const businessId = business?.id ?? 0;

  const tasksQuery = trpc.tasks.list.useQuery(
    { businessId },
    { enabled: businessId > 0 }
  );

  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";
  const taxSystem = business?.taxSystem ?? "GST";
  const fmt = (minor: number) => formatMinorAmount(minor, currency, locale);

  const tasks = tasksQuery.data ?? [];
  const gstTask = tasks.find((t) => t.type === "gst_return_preparation");
  const incomeTaxTask = tasks.find((t) => t.type === "income_tax_preparation");

  const gstTaskDetail = trpc.tasks.get.useQuery(
    { taskId: gstTask?.id ?? 0 },
    { enabled: !!gstTask }
  );

  const [showTechnicalBreakdown, setShowTechnicalBreakdown] = useState(false);

  const createGstTask = trpc.tasks.create.useMutation({
    onSuccess: (task) => {
      toast.success(`${taxSystem} preparation workflow created.`);
      tasksQuery.refetch();
      if (task) setLocation(`/tasks/${task.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const createIncomeTaxTask = trpc.tasks.create.useMutation({
    onSuccess: (task) => {
      toast.success("Income Tax preparation workflow created.");
      tasksQuery.refetch();
      if (task) setLocation(`/tasks/${task.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const prep = gstTaskDetail.data?.preparation;
  const reqs = gstTaskDetail.data?.requirements ?? [];
  const incompleteReqs = reqs.filter((r) => r.status !== "complete" && r.status !== "skipped");

  const gstStatusLabel = () => {
    if (!gstTask) return "Not Started";
    if (gstTask.status === "submitted") return "Submitted";
    if (gstTask.status === "submission_pending") return "CA Approved & Ready";
    if (gstTask.status === "professional_review") return "CA Reviewing";
    if (prep?.status === "prepared" && incompleteReqs.length === 0) return "Ready for CA Review";
    return "Needs Attention";
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[#dfd6c4] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="prava-kicker">Tax & Compliance Hub</span>
            <h1 className="prava-display mt-2 text-4xl text-[#153832]">
              {taxSystem} & Income Tax Preparation
            </h1>
            <p className="mt-2 text-sm text-[#65766e]">
              Prava organizes your sales, expenses, and tax credits so your CA can verify and file without delays.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setLocation("/assistant")}
              className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26]"
            >
              <Sparkles className="mr-2 size-4 text-[#d9e8be]" />
              Ask Prava about Tax
            </Button>
            <Button
              variant="outline"
              onClick={() => setLocation("/ca-review")}
              className="rounded-full border-[#cfc4b1] text-[#24473e] hover:bg-[#eee8dc]"
            >
              <UserCheck className="mr-2 size-4" />
              Check CA Review Status
            </Button>
          </div>
        </div>

        {/* Workflow Philosophy Banner */}
        <div className="rounded-2xl bg-[#163a34] p-6 text-[#f7f1e4] shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-[#cfe4ad]">
                <ShieldCheck className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Accountable Workflow
                </span>
              </div>
              <h2 className="prava-display mt-2 text-2xl">
                Prava Prepares → You Review → CA Verifies → You Authorize.
              </h2>
              <p className="mt-2 max-w-2xl text-xs text-[#c5d2c9] leading-relaxed">
                Tax filings are never automated blindly. Prava extracts your documents, flags discrepancies, and facilitates a professional sign-off before official submission.
              </p>
            </div>
          </div>
        </div>

        {/* 1. GST / Sales Tax Card */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#e5efe1] text-[#1e4e3e]">
                <Receipt className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#163a34]">{taxSystem} Preparation</h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      gstStatusLabel() === "CA Approved & Ready" || gstStatusLabel() === "Submitted"
                        ? "bg-[#e5efe1] text-[#2c5847]"
                        : gstStatusLabel() === "Ready for CA Review" || gstStatusLabel() === "CA Reviewing"
                        ? "bg-[#eaf4fc] text-[#1f5682]"
                        : "bg-[#fae7d4] text-[#8e4c19]"
                    }`}
                  >
                    {gstStatusLabel()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#708078]">
                  Monthly/Quarterly tax calculation from verified sales and supplier invoices.
                </p>
              </div>
            </div>

            {gstTask ? (
              <Button
                onClick={() => setLocation(`/tasks/${gstTask.id}`)}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
              >
                Open {taxSystem} Preparation
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            ) : (
              <Button
                disabled={createGstTask.isPending}
                onClick={() =>
                  createGstTask.mutate({
                    businessId,
                    type: "gst_return_preparation",
                  })
                }
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
              >
                <Plus className="mr-1.5 size-3.5" />
                {createGstTask.isPending ? "Creating…" : `Start ${taxSystem} Preparation`}
              </Button>
            )}
          </div>

          {prep ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 border-t border-[#ece4d6] pt-5">
              <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#708078]">
                  Total Sales Billed
                </p>
                <p className="mt-2 text-xl font-bold text-[#163a34]">{fmt(prep.salesMinor)}</p>
                <p className="mt-1 text-[11px] text-[#718279]">From verified sales invoices</p>
              </div>

              <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#708078]">
                  GST Credit (ITC)
                </p>
                <p className="mt-2 text-xl font-bold text-[#2b5847]">
                  {fmt(prep.inputTaxCreditMinor)}
                </p>
                <p className="mt-1 text-[11px] text-[#718279]">Tax paid on business expenses</p>
              </div>

              <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#708078]">
                  Estimated Net Tax to Pay
                </p>
                <p className="mt-2 text-xl font-bold text-[#163a34]">
                  {fmt(prep.netTaxPositionMinor)}
                </p>
                <p className="mt-1 text-[11px] text-[#718279]">Output tax minus verified credit</p>
              </div>

              <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#708078]">
                  Checklist Readiness
                </p>
                <p className="mt-2 text-xl font-bold text-[#163a34]">
                  {incompleteReqs.length === 0 ? "100% Ready" : `${incompleteReqs.length} pending`}
                </p>
                <p className="mt-1 text-[11px] text-[#718279]">
                  {incompleteReqs.length === 0 ? "Ready for CA sign-off" : "Missing required records"}
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[#d9cfbb] p-5 text-center text-xs text-[#718279]">
              Click "Start {taxSystem} Preparation" to create this period's tax checklist and extract your invoices.
            </div>
          )}
        </div>

        {/* 2. Income Tax Preparation Card */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#fbeef4] text-[#8e3926]">
                <Calculator className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-[#163a34]">Income Tax Annual Summary</h2>
                  <span className="rounded-full bg-[#fbeef4] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#8e3926]">
                    Preparation
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#708078]">
                  Year-end revenue, deductible expenses, and financial schedules prepared for your tax accountant.
                </p>
              </div>
            </div>

            {incomeTaxTask ? (
              <Button
                onClick={() => setLocation(`/tasks/${incomeTaxTask.id}`)}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
              >
                Open Income Tax Task
                <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            ) : (
              <Button
                disabled={createIncomeTaxTask.isPending}
                onClick={() =>
                  createIncomeTaxTask.mutate({
                    businessId,
                    type: "income_tax_preparation" as any,
                  })
                }
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
              >
                <Plus className="mr-1.5 size-3.5" />
                {createIncomeTaxTask.isPending ? "Creating…" : "Start Income Tax Schedule"}
              </Button>
            )}
          </div>
        </div>

        {/* 3. Progressive Disclosure: Tax Technical Schedule */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <button
            type="button"
            onClick={() => setShowTechnicalBreakdown(!showTechnicalBreakdown)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#698477]">
                Technical Tax Details
              </p>
              <h3 className="text-base font-bold text-[#153832]">
                Detailed Rate Schedule (CGST / SGST / IGST / State Splits)
              </h3>
            </div>
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#efeae0] text-[#335649]">
              <ChevronDown
                className={`size-4 transition-transform ${
                  showTechnicalBreakdown ? "rotate-180" : ""
                }`}
              />
            </span>
          </button>

          {showTechnicalBreakdown && (
            <div className="mt-5 border-t border-[#ece4d6] pt-5 space-y-4">
              <p className="text-xs text-[#6e7f77]">
                Deterministic calculation breakdown per tax jurisdiction:
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                  <p className="text-[11px] font-semibold text-[#708078]">Local Tax 1 (CGST)</p>
                  <p className="mt-1 text-lg font-bold text-[#163a34]">
                    {fmt(prep?.cgstMinor ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                  <p className="text-[11px] font-semibold text-[#708078]">State Tax 2 (SGST)</p>
                  <p className="mt-1 text-lg font-bold text-[#163a34]">
                    {fmt(prep?.sgstMinor ?? 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-[#ece4d6] bg-white p-4">
                  <p className="text-[11px] font-semibold text-[#708078]">Combined / Inter-State (IGST)</p>
                  <p className="mt-1 text-lg font-bold text-[#163a34]">
                    {fmt(prep?.igstMinor ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
