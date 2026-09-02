import { useAuth } from "@/_core/hooks/useAuth";
import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, ShieldCheck } from "lucide-react";
import { countryOptions, currencyCodes, profileForCountry, type CountryCode, type CurrencyCode } from "@shared/locale";
import { FormEvent, useState } from "react";
import { useLocation } from "wouter";

type WorkspaceForm = {
  name: string;
  legalName: string;
  businessType: string;
  industry: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  country: CountryCode;
  gstStatus: "registered" | "not_registered" | "pending";
  gstin: string;
  taxSystem: string;
  financialYear: string;
  currency: CurrencyCode;
  locale: string;
  timezone: string;
};

function initialRegionalProfile() {
  const language = typeof navigator !== "undefined" ? navigator.language : "en-US";
  const detectedCountry = language.match(/-([A-Z]{2})$/)?.[1] ?? "US";
  const profile = profileForCountry(detectedCountry);
  const timezone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || profile.timezone : profile.timezone;
  return { country: profile.code, taxSystem: profile.taxSystem, financialYear: profile.fiscalYearStartMonth === 1 ? "January–December" : profile.fiscalYearStartMonth === 4 ? "April–March" : profile.fiscalYearStartMonth === 7 ? "July–June" : "Custom fiscal calendar", currency: profile.currency, locale: profile.locale, timezone };
}

const initialForm: WorkspaceForm = { name: "", legalName: "", businessType: "Company", industry: "", email: "", phone: "", city: "", state: "", gstStatus: "not_registered", gstin: "", ...initialRegionalProfile() };

export default function Onboarding() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WorkspaceForm>(initialForm);
  const [localError, setLocalError] = useState("");
  const createWorkspace = trpc.businesses.create.useMutation({
    onSuccess: () => setLocation("/dashboard"),
  });

  const update = <K extends keyof WorkspaceForm>(key: K, value: WorkspaceForm[K]) => {
    setLocalError("");
    setForm(current => ({ ...current, [key]: value }));
  };

  const continueToDetails = () => {
    if (form.name.trim().length < 2 || form.industry.trim().length < 2) {
      setLocalError("Add your business name and industry before continuing.");
      return;
    }
    setLocalError("");
    setStep(2);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    createWorkspace.mutate({
      ...form,
      name: form.name.trim(),
      industry: form.industry.trim(),
      legalName: form.legalName.trim() || undefined,
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      gstin: form.gstin.trim() || undefined,
    });
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#f7f3e9]"><Loader2 className="size-5 animate-spin text-[#55796a]" /></div>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f7f3e9] p-6">
        <div className="w-full max-w-md rounded-[1.5rem] border border-[#ddd3c1] bg-[#fffdf8] p-8 text-center shadow-[0_24px_60px_rgb(32_55_47_/_0.1)]">
          <PravaMark className="justify-center text-[#153832]" />
          <h1 className="prava-display mt-7 text-4xl text-[#153832]">Start with a secure workspace.</h1>
          <p className="mt-4 text-sm leading-6 text-[#627269]">Sign in to create your business workspace. Your access is protected before any financial work begins.</p>
          <Button onClick={() => startLogin()} className="mt-7 w-full rounded-full bg-[#153832] text-[#f6f1e5] hover:bg-[#0f2924]">Sign in to continue<ArrowRight className="ml-2 size-4" /></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3e9] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl"><header className="flex items-center justify-between"><button onClick={() => setLocation("/")} className="rounded-lg focus-visible:ring-2 focus-visible:ring-[#62836f]"><PravaMark className="text-[#153832]" /></button><div className="hidden items-center gap-2 text-xs font-medium text-[#638078] sm:flex"><ShieldCheck className="size-4"/> Your workspace stays private</div></header>
        <main className="mt-10 grid overflow-hidden rounded-[1.8rem] border border-[#d8cfbd] bg-[#fffdf8] shadow-[0_30px_70px_rgb(31_61_52_/_0.1)] lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="bg-[#163a34] p-7 text-[#f7f1e4] sm:p-10"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b6d19a]">Workspace setup</p><h1 className="prava-display mt-5 text-4xl leading-[0.98]">Put the right business context behind every number.</h1><p className="mt-5 text-sm leading-6 text-[#cbd8cf]">Start with the essentials. You can add collaborators and detailed settings after your workspace is ready.</p><div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-5 text-[#cbd8cf]"><span className="font-semibold text-[#d5e7c1]">No financial data is imported during setup.</span> This creates a private workspace only; source documents remain under your review.</div><div className="mt-10 space-y-5">{[{ number: 1, title: "Your business", copy: "Set the workspace basics" }, { number: 2, title: "Finance context", copy: "GST and contact details" }].map(item => <div key={item.number} className="flex gap-4"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${step === item.number ? "bg-[#c9dfa7] text-[#173932]" : step > item.number ? "bg-[#7caa7e] text-[#102b26]" : "border border-white/20 text-[#d9e5d8]"}`}>{step > item.number ? <Check className="size-4"/> : item.number}</span><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-[#b7c9bf]">{item.copy}</p></div></div>)}</div></aside>
          <section className="p-7 sm:p-10 lg:p-12"><form onSubmit={submit} className="mx-auto max-w-xl" aria-describedby="setup-scope"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#648076]">Step {step} of 2 · about two minutes</p>{step === 1 ? <><h2 className="prava-display mt-4 text-4xl leading-none text-[#153832]">Tell us about your business.</h2><p id="setup-scope" className="mt-4 text-sm leading-6 text-[#627269]">We use this information to establish your business workspace and prepare future finance settings. Required fields are marked by their validation feedback.</p><div className="mt-8 grid gap-5"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Business name<Input value={form.name} onChange={event => update("name", event.target.value)} placeholder="e.g. Verma Electricals" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" aria-invalid={Boolean(localError && form.name.trim().length < 2)} autoFocus /></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Legal name <span className="font-normal text-[#829088]">(optional)</span><Input value={form.legalName} onChange={event => update("legalName", event.target.value)} placeholder="If different from business name" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Business type<select value={form.businessType} onChange={event => update("businessType", event.target.value)} className="h-11 rounded-md border border-[#d5ccb9] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#6b9380]"><option>Proprietorship</option><option>Partnership</option><option>Private limited company</option><option>LLP</option><option>Other</option></select></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Industry<Input value={form.industry} onChange={event => update("industry", event.target.value)} placeholder="e.g. Electrical supplies" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" aria-invalid={Boolean(localError && form.industry.trim().length < 2)} /></label></div></div><p className="mt-5 min-h-5 text-sm text-[#b7523d]" role="alert" aria-live="polite">{localError}</p><Button type="button" onClick={continueToDetails} className="mt-5 rounded-full bg-[#153832] px-6 text-[#f7f1e4] hover:bg-[#102b26]">Continue<ArrowRight className="ml-2 size-4" /></Button></> : <><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 text-sm font-medium text-[#547469] transition hover:text-[#173c35]"><ArrowLeft className="size-4"/>Back to business details</button><h2 className="prava-display mt-5 text-4xl leading-none text-[#153832]">Add the finance context.</h2><p className="mt-4 text-sm leading-6 text-[#627269]">Choose the country and finance conventions your workspace should use. Tax workflows remain guidance-only until an authorized local integration is configured.</p><div className="mt-5 rounded-xl border border-[#dbe5d5] bg-[#f2f7ee] p-4 text-sm leading-6 text-[#3d5e51]"><strong>What happens next:</strong> after your workspace is created, start a task only when you have real source documents ready for review.</div><div className="mt-8 grid gap-5"><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Business email<Input value={form.email} onChange={event => update("email", event.target.value)} placeholder="owner@business.com" type="email" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Phone <span className="font-normal text-[#829088]">(optional)</span><Input value={form.phone} onChange={event => update("phone", event.target.value)} placeholder="+ country code" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Country<select value={form.country} onChange={event => { const profile = profileForCountry(event.target.value); update("country", profile.code); update("currency", profile.currency); update("locale", profile.locale); update("timezone", profile.timezone); update("taxSystem", profile.taxSystem); update("financialYear", profile.fiscalYearStartMonth === 1 ? "January–December" : profile.fiscalYearStartMonth === 4 ? "April–March" : profile.fiscalYearStartMonth === 7 ? "July–June" : "Custom fiscal calendar"); }} className="h-11 rounded-md border border-[#d5ccb9] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#6b9380]">{countryOptions.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Tax system<Input value={form.taxSystem} onChange={event => update("taxSystem", event.target.value)} placeholder="e.g. VAT, GST, sales tax" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Tax registration ID <span className="font-normal text-[#829088]">(if applicable)</span><Input value={form.gstin} onChange={event => update("gstin", event.target.value)} placeholder="Local tax registration number" className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Registration status<select value={form.gstStatus} onChange={event => update("gstStatus", event.target.value as WorkspaceForm["gstStatus"])} className="h-11 rounded-md border border-[#d5ccb9] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#6b9380]"><option value="not_registered">Not registered</option><option value="registered">Registered</option><option value="pending">Registration pending</option></select></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Currency<select value={form.currency} onChange={event => update("currency", event.target.value as CurrencyCode)} className="h-11 rounded-md border border-[#d5ccb9] bg-[#fffdf8] px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-[#6b9380]">{currencyCodes.map(currency => <option key={currency} value={currency}>{currency}</option>)}</select></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">Financial year<Input value={form.financialYear} onChange={event => update("financialYear", event.target.value)} className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label></div><div className="grid gap-5 sm:grid-cols-2"><label className="grid gap-2 text-sm font-semibold text-[#294a42]">City <span className="font-normal text-[#829088]">(optional)</span><Input value={form.city} onChange={event => update("city", event.target.value)} className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label><label className="grid gap-2 text-sm font-semibold text-[#294a42]">State <span className="font-normal text-[#829088]">(optional)</span><Input value={form.state} onChange={event => update("state", event.target.value)} className="h-11 border-[#d5ccb9] bg-[#fffdf8]" /></label></div></div>{createWorkspace.error && <div className="mt-5 rounded-xl border border-[#efc3b8] bg-[#fff6f2] p-4 text-sm text-[#8f412e]" role="alert"><p>{createWorkspace.error.message}</p><button type="submit" disabled={createWorkspace.isPending} className="mt-2 font-semibold underline underline-offset-4">Try creating the workspace again</button></div>}<Button type="submit" disabled={createWorkspace.isPending} className="mt-8 rounded-full bg-[#153832] px-6 text-[#f7f1e4] hover:bg-[#102b26] disabled:opacity-70">{createWorkspace.isPending ? <><Loader2 className="mr-2 size-4 animate-spin"/>Creating securely…</> : <><Building2 className="mr-2 size-4"/>Create workspace</>}</Button></>}</form></section>
        </main>
      </div>
    </div>
  );
}
