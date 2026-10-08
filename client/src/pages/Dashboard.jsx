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
  ExternalLink,
  FileText,
  FileUp,
  HelpCircle,
  Info,
  Landmark,
  Loader2,
  Plus,
  Receipt,
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
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="mx-auto mb-2 size-6 text-emerald-500" />
              You're all caught up! No urgent tasks or overdue obligations require your attention today.
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
                    <h4 className="text-xs font-bold text-foreground">{item.action}</h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{item.why}</p>
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
    <TiltCard
      className={`relative cursor-pointer rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-300 ${
        borderAccent
          ? `${borderAccent} bg-white/40 shadow-sm dark:bg-[#090d16]/85`
          : "border-white/60 bg-white/40 shadow-sm hover:border-white/80 dark:border-white/[0.12] dark:bg-[#090d16]/85"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-800 dark:text-slate-300">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          {tag && (
            <span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold font-mono ${tagColor || "bg-amber-500/15 text-amber-500"}`}>
              {tag}
            </span>
          )}
          <span className={`flex size-7 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`size-3.5 ${iconColor}`} />
          </span>
        </div>
      </div>
      <p className="prava-mono mt-3 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white truncate">
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-slate-700 dark:text-slate-400">{sublabel}</span>
        {onExplain && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExplain();
            }}
            className="flex items-center gap-1 text-[10px] font-bold text-sky-600 hover:underline dark:text-sky-400"
          >
            How calculated? <HelpCircle className="size-3" />
          </button>
        )}
      </div>
    </TiltCard>
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

  const handleAsk = (e) => {
    e.preventDefault();
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setLocation("/assistant");
    } else {
      try {
        sessionStorage.setItem("prava_pending_prompt", cleanPrompt);
      } catch {}
      setLocation(`/assistant?q=${encodeURIComponent(cleanPrompt)}`);
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
      {/* ── 1. Header & Personal Greeting ─────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#090d16]/85"
      >
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-gradient-to-br from-sky-400/10 via-purple-400/5 to-transparent blur-3xl dark:from-sky-400/[0.08]" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="prava-live-beacon" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-800 dark:text-slate-300">
                FINANCIAL HEALTH DESK · {business.name}
              </span>
            </div>
            <h1 className="mt-2 font-serif text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              {getGreeting()}, <em className="italic font-normal">{business.name}</em> 👋
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              Here is what needs your attention today, calculated from your verified invoices and tax records.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary Attention Action Button */}
            <Button
              onClick={() => setShowTodayActions(true)}
              className="rounded-2xl bg-amber-500 px-4 text-xs font-bold text-black shadow-md hover:bg-amber-400 transition active:scale-95"
            >
              <Zap className="mr-1.5 size-4" />
              What should I do today?
              {todayActionsList.length > 0 && (
                <span className="ml-2 rounded-full bg-black/20 px-1.5 py-0.2 text-[10px]">
                  {todayActionsList.length}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/documents")}
              className="rounded-2xl border-white/60 bg-white/50 text-xs font-semibold text-slate-800 hover:bg-white/70 dark:border-white/10 dark:bg-white/[0.04] dark:text-white"
            >
              <FileUp className="mr-1.5 size-3.5 text-sky-500" />
              Drop Invoices
            </Button>
            <Button
              size="sm"
              onClick={() => setLocation("/assistant")}
              className="rounded-2xl bg-slate-900 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black"
            >
              <Bot className="mr-1.5 size-3.5" />
              Ask Prava
            </Button>
          </div>
        </div>

        {/* AI Natural Query Bar */}
        <motion.form
          onSubmit={handleAsk}
          className="relative mt-5"
          animate={isFocused ? { scale: 1.005 } : { scale: 1 }}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border p-2 backdrop-blur-xl transition ${
              isFocused
                ? "border-amber-500/60 bg-white/70 shadow-md ring-2 ring-amber-500/20 dark:border-white/30 dark:bg-black/60"
                : "border-white/60 bg-white/40 dark:border-white/10 dark:bg-black/40"
            }`}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/60 text-slate-700 dark:bg-white/10 dark:text-white">
              <Bot className="size-4 text-sky-500" />
            </div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask Prava anything in plain words: 'How much tax do I owe?', 'Are any clients late on payments?', 'Do I need to deduct TDS?'"
              className="flex-1 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-600 outline-none dark:text-white dark:placeholder:text-slate-400"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black"
            >
              <Send className="mr-1 size-3" />
              Ask
            </Button>
          </div>
        </motion.form>
      </motion.div>

      {/* ── 2. Business Health Score Gauge & Plain Summary ────────────────── */}
      <motion.div
        variants={fadeUp}
        className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-6 shadow-sm backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#090d16]/85"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            {/* Visual Health Gauge Badge */}
            <div className="relative flex size-20 shrink-0 flex-col items-center justify-center rounded-2xl border border-white/40 bg-white/60 shadow-inner dark:border-white/10 dark:bg-white/[0.05]">
              <span className="font-mono text-2xl font-black text-slate-900 dark:text-white">
                {intelData?.healthScore ?? 75}
              </span>
              <span className="text-[10px] font-bold text-muted-foreground">/ 100</span>
              <span
                className={`absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase shadow-sm ${
                  (intelData?.healthScore ?? 75) >= 80
                    ? "bg-emerald-500 text-white"
                    : (intelData?.healthScore ?? 75) >= 60
                    ? "bg-amber-500 text-black"
                    : "bg-red-500 text-white"
                }`}
              >
                Grade {intelData?.healthGrade ?? "B"}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
                  Business Health Standing
                </span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {intelData?.healthGradeLabel ?? "Good Standing"}
                </span>
              </div>
              <p className="mt-1.5 text-sm font-semibold text-foreground leading-snug">
                {healthData?.plainEnglish ||
                  "Your business records are in good shape. Review overdue invoices and tax deductions below to improve your score."}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Calculated from real invoice extractions, GST matching, customer receivables, and payment timeliness.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowScoreDetails(!showScoreDetails)}
              className="rounded-xl text-xs font-semibold"
            >
              {showScoreDetails ? "Hide Breakdown" : "See How Score is Calculated"}
              {showScoreDetails ? <ChevronUp className="ml-1.5 size-3.5" /> : <ChevronDown className="ml-1.5 size-3.5" />}
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
              className="mt-6 border-t border-border/60 pt-5 overflow-hidden"
            >
              <h4 className="text-xs font-bold text-muted-foreground font-mono uppercase tracking-wider">
                Verifiable Score Components (7 Factors)
              </h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {healthData.components.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-border/60 bg-secondary/30 p-3.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">{c.plainLabel || c.name}</span>
                      <span className="font-mono text-xs font-bold text-primary">{c.score}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${
                          c.score >= 80 ? "bg-emerald-500" : c.score >= 50 ? "bg-amber-500" : "bg-red-500"
                        }`}
                        style={{ width: `${c.score}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">{c.reason}</p>
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
            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Here is what needs your attention</h2>
          </div>
          <span className="text-xs text-muted-foreground">
            {criticalFindings.length} critical · {warningFindings.length} worth reviewing
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 🔴 Section: Needs Action */}
          <div className="rounded-3xl border border-red-500/25 bg-red-500/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-red-500/20">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 dark:text-red-400">
                <ShieldAlert className="size-4" /> 🔴 Needs Action ({criticalFindings.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Immediate obligations</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {criticalFindings.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  No critical actions pending right now.
                </div>
              ) : (
                criticalFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-red-500/20 bg-background/80 p-4 shadow-sm transition hover:border-red-500/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{finding.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {finding.plainEnglish}
                        </p>
                        {finding.amountLabel && (
                          <span className="mt-2 inline-block rounded-md bg-red-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-red-600 dark:text-red-400">
                            {finding.amountLabel}
                          </span>
                        )}
                      </div>
                      {finding.actionPath && (
                        <Button
                          size="sm"
                          onClick={() => setLocation(finding.actionPath)}
                          className="shrink-0 rounded-xl bg-red-600 text-[11px] font-semibold text-white hover:bg-red-700 shadow-sm"
                        >
                          Review →
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 🟠 Section: Worth Reviewing */}
          <div className="rounded-3xl border border-amber-500/25 bg-amber-500/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-4" /> 🟠 Worth Reviewing ({warningFindings.length})
              </span>
              <span className="text-[10px] text-muted-foreground">Avoid future surprises</span>
            </div>

            <div className="mt-3.5 space-y-3">
              {warningFindings.length === 0 ? (
                <div className="flex items-center gap-2 py-4 text-xs font-medium text-muted-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  All good! No warnings or approaching issues found.
                </div>
              ) : (
                warningFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="rounded-2xl border border-amber-500/20 bg-background/80 p-4 shadow-sm transition hover:border-amber-500/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-foreground">{finding.title}</h4>
                        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                          {finding.plainEnglish}
                        </p>
                        {finding.amountLabel && (
                          <span className="mt-2 inline-block rounded-md bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            {finding.amountLabel}
                          </span>
                        )}
                      </div>
                      {finding.actionPath && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLocation(finding.actionPath)}
                          className="shrink-0 rounded-xl text-[11px] font-semibold shadow-sm"
                        >
                          Check →
                        </Button>
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
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            3
          </span>
          <h2 className="text-base sm:text-lg font-bold text-foreground">Common Workflows</h2>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 md:grid-cols-3">
          <div
            onClick={() => setLocation("/documents")}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4.5 backdrop-blur-xl transition hover:border-sky-500/60 hover:bg-sky-500/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/20 px-2.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                <FileUp className="size-3" /> Invoices & Bills Vault
              </span>
              <ArrowRight className="size-4 text-sky-600 dark:text-sky-400 transition group-hover:translate-x-1" />
            </div>
            <h3 className="mt-2.5 text-sm font-bold text-foreground">Upload Invoices & Bills</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Drop purchase bills, client invoices, and receipts for automatic text reading and tax verification.
            </p>
          </div>

          <div
            onClick={() => setLocation("/tax")}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4.5 backdrop-blur-xl transition hover:border-emerald-500/60 hover:bg-emerald-500/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                <Receipt className="size-3" /> GST Filing & Credits
              </span>
              <ArrowRight className="size-4 text-emerald-600 dark:text-emerald-400 transition group-hover:translate-x-1" />
            </div>
            <h3 className="mt-2.5 text-sm font-bold text-foreground">Review Taxes & GST</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              See how much GST you owe, claim input credits on purchase bills, and prepare returns for CA sign-off.
            </p>
          </div>

          <div
            onClick={() => setLocation("/ca-suite")}
            className="group relative cursor-pointer overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4.5 backdrop-blur-xl transition hover:border-purple-500/60 hover:bg-purple-500/10 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/20 px-2.5 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-300">
                <Scale className="size-3" /> Autonomous CA Works
              </span>
              <ArrowRight className="size-4 text-purple-600 dark:text-purple-400 transition group-hover:translate-x-1" />
            </div>
            <h3 className="mt-2.5 text-sm font-bold text-foreground">Chartered Accountant Tools</h3>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
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
            className="rounded-3xl border border-purple-500/20 bg-gradient-to-r from-purple-500/[0.06] to-transparent p-5 backdrop-blur-xl"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-500 shadow-sm">
                  <UserCheck className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Dedicated Chartered Accountant</span>
                    <span className="rounded bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      {assignedCa.membershipNumber}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {assignedCa.fullName} ({assignedCa.firmName || "Prava Audit Network"}) · Ready to inspect and certify your filings
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setLocation("/ca-review")}
                size="sm"
                className="rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm"
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
