import { useAuth } from "@/_core/hooks/useAuth";
import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ElectricHorizonBackground from "@/components/ElectricHorizonBackground";
import { startLogin } from "@/const";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { countryOptions, currencyCodes, profileForCountry } from "@shared/locale";
import { ArrowLeft, ArrowRight, Building2, Check, Edit3, Globe, Loader2, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Onboarding() {
    const { user, isAuthenticated, loading } = useAuth();
    const [, setLocation] = useLocation();
    const [step, setStep] = useState(1);
    const [localError, setLocalError] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const queryClient = useQueryClient();
    const defaultProfile = profileForCountry("IN");

    const businessesQuery = useQuery({
        queryKey: ["businesses", "list"],
        queryFn: () => api.businesses.list(),
        enabled: Boolean(isAuthenticated && user),
    });

    const existingBusiness = businessesQuery.data?.[0];

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
        email: "",
        phone: "",
        addressLine1: "",
        city: "Mumbai",
        state: "Maharashtra",
        postalCode: "",
        gstin: "",
        gstStatus: "registered",
    });

    // Populate from existing persisted profile if available
    useEffect(() => {
        if (existingBusiness) {
            setForm({
                name: existingBusiness.name || "",
                legalName: existingBusiness.legalName || existingBusiness.name || "",
                businessType: existingBusiness.businessType || "Private Limited Company",
                industry: existingBusiness.industry || "Software & Cloud Services",
                country: existingBusiness.country || defaultProfile.code,
                currency: existingBusiness.currency || defaultProfile.currency,
                locale: existingBusiness.locale || defaultProfile.locale,
                timezone: existingBusiness.timezone || defaultProfile.timezone,
                taxSystem: existingBusiness.taxSystem || defaultProfile.taxSystem,
                financialYear: existingBusiness.financialYear || "April–March",
                email: existingBusiness.email || "",
                phone: existingBusiness.phone || "",
                addressLine1: existingBusiness.addressLine1 || "",
                city: existingBusiness.city || "Mumbai",
                state: existingBusiness.state || "Maharashtra",
                postalCode: existingBusiness.postalCode || "",
                gstin: existingBusiness.gstin || "",
                gstStatus: existingBusiness.gstStatus || "registered",
            });

            const completed = Boolean(
                existingBusiness.onboardingCompletedAt ||
                (existingBusiness.onboardingStep && existingBusiness.onboardingStep >= 3)
            );
            setIsCompleted(completed);

            if (!completed && existingBusiness.onboardingStep) {
                setStep(Math.min(2, Math.max(1, existingBusiness.onboardingStep)));
            }
        }
    }, [existingBusiness]);

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
            setIsCompleted(true);
            setIsEditing(false);
            setLocation("/dashboard");
        },
        onError: (err) => {
            toast.error(err.message || "Could not initialize workspace.");
        },
    });

    const updateWorkspace = useMutation({
        mutationFn: (body) => api.businesses.updateProfile(body),
        onSuccess: (data) => {
            void queryClient.invalidateQueries({ queryKey: ["businesses"] });
            toast.success("Business profile updated successfully.", {
                description: `Workspace '${data.name}' configuration saved.`,
            });
            setIsCompleted(true);
            setIsEditing(false);
        },
        onError: (err) => {
            toast.error(err.message || "Could not update business profile.");
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

        const payload = {
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
            email: form.email?.trim() || undefined,
            phone: form.phone?.trim() || undefined,
            addressLine1: form.addressLine1?.trim() || undefined,
            city: form.city?.trim() || undefined,
            state: form.state?.trim() || undefined,
            postalCode: form.postalCode?.trim() || undefined,
            gstin: form.gstin?.trim() || undefined,
            gstStatus: form.gstStatus,
        };

        if (existingBusiness?.id) {
            updateWorkspace.mutate({
                businessId: existingBusiness.id,
                ...payload,
            });
        } else {
            createWorkspace.mutate(payload);
        }
    };

    const isPending = createWorkspace.isPending || updateWorkspace.isPending;
    const mutationError = createWorkspace.error || updateWorkspace.error;

    if (loading || businessesQuery.isLoading) {
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
                        {isCompleted && !isEditing ? (
                            <div className="mx-auto max-w-lg space-y-6">
                                <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
                                    <div>
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                                            ACTIVE & VERIFIED WORKSPACE
                                        </span>
                                        <h2 className="text-xl font-semibold text-white mt-1">
                                            {existingBusiness?.name || form.name}
                                        </h2>
                                        {existingBusiness?.legalName && (
                                            <p className="text-xs text-slate-400 mt-0.5 font-mono">
                                                Legal Entity: {existingBusiness.legalName}
                                            </p>
                                        )}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsEditing(true)}
                                        className="h-8 rounded-full border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20"
                                    >
                                        <Edit3 className="mr-1.5 size-3" />
                                        Edit Profile
                                    </Button>
                                </div>

                                {/* Metadata Details Grid */}
                                <div className="grid gap-3 rounded-xl border border-white/[0.06] bg-[#0E1424] p-4 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Entity Type</span>
                                        <span className="font-medium text-white">{existingBusiness?.businessType || form.businessType}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Industry Sector</span>
                                        <span className="font-medium text-white">{existingBusiness?.industry || form.industry}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Tax Identifier / GSTIN</span>
                                        <span className="font-mono font-medium text-cyan-400">{existingBusiness?.gstin || form.gstin || "Not Registered"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Registration Status</span>
                                        <span className="font-mono uppercase text-slate-300">{existingBusiness?.gstStatus || form.gstStatus}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Tax System</span>
                                        <span className="text-white">{existingBusiness?.taxSystem || form.taxSystem}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Operating Currency</span>
                                        <span className="font-mono font-medium text-white">{existingBusiness?.currency || form.currency}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Financial Year</span>
                                        <span className="font-mono text-white">{existingBusiness?.financialYear || form.financialYear}</span>
                                    </div>
                                    {(existingBusiness?.city || existingBusiness?.state || existingBusiness?.addressLine1) && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Location</span>
                                            <span className="text-white text-right max-w-[240px] truncate">
                                                {[existingBusiness?.addressLine1, existingBusiness?.city, existingBusiness?.state, existingBusiness?.postalCode].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    )}
                                    {(existingBusiness?.phone || existingBusiness?.email) && (
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Contact</span>
                                            <span className="font-mono text-white">
                                                {[existingBusiness?.phone, existingBusiness?.email].filter(Boolean).join(" • ")}
                                            </span>
                                        </div>
                                    )}
                                    {existingBusiness?.updatedAt && (
                                        <div className="flex items-center justify-between border-t border-white/[0.06] pt-2 text-[11px] text-slate-500">
                                            <span>Last Persisted</span>
                                            <span>{new Date(existingBusiness.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2.5 pt-2">
                                    <Button
                                        type="button"
                                        onClick={() => setLocation("/dashboard")}
                                        className="w-full h-10 rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 transition shadow-md"
                                    >
                                        <Building2 className="mr-2 size-3.5" />
                                        Return to Dashboard & Command Center
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => setIsEditing(true)}
                                        className="w-full h-9 rounded-full text-xs text-slate-400 hover:text-white hover:bg-white/[0.05]"
                                    >
                                        Modify Registration or Regional Settings
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={submit} className="mx-auto max-w-lg space-y-6">
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                                        Stage {step} of 2 // {isEditing ? "Editing Saved Profile" : "Configuration"}
                                    </span>
                                    {isCompleted && isEditing && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditing(false)}
                                            className="text-xs text-slate-400 hover:text-white underline"
                                        >
                                            Cancel & View Saved Profile
                                        </button>
                                    )}
                                </div>

                                {step === 1 ? (
                                    <>
                                        <div>
                                            <h2 className="text-lg font-medium text-white">Entity Profile & Classification</h2>
                                            <p className="mt-1 text-xs text-slate-400">
                                                Enter your commercial trade name, legal structure, and registered location.
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
                                                    Legal Entity Name <span className="font-normal text-slate-500">(Optional - for statutory documents)</span>
                                                </label>
                                                <Input
                                                    value={form.legalName}
                                                    onChange={(e) => update("legalName", e.target.value)}
                                                    placeholder="Registered legal corporate name"
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
                                                        <option value="Public Limited Company">Public Limited Company</option>
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

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-slate-300">Registered Office Address</label>
                                                <Input
                                                    value={form.addressLine1}
                                                    onChange={(e) => update("addressLine1", e.target.value)}
                                                    placeholder="Street address, building, suite"
                                                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                />
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-3">
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
                                                    <label className="text-xs font-medium text-slate-300">State / Province</label>
                                                    <Input
                                                        value={form.state}
                                                        onChange={(e) => update("state", e.target.value)}
                                                        placeholder="e.g. Maharashtra"
                                                        className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-300">Postal PIN</label>
                                                    <Input
                                                        value={form.postalCode}
                                                        onChange={(e) => update("postalCode", e.target.value)}
                                                        placeholder="e.g. 400069"
                                                        className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid gap-4 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-300">Business Email</label>
                                                    <Input
                                                        value={form.email}
                                                        type="email"
                                                        onChange={(e) => update("email", e.target.value)}
                                                        placeholder="contact@company.in"
                                                        className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-medium text-slate-300">Contact Phone</label>
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
                                                    Country rules, GSTIN identification, and statutory reporting settings.
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

                                        {mutationError && (
                                            <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs text-rose-400">
                                                {mutationError.message}
                                            </div>
                                        )}

                                        <Button
                                            type="submit"
                                            disabled={isPending}
                                            className="w-full rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 transition shadow-md"
                                        >
                                            {isPending ? (
                                                <>
                                                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                                                    {existingBusiness?.id ? "Saving Changes…" : "Initializing Workspace…"}
                                                </>
                                            ) : (
                                                <>
                                                    <Building2 className="mr-2 size-3.5" />
                                                    {existingBusiness?.id ? "Save Business Profile Changes" : "Launch Command Center"}
                                                </>
                                            )}
                                        </Button>
                                    </>
                                )}
                            </form>
                        )}
                    </section>
                </main>
            </div>
        </div>
    );
}
