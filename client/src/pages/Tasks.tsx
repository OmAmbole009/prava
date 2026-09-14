import DashboardLayout from "@/components/DashboardLayout";
import { AnimatedGrid, AnimatedItem, AnimatedList, AnimatedRow, AnimatedSection, FadeInView } from "@/components/AnimatedPage";
import { TiltCard } from "@/components/TiltCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Landmark,
  Plus,
  ReceiptText,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const statusLabel = (value: string) => value.replaceAll("_", " ");
type WorkflowType = "gst_return_preparation" | "cash_reconciliation";

export default function Tasks() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const tasks = trpc.tasks.list.useQuery(
    { businessId: business?.id ?? 0 },
    { enabled: !!business }
  );
  const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));
  const [workflowType, setWorkflowType] = useState<WorkflowType>("gst_return_preparation");

  const taxName = business?.taxSystem ?? "Tax";

  const workflowOptions: Record<
    WorkflowType,
    {
      label: string;
      title: string;
      description: string;
      button: string;
      icon: typeof ReceiptText;
    }
  > = {
    gst_return_preparation: {
      label: `${taxName} Return Preparation`,
      title: `Prepare ${period} ${taxName} Return`,
      description: `Gathers invoices, validates GSTINs, matches GSTR-2B input credits, and routes to your assigned CA.`,
      button: `Initialize ${taxName} Return`,
      icon: ReceiptText,
    },
    cash_reconciliation: {
      label: "Bank & Cash Reconciliation",
      title: "Stage Monthly Bank Statement",
      description: "Creates a source evidence workflow to match banking entries with supplier receipts and invoices.",
      button: "Initialize Cash Intake",
      icon: Landmark,
    },
  };

  const selected = workflowOptions[workflowType];
  const create = trpc.tasks.create.useMutation({
    onSuccess: (task) => {
      toast.success(
        workflowType === "cash_reconciliation"
          ? "Cash reconciliation workflow initialized."
          : `${taxName} return preparation workflow initialized.`
      );
      tasks.refetch();
      if (task) setLocation(`/tasks/${task.id}`);
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <DashboardLayout>
      <div className="relative mx-auto max-w-5xl space-y-7 py-2">
        <div className="pointer-events-none absolute -right-20 top-0 size-72 rounded-full bg-sky-400/[0.04] blur-3xl float-glow" />
        {/* Banner */}
        <AnimatedSection className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 shine-on-hover">
          <div className="flex items-center gap-2">
            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
              <Sparkles className="size-4 text-slate-700 dark:text-white" />
            </motion.div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Accountable Workflow Engine
            </span>
          </div>
          <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
            Transform Finance Requests into <em className="italic font-normal">Guided Workflows</em>
          </h1>
          <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
            Prava collects required source documents, identifies missing information, calculates statutory amounts, and routes work directly to your CA for certification.
          </p>
        </AnimatedSection>

        {business ? (
          <>
            {/* Initialize Workflow Panel */}
            <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
              <div className="space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Launch Preparation
                </span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Choose a workflow type</h2>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(Object.keys(workflowOptions) as WorkflowType[]).map((type) => {
                  const option = workflowOptions[type];
                  const Icon = option.icon;
                  const active = type === workflowType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setWorkflowType(type)}
                      className={`rounded-xl border p-4 text-left transition-all ${
                        active
                          ? "border-slate-400 bg-slate-100 text-slate-900 shadow-sm dark:border-white/30 dark:bg-white/[0.08] dark:text-white"
                          : "border-slate-200 bg-white/70 hover:border-slate-300 dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex size-9 items-center justify-center rounded-lg ${
                            active
                              ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                              : "bg-slate-100 text-slate-700 dark:bg-white/[0.06] dark:text-slate-300"
                          }`}
                        >
                          <Icon className="size-4" />
                        </span>
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{option.label}</p>
                          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">{option.description}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 grid gap-4 border-t border-slate-200/80 dark:border-white/[0.06] pt-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{selected.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Target Month: {period}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="workflow-period" className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    Period
                  </Label>
                  <Input
                    id="workflow-period"
                    type="month"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 shadow-sm dark:border-white/10 dark:bg-[#080B0F] dark:text-white"
                  />
                </div>

                <Button
                  disabled={create.isPending}
                  onClick={() =>
                    create.mutate({ businessId: business.id, type: workflowType, period })
                  }
                  size="sm"
                  className="h-9 rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-sm"
                >
                  <Plus className="mr-1 size-3.5" />
                  {create.isPending ? "Creating…" : selected.button}
                </Button>
              </div>
            </div>            {/* Existing Tasks List */}
            <FadeInView className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Active Workflows in Progress</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Current task checklists and review statuses</p>
                </div>
                <motion.div whileHover={{ rotate: 10, scale: 1.1 }}>
                  <ClipboardCheck className="size-5 text-slate-700 dark:text-white" />
                </motion.div>
              </div>

              <AnimatedList className="space-y-2">
                {tasks.isLoading ? (
                  <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">Loading active workflows…</div>
                ) : tasks.data?.length ? (
                  tasks.data.map((task) => (
                    <AnimatedRow key={task.id}>
                      <button
                        onClick={() => setLocation(`/tasks/${task.id}`)}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-4 text-left shadow-sm transition hover:border-slate-300 hover:bg-white hover:shadow-md dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20 dark:hover:bg-[#0E1520] text-xs"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <motion.span
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 dark:bg-white/[0.05] dark:text-white"
                            whileHover={{ scale: 1.15, rotate: 5 }}
                          >
                            {task.type === "cash_reconciliation" ? (
                              <Landmark className="size-4" />
                            ) : (
                              <CalendarDays className="size-4" />
                            )}
                          </motion.span>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 dark:text-white truncate">{task.title}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                              Status: {statusLabel(task.status)}
                            </p>
                          </div>
                        </div>
                        <motion.div whileHover={{ x: 4 }}>
                          <ChevronRight className="size-4 text-slate-400" />
                        </motion.div>
                      </button>
                    </AnimatedRow>
                  ))
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-8 text-center text-xs text-slate-500 dark:text-slate-400"
                  >
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                      <CheckCircle2 className="mx-auto size-6 text-emerald-500 dark:text-emerald-400 mb-2" />
                    </motion.div>
                    No active workflows yet. Select a preparation path above to initialize one.
                  </motion.div>
                )}
              </AnimatedList>
            </FadeInView>
          </>
        ) : (
          <div className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
            Please create a business workspace first.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
