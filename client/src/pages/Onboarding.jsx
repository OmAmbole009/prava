import { useAuth } from "@/_core/hooks/useAuth";
import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ElectricHorizonBackground from "@/components/ElectricHorizonBackground";
import { startLogin } from "@/const";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { countryOptions, currencyCodes, profileForCountry } from "@shared/locale";
import { ArrowLeft, ArrowRight, Building2, Check, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboarding() {
    const { user, isAuthenticated, loading } = useAuth();
    const [, setLocation] = useLocation();
    const [step, setStep] = useState(1);
    const [localError, setLocalError] = useState("");
    const queryClient = useQueryClient();
    const defaultProfile = profileForCountry("IN");
    const [form, setForm] = useState({
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

    useEffect(() => {
        if (user?.name && user.name !== "Business User" && !form.name) {
            setForm((prev) => ({
                ...prev,
                name: user.name || "",
                legalName: user.name || "",
            }));
        }
    }, [user]);

    const update = (k, v) => {
        setForm((prev) => ({ ...prev, [k]: v }));
    };

    const createWorkspace = useMutation({
        mutationFn: (body) => api.businesses.create(body),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ["businesses"] });
            toast.success("Business command center initialized successfully.", {
                description: `Workspace '${data.name}' ready for CA audits and invoice processing.`,
            });
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

    const submit = (e) => {
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
            <div className="flex min-h-screen items-center justify-center bg-[#030712] text-xs text-slate-400">
                <Loader2 className="size-5 animate-spin text-cyan-400" />
            </div>
        );
    }

    if (!isAuthenticated || !user) {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-[#030712] p-4 text-white overflow-hidden">
                <ElectricHorizonBackground variant="hero" />
                <div className="relative z-10 flex max-w-md w-full flex-col items-center gap-6 rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-8 text-center shadow-2xl backdrop-blur-xl">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
                    <PravaMark size="lg" />
                    <div>
                        <h1 className="text-xl font-medium tracking-tight text-white">
                            Initialize Protected Workspace
                        </h1>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                            Sign in to configure your business workspace. Your entity profile and financial records are securely isolated.
                        </p>
                    </div>
                    <Button onClick={() => startLogin()} size="lg" className="w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 shadow-md">
                        Sign in with Secure Portal
                        <ArrowRight className="ml-2 size-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-[#030712] px-4 py-8 text-white sm:px-8 overflow-hidden">
            <ElectricHorizonBackground variant="header" />
            <div className="relative z-10 mx-auto max-w-5xl">
                <header className="flex items-center justify-between border-b border-white/[0.08] pb-5">
                    <button onClick={() => setLocation("/")} className="outline-none">
                        <PravaMark />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                            <ShieldCheck className="size-4 text-cyan-400" />
                            ISOLATED WORKSPACE CONTEXT
                        </div>
                        <ThemeToggle />
                    </div>
                </header>

                <main className="relative mt-8 grid overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-2xl lg:grid-cols-[0.75fr_1.25fr]">
                    <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none" />

                    {/* Left Summary Sidebar */}
                    <aside className="border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#070A12] p-7 sm:p-10">
                        <span className="eyebrow-chip inline-flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                            <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
                            SETUP TELEMETRY
                        </span>
                        <h1 className="mt-4 text-2xl sm:text-3xl font-medium tracking-tight text-white">
                            Establish your business <span className="text-slate-400">operating system</span>.
                        </h1>
                        <p className="mt-3 text-xs leading-relaxed text-slate-400">
                            Set the regional tax rules, currency profile, and industry classification for automated bookkeeping and CA assignment.
                        </p>

                        <div className="mt-8 space-y-4">
                            {[
                                { number: 1, title: "Entity Profile", desc: "Business identity and sector" },
                                { number: 2, title: "Tax & Finance Regime", desc: "Currency, GSTIN, and tax rules" },
                            ].map((s) => (
                                <div key={s.number} className="flex items-start gap-3">
                                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-medium border ${
                                        step === s.number
                                            ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300"
                                            : step > s.number
                                                ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                                                : "border-white/[0.08] bg-white/[0.02] text-slate-400"
                                    }`}>
                                        {step > s.number ? <Check className="size-3.5" /> : s.number}
                                    </span>
                                    <div>
                                        <p className="text-xs font-medium text-white">{s.title}</p>
                                        <p className="text-[11px] text-slate-400">{s.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 rounded-xl border border-white/[0.06] bg-[#0E1424] p-4 text-[11px] text-slate-400">
                            <span className="font-medium text-white">Zero Data Leakage: </span>
                            Your business records and tax documents remain scoped exclusively to your authorized members.
                        </div>
                    </aside>

                    {/* Right Form Console */}
                    <section className="p-7 sm:p-10 bg-[#0B0F19]">
                        <form onSubmit={submit} className="mx-auto max-w-lg space-y-6">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                Stage {step} of 2 // Configuration
                            </span>

                            {step === 1 ? (
                                <>
                                    <div>
                                        <h2 className="text-lg font-medium text-white">Entity Profile & Classification</h2>
                                        <p className="mt-1 text-xs text-slate-400">
                                            Enter your commercial name and industry.
                                        </p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-300">Business name *</label>
                                            <Input
                                                value={form.name}
                                                onChange={(e) => update("name", e.target.value)}
                                                placeholder="e.g. Prava Innovations Pvt Ltd"
                                                className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                autoFocus
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-300">
                                                Legal Entity Name <span className="font-normal text-slate-500">(Optional)</span>
                                            </label>
                                            <Input
                                                value={form.legalName}
                                                onChange={(e) => update("legalName", e.target.value)}
                                                placeholder="If different from commercial trade name"
                                                className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-400"
                                            />
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Business type</label>
                                                <select
                                                    value={form.businessType}
                                                    onChange={(e) => update("businessType", e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0E1424] px-3 text-xs text-white outline-none cursor-pointer focus:ring-1 focus:ring-cyan-400"
                                                >
                                                    <option value="Private Limited Company">Private Limited Company</option>
                                                    <option value="Proprietorship">Proprietorship</option>
                                                    <option value="Partnership">Partnership</option>
                                                    <option value="LLP">LLP</option>
                                                    <option value="Corporation">Corporation</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Industry Sector *</label>
                                                <Input
                                                    value={form.industry}
                                                    onChange={(e) => update("industry", e.target.value)}
                                                    placeholder="e.g. Technology & SaaS"
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">City</label>
                                                <Input
                                                    value={form.city}
                                                    onChange={(e) => update("city", e.target.value)}
                                                    placeholder="e.g. Mumbai"
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Phone</label>
                                                <Input
                                                    value={form.phone}
                                                    onChange={(e) => update("phone", e.target.value)}
                                                    placeholder="+91..."
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {localError && (
                                        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">
                                            {localError}
                                        </div>
                                    )}

                                    <Button
                                        type="button"
                                        onClick={continueToDetails}
                                        className="w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 transition shadow-md"
                                    >
                                        Continue to Tax & Finance Regime
                                        <ArrowRight className="ml-2 size-3.5" />
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-medium text-white">Tax & Finance Regime</h2>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Country rules and statutory filing settings.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                                        >
                                            <ArrowLeft className="size-3" />
                                            Back
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Primary Country</label>
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
                                                            p.fiscalYearStartMonth === 4
                                                                ? "April–March"
                                                                : p.fiscalYearStartMonth === 7
                                                                    ? "July–June"
                                                                    : "Custom fiscal calendar"
                                                        );
                                                    }}
                                                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0E1424] px-3 text-xs text-white outline-none cursor-pointer focus:ring-1 focus:ring-cyan-400"
                                                >
                                                    {countryOptions.map((c) => (
                                                        <option key={c.code} value={c.code}>
                                                            {c.flag} {c.name} ({c.symbol})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Tax System</label>
                                                <Input
                                                    value={form.taxSystem}
                                                    onChange={(e) => update("taxSystem", e.target.value)}
                                                    placeholder="e.g. GST, VAT"
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">
                                                    Tax ID / GSTIN <span className="font-normal text-slate-500">(Optional)</span>
                                                </label>
                                                <Input
                                                    value={form.gstin}
                                                    onChange={(e) => update("gstin", e.target.value)}
                                                    placeholder="e.g. 27AAAAA0000A1Z5"
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white uppercase font-mono focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Registration status</label>
                                                <select
                                                    value={form.gstStatus}
                                                    onChange={(e) => update("gstStatus", e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0E1424] px-3 text-xs text-white outline-none cursor-pointer focus:ring-1 focus:ring-cyan-400"
                                                >
                                                    <option value="not_registered">Not Registered</option>
                                                    <option value="registered">Registered</option>
                                                    <option value="pending">Registration Pending</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Operating Currency</label>
                                                <select
                                                    value={form.currency}
                                                    onChange={(e) => update("currency", e.target.value)}
                                                    className="h-10 w-full rounded-xl border border-white/[0.08] bg-[#0E1424] px-3 text-xs text-white outline-none cursor-pointer focus:ring-1 focus:ring-cyan-400"
                                                >
                                                    {currencyCodes.map((cur) => (
                                                        <option key={cur} value={cur}>
                                                            {cur}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Fiscal Year Cycle</label>
                                                <Input
                                                    value={form.financialYear}
                                                    onChange={(e) => update("financialYear", e.target.value)}
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {createWorkspace.error && (
                                        <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
                                            {createWorkspace.error.message}
                                        </div>
                                    )}

                                    <Button
                                        type="submit"
                                        disabled={createWorkspace.isPending}
                                        className="w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 transition shadow-md"
                                    >
                                        {createWorkspace.isPending ? (
                                            <>
                                                <Loader2 className="mr-2 size-3.5 animate-spin" />
                                                Initializing Workspace…
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="mr-2 size-3.5" />
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
