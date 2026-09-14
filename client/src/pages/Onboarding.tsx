import { useAuth } from "@/_core/hooks/useAuth";
import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  countryOptions,
  currencyCodes,
  profileForCountry,
  type CountryCode,
  type CurrencyCode,
} from "@shared/locale";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Globe,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface WorkspaceForm {
  name: string;
  legalName?: string;
  businessType: string;
  industry: string;
  country: CountryCode;
  currency: CurrencyCode;
  locale: string;
  timezone: string;
  taxSystem: string;
  financialYear: string;
  phone: string;
  city: string;
  state: string;
  gstin: string;
  gstStatus: "registered" | "pending" | "not_registered";
}

export default function Onboarding() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [localError, setLocalError] = useState("");

  const defaultProfile = profileForCountry("IN");

  const [form, setForm] = useState<WorkspaceForm>({
    name: "",
    legalName: "",
    businessType: "Private Limited Company",
    industry: "Software & Cloud Services",
    country: defaultProfile.code,
    currency: defaultProfile.currency,
    locale: defaultProfile.locale,
    timezone: defaultProfile.timezone,
    taxSystem: defaultProfile.taxSystem,
    financialYear: "April–March",
    phone: "",
    city: "Mumbai",
    state: "Maharashtra",
    gstin: "",
    gstStatus: "registered",
  });

  const update = <K extends keyof WorkspaceForm>(k: K, v: WorkspaceForm[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const createWorkspace = trpc.businesses.create.useMutation({
    onSuccess: (data) => {
      toast.success("Business command center initialized successfully.");
      setLocation("/dashboard");
    },
    onError: (err) => {
      toast.error(err.message || "Could not initialize workspace.");
    },
  });

  const continueToDetails = () => {
    if (!form.name.trim()) {
      setLocalError("Please enter your business or trade name.");
      return;
    }
    if (!form.industry.trim()) {
      setLocalError("Please specify your business industry sector.");
      return;
    }
    setLocalError("");
    setStep(2);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setLocalError("Please enter your business name.");
      return;
    }

    createWorkspace.mutate({
      name: form.name.trim(),
      legalName: form.legalName?.trim() || undefined,
      businessType: form.businessType,
      industry: form.industry,
      country: form.country,
      currency: form.currency,
      locale: form.locale,
      timezone: form.timezone,
      taxSystem: form.taxSystem,
      financialYear: form.financialYear,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-xs text-slate-500 dark:text-slate-400">
        <Loader2 className="size-5 animate-spin text-slate-700 dark:text-white" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 text-foreground">
        <div className="prava-panel flex max-w-md w-full flex-col items-center gap-6 rounded-3xl p-8 text-center shadow-2xl">
          <PravaMark size="lg" />
          <div>
            <h1 className="font-['Playfair_Display',Georgia,serif] text-2xl font-normal tracking-tight text-slate-900 dark:text-white">
              Initialize Protected Workspace
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Sign in to configure your business workspace. Your entity profile and financial records are securely isolated.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full rounded-xl bg-slate-900 text-sm font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
          >
            Sign in with Secure Portal
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] pb-5">
          <button onClick={() => setLocation("/")} className="outline-none">
            <PravaMark />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" />
              ISOLATED WORKSPACE CONTEXT
            </div>
            <ThemeToggle />
          </div>
        </header>

        <main className="prava-panel mt-8 grid overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl lg:grid-cols-[0.75fr_1.25fr]">
          {/* Left Summary Sidebar */}
          <aside className="border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#090D13] p-7 sm:p-10">
            <span className="prava-tag text-[10px]">Setup Telemetry</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Establish your business <em className="italic font-normal">operating system</em>.
            </h1>
            <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Set the regional tax rules, currency profile, and industry classification for automated bookkeeping and CA assignment.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { number: 1, title: "Entity Profile", desc: "Business identity and sector" },
                { number: 2, title: "Tax & Finance Regime", desc: "Currency, GSTIN, and tax rules" },
              ].map((s) => (
                <div key={s.number} className="flex items-start gap-3">
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                      step === s.number
                        ? "bg-slate-900 text-white dark:bg-white dark:text-black shadow-sm"
                        : step > s.number
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "border border-slate-200 text-slate-400 dark:border-white/10 dark:text-slate-500"
                    }`}
                  >
                    {step > s.number ? <Check className="size-4" /> : s.number}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 rounded-xl border border-slate-200 bg-white/70 dark:border-white/[0.06] dark:bg-[#0D131A] p-4 text-[11px] text-slate-600 dark:text-slate-400 shadow-sm">
              <span className="font-bold text-slate-900 dark:text-white">Zero Data Leakage: </span>
              Your business records and tax documents remain scoped exclusively to your authorized members.
            </div>
          </aside>

          {/* Right Form Console */}
          <section className="p-7 sm:p-10 bg-white dark:bg-[#080B0F]">
            <form onSubmit={submit} className="mx-auto max-w-lg space-y-6">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Stage {step} of 2 // Configuration
              </span>

              {step === 1 ? (
                <>
                  <div>
                    <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl font-normal text-slate-900 dark:text-white">Entity Profile & Classification</h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Enter your commercial name and industry.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Business name *</label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="e.g. Acme Innovations Corp"
                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm focus:border-slate-400 dark:focus:border-white/30"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Legal Entity Name <span className="font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
                      </label>
                      <Input
                        value={form.legalName}
                        onChange={(e) => update("legalName", e.target.value)}
                        placeholder="If different from commercial trade name"
                        className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Business type</label>
                        <select
                          value={form.businessType}
                          onChange={(e) => update("businessType", e.target.value)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
                        >
                          <option>Private Limited Company</option>
                          <option>Proprietorship</option>
                          <option>Partnership</option>
                          <option>LLP</option>
                          <option>Corporation</option>
                          <option>Other</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Industry Sector *</label>
                        <Input
                          value={form.industry}
                          onChange={(e) => update("industry", e.target.value)}
                          placeholder="e.g. Software & Cloud"
                          className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {localError && (
                    <p role="alert" className="text-xs text-red-500 dark:text-red-400 font-medium">{localError}</p>
                  )}

                  <Button
                    type="button"
                    onClick={continueToDetails}
                    className="w-full rounded-xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100 shadow-md"
                  >
                    Proceed to Tax & Finance Context
                    <ArrowRight className="ml-1.5 size-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  >
                    <ArrowLeft className="size-3.5" />
                    Back to Entity Profile
                  </button>

                  <div>
                    <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl font-normal text-slate-900 dark:text-white">Tax Regime & Currency Profile</h2>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      Configure country conventions and statutory tax identifier.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Operating Country</label>
                        <select
                          value={form.country}
                          onChange={(e) => {
                            const p = profileForCountry(e.target.value);
                            update("country", p.code);
                            update("currency", p.currency);
                            update("locale", p.locale);
                            update("timezone", p.timezone);
                            update("taxSystem", p.taxSystem);
                            update(
                              "financialYear",
                              p.fiscalYearStartMonth === 1
                                ? "January–December"
                                : p.fiscalYearStartMonth === 4
                                ? "April–March"
                                : p.fiscalYearStartMonth === 7
                                ? "July–June"
                                : "Custom fiscal calendar"
                            );
                          }}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
                        >
                          {countryOptions.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.symbol})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tax System</label>
                        <Input
                          value={form.taxSystem}
                          onChange={(e) => update("taxSystem", e.target.value)}
                          placeholder="e.g. GST, VAT"
                          className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Tax ID / GSTIN <span className="font-normal text-slate-400 dark:text-slate-500">(Optional)</span>
                        </label>
                        <Input
                          value={form.gstin}
                          onChange={(e) => update("gstin", e.target.value)}
                          placeholder="e.g. 27AAAAA0000A1Z5"
                          className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white uppercase font-mono shadow-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Registration status</label>
                        <select
                          value={form.gstStatus}
                          onChange={(e) =>
                            update("gstStatus", e.target.value as WorkspaceForm["gstStatus"])
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
                        >
                          <option value="not_registered">Not Registered</option>
                          <option value="registered">Registered</option>
                          <option value="pending">Registration Pending</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Operating Currency</label>
                        <select
                          value={form.currency}
                          onChange={(e) => update("currency", e.target.value as CurrencyCode)}
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm outline-none cursor-pointer dark:border-white/10 dark:bg-[#0D131A] dark:text-white"
                        >
                          {currencyCodes.map((cur) => (
                            <option key={cur} value={cur}>
                              {cur}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fiscal Year Cycle</label>
                        <Input
                          value={form.financialYear}
                          onChange={(e) => update("financialYear", e.target.value)}
                          className="h-10 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-[#0D131A] text-xs text-slate-900 dark:text-white shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {createWorkspace.error && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-600 dark:text-red-300">
                      {createWorkspace.error.message}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={createWorkspace.isPending}
                    className="w-full rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
                  >
                    {createWorkspace.isPending ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        Initializing Workspace…
                      </>
                    ) : (
                      <>
                        <Building2 className="mr-2 size-4" />
                        Launch Command Center
                      </>
                    )}
                  </Button>
                </>
              )}
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
