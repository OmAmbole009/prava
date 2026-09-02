import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import { AlertCircle, CheckCircle2, CreditCard, Globe, ShieldCheck } from "lucide-react";
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
    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <article className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6">
        <div className="flex items-start gap-3">
          <Globe className="mt-0.5 size-5 text-[#b77a43]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Multi-Currency & Global Cards</p>
            <h2 className="prava-display mt-2 text-2xl text-[#153832]">International billing ready.</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#718078]">Prava supports major global currencies (USD, GBP, EUR, CAD, AUD, JPY, SGD, AED, BRL, ZAR, INR) and enforces subscription quotas server-side before execution.</p>
        <div className="mt-4 rounded-xl border border-[#e9dfcd] bg-[#f8f5ec] p-4 text-xs leading-5 text-[#58766a]">Checkout connects securely to your workspace's preferred currency and regional tax compliance rules.</div>
      </article>
      <article className="rounded-2xl border border-[#e4c4ba] bg-[#fff7f4] p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-[#b7523d]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a45b48]">Provider checkout</p>
            <h2 className="prava-display mt-2 text-2xl text-[#5c3027]">Live checkout readiness.</h2>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-[#70473d]">Live payment gateway credentials and webhook signatures must be verified before payment status changes are recorded. Prava will not simulate payments or grant unverified subscriptions.</p>
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
      <div className="mx-auto max-w-6xl py-2">
        <section className="rounded-3xl bg-[#163a34] p-7 text-[#f7f1e4] sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cfe4ad]">Workspace billing</p>
              <h1 className="prava-display mt-3 text-4xl">Plans that control automation before it runs.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[#c5d2c9]">Feature access and usage are checked server-side before Prava consumes document-processing or compliance-workflow resources.</p>
            </div>
            <CreditCard className="size-7 text-[#d5bd90]" />
          </div>
        </section>

        {!business ? (
          <>
            <section className="mt-6 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-7 text-sm text-[#718078]">Create a workspace before selecting a plan or configuring a verified payment method.</section>
            <PaymentSafety />
          </>
        ) : billing.isLoading ? (
          <div className="mt-6 text-sm text-[#718078]">Loading billing details…</div>
        ) : data ? (
          <>
            <section className="mt-6 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Current entitlement</p>
                  <h2 className="prava-display mt-1 text-3xl text-[#153832]">{data.currentPlan.name}</h2>
                  <p className="mt-2 text-sm text-[#718078]">Status: <strong className="capitalize text-[#24473e]">{data.subscription.status.replaceAll("_", " ")}</strong>. Existing records remain accessible if a paid entitlement changes.</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#d5cbb9] bg-[#f7f3e9] px-3 py-1.5 text-xs font-semibold text-[#58766a]"><ShieldCheck className="size-3.5" />Server-enforced</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(metricLabel).map(([metric, label]) => {
                  const record = data.usage.find(item => item.metric === metric);
                  return <div key={metric} className="rounded-xl border border-[#e8dfce] p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#718078]">{label}</p><p className="mt-2 text-lg font-semibold text-[#24473e]">{record?.quantity ?? 0}</p><p className="mt-1 text-xs text-[#879188]">Current billing period</p></div>;
                })}
              </div>
            </section>

            <section className="mt-7">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Configured plans</p>
              <h2 className="prava-display mt-1 text-3xl text-[#153832]">Choose when provider checkout is enabled</h2>
              <div className="mt-4 grid gap-4 lg:grid-cols-3">
                {data.plans.map(plan => (
                  <article key={plan.id} className={`rounded-2xl border p-6 ${plan.id === data.currentPlan.id ? "border-[#6e927e] bg-[#edf4e8]" : "border-[#dfd6c4] bg-[#fffdf8]"}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-[#24473e]">{plan.name}</p>
                      {plan.priceMinor != null && (
                        <span className="text-xs font-bold text-[#163a34]">
                          {formatMinorAmount(plan.priceMinor, currency, locale)} / mo
                        </span>
                      )}
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#718078]">{plan.description}</p>
                    <div className="mt-5 space-y-2 text-xs text-[#58766a]">
                      <p><CheckCircle2 className="mr-2 inline size-3.5" />{plan.documentLimit ?? "Configured"} documents</p>
                      <p><CheckCircle2 className="mr-2 inline size-3.5" />{plan.gstWorkflowLimit ?? "Configured"} compliance workflows</p>
                      <p><CheckCircle2 className="mr-2 inline size-3.5" />{plan.memberLimit} business users</p>
                    </div>
                    <Button disabled className="mt-6 w-full rounded-full">{plan.id === data.currentPlan.id ? "Current plan" : "Provider checkout not configured"}</Button>
                  </article>
                ))}
              </div>
            </section>
            <PaymentSafety />
          </>
        ) : (
          <section className="mt-6 rounded-2xl border border-[#edc8bb] bg-[#fff7f4] p-6 text-sm text-[#7b5249]">Billing details could not be loaded. <button onClick={() => setLocation("/dashboard")} className="font-semibold underline">Return to overview</button>.</section>
        )}
      </div>
    </DashboardLayout>
  );
}
