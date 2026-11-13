import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatMinorAmount } from "@shared/locale";
import { AlertCircle, CheckCircle2, CreditCard, Gift, Loader2, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useState } from "react";
import { Input } from "@/components/ui/input";

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
        <section className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5">
            <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-cyan-400" />
                <div>
                    <h2 className="text-sm font-medium text-white">Payments verified by Razorpay</h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                        Paid plans activate only after Razorpay confirms a captured payment. Each payment covers the displayed plan period; plans do not auto-renew. UPI options, including Google Pay, depend on Razorpay account and device availability.
                    </p>
                </div>
            </div>
        </section>
    );
}

let razorpayScriptPromise;

function loadRazorpayCheckout() {
    if (window.Razorpay) return Promise.resolve();
    if (razorpayScriptPromise) return razorpayScriptPromise;
    razorpayScriptPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = resolve;
        script.onerror = () => {
            razorpayScriptPromise = null;
            reject(new Error("Razorpay checkout could not be loaded."));
        };
        document.body.appendChild(script);
    });
    return razorpayScriptPromise;
}

export default function Billing() {
    const [, setLocation] = useLocation();
    const [giftCode, setGiftCode] = useState("");
    const [giftPlanId, setGiftPlanId] = useState("");
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];
    const queryClient = useQueryClient();
    const currency = business?.currency ?? "USD";
    const locale = business?.locale ?? "en-US";
    const billing = useQuery({
        queryKey: ["billing", "snapshot", business?.id],
        queryFn: () => api.billing.snapshot({ businessId: business?.id ?? 0 }),
        enabled: Boolean(business),
        refetchInterval: 5000,
    });
    const data = billing.data;
    const gateway = useQuery({ queryKey: ["billing", "gatewayConfig"], queryFn: () => api.billing.gatewayConfig(), retry: false });
    const refreshBilling = async () => {
        await queryClient.invalidateQueries({ queryKey: ["billing", "snapshot", business?.id] });
    };
    const selectFreePlan = useMutation({
        mutationFn: () => api.billing.selectFreePlan({ businessId: business.id }),
        onSuccess: async () => {
            toast.success("Free plan selected. Your workspace is ready.");
            await refreshBilling();
            setLocation("/dashboard");
        },
        onError: (error) => toast.error(error.message),
    });
    const createOrder = useMutation({
        mutationFn: (planId) => api.billing.createOrder({ businessId: business.id, planId }),
        onSuccess: async (order) => {
            try {
                await loadRazorpayCheckout();
                const checkout = new window.Razorpay({
                    key: order.keyId,
                    order_id: order.orderId,
                    amount: order.amount,
                    currency: order.currency,
                    name: "Prava",
                    description: order.description,
                    handler: async (response) => {
                        try {
                            await api.billing.verifyPayment({
                                businessId: business.id,
                                orderId: response.razorpay_order_id,
                                paymentId: response.razorpay_payment_id,
                                signature: response.razorpay_signature,
                            });
                            toast.success("Payment verified. Your plan is active.");
                            setCheckoutOpen(false);
                            await refreshBilling();
                            setLocation("/dashboard");
                        } catch (error) {
                            setCheckoutOpen(false);
                            toast.error(error.message || "Payment is processing. Your plan will activate after provider confirmation.");
                            await refreshBilling();
                        }
                    },
                    modal: {
                        ondismiss: () => {
                            setCheckoutOpen(false);
                            createOrder.reset();
                        },
                    },
                    theme: { color: "#38BDF8" },
                });
                checkout.on("payment.failed", (event) => {
                    setCheckoutOpen(false);
                    toast.error(event.error?.description || "Payment failed. Your current plan has not changed.");
                });
                checkout.open();
                setCheckoutOpen(true);
            } catch (error) {
                toast.error(error.message);
            }
        },
        onError: (error) => toast.error(error.message),
    });
    const redeemGiftCode = useMutation({
        mutationFn: () => api.billing.redeemGiftCode({
            businessId: business.id,
            planId: Number(giftPlanId || data.plans.find((plan) => plan.code !== "free")?.id),
            code: giftCode,
        }),
        onSuccess: async (result) => {
            toast.success(`${result.planName} plan activated with the gift code.`);
            setGiftCode("");
            await refreshBilling();
            setLocation("/dashboard");
        },
        onError: (error) => toast.error(error.message),
    });

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

                {businesses.isLoading ? (
                    <div className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-6 text-xs text-slate-400">
                        Loading workspace…
                    </div>
                ) : !business ? (
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
                        {!data.subscription.planSelected && (
                            <section className="rounded-2xl border border-cyan-500/25 bg-cyan-500/[0.06] p-5">
                                <h2 className="text-sm font-semibold text-white">Choose a plan to activate your workspace</h2>
                                <p className="mt-1 text-xs text-slate-300">Select Free, pay securely for a paid plan, or use a gift code. Workspace features stay locked until you finish selection.</p>
                            </section>
                        )}

                        {/* Current Entitlement */}
                        <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] p-6 shadow-md">
                            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                                        <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                                        CURRENT ENTITLEMENT
                                    </span>
                                    <h2 className="mt-2 text-xl font-medium text-white">{data.subscription.planSelected ? data.currentPlan.name : "No plan selected"}</h2>
                                    <p className="mt-1 text-xs text-slate-400">
                                        {data.subscription.planSelected
                                            ? <>Status: <strong className="capitalize text-white font-medium">{data.subscription.status.replaceAll("_", " ")}</strong>. Plan changes take effect after verified payment or gift-code redemption.</>
                                            : "Choose a plan below to unlock your workspace."}
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
                                <h2 className="mt-2 text-lg font-medium text-white">Choose a plan</h2>
                            </div>
                            {!gateway.data?.enabled && (
                                <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-100">
                                    Secure checkout is not configured yet. A workspace owner can still choose Free or redeem a gift code.
                                </p>
                            )}
                            <div className="grid gap-4 lg:grid-cols-3">
                                {data.plans.map((plan) => {
                                        const selected = Boolean(data.subscription.planSelected);
                                        const current = selected && plan.id === data.currentPlan.id && data.subscription.status !== "expired";
                                        const freeDowngrade = selected && plan.code === "free" && data.currentPlan.code !== "free";
                                        const canChooseFree = plan.code === "free" && !selected;
                                        const priceConfigured = Number.isSafeInteger(plan.priceMinor) && plan.priceMinor > 0;
                                        const canPay = plan.code !== "free" && !current && !freeDowngrade && priceConfigured;
                                        const busy = selectFreePlan.isPending || createOrder.isPending || checkoutOpen;
                                        return (
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
                                            {plan.priceMinor != null ? (
                                                <span className="font-mono text-xs font-medium text-white">
                                                    {formatMinorAmount(plan.priceMinor, plan.currency ?? currency, locale)} {plan.billingPeriod === "yearly" ? "/ yr" : plan.billingPeriod === "monthly" ? "/ mo" : "/ custom"}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-slate-300">{plan.code === "free" ? "Free" : "Contact us"}</span>
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
                                            disabled={current || freeDowngrade || (plan.code !== "free" && !priceConfigured) || (canPay && (!gateway.data?.enabled || createOrder.isPending)) || busy}
                                            onClick={() => canChooseFree ? selectFreePlan.mutate() : canPay ? createOrder.mutate(plan.id) : null}
                                            className={`mt-6 w-full rounded-full text-xs font-medium ${
                                                current
                                                    ? "bg-white text-black opacity-100 cursor-default"
                                                    : "border border-white/[0.08] bg-white/[0.03] text-slate-200"
                                            }`}
                                        >
                                            {current
                                                ? "Current plan"
                                                : canChooseFree
                                                    ? selectFreePlan.isPending ? "Selecting…" : "Choose Free"
                                                    : freeDowngrade
                                                        ? "Included in current plan"
                                                        : plan.code !== "free" && !priceConfigured
                                                            ? "Plan price not configured"
                                                        : createOrder.isPending ? "Preparing checkout…" : gateway.data?.enabled ? "Pay securely to upgrade" : "Checkout unavailable"}
                                        </Button>
                                    </article>
                                        );
                                })}
                            </div>
                            <section className="rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-5">
                                <div className="flex items-start gap-3">
                                    <Gift className="mt-0.5 size-4 text-cyan-400" />
                                    <div className="flex-1">
                                        <h3 className="text-sm font-medium text-white">Have a gift code?</h3>
                                        <p className="mt-1 text-xs text-slate-400">GANPATIBAPPA can activate one paid plan once for this workspace.</p>
                                        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
                                            <select
                                                aria-label="Gift plan"
                                                className="h-10 rounded-xl border border-white/[0.08] bg-[#0B0F19] px-3 text-sm text-white"
                                                value={giftPlanId || data.plans.find((plan) => plan.code !== "free")?.id || ""}
                                                onChange={(event) => setGiftPlanId(event.target.value)}
                                            >
                                                {data.plans.filter((plan) => plan.code !== "free").map((plan) => (
                                                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                                                ))}
                                            </select>
                                            <Input
                                                aria-label="Gift code"
                                                autoComplete="off"
                                                value={giftCode}
                                                onChange={(event) => setGiftCode(event.target.value)}
                                                placeholder="Enter gift code"
                                            />
                                            <Button
                                                disabled={!giftCode.trim() || redeemGiftCode.isPending || Boolean(data.giftCodeRedeemed)}
                                                onClick={() => redeemGiftCode.mutate()}
                                                className="h-10"
                                            >
                                                {redeemGiftCode.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                                {data.giftCodeRedeemed ? "Already redeemed" : "Redeem code"}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </section>
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
