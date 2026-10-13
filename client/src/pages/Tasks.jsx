import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    ClipboardCheck,
    FileCheck2,
    Landmark,
    Plus,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { AnimatedSection, AnimatedList, AnimatedRow, FadeInView } from "@/lib/animations";

const workflowOptions = {
    monthly_close: {
        label: "Month-End Close",
        description: "Reconcile supplier invoices, output revenue, and input tax credit before closing books.",
        icon: FileCheck2,
    },
    gst_return: {
        label: "GST Return Package",
        description: "Prepare outward GSTR-1 ledgers and matched GSTR-3B monthly compliance summaries.",
        icon: CalendarDays,
    },
    cash_reconciliation: {
        label: "Cash & Bank Audit",
        description: "Match bank feeds, payment gateway statements, and physical cash expense vouchers.",
        icon: Landmark,
    },
};

const statusLabel = (status) => {
    switch (status) {
        case "completed":
            return "Completed";
        case "in_progress":
            return "In Progress";
        case "waiting_user":
            return "Action Required";
        default:
            return "Active";
    }
};

export default function Tasks() {
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];

    const [workflowType, setWorkflowType] = useState("monthly_close");
    const [period, setPeriod] = useState(() => new Date().toISOString().slice(0, 7));

    const tasks = useQuery({
        queryKey: ["tasks", "list", business?.id],
        queryFn: () => api.tasks.list({ businessId: business?.id ?? 0 }),
        enabled: Boolean(business),
    });

    const create = useMutation({
        mutationFn: (body) => api.tasks.create(body),
        onSuccess: (task) => {
            toast.success("Workflow checklist initialized.");
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            setLocation(`/tasks/${task.id}`);
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const selected = workflowOptions[workflowType];

    return (
        <DashboardLayout>
            <div className="relative mx-auto max-w-5xl space-y-6 py-2">
                {/* Header Banner */}
                <AnimatedSection className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
                    <div className="flex items-center gap-2">
                        <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                            <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                            ACCOUNTABLE WORKFLOW ENGINE
                        </span>
                    </div>
                    <h1 className="mt-3 text-2xl sm:text-3xl font-medium tracking-tight text-white">
                        Transform Finance Requests into <span className="text-slate-400">Guided Workflows</span>
                    </h1>
                    <p className="mt-2 text-xs text-slate-400 leading-relaxed max-w-2xl">
                        Prava collects required source documents, identifies missing information, calculates statutory amounts, and routes work directly to your CA for certification.
                    </p>
                </AnimatedSection>

                {business ? (
                    <>
                        {/* Initialize Workflow Panel */}
                        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md">
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none" />
                            <div className="space-y-1">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                    Launch Preparation
                                </span>
                                <h2 className="text-sm font-medium text-white">Choose a workflow type</h2>
                            </div>

                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                                {Object.keys(workflowOptions).map((type) => {
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
                                                    ? "border-cyan-500/50 bg-[#0E1424] text-white shadow-md"
                                                    : "border-white/[0.06] bg-[#0B0F19]/60 text-slate-400 hover:border-white/[0.14] hover:bg-[#0E1424]"
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition ${
                                                        active
                                                            ? "border-cyan-500/40 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]"
                                                            : "border-white/[0.06] bg-white/[0.03] text-slate-400"
                                                    }`}
                                                >
                                                    <Icon className="size-4" />
                                                </span>
                                                <div>
                                                    <p className={`text-xs font-medium ${active ? "text-white" : "text-slate-300"}`}>
                                                        {option.label}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-slate-400 leading-relaxed">
                                                        {option.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="mt-6 grid gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
                                <div>
                                    <p className="text-xs font-medium text-white">{selected.label}</p>
                                    <p className="text-[11px] text-slate-400">Target Month: {period}</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <Label htmlFor="workflow-period" className="text-[10px] font-mono text-slate-400">
                                        Period
                                    </Label>
                                    <Input
                                        id="workflow-period"
                                        type="month"
                                        value={period}
                                        onChange={(e) => setPeriod(e.target.value)}
                                        className="h-9 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                    />
                                </div>

                                <Button
                                    disabled={create.isPending}
                                    onClick={() => create.mutate({ businessId: business.id, type: workflowType, period })}
                                    size="sm"
                                    className="h-9 rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 transition shadow-sm"
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    {create.isPending ? "Creating…" : "Initialize Workflow"}
                                </Button>
                            </div>
                        </div>

                        {/* Existing Tasks List */}
                        <FadeInView className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md space-y-4">
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none" />
                            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                                <div>
                                    <h3 className="text-sm font-medium text-white">Active Workflows in Progress</h3>
                                    <p className="text-xs text-slate-400">Current task checklists and review statuses</p>
                                </div>
                                <ClipboardCheck className="size-4 text-cyan-400" />
                            </div>

                            <AnimatedList className="space-y-2">
                                {tasks.isLoading ? (
                                    <div className="p-6 text-center text-xs text-slate-400">Loading active workflows…</div>
                                ) : tasks.data?.length ? (
                                    tasks.data.map((task) => (
                                        <AnimatedRow key={task.id}>
                                            <button
                                                onClick={() => setLocation(`/tasks/${task.id}`)}
                                                className="flex w-full items-center justify-between rounded-xl border border-white/[0.06] bg-[#0B0F19] p-4 text-left transition hover:border-cyan-500/30 hover:bg-[#0E1424] text-xs group"
                                            >
                                                <div className="flex items-center gap-3.5 min-w-0">
                                                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-slate-400 group-hover:text-cyan-400 transition">
                                                        {task.type === "cash_reconciliation" ? (
                                                            <Landmark className="size-4" />
                                                        ) : (
                                                            <CalendarDays className="size-4" />
                                                        )}
                                                    </span>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-white truncate">{task.title}</p>
                                                        <p className="mt-0.5 font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                                                            Status: {statusLabel(task.status)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <ChevronRight className="size-4 text-slate-400 group-hover:text-white transition" />
                                            </button>
                                        </AnimatedRow>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-xs text-slate-400">
                                        <CheckCircle2 className="mx-auto size-6 text-cyan-400 mb-2 opacity-80" />
                                        No active workflows yet. Select a preparation path above to initialize one.
                                    </div>
                                )}
                            </AnimatedList>
                        </FadeInView>
                    </>
                ) : (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                        Please create a business workspace first.
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
