import { TiltCard } from "@/components/TiltCard";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  fadeUp,
  listContainer,
  listItem,
  pageVariants,
  scaleIn,
  staggerContainer,
  viewportOnce,
} from "@/lib/animations";
import { formatMinorAmount, profileForCountry } from "@shared/locale";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileUp,
  Landmark,
  Loader2,
  Plus,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useLocation } from "wouter";

function formatMinor(minor: number, currency: string, locale: string) {
  return formatMinorAmount(minor, currency, locale);
}

function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  iconColor,
  iconBg,
  borderAccent,
  textAccent,
  onClick,
  index,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  borderAccent?: string;
  textAccent?: string;
  onClick?: () => void;
  index: number;
}) {
  return (
    <motion.div variants={fadeUp} custom={index}>
      <TiltCard
        className={`cursor-pointer rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-300 ${
          borderAccent
            ? `${borderAccent} bg-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.75)] dark:bg-[#090d16]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`
            : "border-white/60 bg-white/35 shadow-[0_8px_24px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.75)] hover:bg-white/50 hover:border-white/80 hover:shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-white/[0.12] dark:bg-[#090d16]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        }`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-slate-900 dark:text-slate-300">
            {label}
          </span>
          <span className={`flex size-7 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`size-3.5 ${iconColor}`} />
          </span>
        </div>
        <p className={`prava-mono mt-3 text-xl sm:text-2xl font-bold tabular-nums tracking-tight truncate ${textAccent ?? "text-slate-900 dark:text-white"}`}>
          {value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-800 dark:text-slate-400">{sublabel}</p>
      </TiltCard>
    </motion.div>
  );
}

function EmptyOverview({ onCreateWorkspace }: { onCreateWorkspace: () => void }) {
  return (
    <motion.div
      className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-4xl flex-col justify-center py-10"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.1)}
    >
      <motion.div variants={scaleIn} className="prava-panel p-8 sm:p-12 text-center">
        <motion.span variants={fadeUp} className="prava-tag">Initialize Operating System</motion.span>
        <motion.h1
          variants={fadeUp}
          className="font-['Playfair_Display',Georgia,serif] mt-6 text-4xl sm:text-5xl font-normal tracking-tight text-slate-900 dark:text-white"
        >
          Create the command center <em className="italic font-normal">your business</em> will grow into.
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-slate-900 dark:text-slate-300 font-medium"
        >
          A Prava workspace isolates your financial documents, double-entry ledger, statutory tax calculations, and dedicated Chartered Accountant verification.
        </motion.p>

        <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={onCreateWorkspace}
            size="lg"
            className="rounded-xl bg-slate-900 px-7 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
          >
            <Plus className="mr-2 size-4" />
            Initialize Workspace
          </Button>
          <a
            href="/#pipeline"
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/60 bg-white/50 px-5 text-xs font-bold text-slate-900 shadow-sm transition hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
          >
            Explore System Architecture →
          </a>
        </motion.div>

        <motion.div variants={staggerContainer(0.1)} className="mt-12 grid gap-4 sm:grid-cols-3 text-left">
          {[
            {
              icon: ShieldCheck,
              color: "text-emerald-500 dark:text-emerald-400",
              title: "Isolated Entity Context",
              desc: "Business settings, currency profiles, and document permissions stay strictly scoped.",
            },
            {
              icon: Receipt,
              color: "text-sky-500 dark:text-sky-400",
              title: "Automated Tax Tracking",
              desc: "Real-time calculation of GST / Sales Tax reserves to prevent end-of-quarter surprises.",
            },
            {
              icon: UserCheck,
              color: "text-purple-500 dark:text-purple-400",
              title: "In-House CA Review",
              desc: "Qualified Chartered Accountants verify your returns before official submission.",
            },
          ].map((card, i) => (
            <motion.div key={i} variants={fadeUp}>
              <TiltCard className="prava-card p-4">
                <card.icon className={`size-5 ${card.color}`} />
                <h4 className="mt-3 text-xs font-bold text-slate-900 dark:text-white">{card.title}</h4>
                <p className="mt-1 text-[11px] text-slate-900 dark:text-slate-300 font-medium leading-relaxed">{card.desc}</p>
              </TiltCard>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function WorkspaceOverview({
  business,
}: {
  business: {
    id: number;
    name: string;
    currency: string;
    locale: string;
    taxSystem: string;
    timezone: string;
    country: string;
  };
}) {
  const summary = trpc.finance.latestSummary.useQuery({ businessId: business.id });
  const actions = trpc.actions.list.useQuery({ businessId: business.id });
  const tasks = trpc.tasks.list.useQuery({ businessId: business.id });
  const caReviewsQuery = trpc.assistant.caReviews.useQuery({ businessId: business.id });
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const summaryData = summary.data;
  const revenue = summaryData?.revenueMinor ?? 0;
  const expenses = summaryData?.expensesMinor ?? 0;
  const cash = summaryData?.cashMinor ?? 0;
  const receivables = summaryData?.receivablesMinor ?? 0;
  const payables = summaryData?.payablesMinor ?? 0;
  const taxPosition = summaryData?.gstPositionMinor ?? 0;

  const fmt = (minor: number) => formatMinor(minor, business.currency, business.locale);

  const handleAsk = (e: React.FormEvent) => {
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

  const assignedCa = caReviewsQuery.data?.assignedCa;

  const launchItems = [
    { icon: Sparkles, title: "Ask Prava AI Co-Pilot", desc: "Get instant plain-language answers grounded in your active ledger.", path: "/assistant", highlight: true },
    { icon: FileUp, title: "Upload Invoices & Bills", desc: "Sub-second OCR extracts vendor IDs, GSTINs, and line items.", path: "/documents" },
    { icon: Receipt, title: `Prepare ${business.taxSystem} Return`, desc: "Calculate net tax liability, match 2B credits, and ready for CA.", path: "/tax" },
    { icon: WalletCards, title: "Income & Expense Ledger", desc: "Inspect customer receivables and pending vendor payables.", path: "/money" },
    { icon: UserCheck, title: "CA Verification Desk", desc: "Track reviews by your assigned ICAI-certified accountant.", path: "/ca-review" },
    { icon: Landmark, title: "Cash Reconciliation", desc: "Stage monthly bank statements and reconcile payments.", path: "/tasks" },
  ];

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-8 py-2"
      initial="hidden"
      animate="visible"
      variants={staggerContainer(0.06)}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp} className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/35 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl dark:border-white/[0.12] dark:bg-[#090d16]/85 dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {/* Animated gradient orb */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-gradient-to-br from-sky-400/10 via-purple-400/5 to-transparent blur-3xl dark:from-sky-400/[0.08]" />
        <div className="pointer-events-none absolute -left-10 bottom-0 size-48 rounded-full bg-gradient-to-tr from-emerald-400/10 to-transparent blur-3xl dark:from-emerald-400/[0.06]" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="prava-live-beacon" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-slate-900 dark:text-slate-300">
                TELEMETRY ACTIVE · {business.name}
              </span>
            </div>
            <h1 className="font-['Playfair_Display',Georgia,serif] mt-2 text-3xl sm:text-4xl font-normal tracking-tight text-slate-900 dark:text-white">
              Business <em className="italic font-normal">Command Center</em>
            </h1>
            <p className="mt-1.5 text-xs font-semibold text-slate-800 dark:text-slate-300">
              Operating in {business.country} ({business.currency}) · Tax System: {business.taxSystem} · Reconciled & Ledger-Verified
            </p>
          </div>

          <motion.div variants={scaleIn} className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setLocation("/assistant")}
              size="sm"
              className="rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Sparkles className="mr-1.5 size-3.5" />
              Ask Prava AI
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/documents")}
              className="rounded-xl border-white/60 bg-white/40 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white/60 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            >
              <FileUp className="mr-1.5 size-3.5 text-sky-500 dark:text-sky-400" />
              Drop Invoices
            </Button>
          </motion.div>
        </div>

        {/* AI Query Bar */}
        <motion.form
          onSubmit={handleAsk}
          className="relative mt-6"
          animate={isFocused ? { scale: 1.01 } : { scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <div className={`flex items-center gap-3 rounded-xl border p-2 backdrop-blur-xl transition-all duration-300 ${
            isFocused
              ? "border-white/80 bg-white/60 shadow-lg shadow-amber-500/10 ring-2 ring-white/60 dark:border-white/30 dark:bg-black/60 dark:shadow-none dark:ring-white/10"
              : "border-white/50 bg-white/30 dark:border-white/10 dark:bg-black/40"
          }`}>
            <motion.div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/50 text-slate-700 dark:bg-white/10 dark:text-white"
              animate={isFocused ? { rotate: [0, -10, 10, 0] } : {}}
              transition={{ duration: 0.4 }}
            >
              <Bot className="size-4" />
            </motion.div>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Ask Prava anything (e.g. 'How much did I spend on marketing this month?', 'Are any client invoices overdue?')"
              className="flex-1 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-700 outline-none dark:text-white dark:placeholder:text-slate-400"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
            >
              <Send className="mr-1 size-3" />
              Query
            </Button>
          </div>
        </motion.form>
      </motion.div>

      {/* ── Financial Telemetry ──────────────────────────────────────── */}
      <section className="space-y-4">
        <motion.div variants={fadeUp} className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <motion.span
              className="flex size-6 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-bold text-slate-800 dark:border-white/15 dark:bg-white/10 dark:text-white"
              whileHover={{ scale: 1.2, rotate: 10 }}
            >
              1
            </motion.span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">What is happening in your business?</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/money")} className="text-xs font-bold text-slate-900 hover:text-black dark:text-slate-200 dark:hover:text-white">
            Full Money Ledger →
          </Button>
        </motion.div>

        <motion.div
          className="grid gap-4 sm:grid-cols-2 md:grid-cols-3"
          variants={staggerContainer(0.07)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          <StatCard label="Money In (Revenue)" value={fmt(revenue)} sublabel="Verified double-entry earnings" icon={TrendingUp} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-500/10" onClick={() => setLocation("/money")} index={0} />
          <StatCard label="Money Out (Expenses)" value={fmt(expenses)} sublabel="Operating costs & vendor bills" icon={TrendingDown} iconColor="text-red-500 dark:text-red-400" iconBg="bg-red-500/10" onClick={() => setLocation("/money")} index={1} />
          <StatCard label="Available Liquidity" value={fmt(cash)} sublabel="Bank balances & verified funds" icon={Landmark} iconColor="text-sky-600 dark:text-sky-400" iconBg="bg-sky-500/10" onClick={() => setLocation("/money")} index={2} />
          <StatCard label="Money Owed To You" value={fmt(receivables)} sublabel="Unpaid customer invoices" icon={ArrowDownLeft} iconColor="text-emerald-600 dark:text-emerald-400" iconBg="bg-emerald-500/10" onClick={() => setLocation("/money")} index={3} />
          <StatCard label="Money You Owe" value={fmt(payables)} sublabel="Pending supplier bills" icon={ArrowUpRight} iconColor="text-amber-500 dark:text-amber-400" iconBg="bg-amber-500/10" onClick={() => setLocation("/money")} index={4} />
          <StatCard
            label={`Estimated ${business.taxSystem}`}
            value={fmt(taxPosition)}
            sublabel="Reserved for statutory filing"
            icon={Receipt}
            iconColor="text-amber-600 dark:text-amber-400"
            iconBg="bg-amber-500/10"
            borderAccent="border-amber-500/30 hover:border-amber-500/60"
            textAccent="text-amber-600 dark:text-amber-400"
            onClick={() => setLocation("/tax")}
            index={5}
          />
        </motion.div>
      </section>

      {/* ── Action Center ───────────────────────────────────────────── */}
      <section className="space-y-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2.5">
            <motion.span
              className="flex size-6 items-center justify-center rounded-full border border-amber-400/40 bg-amber-500/10 text-xs font-bold text-amber-600 dark:text-amber-400"
              whileHover={{ scale: 1.2, rotate: -10 }}
            >
              2
            </motion.span>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">What needs your attention?</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setLocation("/tasks")} className="text-xs font-bold text-slate-900 hover:text-black dark:text-slate-200 dark:hover:text-white">
            All Workflows ({tasks.data?.length || 0}) →
          </Button>
        </motion.div>

        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="prava-panel p-5"
        >
          {actions.isLoading ? (
            <div className="flex items-center py-6 text-xs font-bold text-slate-900 dark:text-slate-400">
              <Loader2 className="mr-2 size-4 animate-spin text-slate-900 dark:text-white" />
              Scanning active tasks and documents…
            </div>
          ) : actions.error ? (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-semibold text-red-600 dark:text-red-300">
              Action items could not be loaded.
            </div>
          ) : actions.data?.length ? (
            <motion.div
              className="space-y-3"
              variants={listContainer}
              initial="hidden"
              animate="visible"
            >
              <AnimatePresence>
                {actions.data.slice(0, 4).map((action) => (
                  <motion.button
                    key={action.id}
                    variants={listItem}
                    layout
                    onClick={() => setLocation(action.documentId ? `/documents/${action.documentId}` : action.taskId ? `/tasks/${action.taskId}` : "/tasks")}
                    className="flex w-full items-start justify-between rounded-xl border border-white/50 bg-white/35 backdrop-blur-xl p-4 text-left shadow-sm transition hover:border-white/80 hover:bg-white/55 hover:shadow-md dark:border-white/[0.06] dark:bg-[#0A0F16] dark:hover:border-white/20 dark:hover:bg-[#0E1520]"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-start gap-3.5">
                      <motion.div
                        className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        whileHover={{ rotate: [0, -15, 15, 0] }}
                        transition={{ duration: 0.4 }}
                      >
                        <AlertCircle className="size-4" />
                      </motion.div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">{action.title}</h4>
                        <p className="mt-0.5 text-[11px] font-semibold text-slate-900 dark:text-slate-300 leading-relaxed">
                          {action.description}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-slate-900 dark:text-white pl-3 hover:underline">
                      {action.documentId ? "Verify Document" : "Open Task"} →
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 rounded-xl border border-dashed border-slate-400/60 p-5 text-xs font-bold text-slate-900 dark:border-white/10 dark:text-slate-400"
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              >
                <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              </motion.div>
              <span>All clear! No pending document discrepancies or missing return records.</span>
            </motion.div>
          )}
        </motion.div>
      </section>

      {/* ── Launch Grid ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="flex items-center gap-2.5"
        >
          <motion.span
            className="flex size-6 items-center justify-center rounded-full border border-sky-400/40 bg-sky-500/10 text-xs font-bold text-sky-600 dark:text-sky-400"
            whileHover={{ scale: 1.2, rotate: 10 }}
          >
            3
          </motion.span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">What can Prava help you do?</h2>
        </motion.div>

        <motion.div
          className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3"
          variants={staggerContainer(0.08)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
        >
          {launchItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div key={idx} variants={fadeUp}>
                <TiltCard
                  className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 backdrop-blur-2xl transition-all duration-200 ${
                    item.highlight
                      ? "border-white/70 bg-white/45 text-slate-900 shadow-[0_8px_24px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.85)] hover:bg-white/60 dark:border-white/20 dark:bg-white/[0.06] dark:text-white"
                      : "prava-card text-slate-900 dark:text-white"
                  }`}
                  onClick={() => setLocation(item.path)}
                >
                  <div>
                    <motion.span
                      className={`flex size-9 items-center justify-center rounded-xl ${
                        item.highlight
                          ? "bg-slate-900 text-white dark:bg-white dark:text-black"
                          : "bg-slate-100 text-slate-700 dark:bg-white/[0.05] dark:text-slate-300"
                      }`}
                      whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Icon className="size-4" />
                    </motion.span>
                    <p className="mt-3.5 text-xs font-bold text-slate-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-800 dark:text-slate-300">{item.desc}</p>
                  </div>
                  <span className="mt-4 inline-flex items-center text-xs font-bold text-slate-900 dark:text-white hover:underline">
                    Launch Workflow →
                  </span>
                </TiltCard>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* ── CA Banner ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {assignedCa && (
          <motion.section
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            className="prava-panel p-5 border border-purple-400/20 bg-gradient-to-r from-purple-500/[0.05] to-transparent"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400"
                  animate={{ boxShadow: ["0 0 0 0 rgba(168,85,247,0.3)", "0 0 0 12px rgba(168,85,247,0)", "0 0 0 0 rgba(168,85,247,0)"] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <UserCheck className="size-5" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Assigned Chartered Accountant</span>
                    <span className="rounded bg-purple-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-purple-700 dark:text-purple-300">
                      {assignedCa.membershipNumber}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-slate-900 dark:text-slate-300">
                    {assignedCa.fullName} ({assignedCa.firmName || "Prava Audit Network"}) · Ready for statutory sign-offs
                  </p>
                </div>
              </div>
              <Button onClick={() => setLocation("/ca-review")} size="sm" className="rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 shadow-sm">
                Open CA Desk
              </Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        {businesses.isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-xs font-bold text-slate-900 dark:text-slate-400"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Loader2 className="size-6 text-slate-900 dark:text-white" />
            </motion.div>
            <span>Synchronizing business command center…</span>
          </motion.div>
        ) : businesses.error ? (
          <motion.div
            key="error"
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="mx-auto mt-20 max-w-lg rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center"
          >
            <AlertCircle className="mx-auto size-6 text-red-500 dark:text-red-400" />
            <h2 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Could not initialize command center</h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{businesses.error.message}</p>
            <Button onClick={() => businesses.refetch()} className="mt-5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-black font-semibold text-xs">
              Retry Telemetry Link
            </Button>
          </motion.div>
        ) : businesses.data?.[0] ? (
          <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <WorkspaceOverview business={businesses.data[0]} />
          </motion.div>
        ) : (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
            <EmptyOverview onCreateWorkspace={() => setLocation("/onboarding")} />
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
