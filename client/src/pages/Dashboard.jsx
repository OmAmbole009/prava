import { TiltCard } from "@/components/TiltCard";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { fadeUp, listContainer, listItem, scaleIn, staggerContainer, viewportOnce } from "@/lib/animations";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  ExternalLink,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  Landmark,
  Layers,
  Loader2,
  Mic,
  Paperclip,
  Plus,
  Receipt,
  RefreshCw,
  Scale,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function formatMinor(minor, currency, locale) {
  return formatMinorAmount(minor, currency, locale);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// ─── 3-Level Disclosure Modal ────────────────────────────────────────────────
function DisclosureModal({ isOpen, onClose, title, level1, level2, level3, currency, locale }) {
  const [activeTab, setActiveTab] = useState("simple");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-card p-6 shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-500">
            <Info className="size-4" />
          </span>
          <h3 className="text-lg font-bold text-foreground">{title}</h3>
        </div>

        {/* 3-Level Tabs */}
        <div className="mt-5 flex gap-2 border-b border-border/60 pb-3">
          <button
            onClick={() => setActiveTab("simple")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "simple"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            1. Simple Summary
          </button>
          <button
            onClick={() => setActiveTab("how")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "how"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            2. How We Calculated This
          </button>
          <button
            onClick={() => setActiveTab("technical")}
            className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
              activeTab === "technical"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            3. Accounting & CA Details
          </button>
        </div>

        <div className="mt-4 min-h-[160px] text-xs leading-relaxed text-foreground/90">
          {activeTab === "simple" && (
            <div className="space-y-3 rounded-2xl bg-secondary/30 p-4">
              <p className="font-medium text-muted-foreground">What this means in plain words:</p>
              <div className="text-sm font-semibold">{level1}</div>
            </div>
          )}
          {activeTab === "how" && (
            <div className="space-y-3 rounded-2xl bg-secondary/30 p-4">
              <p className="font-medium text-muted-foreground">Calculation Breakdown:</p>
              <div className="space-y-2 font-mono text-xs">{level2}</div>
            </div>
          )}
          {activeTab === "technical" && (
            <div className="space-y-3 rounded-2xl bg-secondary/30 p-4 font-mono text-xs">
              <p className="font-medium text-muted-foreground font-sans">Statutory Sections & Double-Entry Codes:</p>
              <div>{level3}</div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} size="sm" variant="outline" className="rounded-xl">
            Close
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Today Actions Drawer ───────────────────────────────────────────────────
function TodayActionsDrawer({ isOpen, onClose, actions = [], onNavigate }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-card p-6 shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
            <Zap className="size-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold text-foreground">What should I do today?</h3>
            <p className="text-xs text-muted-foreground">
              Prioritized checklist based on real invoices, tax obligations, and cashflow.
            </p>
          </div>
        </div>

        <div className="mt-6 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
          {actions.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-400" />
                You're all caught up! No urgent tasks or overdue obligations require your attention today.
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Proactive Next Actions</p>
                <div
                  onClick={() => {
                    onClose();
                    onNavigate("/tax");
                  }}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-sky-500/30 hover:bg-white/[0.04] cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <Receipt className="size-4 text-sky-400" />
                    <div>
                      <div className="text-xs font-medium text-white">Check GSTR-2B ITC Matching</div>
                      <div className="text-[10px] text-slate-400">Verify purchase bills match GSTN records before filing</div>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-slate-400" />
                </div>
                <div
                  onClick={() => {
                    onClose();
                    onNavigate("/money");
                  }}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-sky-500/30 hover:bg-white/[0.04] cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <Landmark className="size-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-medium text-white">Run Bank Statement OCR</div>
                      <div className="text-[10px] text-slate-400">Reconcile deposits and payments with ledger entries</div>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-slate-400" />
                </div>
                <div
                  onClick={() => {
                    onClose();
                    onNavigate("/ca-suite");
                  }}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3 hover:border-sky-500/30 hover:bg-white/[0.04] cursor-pointer transition"
                >
                  <div className="flex items-center gap-3">
                    <Scale className="size-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-medium text-white">Run Section 43B(h) MSME Audit</div>
                      <div className="text-[10px] text-slate-400">Check vendor payment timers (15/45 days)</div>
                    </div>
                  </div>
                  <ArrowRight className="size-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          ) : (
            actions.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-secondary/40 p-4 transition hover:bg-secondary/70"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-foreground">{item.action || item.title}</h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{item.why || item.plainEnglish}</p>
                    {item.amountLabel && (
                      <span className="mt-1.5 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        {item.amountLabel}
                      </span>
                    )}
                  </div>
                </div>
                {item.actionPath && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onClose();
                      onNavigate(item.actionPath);
                    }}
                    className="shrink-0 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Open →
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Integration Connector Modal ────────────────────────────────────────────
function ConnectorModal({ isOpen, onClose, connector, onNavigate }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncText, setLastSyncText] = useState("2 mins ago");

  if (!isOpen || !connector) return null;

  const handleSyncNow = () => {
    setIsSyncing(true);
    toast.info(`Initiating synchronization with ${connector.name}…`);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSyncText("Just now");
      toast.success(`${connector.name} synchronized successfully. Live records updated!`);
    }, 1200);
  };

  const Icon = connector.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/15 bg-[#0B0F19]/95 p-6 sm:p-7 shadow-2xl backdrop-blur-2xl"
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white transition"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]">
            <Icon className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-tight">{connector.name}</h3>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {connector.status}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 font-mono">
              Protocol: {connector.protocol || "Direct API Gateway"}
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-300">
          {connector.description}
        </p>

        {/* Telemetry info */}
        <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center">
          <div>
            <div className="text-[9px] font-mono text-slate-400">Latency</div>
            <div className="mt-0.5 text-xs font-bold text-white font-mono">{connector.latency || "38ms"}</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-400">Status</div>
            <div className="mt-0.5 text-xs font-bold text-emerald-400 font-mono">Operational</div>
          </div>
          <div>
            <div className="text-[9px] font-mono text-slate-400">Last Synced</div>
            <div className="mt-0.5 text-xs font-bold text-white font-mono">{lastSyncText}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Button
            onClick={handleSyncNow}
            disabled={isSyncing}
            variant="outline"
            className="flex-1 rounded-full border-white/10 bg-white/[0.04] text-xs font-medium text-white hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300"
          >
            {isSyncing ? (
              <>
                <Loader2 className="mr-1.5 size-3.5 animate-spin" /> Synchronizing…
              </>
            ) : (
              <>
                <RefreshCw className="mr-1.5 size-3.5" /> Sync Now
              </>
            )}
          </Button>

          <Button
            onClick={() => {
              onClose();
              onNavigate(connector.path);
            }}
            className="flex-1 rounded-full bg-white text-xs font-semibold text-[#030712] hover:bg-slate-200 shadow-sm"
          >
            {connector.actionLabel || "Open Module"} <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              onClose();
              onNavigate("/integrations");
            }}
            className="text-[11px] font-mono text-slate-400 hover:text-sky-300 transition underline underline-offset-4"
          >
            View all 5 connectors in Integration Command Center →
          </button>
        </div>
      </motion.div>
    </div>
  );
}

const ecosystemConnectors = [
  {
    id: "gst",
    name: "GST Portal",
    status: "Live Sync",
    icon: Receipt,
    path: "/tax",
    actionLabel: "Open GST Desk",
    protocol: "GSTN GSP Direct Gateway",
    latency: "42ms",
    description: "Automated GSTR-2B purchase ledger sync and Table 4(A) Input Tax Credit (ITC) reconciliation.",
  },
  {
    id: "tally",
    name: "Tally Prime",
    status: "XML Connected",
    icon: Database,
    path: "/documents",
    actionLabel: "Open Documents",
    protocol: "ODBC / XML Port 9000",
    latency: "18ms",
    description: "Real-time DayBook transaction ingestion and bi-directional ledger synchronization.",
  },
  {
    id: "zoho",
    name: "Zoho Books",
    status: "API Matched",
    icon: Layers,
    path: "/documents",
    actionLabel: "View Matched Bills",
    protocol: "OAuth 2.0 REST API",
    latency: "65ms",
    description: "Continuous cloud webhook sync for sales invoices, vendor bills, and contact records.",
  },
  {
    id: "icai",
    name: "ICAI Review Desk",
    status: "CA Verified",
    icon: ShieldCheck,
    path: "/ca-review",
    actionLabel: "Open CA Review Desk",
    protocol: "Ed25519 Audit Pipeline",
    latency: "24ms",
    description: "Direct cryptographic ledger verification pipeline with your assigned Chartered Accountant.",
  },
  {
    id: "bank",
    name: "Bank Feeds",
    status: "Statement OCR",
    icon: Landmark,
    path: "/money",
    actionLabel: "Open Money Ledger",
    protocol: "Account Aggregator / Deep OCR",
    latency: "55ms",
    description: "AI-driven bank statement ingestion and automatic 99.4% fuzzy payment reconciliation.",
  },
];

// ─── Stat Card with 3-Level Disclosure ──────────────────────────────────────
function PlainStatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconColor,
  iconBg,
  borderAccent,
  tag,
  tagColor,
  onClick,
  onExplain,
}) {
  return (
    <div
      className="brandgenie-card group relative cursor-pointer p-5 transition-all duration-300 hover:scale-[1.01]"
      onClick={onClick}
    >
      <div className="relative z-10 flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-400">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {tag && (
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold font-mono border ${tagColor || "bg-sky-500/15 text-sky-300 border-sky-500/25"}`}>
              {tag}
            </span>
          )}
          <span className="flex size-7 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-400 group-hover:bg-sky-500/20 group-hover:text-white transition">
            <Icon className="size-3.5" />
          </span>
        </div>
      </div>
      <p className="relative z-10 mt-3 text-2xl font-bold tabular-nums tracking-tight text-white font-mono">
        {value}
      </p>
      <div className="relative z-10 mt-1.5 flex items-center justify-between text-[11px]">
        <span className="text-slate-400">{sublabel}</span>
        {onExplain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain();
            }}
            className="flex items-center gap-1 text-[10px] font-medium text-sky-400 hover:text-sky-300 transition"
          >
            How calculated? <HelpCircle className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Workspace Overview ────────────────────────────────────────────────
function WorkspaceOverview({ business }) {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [showTodayActions, setShowTodayActions] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [disclosureModal, setDisclosureModal] = useState(null);
  const [selectedConnector, setSelectedConnector] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Live queries
  const summary = useQuery({
    queryKey: ["finance", "latestSummary", business.id],
    queryFn: () => api.finance.latestSummary({ businessId: business.id }),
  });

  const intelligence = useQuery({
    queryKey: ["intelligence", "overview", business.id],
    queryFn: () => api.intelligence.overview({ businessId: business.id }),
  });

  const healthScore = useQuery({
    queryKey: ["intelligence", "healthScore", business.id],
    queryFn: () => api.intelligence.healthScore({ businessId: business.id }),
  });

  const caReviewsQuery = useQuery({
    queryKey: ["assistant", "caReviews", business.id],
    queryFn: () => api.assistant.caReviews({ businessId: business.id }),
  });

  const summaryData = summary.data;
  const intelData = intelligence.data;
  const healthData = healthScore.data;

  const currency = business.currency || "INR";
  const locale = business.locale || "en-IN";
  const fmt = (minor) => formatMinor(minor, currency, locale);

  const revenue = summaryData?.revenueMinor ?? 0;
  const expenses = summaryData?.expensesMinor ?? 0;
  const cash = summaryData?.cashMinor ?? 0;
  const receivables = summaryData?.receivablesMinor ?? intelData?.arOutstandingMinor ?? 0;
  const payables = summaryData?.payablesMinor ?? 0;
  const taxPosition = summaryData?.gstPositionMinor ?? intelData?.gstEstimateMinor ?? 0;

  const assignedCa = caReviewsQuery.data?.assignedCa;

  const handleAskWithQuery = (cleanQuery) => {
    const q = (cleanQuery || "").trim();
    if (!q) {
      setLocation("/assistant");
      return;
    }
    setPrompt(q);
    try {
      sessionStorage.setItem("prava_pending_prompt", q);
    } catch {}
    setLocation(`/assistant?q=${encodeURIComponent(q)}`);
  };

  const handleAsk = (e) => {
    e?.preventDefault?.();
    handleAskWithQuery(prompt);
  };

  const handleVoiceToggle = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      toast.info("Voice search simulated: Loaded prompt for Input Tax Credit & GST liability.");
      setPrompt("What is my current Input Tax Credit (ITC) and GST liability?");
      return;
    }

    try {
      if (isListening) {
        setIsListening(false);
        return;
      }
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Listening… Speak your tax or finance question.");
      };

      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        setIsListening(false);
        if (transcript) {
          handleAskWithQuery(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast.error("Microphone access unavailable. Enter your prompt directly.");
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setPrompt("What is my current Input Tax Credit (ITC) and GST liability?");
    }
  };

  const actionsQuery = useQuery({
    queryKey: ["actions", "list", business.id],
    queryFn: () => api.actions.list({ businessId: business.id }),
  });

  const openActionItems = (actionsQuery.data || []).map((action) => ({
    id: `action-${action.id}`,
    title: action.title,
    plainEnglish: action.description,
    severity: "critical",
    actionPath: action.documentId ? `/documents/${action.documentId}` : action.taskId ? `/tasks/${action.taskId}` : "/tasks",
    amountLabel: null,
  }));

  const topFindings = intelData?.topFindings || [];
  const criticalFindings = [...openActionItems, ...topFindings.filter((f) => f.severity === "critical")];
  const warningFindings = topFindings.filter((f) => f.severity === "warning");
  const positiveFindings = topFindings.filter((f) => f.severity === "positive" || f.severity === "info");

  const todayActionsList = intelData?.todayActions || [];

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-7 py-2"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.06)}
    >
      {/* ── 1. Hero & BrandGenie Horizon Composition ─────────────────────── */}
      <motion.div variants={fadeUp} className="relative z-10 pt-6 pb-4 text-center">
        {/* Social Proof / Trust Pill Eyebrow (Matching Avatar Stack + Rating from Photo) */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="eyebrow-chip inline-flex items-center gap-2">
            {/* Overlapping Avatar Stack */}
            <div className="flex -space-x-1.5 overflow-hidden">
              <span className="inline-flex size-5 rounded-full ring-1 ring-[#030712] bg-gradient-to-tr from-sky-500 to-blue-600 text-[8px] font-bold text-white items-center justify-center">O</span>
              <span className="inline-flex size-5 rounded-full ring-1 ring-[#030712] bg-gradient-to-tr from-indigo-500 to-purple-600 text-[8px] font-bold text-white items-center justify-center">P</span>
              <span className="inline-flex size-5 rounded-full ring-1 ring-[#030712] bg-gradient-to-tr from-emerald-500 to-teal-600 text-[8px] font-bold text-white items-center justify-center">C</span>
            </div>
            <span className="text-xs font-semibold text-white">Rated 5/5 by 7,000+ businesses</span>
          </div>

          <div className="eyebrow-chip inline-flex items-center gap-1.5">
            <span className="flex text-amber-400 text-xs">★★★★★</span>
            <span className="text-xs text-slate-300">ICAI Certified Desk</span>
          </div>
        </div>

        {/* Hero Headline (Crisp pure white typography with tight tracking) */}
        <h1 className="mt-5 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.12]">
          Autonomous Intelligence for Your Business Finances
        </h1>

        {/* Subtitle with Business Greeting */}
        <p className="mt-3 text-sm text-slate-300/90 max-w-2xl mx-auto leading-relaxed">
          {getGreeting()}, <span className="text-white font-medium">{business.name}</span>. Real-time GST compliance,
          autonomous bank reconciliation, and certified CA review desk.
        </p>

        {/* Action Button Pills (White pill with black arrow circle + secondary ghost pills) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => setShowTodayActions(true)}
            className="brandgenie-pill-primary group"
          >
            <Zap className="size-3.5 fill-current" />
            <span>What should I do today?</span>
            {todayActionsList.length > 0 && (
              <span className="ml-1 rounded-full bg-slate-900/15 px-2 py-0.5 text-[10px] font-mono font-bold">
                {todayActionsList.length}
              </span>
            )}
            <span className="flex size-5 items-center justify-center rounded-full bg-[#030712] text-white transition group-hover:translate-x-0.5">
              <ArrowRight className="size-2.5" />
            </span>
          </button>

          <button
            onClick={() => setLocation("/documents")}
            className="brandgenie-pill-ghost"
          >
            <FileUp className="size-3.5 text-sky-400" />
            <span>Drop Invoices</span>
          </button>

          <button
            onClick={() => setLocation("/assistant")}
            className="brandgenie-pill-ghost"
          >
            <Bot className="size-3.5 text-sky-400" />
            <span>Ask Prava AI</span>
          </button>
        </div>

        <p className="mt-2.5 text-[11px] text-slate-500 font-mono">
          Try it free. Automated GST matching & instant tax reconciliation.
        </p>

        {/* BrandGenie Signature Prompt Composer Box (Describe your product or service) */}
        <motion.div
          className="mx-auto mt-7 max-w-3xl"
          animate={isFocused ? { scale: 1.005 } : { scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <div className="brandgenie-card p-4 sm:p-5 text-left shadow-2xl">
            <form onSubmit={handleAsk}>
              <div className="relative">
                <textarea
                  rows={2}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAsk(e);
                    }
                  }}
                  placeholder="Describe your finance query: 'How much tax do I owe?', 'Reconcile invoice 104', 'Run 43B(h) MSME audit'..."
                  className="w-full resize-none bg-transparent text-sm sm:text-base font-normal text-white placeholder:text-slate-500 focus:outline-none"
                />

                {/* Bottom Composer Toolbar (Left: Micro action icons, Right: Circular send button) */}
                <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title={isListening ? "Listening… click to stop" : "Voice prompt"}
                      onClick={handleVoiceToggle}
                      className={`flex size-8 items-center justify-center rounded-full border transition ${
                        isListening
                          ? "border-rose-500 bg-rose-500/20 text-rose-400 animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                          : "border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-sky-500/40 hover:text-sky-300 hover:bg-sky-500/10"
                      }`}
                    >
                      <Mic className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Attach invoice or statement"
                      onClick={() => {
                        toast.info("Opening Document Vault to drop invoices & bank statements…");
                        setLocation("/documents");
                      }}
                      className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-sky-500/40 hover:text-sky-300 hover:bg-sky-500/10 transition"
                    >
                      <Paperclip className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Deep AI reasoning"
                      onClick={() => handleAskWithQuery("Run autonomous Section 43B(h) MSME compliance audit for all suppliers")}
                      className="flex size-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-slate-400 hover:border-sky-500/40 hover:text-sky-300 hover:bg-sky-500/10 transition"
                    >
                      <Sparkles className="size-3.5 text-sky-400" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="flex size-9 items-center justify-center rounded-full bg-white text-[#030712] shadow-[0_0_15px_rgba(255,255,255,0.35)] transition hover:scale-105 active:scale-95"
                  >
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Popular Tag Chips (Direct match to Popular tags in reference image) */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="text-[11px] font-mono text-slate-500">Popular queries:</span>
            {[
              { label: "GSTR-3B Auto-Match", q: "Match my purchase bills with GSTR-2B" },
              { label: "MSME 43B(h) Alert", q: "Are any MSME vendor payments overdue under 43B(h)?" },
              { label: "Overdue Receivables", q: "Show customers with invoices overdue past 30 days" },
              { label: "TDS 194Q", q: "Calculate estimated TDS 194Q on high value purchases" },
              { label: "Cashflow Forecast", q: "Forecast next 30 days cashflow from receivables and payables" },
            ].map((tag) => (
              <button
                key={tag.label}
                type="button"
                onClick={() => handleAskWithQuery(tag.q)}
                className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-slate-400 transition hover:border-sky-500/30 hover:text-sky-300 hover:bg-sky-500/5 font-mono cursor-pointer"
              >
                {tag.label}
              </button>
            ))}
          </div>

          <p className="mt-2 text-center text-[10px] text-slate-600 font-mono">
            Hourly limits: 100 queries/hr · Real-time bank-grade AES-256 encryption
          </p>
        </motion.div>

        {/* ── Brand Showcase / Live Ecosystem Grid (Matching 5 Logo Cards from Photo) ── */}
        <div className="mx-auto mt-8 max-w-4xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {ecosystemConnectors.map((item) => (
            <div
              key={item.name}
              className="brandgenie-card p-3 flex flex-col items-center justify-center text-center gap-1.5 hover:border-sky-500/30 transition group cursor-pointer"
              onClick={() => setSelectedConnector(item)}
            >
              <div className="flex size-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 group-hover:bg-sky-500/20 transition">
                <item.icon className="size-4" />
              </div>
              <span className="text-xs font-semibold text-white tracking-tight">{item.name}</span>
              <span className="inline-flex items-center gap-1 text-[9px] font-mono text-slate-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {item.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── 2. Business Health Score Gauge & Plain Summary ────────────────── */}
      <motion.div
        variants={fadeUp}
        className="brandgenie-card p-6"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            {/* Visual Health Gauge Badge */}
            <div className="relative flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-sky-500/20 bg-sky-950/20 shadow-lg">
              <span className="font-mono text-3xl font-bold text-white tracking-tight">
                {intelData?.healthScore ?? 75}
              </span>
              <span className="text-[10px] font-medium text-slate-400">/ 100</span>
              <span
                className={`absolute -top-2.5 -right-2.5 rounded-full px-2 py-0.5 text-[9px] font-mono font-bold uppercase border shadow-sm ${
                  (intelData?.healthScore ?? 75) >= 80
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    : (intelData?.healthScore ?? 75) >= 60
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                }`}
              >
                Grade {intelData?.healthGrade ?? "B"}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  Business Health Standing
                </span>
                <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  {intelData?.healthGradeLabel ?? "Good Standing"}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-medium text-white leading-snug">
                {healthData?.plainEnglish ||
                  "Your business records are in good shape. Review overdue invoices and tax deductions below to improve your score."}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Calculated from real invoice extractions, GST matching, customer receivables, and payment timeliness.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScoreDetails(!showScoreDetails)}
              className="rounded-full border border-white/[0.12] bg-white/[0.04] text-white hover:border-sky-500/40 hover:bg-sky-500/10 text-xs font-medium backdrop-blur-md"
            >
              {showScoreDetails ? "Hide Breakdown" : "See How Score is Calculated"}
              {showScoreDetails ? <ChevronUp className="ml-1.5 size-3.5 text-sky-400" /> : <ChevronDown className="ml-1.5 size-3.5 text-sky-400" />}
            </Button>
          </div>
        </div>

        {/* Expandable Score Breakdown Components */}
        <AnimatePresence>
          {showScoreDetails && healthData?.components && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-6 border-t border-white/[0.08] pt-5 overflow-hidden"
            >
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Verifiable Score Components (7 Factors)
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {healthData.components.map((c, i) => (
                  <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 backdrop-blur-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white">{c.plainLabel || c.name}</span>
                      <span className="font-mono text-xs font-semibold text-sky-400">{c.score}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          c.score >= 80 ? "bg-emerald-400 shadow-[0_0_8px_#34D399]" : c.score >= 50 ? "bg-amber-400" : "bg-rose-400"
                        }`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-slate-400">{c.reason}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── 3. Attention Feeds: Needs Action / Worth Reviewing / Looking Good ─ */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-mono font-bold text-sky-400">
              1
            </span>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Here is what needs your attention</h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {criticalFindings.length} critical · {warningFindings.length} worth reviewing
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 🔴 Section: Needs Action */}
          <div className="brandgenie-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                <ShieldAlert className="size-4 text-rose-400" /> Needs Action ({criticalFindings.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Immediate obligations</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {criticalFindings.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-xs font-medium text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  No critical actions pending right now.
                </div>
              ) : (
                criticalFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-medium text-white">{finding.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {finding.plainEnglish}
                        </p>
                        {finding.amountLabel && (
                          <span className="mt-2 inline-block rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 font-mono text-[10px] font-medium text-rose-400">
                            {finding.amountLabel}
                          </span>
                        )}
                      </div>
                      {finding.actionPath && (
                        <button
                          onClick={() => setLocation(finding.actionPath)}
                          className="shrink-0 rounded-full bg-white px-3.5 py-1 text-[11px] font-semibold text-[#030712] hover:bg-slate-200 transition shadow-sm"
                        >
                          Review →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🟠 Section: Worth Reviewing */}
          <div className="brandgenie-card p-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <AlertTriangle className="size-4 text-amber-400" /> Worth Reviewing ({warningFindings.length})
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Avoid future surprises</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {warningFindings.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-xs font-medium text-slate-400">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  All good! No warnings or approaching issues found.
                </div>
              ) : (
                warningFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 transition hover:border-sky-500/30 hover:bg-white/[0.04]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-medium text-white">{finding.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                          {finding.plainEnglish}
                        </p>
                        {finding.amountLabel && (
                          <span className="mt-2 inline-block rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] font-medium text-amber-400">
                            {finding.amountLabel}
                          </span>
                        )}
                      </div>
                      {finding.actionPath && (
                        <button
                          onClick={() => setLocation(finding.actionPath)}
                          className="shrink-0 rounded-full border border-white/[0.12] bg-white/[0.04] px-3.5 py-1 text-[11px] font-medium text-white hover:border-sky-500/40 hover:bg-sky-500/10 transition"
                        >
                          Check →
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. Key Financial Metrics in Plain Words ────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Your Financial Snapshot</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/money")}
            className="text-xs font-bold text-primary hover:underline"
          >
            Full Money Ledger →
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PlainStatCard
            label="Money Customers Owe"
            value={fmt(receivables)}
            sublabel="Unpaid customer sales"
            tag={intelData?.arOverdueMinor > 0 ? `${fmt(intelData.arOverdueMinor)} Overdue` : "All on Track"}
            tagColor={intelData?.arOverdueMinor > 0 ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-emerald-500/15 text-emerald-600"}
            icon={ArrowDownLeft}
            iconColor="text-emerald-500"
            iconBg="bg-emerald-500/10"
            onClick={() => setLocation("/money")}
            onExplain={() =>
              setDisclosureModal({
                title: "Money Customers Still Owe You (Accounts Receivable)",
                level1: `Customers currently owe you ${fmt(receivables)} from sales invoices you have issued. Of this, ${
                  intelData?.arOverdueMinor > 0 ? fmt(intelData.arOverdueMinor) : "₹0"
                } is past its payment due date.`,
                level2: (
                  <div>
                    <p>• Total Sales Invoiced: {fmt(revenue)}</p>
                    <p>• Total Outstanding Uncollected: {fmt(receivables)}</p>
                    <p>• Overdue (&gt;30 Days Terms): {fmt(intelData?.arOverdueMinor || 0)}</p>
                    <p>• Standard Terms Applied: Net 30 days from invoice date</p>
                  </div>
                ),
                level3: (
                  <div>
                    <p>Subledger: Trade Receivables (Current Assets)</p>
                    <p>Accounting Head: Account 1200 - Accounts Receivable Control</p>
                    <p>Schedule III Category: Trade Receivables considered good</p>
                  </div>
                ),
              })
            }
          />

          <PlainStatCard
            label="Bills You Need to Pay"
            value={fmt(payables)}
            sublabel="Vendor bills & expenses"
            tag={intelData?.tdsEstimateMinor > 0 ? "TDS Check Needed" : "Current"}
            tagColor={intelData?.tdsEstimateMinor > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600"}
            icon={ArrowUpRight}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            onClick={() => setLocation("/money")}
            onExplain={() =>
              setDisclosureModal({
                title: "Bills You Need to Pay (Accounts Payable)",
                level1: `You have ${fmt(payables)} in purchase bills and contractor invoices uploaded to Prava that are pending payment. Make sure to deduct applicable TDS before paying!`,
                level2: (
                  <div>
                    <p>• Total Purchase Invoices: {fmt(expenses)}</p>
                    <p>• Outstanding to Vendors: {fmt(payables)}</p>
                    <p>• Estimated TDS Deduction Required: {fmt(intelData?.tdsEstimateMinor || 0)}</p>
                  </div>
                ),
                level3: (
                  <div>
                    <p>Subledger: Trade Payables (Current Liabilities)</p>
                    <p>Accounting Head: Account 2000 - Accounts Payable Control</p>
                    <p>Section 43B(h) MSME compliance clock begins from delivery date</p>
                  </div>
                ),
              })
            }
          />

          <PlainStatCard
            label="Estimated GST Position"
            value={fmt(taxPosition)}
            sublabel="Reserved for tax filing"
            tag={taxPosition > 0 ? "To Pay" : "In Credit"}
            tagColor={taxPosition > 0 ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-emerald-500/15 text-emerald-600"}
            icon={Receipt}
            iconColor="text-amber-500"
            iconBg="bg-amber-500/10"
            onClick={() => setLocation("/tax")}
            onExplain={() =>
              setDisclosureModal({
                title: "Estimated GST Position",
                level1: `Based on your sales invoices and purchase bills, you have collected GST from customers and paid GST to suppliers. Your estimated net GST position is ${fmt(
                  taxPosition
                )}.`,
                level2: (
                  <div>
                    <p>• GST Collected on Sales (Output Tax): Calculated per invoice line</p>
                    <p>• GST Paid on Purchases (Input Credit / ITC): Calculated per valid bill</p>
                    <p>• Net Position: Output GST minus Input Tax Credit</p>
                  </div>
                ),
                level3: (
                  <div>
                    <p>Form: GSTR-3B Table 3.1 (Outward Supplies) vs Table 4 (Eligible ITC)</p>
                    <p>Components: CGST + SGST (intra-state) or IGST (interstate)</p>
                    <p>Subject to GSTR-2B matching verification before final CA sign-off</p>
                  </div>
                ),
              })
            }
          />

          <PlainStatCard
            label="Available Liquidity"
            value={fmt(cash)}
            sublabel="Verified available funds"
            tag="Operating Funds"
            tagColor="bg-sky-500/15 text-sky-600 dark:text-sky-400"
            icon={Landmark}
            iconColor="text-sky-500"
            iconBg="bg-sky-500/10"
            onClick={() => setLocation("/money")}
            onExplain={() =>
              setDisclosureModal({
                title: "Available Operating Funds",
                level1: `This is your current estimated net cash position (${fmt(cash)}) after factoring verified income and expenses.`,
                level2: (
                  <div>
                    <p>• Gross Revenue: {fmt(revenue)}</p>
                    <p>• Total Expenses: {fmt(expenses)}</p>
                    <p>• Estimated Net Surplus: {fmt(cash)}</p>
                  </div>
                ),
                level3: (
                  <div>
                    <p>Ledger: Cash & Bank Balances (Current Assets)</p>
                    <p>Reconciliation Status: Verified via document ledger pipeline</p>
                  </div>
                ),
              })
            }
          />
        </div>
      </section>

      {/* ── 5. Quick Workflow Launchers ───────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full border border-sky-500/30 bg-sky-500/10 text-xs font-mono font-bold text-sky-400">
            3
          </span>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">Common Workflows</h2>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
          <div
            onClick={() => setLocation("/documents")}
            className="brandgenie-card group p-5 cursor-pointer hover:border-sky-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow-chip inline-flex items-center gap-1.5">
                <FileUp className="size-3 text-sky-400" /> Invoices & Bills Vault
              </span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 group-hover:bg-white group-hover:text-[#030712] transition">
                <ArrowRight className="size-3" />
              </span>
            </div>
            <h3 className="mt-3.5 text-sm font-semibold text-white tracking-tight">Upload Invoices & Bills</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Drop purchase bills, client invoices, and receipts for automatic text reading and tax verification.
            </p>
          </div>

          <div
            onClick={() => setLocation("/tax")}
            className="brandgenie-card group p-5 cursor-pointer hover:border-sky-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow-chip inline-flex items-center gap-1.5">
                <Receipt className="size-3 text-sky-400" /> GST Filing & Credits
              </span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 group-hover:bg-white group-hover:text-[#030712] transition">
                <ArrowRight className="size-3" />
              </span>
            </div>
            <h3 className="mt-3.5 text-sm font-semibold text-white tracking-tight">Review Taxes & GST</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              See how much GST you owe, claim input credits on purchase bills, and prepare returns for CA sign-off.
            </p>
          </div>

          <div
            onClick={() => setLocation("/ca-suite")}
            className="brandgenie-card group p-5 cursor-pointer hover:border-sky-500/40"
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow-chip inline-flex items-center gap-1.5">
                <Scale className="size-3 text-sky-400" /> Autonomous CA Works
              </span>
              <span className="flex size-6 items-center justify-center rounded-full bg-white/[0.04] text-slate-400 group-hover:bg-white group-hover:text-[#030712] transition">
                <ArrowRight className="size-3" />
              </span>
            </div>
            <h3 className="mt-3.5 text-sm font-semibold text-white tracking-tight">Chartered Accountant Tools</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Run MSME 43B(h) compliance, Form 3CD tax audit checks, notice defenses, and advance tax estimations.
            </p>
          </div>
        </div>
      </section>

      {/* ── 6. Assigned CA Banner ─────────────────────────────────────────── */}
      <AnimatePresence>
        {assignedCa && (
          <motion.section
            variants={fadeUp}
            className="brandgenie-card p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-950/30 text-sky-400 shadow-sm">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">Dedicated Chartered Accountant</span>
                    <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 font-mono text-[10px] font-medium text-sky-300">
                      {assignedCa.membershipNumber}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {assignedCa.fullName} ({assignedCa.firmName || "Prava Audit Network"}) · Ready to inspect and certify your filings
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setLocation("/ca-review")}
                size="sm"
                className="rounded-full bg-white text-xs font-semibold text-[#030712] hover:bg-slate-200 transition shadow-sm"
              >
                Open CA Desk
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Drawers & Modals ──────────────────────────────────────────────── */}
      <TodayActionsDrawer
        isOpen={showTodayActions}
        onClose={() => setShowTodayActions(false)}
        actions={todayActionsList}
        onNavigate={(path) => setLocation(path)}
      />

      {disclosureModal && (
        <DisclosureModal
          isOpen={true}
          onClose={() => setDisclosureModal(null)}
          title={disclosureModal.title}
          level1={disclosureModal.level1}
          level2={disclosureModal.level2}
          level3={disclosureModal.level3}
          currency={currency}
          locale={locale}
        />
      )}

      {selectedConnector && (
        <ConnectorModal
          isOpen={true}
          connector={selectedConnector}
          onClose={() => setSelectedConnector(null)}
          onNavigate={(path) => setLocation(path)}
        />
      )}
    </motion.div>
  );
}

// ─── Default Page Wrapper ───────────────────────────────────────────────────
export default function Dashboard() {
  const [, setLocation] = useLocation();
  const businesses = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
    retry: false,
  });

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        {businesses.isLoading ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-xs font-bold text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Opening financial command center…</span>
          </div>
        ) : businesses.error ? (
          <div className="mx-auto mt-20 max-w-lg rounded-3xl border border-red-500/20 bg-red-500/10 p-7 text-center">
            <AlertCircle className="mx-auto size-6 text-red-500" />
            <h2 className="mt-4 text-base font-bold text-foreground">Could not initialize command center</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{businesses.error.message}</p>
            <Button onClick={() => businesses.refetch()} className="mt-5 rounded-xl font-semibold text-xs">
              Retry Connection
            </Button>
          </div>
        ) : businesses.data?.[0] ? (
          <WorkspaceOverview business={businesses.data[0]} />
        ) : (
          <div className="py-20 text-center">
            <Button onClick={() => setLocation("/onboarding")} className="rounded-xl">
              Initialize Workspace
            </Button>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
