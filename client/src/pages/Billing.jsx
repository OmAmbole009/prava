import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import { AlertCircle, CheckCircle2, CreditCard, Globe, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

const metricLabel = {
    documents_processed: "Documents processed",
    ai_requests: "AI requests",
    gst_workflows: "Tax & compliance workflows",
    ocr_pages: "OCR pages",
    storage_bytes: "Storage",
    invoices_created: "Invoices",
    business_users: "Business users",
};

function PaymentSafety() {
    return (
        <section className="mt-8 grid gap-4 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3">
                    <Globe className="mt-0.5 size-4 text-cyan-400" />
                    <div>
                        <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                            <span className="size-1.5 rounded-full bg-cyan-400" />
                            MULTI-CURRENCY & GLOBAL CARDS
                        </span>
                        <h2 className="mt-2 text-lg font-medium text-white">International billing ready.</h2>
                    </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    Prava supports major global currencies (USD, GBP, EUR, CAD, AUD, JPY, SGD, AED, BRL, ZAR, INR) and enforces subscription quotas server-side before execution.
                </p>
                <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#0E1424] p-3 text-[11px] leading-5 text-slate-400">
                    Checkout connects securely to your workspace's preferred currency and regional tax compliance rules.
                </div>
            </article>

            <article className="relative overflow-hidden rounded-2xl border border-[#C9A24B]/30 bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md">
                <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-[#C9A24B]/20 to-transparent pointer-events-none" />
                <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 size-4 text-[#C9A24B]" />
                    <div>
                        <span className="eyebrow-chip inline-flex items-center gap-1.5 border-[#C9A24B]/30 text-[#C9A24B]">
                            <span className="size-1.5 rounded-full bg-[#C9A24B]" />
                            PROVIDER CHECKOUT
                        </span>
                        <h2 className="mt-2 text-lg font-medium text-white">Live checkout verification.</h2>
                    </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    Live payment gateway credentials and webhook signatures must be verified before payment status changes are recorded. Prava will not simulate payments or grant unverified subscriptions.
                </p>
            </article>
        </section>
    );
}

export default function Billing() {
    const [, setLocation] = useLocation();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];
    const currency = business?.currency ?? "USD";
    const locale = business?.locale ?? "en-US";
    const billing = useQuery({ queryKey: ["billing", "snapshot", business?.id], queryFn: () => api.billing.snapshot({ businessId: business?.id ?? 0 }), enabled: Boolean(business) });
    const data = billing.data;

    return (
        <DashboardLayout>
            <div className="mx-auto max-w-6xl py-2 space-y-6">
                {/* Banner */}
                <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 sm:p-8 shadow-xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none" />
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                                WORKSPACE BILLING & SUBSCRIPTIONS
                            </span>
                            <h1 className="mt-3 text-2xl sm:text-3xl font-medium tracking-tight text-white">
                                Plans that control automation <span className="text-slate-400">before it runs</span>.
                            </h1>
                            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-400">
                                Feature access and usage are verified server-side before Prava consumes document-processing or compliance-workflow resources.
                            </p>
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white">
                            <CreditCard className="size-5 text-cyan-400" />
                        </div>
                    </div>
                </section>

                {!business ? (
                    <>
                        <section className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                            Create a workspace before selecting a plan or configuring a verified payment method.
                        </section>
                        <PaymentSafety />
                    </>
                ) : billing.isLoading ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                        Loading billing details…
                    </div>
                ) : data ? (
                    <>
                        {/* Current Entitlement */}
                        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md">
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                        <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                                        CURRENT ENTITLEMENT
                                    </span>
                                    <h2 className="mt-2 text-xl font-medium text-white">{data.currentPlan.name}</h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Status: <strong className="capitalize text-white font-medium">{data.subscription.status.replaceAll("_", " ")}</strong>. Existing records remain accessible if a paid entitlement changes.
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-[#0E1424] px-3 py-1.5 text-xs font-medium text-cyan-300">
                                    <ShieldCheck className="size-3.5 text-cyan-400" />
                                    Server-enforced
                                </span>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {Object.entries(metricLabel).map(([metric, label]) => {
                                    const record = data.usage.find((item) => item.metric === metric);
                                    return (
                                        <div key={metric} className="rounded-xl border border-white/[0.06] bg-[#0E1424] p-4">
                                            <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{label}</p>
                                            <p className="mt-1.5 font-mono text-xl font-medium text-white">{record?.quantity ?? 0}</p>
                                            <p className="mt-0.5 text-[10px] text-slate-400">Current billing period</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Configured Plans */}
                        <section className="space-y-4">
                            <div>
                                <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                    <span className="size-1.5 rounded-full bg-cyan-400" />
                                    CONFIGURED PLANS
                                </span>
                                <h2 className="mt-2 text-lg font-medium text-white">Choose When Provider Checkout Is Enabled</h2>
                            </div>
                            <div className="grid gap-4 lg:grid-cols-3">
                                {data.plans.map((plan) => (
                                    <article
                                        key={plan.id}
                                        className={`relative overflow-hidden rounded-2xl border p-6 transition-all ${
                                            plan.id === data.currentPlan.id
                                                ? "border-cyan-500/50 bg-gradient-to-b from-[#0E1424] to-[#0B0F19] shadow-lg"
                                                : "border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12]"
                                        }`}
                                    >
                                        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none" />
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-medium text-white">{plan.name}</p>
                                            {plan.priceMinor != null && (
                                                <span className="font-mono text-xs font-medium text-white">
                                                    {formatMinorAmount(plan.priceMinor, currency, locale)} / mo
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-3 text-xs leading-relaxed text-slate-400">{plan.description}</p>
                                        <div className="mt-5 space-y-2 text-xs text-slate-400">
                                            <p className="flex items-center gap-2">
                                                <CheckCircle2 className="size-3.5 text-cyan-400" />
                                                {plan.documentLimit ?? "Configured"} documents
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <CheckCircle2 className="size-3.5 text-cyan-400" />
                                                {plan.gstWorkflowLimit ?? "Configured"} compliance workflows
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <CheckCircle2 className="size-3.5 text-cyan-400" />
                                                {plan.memberLimit} business users
                                            </p>
                                        </div>
                                        <Button
                                            disabled
                                            className={`mt-6 w-full rounded-full text-xs font-medium ${
                                                plan.id === data.currentPlan.id
                                                    ? "bg-white text-black opacity-100 cursor-default"
                                                    : "border border-white/[0.08] bg-white/[0.03] text-slate-400 opacity-70"
                                            }`}
                                        >
                                            {plan.id === data.currentPlan.id ? "Current plan" : "Provider checkout not configured"}
                                        </Button>
                                    </article>
                                ))}
                            </div>
                        </section>
                        <PaymentSafety />
                    </>
                ) : (
                    <section className="rounded-2xl border border-rose-500/20 bg-[#0B0F19] p-6 text-xs text-rose-400">
                        Billing details could not be loaded.{" "}
                        <button onClick={() => setLocation("/dashboard")} className="font-medium text-white underline">
                            Return to overview
                        </button>
                        .
                    </section>
                )}
            </div>
        </DashboardLayout>
    );
}
