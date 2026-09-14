import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, CircleDashed, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type IntegrationType = "email" | "gst_provider" | "razorpay" | "upi";
type FormState = {
  displayName: string;
  publicIdentifier: string;
  apiBaseUrl: string;
  webhookUrl: string;
  readinessNote: string;
};
const emptyForm: FormState = {
  displayName: "",
  publicIdentifier: "",
  apiBaseUrl: "",
  webhookUrl: "",
  readinessNote: "",
};
const labels: Record<IntegrationType, string> = {
  email: "Decision Email Delivery",
  gst_provider: "Authorized GST Provider",
  razorpay: "Razorpay Payments",
  upi: "Merchant UPI / Google Pay",
};
const descriptions: Record<IntegrationType, string> = {
  email: "Store the verified sender identity and delivery-provider reference. API keys stay in server secrets.",
  gst_provider:
    "Store the selected authorized provider and endpoint reference. This does not enable government filing.",
  razorpay:
    "Store account and webhook endpoint metadata. Checkout remains disabled until credentials and signature verification are complete.",
  upi: "Store merchant destination metadata only. No QR is rendered until server-side payment status verification is available.",
};

export default function AdminIntegrations() {
  const settings = trpc.admin.integrationSettings.useQuery(undefined, { retry: false });
  const utils = trpc.useUtils();
  const update = trpc.admin.updateIntegrationSettings.useMutation({
    onSuccess: () => {
      toast.success("Integration metadata saved. Secrets and live activation remain unchanged.");
      utils.admin.integrationSettings.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const [forms, setForms] = useState<Record<IntegrationType, FormState>>({
    email: emptyForm,
    gst_provider: emptyForm,
    razorpay: emptyForm,
    upi: emptyForm,
  });

  useEffect(() => {
    if (!settings.data) return;
    setForms(
      (previous) =>
        Object.fromEntries(
          settings.data.map((item) => [item.type, { ...previous[item.type], ...(item.settings ?? {}) }])
        ) as Record<IntegrationType, FormState>
    );
  }, [settings.data]);

  const setField = (type: IntegrationType, field: keyof FormState, value: string) =>
    setForms((previous) => ({ ...previous, [type]: { ...previous[type], [field]: value } }));

  if (settings.isLoading)
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          <Loader2 className="mr-2 size-4 animate-spin text-slate-700 dark:text-white" />
          Loading integration readiness…
        </div>
      </DashboardLayout>
    );
  if (settings.error || !settings.data)
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7">
          <AlertCircle className="size-5 text-red-500 dark:text-red-400" />
          <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-lg font-bold text-slate-900 dark:text-white">Integration readiness is unavailable.</h1>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{settings.error?.message ?? "Administrative access is required."}</p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Banner */}
        <section className="prava-panel rounded-3xl p-7 text-slate-900 dark:text-white sm:p-9 border border-slate-200/80 dark:border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="prava-tag">Integration Architecture</span>
              <h1 className="font-['Playfair_Display',Georgia,serif] mt-3 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
                Connect only what <em className="italic font-normal">can be verified</em>.
              </h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Record non-secret setup metadata here so operators know what remains. Credentials stay server-only, and
                saving metadata never prematurely triggers live payment, email, or government filing behavior.
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-white shadow-sm">
              <ShieldCheck className="size-6" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          {settings.data.map((item) => {
            const type = item.type as IntegrationType;
            const form = forms[type];
            const ready = item.status === "ready" && item.metadataComplete;
            return (
              <section key={type} className="prava-panel p-6 border border-slate-200/80 dark:border-white/10 shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-10 place-items-center rounded-xl border ${
                        ready
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {ready ? <CheckCircle2 className="size-5" /> : <CircleDashed className="size-5" />}
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900 dark:text-white">{labels[type]}</h2>
                      <p
                        className={`mt-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          ready ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                        }`}
                      >
                        {ready ? "Ready for verification" : "Not ready for activation"}
                      </p>
                    </div>
                  </div>
                  <KeyRound className="size-4 text-slate-400" />
                </div>

                <p className="mt-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {descriptions[type]} {item.boundary}
                </p>

                <div className="mt-5 grid gap-3">
                  <div className="grid gap-2">
                    <Label htmlFor={`${type}-name`} className="text-xs text-slate-700 dark:text-slate-300">
                      Display Name
                    </Label>
                    <Input
                      id={`${type}-name`}
                      value={form.displayName}
                      onChange={(event) => setField(type, "displayName", event.target.value)}
                      placeholder={labels[type]}
                      className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#0A0F16] dark:text-white shadow-sm"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor={`${type}-identifier`} className="text-xs text-slate-700 dark:text-slate-300">
                      Public Identifier or Account Label
                    </Label>
                    <Input
                      id={`${type}-identifier`}
                      value={form.publicIdentifier}
                      onChange={(event) => setField(type, "publicIdentifier", event.target.value)}
                      placeholder="Non-secret reference only"
                      className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#0A0F16] dark:text-white shadow-sm"
                    />
                  </div>

                  {type === "gst_provider" ? (
                    <div className="grid gap-2">
                      <Label htmlFor={`${type}-api`} className="text-xs text-slate-700 dark:text-slate-300">
                        Provider API Base URL
                      </Label>
                      <Input
                        id={`${type}-api`}
                        type="url"
                        value={form.apiBaseUrl}
                        onChange={(event) => setField(type, "apiBaseUrl", event.target.value)}
                        placeholder="https://provider.example"
                        className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#0A0F16] dark:text-white shadow-sm"
                      />
                    </div>
                  ) : null}

                  {type === "razorpay" ? (
                    <div className="grid gap-2">
                      <Label htmlFor={`${type}-webhook`} className="text-xs text-slate-700 dark:text-slate-300">
                        Webhook Endpoint URL
                      </Label>
                      <Input
                        id={`${type}-webhook`}
                        type="url"
                        value={form.webhookUrl}
                        onChange={(event) => setField(type, "webhookUrl", event.target.value)}
                        placeholder="https://app.example/webhooks/razorpay"
                        className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#0A0F16] dark:text-white shadow-sm"
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label htmlFor={`${type}-note`} className="text-xs text-slate-700 dark:text-slate-300">
                      Operator Note
                    </Label>
                    <Textarea
                      id={`${type}-note`}
                      value={form.readinessNote}
                      onChange={(event) => setField(type, "readinessNote", event.target.value)}
                      placeholder="Record verification steps or ownership without secrets."
                      className="border-slate-200 bg-white text-xs text-slate-900 dark:border-white/10 dark:bg-[#0A0F16] dark:text-white shadow-sm"
                    />
                  </div>

                  <Button
                    disabled={update.isPending || form.displayName.trim().length < 2}
                    onClick={() => update.mutate({ integrationType: type, ...form })}
                    className="mt-1 rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
                  >
                    {update.isPending ? "Saving…" : "Save non-secret metadata"}
                  </Button>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-white/[0.06] dark:bg-[#0A0F16] p-3 text-[11px] leading-5 text-slate-600 dark:text-[#94A3B8]">
                  {"Activation gate: " + item.configuredCount + " of " + item.requiredCount + " server requirements are present; metadata is " + (item.metadataComplete ? "complete" : "incomplete") + ". No secret values are shown or stored here."}
                </div>
              </section>
            );
          })}
        </div>

        <section className="prava-panel border border-slate-200/80 dark:border-white/10 p-5 text-xs leading-6 text-slate-600 dark:text-[#94A3B8]">
          {"Current delivery rule: approval and rejection notices remain available in-app; email rows are suppressed until delivery is configured. GST preparation is not filing, and payment status requires a server-verifiable provider response. No Razorpay checkout, UPI QR, or GST-provider dispatch is activated by this page."}
        </section>
      </div>
    </DashboardLayout>
  );
}
