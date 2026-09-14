import { useAuth } from "@/_core/hooks/useAuth";
import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
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
import { trpc } from "@/lib/trpc";
import { pageVariants } from "@/lib/animations";
import { useCurrencyRates } from "@/hooks/useCurrencyRates";
import { countryOptions, profileForCountry, type CountryCode } from "@shared/locale";
import {
  Activity,
  ArrowRightLeft,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Coins,
  CreditCard,
  Cpu,
  FileText,
  Globe,
  HardDrive,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Receipt,
  ReceiptText,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  WalletCards,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

// ─── Grouped Nav Items for High-Tech Sci-Fi Sidebar ───────────────────────────
const navGroups = [
  {
    category: "01 // COMMAND OPS",
    items: [
      { icon: LayoutDashboard, label: "Command Center", path: "/dashboard", badge: "LIVE", color: "text-sky-400", glow: "from-sky-500/25" },
      { icon: Sparkles, label: "Ask Prava (AI)", path: "/assistant", highlight: true, color: "text-violet-400", glow: "from-violet-500/25" },
    ],
  },
  {
    category: "02 // LEDGER & CAPITAL",
    items: [
      { icon: WalletCards, label: "Money & Cashflow", path: "/money", color: "text-emerald-400", glow: "from-emerald-500/25" },
      { icon: FileText, label: "Documents Vault", path: "/documents", badge: "OCR", color: "text-cyan-400", glow: "from-cyan-500/25" },
      { icon: ClipboardCheck, label: "Tasks & Workflows", path: "/tasks", color: "text-amber-400", glow: "from-amber-500/25" },
    ],
  },
  {
    category: "03 // STATUTORY AUDIT",
    items: [
      { icon: Receipt, label: "Tax & Compliance", path: "/tax", color: "text-orange-400", glow: "from-orange-500/25" },
      { icon: UserCheck, label: "CA Review Desk", path: "/ca-review", badge: "ICAI", color: "text-purple-400", glow: "from-purple-500/25" },
    ],
  },
  {
    category: "04 // ENTITY CONFIG",
    items: [
      { icon: Building2, label: "Business Profile", path: "/onboarding", color: "text-rose-400", glow: "from-rose-500/25" },
      { icon: CreditCard, label: "Billing & Plans", path: "/billing", color: "text-pink-400", glow: "from-pink-500/25" },
    ],
  },
];

const SIDEBAR_WIDTH_KEY = "prava-sidebar-width";
const DEFAULT_WIDTH = 290;
const MIN_WIDTH = 240;
const MAX_WIDTH = 420;

// Popular fast-switch currencies
const TOP_CURRENCIES: { code: CountryCode; symbol: string; label: string }[] = [
  { code: "US", symbol: "$", label: "USD" },
  { code: "IN", symbol: "₹", label: "INR" },
  { code: "DE", symbol: "€", label: "EUR" },
  { code: "GB", symbol: "£", label: "GBP" },
  { code: "JP", symbol: "¥", label: "JPY" },
  { code: "AE", symbol: "AED", label: "AED" },
];

// ─── High-Tech Currency Matrix Component ──────────────────────────────────────
function CurrencyMatrixWidget() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const utils = trpc.useUtils();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });
  const business = businesses.data?.[0];
  const { rates, loading: ratesLoading, error: ratesError, getRate } = useCurrencyRates();
  const [isExpanded, setIsExpanded] = useState(false);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const updateProfile = trpc.businesses.updateProfile.useMutation({
    onSuccess: (updated) => {
      setSwitchingTo(null);
      toast.success(`Currency switched to ${updated?.currency} — all balances dynamically converted!`);
      utils.businesses.list.invalidate();
      utils.finance.latestSummary.invalidate();
      utils.tasks.list.invalidate();
      utils.documents.list.invalidate();
    },
    onError: (err) => {
      setSwitchingTo(null);
      toast.error(err.message);
    },
  });

  if (!business) return null;
  const currentProfile = profileForCountry(business.country);

  const handleCountryChange = (newCode: CountryCode) => {
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
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-sky-400 hover:border-sky-400/40 hover:bg-sky-500/10 transition shadow-sm"
          title={`Active Currency: ${business.currency}`}
        >
          <Coins className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/50 bg-white/35 p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.65)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#090d16]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
      {/* HUD Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          <span className="text-[9px] font-mono font-bold tracking-widest text-slate-900 dark:text-slate-300 uppercase">
            FX Matrix · Live
          </span>
        </div>
        <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[8px] font-mono font-bold text-sky-600 dark:text-sky-400 border border-sky-500/20">
          {ratesError ? "EST. RATES" : "CORS 24H"}
        </span>
      </div>

      {/* Active Currency Card */}
      <div className="mt-2 flex items-center justify-between rounded-xl border border-white/60 bg-white/40 backdrop-blur-xl px-2.5 py-2 shadow-xs dark:border-white/[0.08] dark:bg-black/50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{currentProfile.flag}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 dark:text-white font-mono">{business.currency}</span>
              <span className="text-[10px] font-bold text-slate-800 dark:text-slate-300">({currentProfile.symbol})</span>
            </div>
            <p className="text-[9px] font-mono font-bold text-slate-800 dark:text-slate-300">
              {business.currency === "USD" ? "Base Currency" : `1 USD ≈ ${currentRateVsUSD.toFixed(2)} ${business.currency}`}
            </p>
          </div>
        </div>

        {/* Country Selector Dropdown */}
        <select
          aria-label="Change workspace country and currency"
          value={business.country}
          disabled={updateProfile.isPending}
          onChange={(e) => handleCountryChange(e.target.value as CountryCode)}
          className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono font-bold text-sky-600 outline-none hover:border-sky-400 transition dark:border-white/10 dark:bg-[#0d1117] dark:text-sky-400 [&>option]:bg-white dark:[&>option]:bg-[#0d1117] [&>option]:text-slate-900 dark:[&>option]:text-white"
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
          <span className="text-[8px] font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-400">
            Instant Convert
          </span>
          <button
            onClick={() => setIsExpanded((s) => !s)}
            className="flex items-center gap-1 text-[8px] font-mono font-bold text-sky-700 dark:text-sky-400 hover:text-sky-600 transition"
          >
            <span>{isExpanded ? "Hide Rates" : "All 11 Rates"}</span>
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
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                disabled={updateProfile.isPending}
                onClick={() => handleCountryChange(curr.code)}
                className={`relative flex items-center justify-center gap-1 rounded-lg border px-1.5 py-1 text-[10px] font-mono font-bold transition-all ${
                  isActive
                    ? "border-sky-500/50 bg-sky-50 text-sky-700 font-extrabold shadow-sm dark:border-sky-400/50 dark:bg-sky-500/25 dark:text-sky-200 dark:shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                    : "border-white/50 bg-white/40 text-slate-900 font-bold hover:border-white/80 hover:bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-white/20 dark:hover:bg-white/[0.08] dark:hover:text-white"
                }`}
              >
                {isPendingThis ? (
                  <span className="size-3 animate-spin rounded-full border border-sky-400 border-t-transparent" />
                ) : (
                  <>
                    <span className="text-[9px] font-bold text-slate-700 dark:text-slate-400">{curr.symbol}</span>
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
            <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-black/60 p-2 space-y-1">
              <div className="flex items-center justify-between pb-1 border-b border-white/[0.06]">
                <span className="text-[8px] font-mono uppercase font-bold text-slate-900 dark:text-slate-400">1 {business.currency} EQUALS</span>
                <span className="text-[8px] font-mono font-bold text-emerald-600 dark:text-emerald-400">LIVE FEED</span>
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
                          <span className="text-[9px] font-mono font-bold text-slate-900 dark:text-slate-300">{target.currency}</span>
                        </div>
                        <span className="text-[9px] font-mono font-bold text-sky-400">
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

// ─── Main DashboardLayout Component ───────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
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
      <div className="flex min-h-screen items-center justify-center bg-[#07080a] p-4 text-white">
        <div className="prava-panel flex max-w-md w-full flex-col items-center gap-6 rounded-3xl border border-white/10 bg-black/60 p-8 text-center shadow-2xl backdrop-blur-2xl">
          <PravaMark size="lg" />
          <div>
            <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl font-normal tracking-tight text-white">
              Sign in to continue
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Access your business finances, automated tax compliance engine, and certified Chartered Accountant review desk.
            </p>
          </div>
          <Button
            onClick={() => startLogin()}
            size="lg"
            className="w-full rounded-xl bg-white text-sm font-semibold text-black shadow-lg hover:bg-slate-200 transition"
          >
            Authenticate & Launch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
      className="bg-transparent text-foreground"
    >
      <DashboardLayoutContent user={user} logout={logout} setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  user: { name?: string | null; email?: string | null; role?: string | null };
  logout: () => Promise<void>;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({ children, user, logout, setSidebarWidth }: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const allItems = navGroups.flatMap((g) => g.items);
  const activeMenuItem = allItems.find((item) => item.path === location);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
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

  return (
    <>
      <a
        href="#workspace-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:text-xs focus:font-bold focus:text-black focus:shadow-xl"
      >
        Skip to workspace content
      </a>

      <div className="relative" ref={sidebarRef}>
        {/* ── HIGH-TECH CREATIVE SCI-FI SIDEBAR ─────────────────────────────── */}
        <Sidebar
          collapsible="icon"
          className="border-r border-white/40 bg-white/35 text-slate-900 shadow-[0_4px_24px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#07090f]/95 dark:text-white backdrop-blur-2xl"
          disableTransition={isResizing}
        >
          {/* Cyber Ambient Background Grid & Radial Nodes */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-16 -top-16 size-60 rounded-full bg-cyan-500/[0.04] blur-3xl dark:bg-cyan-500/[0.08]" />
            <div className="absolute -right-16 bottom-24 size-60 rounded-full bg-violet-500/[0.04] blur-3xl dark:bg-violet-500/[0.08]" />
            <div
              className="absolute inset-0 opacity-20 dark:opacity-40"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)
                `,
                backgroundSize: "28px 28px",
              }}
            />
          </div>

          {/* ── SIDEBAR HUD HEADER ────────────────────────────────────────── */}
          <SidebarHeader className="relative h-16 justify-center border-b border-white/30 dark:border-white/[0.07] px-3 z-10 bg-white/20 backdrop-blur-2xl">
            <div className="flex items-center gap-3 w-full">
              <motion.button
                onClick={toggleSidebar}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/50 bg-white/40 text-slate-600 hover:border-white/80 hover:bg-white/60 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10 dark:hover:text-white transition focus-visible:ring-2 focus-visible:ring-sky-500 backdrop-blur-xl"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="size-4" />
              </motion.button>

              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <PravaMark size="sm" />
                  </div>

                  {/* High-Tech Telemetry Pill */}
                  <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] font-mono uppercase tracking-widest text-emerald-600 dark:text-emerald-300 font-bold">
                      SYS ONLINE
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          </SidebarHeader>

          {/* ── NAVIGATION CONTENT ────────────────────────────────────────── */}
          <SidebarContent className="relative z-10 gap-4 px-2.5 py-4 overflow-y-auto">
            {user?.role === "ca" ? (
              // CA Specialist Menu
              <SidebarMenu>
                {[
                  { icon: UserCheck, label: "CA Review Desk", path: "/ca/dashboard", color: "text-purple-500 dark:text-purple-400" },
                  { icon: Receipt, label: "Tax & Filings", path: "/tax", color: "text-amber-500 dark:text-amber-400" },
                  { icon: FileText, label: "Documents", path: "/documents", color: "text-sky-500 dark:text-sky-400" },
                  { icon: ClipboardCheck, label: "Tasks", path: "/tasks", color: "text-emerald-500 dark:text-emerald-400" },
                  { icon: Sparkles, label: "Ask Prava", path: "/assistant", color: "text-violet-500 dark:text-violet-400" },
                ].map((item, idx) => {
                  const isActive = location === item.path;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={isActive}
                        onClick={() => setLocation(item.path)}
                        tooltip={item.label}
                        className={`relative h-10 rounded-xl px-3 transition-all ${
                          isActive
                            ? "bg-slate-900 text-white dark:bg-gradient-to-r dark:from-purple-500/20 dark:to-white/[0.04] dark:text-white dark:border dark:border-purple-500/40 shadow-sm"
                            : "text-slate-900 font-bold hover:text-black hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04]"
                        }`}
                      >
                        <Icon className={`size-4 shrink-0 ${isActive ? "text-purple-400" : item.color}`} />
                        <span className="flex-1 truncate font-semibold">{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            ) : (
              // High-Tech Grouped Menu for Standard/Admin Users
              navGroups.map((group, groupIdx) => (
                <div key={group.category} className="space-y-1">
                  {!isCollapsed && (
                    <div className="flex items-center justify-between px-3 py-1">
                      <span className="text-[9px] font-mono tracking-wider font-bold text-slate-900 dark:text-slate-400 uppercase">
                        {group.category}
                      </span>
                      <span className="size-1 rounded-full bg-slate-400 dark:bg-slate-700" />
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
                            className={`relative h-10 rounded-xl px-3 transition-all duration-200 ${
                              isActive
                                ? "bg-slate-900 text-white shadow-md dark:bg-gradient-to-r dark:from-white/[0.12] dark:via-white/[0.06] dark:to-transparent dark:text-white dark:border dark:border-white/[0.16] dark:shadow-[0_0_20px_rgba(255,255,255,0.06)]"
                                : "text-slate-900 font-bold hover:text-black hover:bg-white/60 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.04] border border-transparent"
                            }`}
                          >
                            {/* Glowing Active Neon Left Pill with fun spring transition */}
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active-pill"
                                transition={{ type: "spring", stiffness: 480, damping: 26 }}
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full ${item.color.replace("text-", "bg-")} shadow-[0_0_12px_currentColor]`}
                              />
                            )}

                            {/* Active Ambient Glow Background */}
                            {isActive && (
                              <div
                                className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.glow} to-transparent opacity-70 pointer-events-none`}
                              />
                            )}

                            <motion.div
                              whileHover={{ scale: 1.15, rotate: isActive ? 0 : 6 }}
                              transition={{ type: "spring", stiffness: 450, damping: 22 }}
                              className="relative z-10"
                            >
                              <Icon
                                className={`size-4 shrink-0 transition-colors ${
                                  isActive ? "text-white dark:text-white" : `${item.color} group-hover:opacity-100`
                                }`}
                              />
                            </motion.div>

                            <span className="relative z-10 flex-1 truncate text-xs font-semibold tracking-wide">
                              {item.label}
                            </span>

                            {item.badge && !isCollapsed && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase ${
                                  isActive
                                    ? "bg-white/20 text-white dark:bg-sky-500/20 dark:text-sky-400 border border-white/30 dark:border-sky-500/30"
                                    : "bg-white/50 text-slate-900 font-bold border border-white/60 dark:bg-white/[0.06] dark:text-slate-400 dark:border-white/[0.06]"
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

            {/* Admin Management Section */}
            {user?.role === "admin" && (
              <div className="space-y-1 pt-2 border-t border-white/[0.06]">
                {!isCollapsed && (
                  <p className="px-3 py-1 text-[9px] font-mono uppercase tracking-widest text-slate-500">
                    05 // SECURITY & ACCESS
                  </p>
                )}
                <SidebarMenu>
                  {[
                    { icon: UserCheck, label: "CA Management", path: "/admin/cas", color: "text-purple-400" },
                    { icon: ReceiptText, label: "GST Submissions", path: "/admin/gst", color: "text-amber-400" },
                    { icon: ShieldCheck, label: "Access & Security", path: "/admin/security", color: "text-emerald-400" },
                  ].map((item) => {
                    const isActive = location === item.path;
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(item.path)}
                          tooltip={item.label}
                          className={`h-9 rounded-xl px-3 transition-all ${
                            isActive
                              ? "bg-white/[0.1] text-white border border-white/10"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                          }`}
                        >
                          <Icon className={`size-3.5 shrink-0 ${item.color}`} />
                          <span className="flex-1 truncate text-xs">{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            )}
          </SidebarContent>

          {/* ── FOOTER: CURRENCY MATRIX + AUTHENTICATED IDENTITY ──────────── */}
          <SidebarFooter className={`relative z-10 border-t border-white/30 bg-white/20 dark:border-white/[0.07] dark:bg-black/30 backdrop-blur-2xl transition-all ${
            isCollapsed ? "p-1.5 flex flex-col items-center gap-2" : "p-3 gap-3"
          }`}>
            {/* Live Currency Matrix Widget */}
            <CurrencyMatrixWidget />

            {/* Cryptographic User Identity */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="User profile options"
                  className={`flex items-center rounded-xl border border-white/50 bg-white/40 transition hover:border-white/80 hover:bg-white/60 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:border-sky-400/30 dark:hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 group shadow-sm shrink-0 backdrop-blur-xl ${
                    isCollapsed
                      ? "size-9 p-0 justify-center text-center"
                      : "w-full gap-2.5 p-2 text-left"
                  }`}
                >
                  <Avatar className={`${isCollapsed ? "size-7 rounded-lg" : "size-8 rounded-xl"} border border-slate-200 dark:border-white/10 shrink-0`}>
                    <AvatarFallback className="text-xs font-bold text-white bg-gradient-to-br from-violet-600/70 to-cyan-500/50 rounded-xl">
                      {user?.name?.charAt(0).toUpperCase() || "P"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                          {user?.name || "Business Owner"}
                        </p>
                        <span className="rounded bg-white/60 text-slate-900 border border-white/60 dark:bg-white/[0.07] dark:text-slate-400 dark:border-transparent px-1.5 py-0.5 text-[8px] font-mono font-bold">
                          PRO
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-900 dark:text-slate-400 font-bold truncate mt-0.5 font-mono">
                        {user?.email || "verified"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-white/50 bg-white/95 text-slate-900 dark:border-white/10 dark:bg-[#0d1117] dark:text-white shadow-2xl backdrop-blur-xl"
              >
                <div className="px-3 py-2 border-b border-slate-200 dark:border-white/[0.06]">
                  <p className="text-[10px] font-mono font-bold text-slate-900 dark:text-slate-400 uppercase">Entity Identity</p>
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user?.name}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => {
                    void logout()
                      .then(() => toast.success("Signed out safely."))
                      .catch(() => toast.error("Could not complete sign-out."));
                  }}
                  className="cursor-pointer text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 focus:bg-rose-500/10 text-xs font-bold py-2"
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
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-sky-400/50 transition-colors ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (!isCollapsed) setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      {/* ── MAIN CONTENT AREA (Translucent to let background canvas shine) ── */}
      <SidebarInset className="bg-transparent relative z-10 min-h-screen">
        {/* Futuristic Top Bar */}
        <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/40 bg-white/30 px-4 backdrop-blur-2xl dark:border-white/[0.07] dark:bg-[#07090f]/80 shadow-[0_2px_16px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="size-8 rounded-xl border border-white/50 bg-white/40 text-slate-900 font-bold hover:border-white/80 hover:bg-white/60 hover:text-black dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/10 dark:hover:text-white shadow-sm backdrop-blur-xl" />
            <div className="flex items-center gap-2">
              {activeMenuItem && (
                <motion.div
                  key={location}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <activeMenuItem.icon className={`size-3.5 ${activeMenuItem.color ?? "text-slate-900 dark:text-slate-400"}`} />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{activeMenuItem.label}</span>
                </motion.div>
              )}
              <span className="hidden sm:inline text-[10px] font-mono font-bold text-slate-900 dark:text-slate-500">// TELEMETRY ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation("/assistant")}
              className="hidden sm:flex items-center gap-2 rounded-xl border border-white/50 bg-white/40 px-3 py-1.5 text-xs font-bold text-slate-900 shadow-sm transition hover:border-white/80 hover:bg-white/60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300 dark:hover:border-violet-500/40 dark:hover:bg-violet-500/10 dark:hover:text-white backdrop-blur-xl"
            >
              <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
              <span>Ask Prava AI…</span>
              <kbd className="rounded border border-white/60 bg-white/60 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-900 dark:border-white/10 dark:bg-white/[0.08] dark:text-slate-400">
                ⌘K
              </kbd>
            </motion.button>
            <ThemeToggle />
          </div>
        </div>

        {/* Dynamic Page Content with Silky Hardware-Accelerated Spring Transition */}
        <AnimatePresence mode="wait">
          <motion.main
            key={location}
            id="workspace-content"
            className="flex-1 p-4 sm:p-6"
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
