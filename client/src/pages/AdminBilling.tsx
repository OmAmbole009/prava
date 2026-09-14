import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, ShieldCheck, SlidersHorizontal, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type FeatureConfig = {
  GST_PREPARATION: boolean;
  AI_DOCUMENT_EXTRACTION: boolean;
  ADVANCED_RECONCILIATION: boolean;
  PROFESSIONAL_REVIEW: boolean;
};

function featureConfig(raw: string): FeatureConfig {
  try {
    const value = JSON.parse(raw) as Partial<FeatureConfig>;
    return {
      GST_PREPARATION: value.GST_PREPARATION === true,
      AI_DOCUMENT_EXTRACTION: value.AI_DOCUMENT_EXTRACTION === true,
      ADVANCED_RECONCILIATION: value.ADVANCED_RECONCILIATION === true,
      PROFESSIONAL_REVIEW: value.PROFESSIONAL_REVIEW === true,
    };
  } catch {
    return {
      GST_PREPARATION: false,
      AI_DOCUMENT_EXTRACTION: false,
      ADVANCED_RECONCILIATION: false,
      PROFESSIONAL_REVIEW: false,
    };
  }
}

export default function AdminBilling() {
  const overview = trpc.admin.billingOverview.useQuery(undefined, { retry: false });
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(null);
  const selectedPlan = overview.data?.plans.find((plan) => plan.id === selectedPlanId) ?? overview.data?.plans[0];
  const selectedSubscription =
    overview.data?.subscriptions.find((row) => row.subscription.id === selectedSubscriptionId) ??
    overview.data?.subscriptions[0];
  const [draft, setDraft] = useState<{
    name: string;
    description: string;
    status: "active" | "archived";
    billingPeriod: "monthly" | "yearly" | "custom";
    priceMinor: string;
    documentLimit: string;
    aiRequestLimit: string;
    gstWorkflowLimit: string;
    memberLimit: string;
    features: FeatureConfig;
  } | null>(null);

  useEffect(() => {
    if (!selectedPlan) return;
    setDraft({
      name: selectedPlan.name,
      description: selectedPlan.description ?? "",
      status: selectedPlan.status,
      billingPeriod: selectedPlan.billingPeriod,
      priceMinor: selectedPlan.priceMinor?.toString() ?? "",
      documentLimit: selectedPlan.documentLimit?.toString() ?? "",
      aiRequestLimit: selectedPlan.aiRequestLimit?.toString() ?? "",
      gstWorkflowLimit: selectedPlan.gstWorkflowLimit?.toString() ?? "",
      memberLimit: selectedPlan.memberLimit.toString(),
      features: featureConfig(selectedPlan.featureConfig),
    });
  }, [selectedPlan?.id]);

  const utils = trpc.useUtils();
  const updatePlan = trpc.admin.updatePlan.useMutation({
    onSuccess: () => {
      toast.success("Plan configuration saved and audited.");
      utils.admin.billingOverview.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateSubscription = trpc.admin.updateSubscription.useMutation({
    onSuccess: () => {
      toast.success("Subscription status saved and audited.");
      utils.admin.billingOverview.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const activePlans = useMemo(() => overview.data?.plans.filter((plan) => plan.status === "active") ?? [], [
    overview.data?.plans,
  ]);

  if (overview.isLoading)
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin text-primary" />
          Loading administration console…
        </div>
      </DashboardLayout>
    );
  if (overview.error || !overview.data)
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-destructive/20 bg-destructive/10 p-7">
          <AlertCircle className="size-5 text-destructive" />
          <h1 className="font-serif mt-3 text-lg font-bold text-foreground">Administrative access is required.</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {overview.error?.message ?? "This console is available only to authorized administrators."}
          </p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-card/90 p-7 shadow-xl backdrop-blur-xl sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Internal Administration
              </span>
              <h1 className="font-serif mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Plans and subscriptions, <span className="italic font-normal text-muted-foreground">with an audit trail</span>.
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Provider checkout stays disabled until verified payment credentials and webhook processing are configured.
                Changes here only update Prava's internal entitlement records.
              </p>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
              <ShieldCheck className="size-6 text-foreground" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Plan Configuration */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                <SlidersHorizontal className="size-4.5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Plan Configuration</p>
                <p className="text-xs text-muted-foreground">Feature gates and usage limits are enforced server-side.</p>
              </div>
            </div>

            <div className="mt-5">
              <Label htmlFor="admin-plan" className="text-xs text-foreground">
                Select Plan
              </Label>
              <Select value={String(selectedPlan?.id ?? "")} onValueChange={(value) => setSelectedPlanId(Number(value))}>
                <SelectTrigger id="admin-plan" className="mt-2 border-border/60 bg-background/50 text-xs text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  {overview.data.plans.map((plan) => (
                    <SelectItem key={plan.id} value={String(plan.id)}>
                      {plan.name} · {plan.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {draft && selectedPlan ? (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="plan-name" className="text-xs text-foreground">
                    Name
                  </Label>
                  <Input
                    id="plan-name"
                    value={draft.name}
                    onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                    className="border-border/60 bg-background/50 text-xs text-foreground"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="plan-description" className="text-xs text-foreground">
                    Description
                  </Label>
                  <Input
                    id="plan-description"
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    className="border-border/60 bg-background/50 text-xs text-foreground"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-xs text-foreground">Availability</Label>
                    <Select
                      value={draft.status}
                      onValueChange={(value) => setDraft({ ...draft, status: value as "active" | "archived" })}
                    >
                      <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs text-foreground">Billing Period</Label>
                    <Select
                      value={draft.billingPeriod}
                      onValueChange={(value) =>
                        setDraft({ ...draft, billingPeriod: value as "monthly" | "yearly" | "custom" })
                      }
                    >
                      <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["priceMinor", "Price (minor units)"],
                    ["documentLimit", "Document Limit"],
                    ["aiRequestLimit", "AI Request Limit"],
                    ["gstWorkflowLimit", "GST Workflow Limit"],
                    ["memberLimit", "Member Limit"],
                  ].map(([key, label]) => (
                    <div key={key} className="grid gap-2">
                      <Label htmlFor={key} className="text-xs text-foreground">
                        {label}
                      </Label>
                      <Input
                        id={key}
                        inputMode="numeric"
                        value={
                          draft[
                            key as
                              | "priceMinor"
                              | "documentLimit"
                              | "aiRequestLimit"
                              | "gstWorkflowLimit"
                              | "memberLimit"
                          ]
                        }
                        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
                        className="border-border/60 bg-background/50 text-xs text-foreground"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Feature Entitlements</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {Object.entries(draft.features).map(([feature, enabled]) => (
                      <button
                        type="button"
                        key={feature}
                        onClick={() =>
                          setDraft({
                            ...draft,
                            features: { ...draft.features, [feature]: !enabled },
                          })
                        }
                        className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-semibold transition ${
                          enabled
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/60 bg-secondary/30 text-muted-foreground"
                        }`}
                      >
                        <CheckCircle2 className="size-3.5" />
                        {feature.replaceAll("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  disabled={updatePlan.isPending}
                  onClick={() =>
                    updatePlan.mutate({
                      planId: selectedPlan.id,
                      name: draft.name,
                      description: draft.description || null,
                      status: draft.status,
                      billingPeriod: draft.billingPeriod,
                      priceMinor: draft.priceMinor ? Number(draft.priceMinor) : null,
                      documentLimit: draft.documentLimit ? Number(draft.documentLimit) : null,
                      aiRequestLimit: draft.aiRequestLimit ? Number(draft.aiRequestLimit) : null,
                      gstWorkflowLimit: draft.gstWorkflowLimit ? Number(draft.gstWorkflowLimit) : null,
                      memberLimit: Number(draft.memberLimit),
                      features: draft.features,
                    })
                  }
                  className="mt-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
                >
                  {updatePlan.isPending ? "Saving…" : "Save Audited Configuration"}
                </Button>
              </div>
            ) : null}
          </section>

          {/* Subscriptions & Audit Trail */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                <CreditCard className="size-4.5 text-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Workspace Subscriptions</p>
                <p className="text-xs text-muted-foreground">The selected change updates the internal subscription record and is logged.</p>
              </div>
            </div>

            {selectedSubscription ? (
              <div className="mt-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-xs text-foreground">Workspace</Label>
                    <Select
                      value={String(selectedSubscription.subscription.id)}
                      onValueChange={(value) => setSelectedSubscriptionId(Number(value))}
                    >
                      <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                        {overview.data.subscriptions.map((row) => (
                          <SelectItem key={row.subscription.id} value={String(row.subscription.id)}>
                            {row.businessName} · {row.planName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs text-foreground">Assign Active Plan</Label>
                    <Select
                      defaultValue={String(selectedSubscription.subscription.planId)}
                      onValueChange={(value) =>
                        updateSubscription.mutate({
                          businessId: selectedSubscription.subscription.businessId,
                          planId: Number(value),
                          status: selectedSubscription.subscription.status,
                          cancelAtPeriodEnd: selectedSubscription.subscription.cancelAtPeriodEnd === 1,
                        })
                      }
                    >
                      <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                        {activePlans.map((plan) => (
                          <SelectItem key={plan.id} value={String(plan.id)}>
                            {plan.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-xl border border-border/60 bg-secondary/30 p-4">
                  <p className="text-sm font-semibold text-foreground">{selectedSubscription.businessName}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Current plan: {selectedSubscription.planName} · Provider: {selectedSubscription.subscription.provider}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Select
                      defaultValue={selectedSubscription.subscription.status}
                      onValueChange={(value) =>
                        updateSubscription.mutate({
                          businessId: selectedSubscription.subscription.businessId,
                          planId: selectedSubscription.subscription.planId,
                          status: value as
                            | "trialing"
                            | "active"
                            | "past_due"
                            | "paused"
                            | "cancelled"
                            | "expired"
                            | "payment_failed",
                          cancelAtPeriodEnd: selectedSubscription.subscription.cancelAtPeriodEnd === 1,
                        })
                      }
                    >
                      <SelectTrigger className="w-44 border-border/60 bg-background/50 text-xs text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="past_due">Past due</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="payment_failed">Payment failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updateSubscription.isPending}
                      onClick={() =>
                        updateSubscription.mutate({
                          businessId: selectedSubscription.subscription.businessId,
                          planId: selectedSubscription.subscription.planId,
                          status: selectedSubscription.subscription.status,
                          cancelAtPeriodEnd: selectedSubscription.subscription.cancelAtPeriodEnd !== 1,
                        })
                      }
                      className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
                    >
                      {selectedSubscription.subscription.cancelAtPeriodEnd === 1
                        ? "Keep active after period"
                        : "Cancel at period end"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-border/60 p-5 text-xs text-muted-foreground">
                No workspace subscriptions exist yet.
              </div>
            )}

            <div className="mt-7 border-t border-border/60 pt-5">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Recent Audited Administrative Actions
              </p>
              <div className="mt-3 space-y-2">
                {overview.data.auditEvents.length ? (
                  overview.data.auditEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-secondary/20 px-3.5 py-2.5 text-xs"
                    >
                      <span>
                        <span className="block font-medium text-foreground">{event.action.replaceAll("_", " ")}</span>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          {event.entityType} {event.entityId ? `#${event.entityId}` : ""}
                        </span>
                      </span>
                      <time className="font-mono text-[11px] text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </time>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No plan or subscription changes have been recorded.</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
