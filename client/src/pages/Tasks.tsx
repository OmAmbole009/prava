import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, Landmark, Plus, ReceiptText, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabel = (value: string) => value.replaceAll("_", " ");
type WorkflowType = "gst_return_preparation" | "cash_reconciliation";

export default function Tasks() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const tasks = trpc.tasks.list.useQuery({ businessId: business?.id ?? 0 }, { enabled: !!business });
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [workflowType, setWorkflowType] = useState<WorkflowType>("gst_return_preparation");

  const taxName = business?.taxSystem ?? "Tax";

  const workflowOptions: Record<WorkflowType, { label: string; title: string; description: string; button: string; icon: typeof ReceiptText }> = {
    gst_return_preparation: {
      label: `${taxName} preparation`,
      title: `Prepare this month’s ${taxName} records`,
      description: `Creates a checklist for tax registration, invoices, documents, and the selected filing period before any preparation is generated.`,
      button: `Start ${taxName} preparation`,
      icon: ReceiptText,
    },
    cash_reconciliation: {
      label: "Cash reconciliation",
      title: "Stage a bank statement for review",
      description: "Creates a source-evidence intake workflow. It does not extract transactions, infer a cash balance, or claim that records have been reconciled.",
      button: "Start cash intake",
      icon: Landmark,
    },
  };

  const selected = workflowOptions[workflowType];
  const create = trpc.tasks.create.useMutation({
    onSuccess: task => {
      toast.success(workflowType === "cash_reconciliation" ? "Cash-reconciliation intake created. Add a bank statement as source evidence to continue." : `${taxName} preparation checklist created.`);
      tasks.refetch();
      if (task) setLocation(`/tasks/${task.id}`);
    },
    onError: error => toast.error(error.message),
  });

  return <DashboardLayout><div className="mx-auto max-w-5xl py-2">
    <section className="rounded-3xl bg-[#163a34] p-7 text-[#f7f1e4] sm:p-9"><span className="prava-kicker border-[#557969] bg-[#224a41] text-[#d9e8be]"><Sparkles className="size-3.5" />AI Action Center</span><h1 className="prava-display mt-5 max-w-2xl text-4xl leading-[0.95]">Turn a finance request into an accountable workflow.</h1><p className="mt-5 max-w-2xl text-sm leading-6 text-[#c5d2c9]">Prava collects required information, processes supported source documents, identifies missing data, and prepares outputs for review. It never treats preparation as official submission or infers financial facts from unavailable data.</p></section>
    {business ? <>
      <section className="mt-6 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex flex-col gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Start an accountable workflow</p><h2 className="prava-display mt-2 text-2xl text-[#153832]">Choose a preparation path</h2></div><div className="grid gap-3 md:grid-cols-2">{(Object.keys(workflowOptions) as WorkflowType[]).map(type => { const option = workflowOptions[type]; const Icon = option.icon; const active = type === workflowType; return <button key={type} type="button" onClick={() => setWorkflowType(type)} className={`rounded-2xl border p-5 text-left transition ${active ? "border-[#406b5d] bg-[#e3eee0] shadow-[0_10px_24px_rgb(25_62_52_/_0.09)]" : "border-[#e1d8c7] hover:border-[#a7bdaa] hover:bg-[#faf7ef]"}`}><span className={`grid size-10 place-items-center rounded-xl ${active ? "bg-[#163a34] text-[#d8eab8]" : "bg-[#efe9dc] text-[#476b5e]"}`}><Icon className="size-5" /></span><p className="mt-4 text-sm font-semibold text-[#24473e]">{option.label}</p><p className="mt-2 text-xs leading-5 text-[#6d7e75]">{option.description}</p></button>; })}</div><div className="grid gap-4 border-t border-[#e8dfcf] pt-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end"><div><p className="text-sm font-semibold text-[#153832]">{selected.title}</p><p className="mt-1 text-xs leading-5 text-[#718078]">{selected.description}</p></div><div className="flex flex-col gap-2"><Label htmlFor="workflow-period">{workflowType === "cash_reconciliation" ? "Statement period" : "Filing period"}</Label><Input id="workflow-period" type="month" value={period} onChange={event => setPeriod(event.target.value)} /></div><Button disabled={create.isPending} onClick={() => create.mutate({ businessId: business.id, type: workflowType, period })} className="rounded-full bg-[#163a34] text-[#f7f1e4]"><Plus className="mr-2 size-4" />{create.isPending ? "Creating…" : selected.button}</Button></div></div></section>
      <section className="mt-7"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Your task workflows</p><h2 className="prava-display mt-1 text-3xl text-[#153832]">Work in progress</h2></div><ClipboardCheck className="size-6 text-[#b77a43]" /></div><div className="mt-4 space-y-3">{tasks.isLoading ? <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 text-sm text-[#708078]">Loading workflows…</div> : tasks.data?.length ? tasks.data.map(task => <button key={task.id} onClick={() => setLocation(`/tasks/${task.id}`)} className="flex w-full items-center gap-4 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgb(17_56_49_/_0.1)]"><span className="grid size-10 place-items-center rounded-xl bg-[#dbe9d5] text-[#1c483d]">{task.type === "cash_reconciliation" ? <Landmark className="size-5" /> : <CalendarDays className="size-5" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-[#24473e]">{task.title}</span><span className="mt-1 block text-xs uppercase tracking-[0.12em] text-[#6d8378]">{statusLabel(task.status)}</span></span><ChevronRight className="size-5 text-[#819188]" /></button>) : <div className="rounded-2xl border border-dashed border-[#d9cfbb] bg-[#fffdf8] p-7 text-sm text-[#748179]"><CheckCircle2 className="mb-3 size-5 text-[#62856f]" />No workflows have been started. Choose a tax-preparation or cash-intake path above to begin with source evidence.</div>}</div></section>
    </> : <section className="mt-6 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-7 text-sm text-[#718078]">Create a business workspace first, then Prava can keep financial tasks and records separate for that business.</section>}
  </div></DashboardLayout>;
}
