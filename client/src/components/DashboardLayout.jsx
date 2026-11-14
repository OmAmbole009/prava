import { useAuth } from "@/_core/hooks/useAuth";
import { PravaLogoIcon, PravaMark } from "@/components/PravaMark";
import { ElectricHorizonBackground } from "@/components/ElectricHorizonBackground";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { startLogin } from "@/const";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { pageVariants } from "@/lib/animations";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { countryOptions, profileForCountry } from "@shared/locale";
import {
    Bot,
    Building2,
    ChevronDown,
    ClipboardCheck,
    Coins,
    CreditCard,
    FileText,
    FilePenLine,
    LayoutDashboard,
    Loader2,
    LogOut,
    PanelLeft,
    Receipt,
    ReceiptText,
    Scale,
    Send,
    ShieldCheck,
    Sparkles,
    UploadCloud,
    User,
    UserCheck,
    WalletCards,
    X,
    ArrowRight,
    CornerDownLeft,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { Streamdown } from "streamdown";

// ─── Professional Enterprise Nav Groups ──────────────────────────────────────
const navGroups = [
    {
        category: "OVERVIEW & INTELLIGENCE",
        items: [
            { icon: LayoutDashboard, label: "Command Center", path: "/dashboard" },
            { icon: Sparkles, label: "Ask Prava AI", path: "/assistant" },
        ],
    },
    {
        category: "FINANCE & DOCUMENTS",
        items: [
            { icon: WalletCards, label: "Money In & Out", path: "/money" },
            { icon: FilePenLine, label: "Invoice Studio", path: "/invoice-studio" },
            { icon: FileText, label: "Documents & Vault", path: "/documents" },
            { icon: ClipboardCheck, label: "Action Items", path: "/tasks" },
        ],
    },
    {
        category: "TAXES & CA ADVISORY",
        items: [
            { icon: Receipt, label: "Taxes & Compliance", path: "/tax" },
            { icon: Scale, label: "Autonomous CA Suite", path: "/ca-suite" },
            { icon: UserCheck, label: "CA Review Desk", path: "/ca-review" },
        ],
    },
    {
        category: "WORKSPACE & SETTINGS",
        items: [
            { icon: Building2, label: "Business Profile", path: "/onboarding" },
            { icon: ShieldCheck, label: "Account & Security", path: "/profile" },
            { icon: CreditCard, label: "Billing & Plans", path: "/billing" },
        ],
    },
];

const SIDEBAR_WIDTH_KEY = "prava-sidebar-width";
const DEFAULT_WIDTH = 290;
const MIN_WIDTH = 240;
const MAX_WIDTH = 420;

// Popular fast-switch currencies
const TOP_CURRENCIES = [
    { code: "US", symbol: "$", label: "USD" },
    { code: "IN", symbol: "₹", label: "INR" },
    { code: "DE", symbol: "€", label: "EUR" },
    { code: "GB", symbol: "£", label: "GBP" },
    { code: "JP", symbol: "¥", label: "JPY" },
    { code: "AE", symbol: "AED", label: "AED" },
];

// ─── Holographic Obsidian FX Matrix Component ─────────────────────────────
function CurrencyMatrixWidget() {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const queryClient = useQueryClient();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];
    const { getRate, ratesError } = useCurrencyRates();
    const [isExpanded, setIsExpanded] = useState(false);
    const [switchingTo, setSwitchingTo] = useState(null);

    const updateProfile = useMutation({
        mutationFn: (body) => api.businesses.updateProfile(body),
        onSuccess: (updated) => {
            setSwitchingTo(null);
            toast.success(`Currency switched to ${updated?.currency} — dynamic FX conversion synced.`);
            queryClient.invalidateQueries({ queryKey: ["businesses"] });
            queryClient.invalidateQueries({ queryKey: ["finance"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            queryClient.invalidateQueries({ queryKey: ["documents"] });
        },
        onError: (err) => {
            setSwitchingTo(null);
            toast.error(err.message);
        },
    });

    if (!business) return null;
    const currentProfile = profileForCountry(business.country);

    const handleCountryChange = (newCode) => {
        setSwitchingTo(newCode);
        const p = profileForCountry(newCode);
        updateProfile.mutate({
            businessId: business.id,
            country: p.code,
            currency: p.currency,
            locale: p.locale,
            timezone: p.timezone,
            taxSystem: p.taxSystem,
        });
    };

    const currentRateVsUSD = getRate("USD", business.currency);

    if (isCollapsed) {
        return (
            <div className="flex flex-col items-center gap-2">
                <button
                    onClick={() => setIsExpanded((prev) => !prev)}
                    className="flex size-9 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0B0F19] text-slate-400 hover:border-cyan-500/40 hover:text-white transition shadow-sm"
                    title={`Active Currency: ${business.currency}`}
                >
                    <Coins className="size-4 text-cyan-400" />
                </button>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0B0F19] p-3 shadow-lg">
            {/* Ambient Neon Accent Top Line */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

            {/* HUD Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="relative flex size-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                    </span>
                    <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                        FX MATRIX · LIVE
                    </span>
                </div>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-mono font-medium text-cyan-400 border border-cyan-500/25">
                    {ratesError ? "EST. FEED" : "CORS 24H"}
                </span>
            </div>

            {/* Active Currency Card */}
            <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/[0.06] bg-[#0E1424] px-2.5 py-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{currentProfile.flag}</span>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-white font-mono">{business.currency}</span>
                            <span className="text-[10px] text-slate-400">({currentProfile.symbol})</span>
                        </div>
                        <p className="text-[9px] font-mono text-slate-400">
                            {business.currency === "USD" ? "Base Currency" : `1 USD ≈ ${currentRateVsUSD.toFixed(2)} ${business.currency}`}
                        </p>
                    </div>
                </div>

                {/* Country Selector Dropdown */}
                <select
                    aria-label="Change workspace country and currency"
                    value={business.country}
                    disabled={updateProfile.isPending}
                    onChange={(e) => handleCountryChange(e.target.value)}
                    className="cursor-pointer rounded-lg border border-white/[0.08] bg-[#070A12] px-2 py-1 text-[10px] font-mono font-medium text-slate-200 outline-none hover:border-cyan-500/40 focus:border-cyan-400 transition [&>option]:bg-[#070A12] [&>option]:text-slate-200"
                >
                    {countryOptions.map((c) => (
                        <option key={c.code} value={c.code}>
                            {c.flag} {c.code} · {c.currency}
                        </option>
                    ))}
                </select>
            </div>

            {/* Quick Currency Switch Pills */}
            <div className="mt-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[8px] font-mono uppercase tracking-wider font-semibold text-slate-400">
                        INSTANT CONVERT
                    </span>
                    <button
                        onClick={() => setIsExpanded((s) => !s)}
                        className="flex items-center gap-1 text-[8px] font-mono font-medium text-slate-400 hover:text-cyan-400 transition"
                    >
                        <span>{isExpanded ? "Hide Feed" : "All 11 Feeds"}</span>
                        <ChevronDown className={`size-2.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                    {TOP_CURRENCIES.map((curr) => {
                        const isActive = business.country === curr.code;
                        const isPendingThis = switchingTo === curr.code;
                        return (
                            <motion.button
                                key={curr.code}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                disabled={updateProfile.isPending}
                                onClick={() => handleCountryChange(curr.code)}
                                className={`relative flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-mono font-medium transition-all ${
                                    isActive
                                        ? "border-cyan-500/60 bg-cyan-500/20 text-white shadow-[0_0_12px_rgba(34,211,238,0.2)]"
                                        : "border-white/[0.06] bg-[#0E1424] text-slate-400 hover:border-white/[0.14] hover:text-white"
                                }`}
                            >
                                {isPendingThis ? (
                                    <span className="size-3 animate-spin rounded-full border border-cyan-400 border-t-transparent" />
                                ) : (
                                    <>
                                        <span className="text-[9px] text-slate-400">{curr.symbol}</span>
                                        <span>{curr.label}</span>
                                    </>
                                )}
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Expandable Full Exchange Rate Board */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-[#070A12] p-2 space-y-1">
                            <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                                <span className="text-[8px] font-mono uppercase font-bold text-slate-400">
                                    1 {business.currency} EQUALS
                                </span>
                                <span className="text-[8px] font-mono font-bold text-cyan-400">LIVE FEED</span>
                            </div>
                            <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                                {countryOptions
                                    .filter((c) => c.currency !== business.currency)
                                    .map((target) => {
                                        const rate = getRate(business.currency, target.currency);
                                        return (
                                            <div
                                                key={target.code}
                                                onClick={() => handleCountryChange(target.code)}
                                                className="flex cursor-pointer items-center justify-between rounded px-1.5 py-0.5 hover:bg-white/[0.06] transition"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs">{target.flag}</span>
                                                    <span className="text-[9px] font-mono font-bold text-slate-300">
                                                        {target.currency}
                                                    </span>
                                                </div>
                                                <span className="text-[9px] font-mono font-bold text-cyan-400">
                                                    {rate < 0.01
                                                        ? rate.toFixed(5)
                                                        : rate < 1
                                                        ? rate.toFixed(3)
                                                        : rate < 100
                                                        ? rate.toFixed(2)
                                                        : rate.toFixed(1)}
                                                </span>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Global Quick Copilot Slide-Over Drawer ──────────────────────────────────
function QuickCopilotDrawer({ isOpen, onClose }) {
    const [, setLocation] = useLocation();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), retry: false });
    const business = businesses.data?.[0];
    const businessId = business?.id ?? 0;
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const scrollRef = useRef(null);

    const askMutation = useMutation({
        mutationFn: (body) => api.assistant.ask(body),
        onSuccess: (data) => {
            const assistantMsg = {
                id: `assistant-${Date.now()}`,
                role: "assistant",
                content: data.answer,
                actions: data.actions,
                sources: data.sources,
                dataSnapshot: data.dataSnapshot,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMsg]);
        },
        onError: (err) => {
            toast.error(err.message || "Copilot could not generate an answer.");
            setMessages((prev) => [
                ...prev,
                {
                    id: `assistant-err-${Date.now()}`,
                    role: "assistant",
                    content: `Error consulting ledger: ${err.message}.`,
                    timestamp: new Date(),
                },
            ]);
        },
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, askMutation.isPending]);

    const handleSend = (textToSend) => {
        const query = (textToSend || input).trim();
        if (!query || !businessId || askMutation.isPending) return;

        setMessages((prev) => [
            ...prev,
            { id: `user-${Date.now()}`, role: "user", content: query, timestamp: new Date() },
        ]);
        setInput("");

        const history = messages.slice(-4).map((m) => ({ role: m.role, content: m.content }));
        askMutation.mutate({ businessId, message: query, history });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Click-away backdrop */}
            <div className="flex-1" onClick={onClose} />

            {/* Futuristic HUD Drawer */}
            <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 280 }}
                className="relative flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#070A12] shadow-2xl"
            >
                {/* Neon Top Rail */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-400 via-cyan-400 to-indigo-500 shadow-[0_0_12px_#38BDF8]" />

                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Bot className="size-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-white tracking-tight">PRAVA // QUICK COPILOT</h3>
                                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[8px] font-mono font-medium text-cyan-400 border border-cyan-500/25">
                                    LEDGER-GROUNDED
                                </span>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400">
                                Real-time answers based on invoices, vendors & GST.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex size-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/[0.2] hover:text-white transition"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Message Stream */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-center p-4">
                            <div className="flex size-12 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                                <Sparkles className="size-6" />
                            </div>
                            <h4 className="mt-3 text-sm font-bold text-white">Ask anything about invoices & records</h4>
                            <p className="mt-1 text-xs text-slate-400 max-w-xs">
                                Grounded directly in your active documents. If an invoice doesn't exist, we state it transparently.
                            </p>
                            <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                                {[
                                    "Show my recent invoice totals",
                                    "What is our estimated GST liability?",
                                    "Take me to documents & invoices",
                                    "Do we have any invoice from AWS?",
                                ].map((p, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleSend(p)}
                                        className="text-left rounded-xl border border-white/[0.08] bg-[#0B0F19] p-2.5 text-xs text-slate-300 hover:border-cyan-500/40 hover:text-white transition shadow-sm"
                                    >
                                        {p} →
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-2.5 text-xs ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                {msg.role === "assistant" && (
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                                        <Bot className="size-3.5" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[85%] rounded-2xl p-3.5 ${
                                        msg.role === "user"
                                            ? "rounded-tr-none bg-sky-600 text-white shadow-[0_0_12px_rgba(2,132,199,0.3)]"
                                            : "rounded-tl-none border border-white/[0.08] bg-[#0B0F19] text-slate-200 shadow-md"
                                    }`}
                                >
                                    <div className="prose-sm dark:prose-invert text-slate-200 leading-relaxed text-xs">
                                        <Streamdown>{msg.content}</Streamdown>
                                    </div>

                                    {/* Sources */}
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1">
                                            <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">Sources:</span>
                                            {msg.sources.map((s, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        onClose();
                                                        setLocation(`/documents`);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] font-mono text-cyan-400 hover:border-cyan-500/40"
                                                >
                                                    <FileText className="size-2.5" />
                                                    {s.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Action execution buttons / redirect triggers */}
                                    {msg.actions && msg.actions.length > 0 && (
                                        <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex flex-wrap gap-1.5">
                                            {msg.actions.map((act, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        onClose();
                                                        setLocation(act.path);
                                                    }}
                                                    className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-500/25 transition shadow-sm"
                                                >
                                                    {act.label}
                                                    <ArrowRight className="size-3" />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full border border-white/[0.1] bg-[#0E1424] text-slate-300">
                                        <User className="size-3.5" />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {askMutation.isPending && (
                        <div className="flex gap-2 text-xs items-center text-slate-400 bg-[#0B0F19] rounded-xl p-3 border border-white/[0.08]">
                            <Loader2 className="size-3.5 animate-spin text-cyan-400" />
                            <span>Checking invoices and double-entry books…</span>
                        </div>
                    )}
                </div>

                {/* Input Bar */}
                <div className="border-t border-white/[0.08] p-3 bg-[#070A12]">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleSend();
                        }}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#0B0F19] px-3 py-1.5 focus-within:border-cyan-500/40 shadow-inner"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Query invoices, ask for GST or say 'take me to invoices'…"
                            className="flex-1 bg-transparent text-xs text-white placeholder:text-slate-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || askMutation.isPending}
                            className="inline-flex size-7 items-center justify-center rounded-lg bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-40 transition"
                        >
                            <Send className="size-3.5" />
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
}

// ─── Main DashboardLayout Component ───────────────────────────────────────────
export default function DashboardLayout({ children }) {
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        try {
            const saved = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
            return Number.isFinite(saved) && saved >= MIN_WIDTH && saved <= MAX_WIDTH ? saved : DEFAULT_WIDTH;
        } catch {
            return DEFAULT_WIDTH;
        }
    });
    const { loading, user, logout } = useAuth();

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
        } catch {}
    }, [sidebarWidth]);

    if (loading) return <DashboardLayoutSkeleton />;

    if (!user) {
        return (
            <div className="relative flex min-h-screen items-center justify-center bg-[#030712] p-4 text-white overflow-hidden">
                <ElectricHorizonBackground variant="hero" />
                <div className="brandgenie-card relative z-10 flex max-w-md w-full flex-col items-center gap-6 p-8 text-center shadow-2xl backdrop-blur-2xl">
                    <PravaMark size="lg" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white">Sign in to continue</h1>
                        <p className="mt-2 text-xs leading-relaxed text-slate-400">
                            Access your business finances, automated tax compliance engine, and certified Chartered Accountant review desk.
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (typeof window !== "undefined") window.location.href = "/login";
                            else startLogin();
                        }}
                        className="brandgenie-pill-primary w-full py-3 text-xs font-semibold"
                    >
                        <span>Go to Business Sign In</span>
                        <span className="flex size-4.5 items-center justify-center rounded-full bg-[#030712] text-white">
                            →
                        </span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` }} className="bg-[#030712] text-white">
            <DashboardLayoutContent user={user} logout={logout} setSidebarWidth={setSidebarWidth}>
                {children}
            </DashboardLayoutContent>
        </SidebarProvider>
    );
}

function DashboardLayoutContent({ children, user, logout, setSidebarWidth }) {
    const [location, setLocation] = useLocation();
    const businesses = useQuery({ queryKey: ["businesses", "list"], queryFn: () => api.businesses.list(), enabled: Boolean(user), retry: false });
    const activeBusiness = businesses.data?.[0];
    // Ledger telemetry must reflect persisted data, never a hardcoded badge.
    const financeSummary = useQuery({
        queryKey: ["finance", "latestSummary", activeBusiness?.id],
        queryFn: () => api.finance.latestSummary({ businessId: activeBusiness.id }),
        enabled: Boolean(activeBusiness && location !== "/onboarding"),
        retry: false,
    });
    const pendingDocumentCount = financeSummary.data?.counts?.pendingDocuments ?? 0;
    const hasLedgerActivity = Boolean(financeSummary.data?.hasActivity);

    const billing = useQuery({
        queryKey: ["billing", "snapshot", activeBusiness?.id],
        queryFn: () => api.billing.snapshot({ businessId: activeBusiness.id }),
        enabled: Boolean(activeBusiness && location !== "/onboarding"),
        retry: false,
    });
    const { state, toggleSidebar } = useSidebar();
    const isCollapsed = state === "collapsed";
    const [isResizing, setIsResizing] = useState(false);
    const [quickCopilotOpen, setQuickCopilotOpen] = useState(false);
    const sidebarRef = useRef(null);

    const hasSelectedPlan = billing.data?.subscription?.planSelected !== 0 &&
        billing.data?.subscription?.planSelected !== false;
    const onboardingComplete = Boolean(activeBusiness?.onboardingCompletedAt || activeBusiness?.onboardingStep >= 3);
    const requiresPlanSelection = Boolean(
        onboardingComplete &&
        (billing.error || (billing.data && !hasSelectedPlan))
    );
    const billingGateLoading = Boolean(
        location !== "/billing" &&
        location !== "/onboarding" &&
        (businesses.isLoading || (onboardingComplete && billing.isLoading))
    );

    useEffect(() => {
        if (
            requiresPlanSelection &&
            location !== "/billing" &&
            location !== "/onboarding"
        ) {
            setLocation("/billing");
        }
    }, [location, requiresPlanSelection, setLocation]);

    const allItems = navGroups.flatMap((g) => g.items);
    const activeMenuItem = allItems.find((item) => item.path === location);

    // Keyboard listener for Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setQuickCopilotOpen((prev) => !prev);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        if (isCollapsed) setIsResizing(false);
    }, [isCollapsed]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizing) return;
            const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
            const newWidth = e.clientX - sidebarLeft;
            if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => setIsResizing(false);
        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing, setSidebarWidth]);

    if (billingGateLoading || (requiresPlanSelection && location !== "/billing" && location !== "/onboarding")) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#030712] text-xs text-slate-400">
                <Loader2 className="mr-2 size-4 animate-spin text-cyan-400" />
                Opening plan selection…
            </div>
        );
    }

    return (
        <>
            <a
                href="#workspace-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-black focus:shadow-xl"
            >
                Skip to workspace content
            </a>

            {/* Quick Copilot Modal */}
            <AnimatePresence>
                {quickCopilotOpen && (
                    <QuickCopilotDrawer
                        isOpen={quickCopilotOpen}
                        onClose={() => setQuickCopilotOpen(false)}
                    />
                )}
            </AnimatePresence>

            <div className="relative" ref={sidebarRef}>
                {/* ── HIGH-TECH CINEMATIC SCI-FI SIDEBAR ─────────────────────────────── */}
                <Sidebar
                    collapsible="icon"
                    className="border-r border-white/[0.08] bg-[#070A12] text-slate-200 shadow-2xl"
                    disableTransition={isResizing}
                >
                    {/* ── SIDEBAR HUD HEADER ────────────────────────────────────────── */}
                    <SidebarHeader className="relative h-14 justify-center border-b border-white/[0.08] px-3 z-10 bg-[#070A12]">
                        <div className="flex items-center gap-3 w-full">
                            <motion.button
                                onClick={toggleSidebar}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0B0F19] text-slate-400 hover:text-white hover:border-cyan-500/40 transition shadow-xs"
                                aria-label="Toggle navigation"
                            >
                                <PanelLeft className="size-4" />
                            </motion.button>

                            {!isCollapsed && (
                                <motion.div
                                    initial={{ opacity: 0, x: -6 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between min-w-0 flex-1"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <PravaLogoIcon size="sm" />
                                        <div className="flex flex-col">
                                            <div className="flex items-baseline gap-1 leading-none">
                                                <span className="font-serif text-sm font-bold tracking-tight text-white">
                                                    Prava
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 leading-tight mt-0.5">
                                                Financial Compliance
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </SidebarHeader>

                    {/* ── NAVIGATION CONTENT ────────────────────────────────────────── */}
                    <SidebarContent className="relative z-10 gap-3 px-2.5 py-3 overflow-y-auto">
                        {user?.role === "ca" ? (
                            // CA Specialist Menu
                            <SidebarMenu>
                                {[
                                    { icon: UserCheck, label: "CA Review Desk", path: "/ca/dashboard" },
                                    { icon: Receipt, label: "Tax & Filings", path: "/tax" },
                                    { icon: FileText, label: "Documents", path: "/documents" },
                                    { icon: ClipboardCheck, label: "Tasks", path: "/tasks" },
                                    { icon: Sparkles, label: "Ask Prava", path: "/assistant" },
                                ].map((item) => {
                                    const isActive = location === item.path;
                                    const Icon = item.icon;
                                    return (
                                        <SidebarMenuItem key={item.path}>
                                            <SidebarMenuButton
                                                isActive={isActive}
                                                onClick={() => setLocation(item.path)}
                                                tooltip={item.label}
                                                className={`relative h-9 rounded-xl px-3 transition-colors duration-180 ${
                                                    isActive
                                                        ? "bg-gradient-to-r from-cyan-500/20 via-sky-500/10 to-transparent text-white border border-cyan-500/40 font-medium shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                                                        : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                                                }`}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="sidebar-active-pill"
                                                        transition={{ type: "spring", stiffness: 480, damping: 26 }}
                                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                                                    />
                                                )}
                                                <Icon className={`size-3.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                                                <span className="flex-1 truncate text-xs">{item.label}</span>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                            </SidebarMenu>
                        ) : (
                            // High-Tech Grouped Menu for Standard/Admin Users
                            navGroups.map((group) => (
                                <div key={group.category} className="space-y-1">
                                    {!isCollapsed && (
                                        <div className="flex items-center justify-between px-3 py-1">
                                            <span className="text-[9px] font-mono tracking-wider font-semibold text-slate-400 uppercase">
                                                {group.category}
                                            </span>
                                        </div>
                                    )}

                                    <SidebarMenu>
                                        {group.items.map((item) => {
                                            const isActive = location === item.path;
                                            const Icon = item.icon;
                                            return (
                                                <SidebarMenuItem key={item.path}>
                                                    <SidebarMenuButton
                                                        isActive={isActive}
                                                        onClick={() => setLocation(item.path)}
                                                        tooltip={item.label}
                                                        className={`relative h-9 rounded-xl px-3 transition-colors duration-180 ${
                                                            isActive
                                                                ? "bg-gradient-to-r from-sky-500/20 via-cyan-500/10 to-transparent text-white border border-cyan-500/40 font-medium shadow-[0_0_15px_rgba(34,211,238,0.15)]"
                                                                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
                                                        }`}
                                                    >
                                                        {isActive && (
                                                            <motion.div
                                                                layoutId="sidebar-active-pill"
                                                                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                                                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                                                            />
                                                        )}

                                                        <Icon
                                                            className={`size-3.5 shrink-0 ${
                                                                isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-white"
                                                            }`}
                                                        />

                                                        <span className="relative z-10 flex-1 truncate text-xs tracking-tight">
                                                            {item.label}
                                                        </span>

                                                        {item.badge && !isCollapsed && (
                                                            <span
                                                                className={`rounded-full px-2 py-0.5 text-[8px] font-mono font-medium lowercase ${
                                                                    isActive
                                                                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                                                        : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"
                                                                }`}
                                                            >
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            );
                                        })}
                                    </SidebarMenu>
                                </div>
                            ))
                        )}

                        {/* Admin Platform Switcher */}
                        {user?.role === "admin" && (
                            <div className="pt-3 border-t border-white/[0.08]">
                                {!isCollapsed ? (
                                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">
                                                Platform Administration
                                            </span>
                                            <span className="text-[9px] bg-blue-500/20 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-500/30">
                                                Superadmin
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-300 leading-snug">
                                            Dedicated multi-tenant governance, OCR diagnostics, and CA management.
                                        </p>
                                        <Button
                                            size="sm"
                                            onClick={() => setLocation("/admin")}
                                            className="w-full h-7 bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white gap-1.5"
                                        >
                                            <ShieldCheck className="size-3.5" />
                                            Open Admin Console
                                        </Button>
                                    </div>
                                ) : (
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => setLocation("/admin")}
                                            tooltip="Open Admin Console"
                                            className="h-9 rounded-xl px-3 bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                        >
                                            <ShieldCheck className="size-4" />
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )}
                            </div>
                        )}
                    </SidebarContent>

                    {/* ── FOOTER: CURRENCY MATRIX + AUTHENTICATED IDENTITY ──────────── */}
                    <SidebarFooter
                        className={`relative z-10 border-t border-white/[0.08] bg-[#070A12] transition-all ${
                            isCollapsed ? "p-1.5 flex flex-col items-center gap-2" : "p-3 gap-3"
                        }`}
                    >
                        {/* Live Currency Matrix Widget */}
                        <CurrencyMatrixWidget />

                        {/* Cryptographic User Identity */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button
                                    aria-label="User profile options"
                                    className={`flex items-center rounded-xl border border-white/[0.08] bg-[#0B0F19] transition hover:border-cyan-500/40 hover:bg-[#0E1424] focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500 group shadow-xs shrink-0 ${
                                        isCollapsed ? "size-9 p-0 justify-center text-center" : "w-full gap-2.5 p-2 text-left"
                                    }`}
                                >
                                    <Avatar className={`${isCollapsed ? "size-7 rounded-lg" : "size-8 rounded-xl"} border border-white/[0.08] shrink-0`}>
                                        <AvatarFallback className="text-xs font-semibold text-white bg-[#0E1424] rounded-xl border border-white/[0.06]">
                                            {user?.name?.charAt(0).toUpperCase() || "P"}
                                        </AvatarFallback>
                                    </Avatar>
                                    {!isCollapsed && (
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-medium text-white truncate leading-tight">
                                                    {user?.name || "Business Owner"}
                                                </p>
                                                <span className="rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 px-1.5 py-0.2 text-[8px] font-mono font-medium">
                                                    PRO
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-normal truncate mt-0.5 font-mono">
                                                {user?.email || "verified"}
                                            </p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl border border-white/[0.08] bg-[#0B0F19] text-white shadow-2xl backdrop-blur-xl">
                                <div className="px-3 py-2 border-b border-white/[0.06]">
                                    <p className="text-[10px] font-mono font-medium text-slate-400 uppercase">Entity Identity</p>
                                    <p className="text-xs font-medium text-white truncate">{user?.name}</p>
                                </div>
                                <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer text-slate-300 hover:bg-white/[0.04] hover:text-white text-xs font-medium py-2">
                                    <ShieldCheck className="mr-2 size-3.5 text-cyan-400" />
                                    <span>Account & Security</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => {
                                        void logout()
                                            .then(() => {
                                                toast.success("Signed out safely.");
                                                window.location.href = "/login";
                                            })
                                            .catch(() => {
                                                toast.error("Could not complete sign-out.");
                                                window.location.href = "/login";
                                            });
                                    }}
                                    className="cursor-pointer text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10 text-xs font-medium py-2"
                                >
                                    <LogOut className="mr-2 size-3.5" />
                                    <span>Sign out of Workspace</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarFooter>
                </Sidebar>

                {/* Sidebar Resize Handle */}
                <div
                    className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-cyan-500/50 transition-colors ${
                        isCollapsed ? "hidden" : ""
                    }`}
                    onMouseDown={() => {
                        if (!isCollapsed) setIsResizing(true);
                    }}
                    style={{ zIndex: 50 }}
                />
            </div>

            {/* ── MAIN CONTENT AREA (Futuristic HUD Top Navbar & Canvas) ── */}
            <SidebarInset className="bg-[#030712] relative z-10 min-h-screen text-white">
                {/* ── FUTURISTIC HUD TOP BAR ─────────────────────────────────────── */}
                <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/[0.08] bg-[#030712]/75 px-4 sm:px-6 backdrop-blur-2xl">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger
                            aria-label="Toggle navigation"
                            className="size-8 rounded-xl border border-white/[0.08] bg-[#0B0F19] text-slate-400 hover:border-slate-700 hover:text-white shadow-xs focus-visible:ring-2 focus-visible:ring-blue-500"
                        />
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                                Workspace
                            </span>
                            <span className="text-xs text-slate-600 hidden sm:inline">/</span>
                            {activeMenuItem ? (
                                <span className="text-xs font-semibold text-white tracking-tight">
                                    {activeMenuItem.label}
                                </span>
                            ) : (
                                <span className="text-xs font-semibold text-white tracking-tight">
                                    Console
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-2.5">
                        {/* Ledger telemetry derived from persisted documents */}
                        <div className="hidden lg:flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#0B0F19] px-2.5 py-1">
                            <span
                                className={`size-1.5 rounded-full ${
                                    pendingDocumentCount > 0
                                        ? "bg-amber-400"
                                        : hasLedgerActivity
                                        ? "bg-emerald-400"
                                        : "bg-slate-500"
                                }`}
                            />
                            <span className="text-[10px] font-medium text-slate-300">
                                {pendingDocumentCount > 0
                                    ? `${pendingDocumentCount} Pending Review`
                                    : hasLedgerActivity
                                    ? "Ledger Synced"
                                    : "No Ledger Entries"}
                            </span>
                        </div>

                        {/* Admin Link if authorized */}
                        {user?.role === "admin" && (
                            <button
                                onClick={() => setLocation("/admin")}
                                className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-500/20 hover:text-white transition"
                            >
                                <ShieldCheck className="size-3.5 text-blue-400" />
                                <span>Platform Admin</span>
                            </button>
                        )}

                        {/* Fast Action: Upload Doc */}
                        <button
                            onClick={() => setLocation("/documents")}
                            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#0B0F19] px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-white/[0.18] hover:text-white transition shadow-sm"
                        >
                            <UploadCloud className="size-3.5 text-slate-400" />
                            <span>Upload Invoice</span>
                        </button>

                        {/* Global AI Copilot Trigger */}
                        <button
                            onClick={() => setQuickCopilotOpen(true)}
                            className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-[#0B0F19] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-500/40 hover:text-white"
                        >
                            <Sparkles className="size-3.5 text-blue-400" />
                            <span className="tracking-tight">Ask Prava…</span>
                            <kbd className="hidden sm:inline rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                                ⌘K
                            </kbd>
                        </button>
                    </div>
                </div>

                {/* Global Planetary Horizon Effect */}
                <ElectricHorizonBackground variant={location === "/dashboard" ? "hero" : "header"} />

                {/* Dynamic Page Content with Spring Transition */}
                <AnimatePresence mode="wait">
                    <motion.main
                        key={location}
                        id="workspace-content"
                        className="relative z-10 flex-1 p-4 sm:p-6"
                        tabIndex={-1}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        style={{ willChange: "transform, opacity", transform: "translateZ(0)" }}
                    >
                        {children}
                    </motion.main>
                </AnimatePresence>
            </SidebarInset>
        </>
    );
}
