import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import { AlertCircle, CheckCircle2, CreditCard, Globe, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { useLocation } from "wouter";

const metricLabel: Record<string, string> = {
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
      <article className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 text-slate-700 dark:text-white" />
          <div>
            <span className="prava-tag text-[10px]">Multi-Currency & Global Cards</span>
            <h2 className="font-['Playfair_Display',Georgia,serif] mt-2 text-xl font-normal text-slate-900 dark:text-white">International billing ready.</h2>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Prava supports major global currencies (USD, GBP, EUR, CAD, AUD, JPY, SGD, AED, BRL, ZAR, INR) and enforces subscription quotas server-side before execution.
        </p>
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-[11px] leading-5 text-slate-700 dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-[#CBD5E1]">
          Checkout connects securely to your workspace's preferred currency and regional tax compliance rules.
        </div>
      </article>

      <article className="prava-panel p-6 border border-amber-400/30 bg-gradient-to-br from-amber-500/[0.04] to-transparent">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-amber-600 dark:text-amber-400" />
          <div>
            <span className="prava-tag-amber text-[10px]">Provider Checkout</span>
            <h2 className="font-['Playfair_Display',Georgia,serif] mt-2 text-xl font-normal text-slate-900 dark:text-white">Live checkout verification.</h2>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Live payment gateway credentials and webhook signatures must be verified before payment status changes are recorded. Prava will not simulate payments or grant unverified subscriptions.
        </p>
      </article>
    </section>
  );
}

export default function Billing() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const currency = business?.currency ?? "USD";
  const locale = business?.locale ?? "en-US";

  const billing = trpc.billing.snapshot.useQuery({ businessId: business?.id ?? 0 }, { enabled: Boolean(business) });
  const data = billing.data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Banner */}
        <section className="prava-panel rounded-3xl p-7 text-slate-900 dark:text-white sm:p-9 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="prava-tag">Workspace Billing & Subscriptions</span>
              <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
                Plans that control automation <em className="italic font-normal">before it runs</em>.
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Feature access and usage are verified server-side before Prava consumes document-processing or compliance-workflow resources.
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white shadow-sm">
              <CreditCard className="size-6" />
            </div>
          </div>
        </section>

        {!business ? (
          <>
            <section className="prava-panel p-7 text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
              Create a workspace before selecting a plan or configuring a verified payment method.
            </section>
            <PaymentSafety />
          </>
        ) : billing.isLoading ? (
          <div className="prava-panel p-6 text-xs text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-white/10">
            Loading billing details…
          </div>
        ) : data ? (
          <>
            {/* Current Entitlement */}
            <section className="prava-panel p-6 border border-slate-200/80 dark:border-white/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="prava-tag text-[10px]">Current Entitlement</span>
                  <h2 className="font-['Playfair_Display',Georgia,serif] mt-1 text-2xl font-normal text-slate-900 dark:text-white">{data.currentPlan.name}</h2>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                    Status: <strong className="capitalize text-slate-900 dark:text-white">{data.subscription.status.replaceAll("_", " ")}</strong>. Existing records remain accessible if a paid entitlement changes.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:border-white/15 dark:bg-white/[0.08] dark:text-white">
                  <ShieldCheck className="size-3.5" />
                  Server-enforced
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(metricLabel).map(([metric, label]) => {
                  const record = data.usage.find((item) => item.metric === metric);
                  return (
                    <div key={metric} className="prava-card p-4">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</p>
                      <p className="prava-mono mt-1.5 text-xl font-bold text-slate-900 dark:text-white">{record?.quantity ?? 0}</p>
                      <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Current billing period</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Configured Plans */}
            <section className="space-y-4">
              <div>
                <span className="prava-tag-purple text-[10px]">Configured Plans</span>
                <h2 className="font-['Playfair_Display',Georgia,serif] mt-1 text-2xl font-normal text-slate-900 dark:text-white">Choose When Provider Checkout Is Enabled</h2>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {data.plans.map((plan) => (
                  <article
                    key={plan.id}
                    className={`rounded-2xl border p-6 transition-all ${
                      plan.id === data.currentPlan.id
                        ? "border-slate-400 bg-white shadow-md dark:border-white/30 dark:bg-white/[0.08]"
                        : "prava-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</p>
                      {plan.priceMinor != null && (
                        <span className="prava-mono text-xs font-bold text-slate-900 dark:text-white">
                          {formatMinorAmount(plan.priceMinor, currency, locale)} / mo
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{plan.description}</p>
                    <div className="mt-5 space-y-2 text-xs text-slate-700 dark:text-slate-300">
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        {plan.documentLimit ?? "Configured"} documents
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        {plan.gstWorkflowLimit ?? "Configured"} compliance workflows
                      </p>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        {plan.memberLimit} business users
                      </p>
                    </div>
                    <Button
                      disabled
                      className={`mt-6 w-full rounded-xl text-xs font-bold ${
                        plan.id === data.currentPlan.id
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black opacity-100 cursor-default"
                          : "border border-slate-200 bg-slate-100 text-slate-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500"
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
          <section className="prava-panel p-6 text-xs text-red-500 dark:text-red-300 border border-red-500/20">
            Billing details could not be loaded.{" "}
            <button onClick={() => setLocation("/dashboard")} className="font-bold text-slate-900 dark:text-white underline">
              Return to overview
            </button>
            .
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
