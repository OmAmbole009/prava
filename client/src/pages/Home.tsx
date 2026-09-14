import ThemeToggle from "@/components/ThemeToggle";
import { PravaMark } from "@/components/PravaMark";
import { Button } from "@/components/ui/button";
import { prefetchWorkspace, startLogin } from "@/const";
import { countryOptions, profileForCountry, type CountryCode } from "@shared/locale";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Cpu,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  FileUp,
  Globe,
  Layers,
  Lock,
  Receipt,
  RotateCw,
  Scale,
  ScanLine,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const INK = "#ffffff";
const avatars = [
  "linear-gradient(135deg, #f0abfc, #a855f7)",
  "linear-gradient(135deg, #fdba74, #ea580c)",
  "linear-gradient(135deg, #93c5fd, #2563eb)",
  "linear-gradient(135deg, #34d399, #059669)",
];

const heroSteps = [
  {
    n: "01",
    label: "Ingest Docs",
    desc: "Invoices, OCR & Bank Feeds",
    icon: <path d="M16 20v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />,
  },
  {
    n: "02",
    label: "Auto Bookkeeping",
    desc: "Ledgers & Double Entry",
    icon: (
      <>
        <rect x="3" y="4" width="14" height="10" rx="2" />
        <path d="M7 20h6M10 14v6" />
      </>
    ),
  },
  {
    n: "03",
    label: "Tax Positioning",
    desc: "GST, VAT & ITC Match",
    icon: <path d="M17 20v-2a4 4 0 0 0-3-3.87M11 20v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM15 4.5a3 3 0 0 1 0 5.8" />,
  },
  {
    n: "04",
    label: "CA Verification",
    desc: "Certified Statutory Audit",
    icon: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  },
];

const interactivePrompts = [
  {
    query: "How much did we spend on software & cloud this month?",
    answer: "You spent ₹1,42,800 across AWS, Google Workspace, and GitHub in August 2026. This is 8% lower than July due to server consolidation.",
    sources: ["AWS Tax Invoice #INV-88219", "Google Cloud Statement #90812"],
    category: "Expenses",
  },
  {
    query: "Are any customer invoices overdue for payment?",
    answer: "Apex Global Solutions has 1 overdue invoice (INV-042) for ₹3,40,000 due 6 days ago. 3 other invoices worth ₹8,90,000 are due next week.",
    sources: ["Sales Ledger 2026", "Bank Inflow Match"],
    category: "Receivables",
  },
  {
    query: "What is our estimated GST liability before the CA review?",
    answer: "Your estimated net GST payable is ₹1,42,000 (Output GST: ₹4,10,000 minus verified Input Tax Credit of ₹2,68,000). All 24 invoices are verified.",
    sources: ["GSTR-1 Draft Preparation", "GSTR-2B Inward Match"],
    category: "GST & Tax",
  },
];

export default function Home() {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("IN");
  const [activeStep, setActiveStep] = useState(0);
  const [activePromptIdx, setActivePromptIdx] = useState(0);
  const [customQuestion, setCustomQuestion] = useState("");
  const [customAnswer, setCustomAnswer] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"overview" | "tax" | "documents" | "ca">("overview");

  const profile = profileForCountry(selectedCountry);
  const begin = () => startLogin("/dashboard");

  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Hero scroll parallax transformations
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0.2]);
  const heroScale = useTransform(scrollYProgress, [0, 0.18], [1, 0.96]);
  const heroY = useTransform(scrollYProgress, [0, 0.18], [0, 60]);

  const handleCustomAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestion.trim()) return;
    setIsTyping(true);
    setCustomAnswer(null);
    setTimeout(() => {
      setIsTyping(false);
      setCustomAnswer(
        `Based on your verified ledger in ${profile.code}: "${customQuestion}" is traced across 12 recent transactions totalling ${profile.symbol}4,85,000. All source documents have been matched and verified by your assigned Chartered Accountant.`
      );
    }, 600);
  };

  const workflowStages = [
    {
      step: "01",
      tag: "Source Intake",
      title: "Document & Statement Extraction",
      description: "Drop PDFs, bank statements, and vendor invoices. Prava reads line items, GSTINs, and tax slabs in under 2 seconds without manual entry.",
      badge: "Sub-second AI OCR",
      color: "emerald",
      icon: FileUp,
    },
    {
      step: "02",
      tag: "Ledger Synthesis",
      title: "Automated Double-Entry Accounting",
      description: "Every invoice automatically generates categorized debit/credit accounting entries. Bank transactions are reconciled in real time.",
      badge: "Zero Manual Spreadsheets",
      color: "cyan",
      icon: Layers,
    },
    {
      step: "03",
      tag: "Tax Positioning",
      title: "GST, Sales Tax & ITC Reconciliation",
      description: "Computes tax liabilities, matches eligible input tax credits against government portals (GSTR-2B), and flags supplier discrepancies.",
      badge: "100% Deterministic Engine",
      color: "amber",
      icon: Receipt,
    },
    {
      step: "04",
      tag: "Audit Protocol",
      title: "In-House Chartered Accountant Audit",
      description: "A certified Chartered Accountant assigned to your business inspects drafts, validates high-value claims, and attaches an official observation stamp.",
      badge: "Statutory CA Verification",
      color: "purple",
      icon: UserCheck,
    },
    {
      step: "05",
      tag: "Execution",
      title: "Authorized 1-Click Submission & Growth",
      description: "You review the final CA-certified filing summary with complete confidence. One click securely files to statutory authorities.",
      badge: "Total Peace of Mind",
      color: "emerald",
      icon: CheckCircle2,
    },
  ];

  return (
    <div ref={containerRef} className="relative min-h-screen bg-[#05070a] text-[#F3F4F6] selection:bg-white/20 selection:text-white font-['Inter',sans-serif]">
      {/* Top Navbar */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 sm:px-10 sm:py-5 backdrop-blur-xl bg-black/40 border-b border-white/[0.08]"
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <PravaMark />
          <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] font-mono text-[#cbd5e1]">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE OS
          </div>
        </div>

        {/* Center links with dots */}
        <nav className="hidden lg:flex items-center gap-4 text-[13px] font-medium text-white/70">
          <a href="#pipeline" className="hover:text-white transition-colors">How It Connects</a>
          <span className="size-1 rounded-full bg-white/30" />
          <a href="#pulse" className="hover:text-white transition-colors">Financial Pulse</a>
          <span className="size-1 rounded-full bg-white/30" />
          <a href="#tax-engine" className="hover:text-white transition-colors">GST & Tax Engine</a>
          <span className="size-1 rounded-full bg-white/30" />
          <a href="#ca-hub" className="hover:text-white transition-colors">CA Verification</a>
          <span className="size-1 rounded-full bg-white/30" />
          <a href="#copilot" className="hover:text-white transition-colors">Ask Prava AI</a>
        </nav>

        {/* Right CTA & Locale */}
        <div className="flex items-center gap-3 sm:gap-4">
          <ThemeToggle />
          <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs text-white/90">
            <Globe className="size-3.5 text-white/70" />
            <select
              aria-label="Select Country"
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
              className="cursor-pointer bg-transparent text-xs font-semibold text-white outline-none [&>option]:bg-[#0D131A] [&>option]:text-white"
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={begin}
            onPointerEnter={prefetchWorkspace}
            onFocus={prefetchWorkspace}
            className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-1.5 text-xs font-semibold text-white transition-all backdrop-blur-md shadow-lg"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </motion.header>

      {/* ========================================================================= */}
      {/* CHAPTER 01: ORCHID HERO WITH VIDEO BACKDROP */}
      {/* ========================================================================= */}
      <section ref={heroRef} className="relative w-full min-h-screen overflow-hidden flex flex-col justify-between pt-24 pb-12 sm:pt-28">
        {/* Full-bleed background video */}
        <video
          className="absolute inset-0 w-full h-full object-cover z-0"
          src="/hero.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        {/* Ambient Dark Overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/20 z-[1]" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-[#05070a] z-[1]" />
        <div className="absolute top-[-10%] left-[5%] w-[700px] height-[700px] bg-[radial-gradient(ellipse_at_30%_30%,rgba(14,116,144,0.12)_0%,transparent_65%)] pointer-events-none z-[1]" />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="relative z-10 container max-w-7xl mx-auto px-6 sm:px-10 pt-10 sm:pt-14"
        >
          <div className="max-w-2xl">
            {/* Social Proof Avatar Badge */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="inline-flex items-center gap-2.5 mb-5 rounded-full bg-white/[0.08] border border-white/15 px-3 py-1 backdrop-blur-md shadow-xl"
            >
              <div className="flex -space-x-2">
                {avatars.map((bg, i) => (
                  <span
                    key={i}
                    style={{ background: bg }}
                    className="size-5 rounded-full border border-black/40 shadow-sm"
                  />
                ))}
              </div>
              <span className="text-xs text-white/90 font-medium tracking-wide">
                trusted by many businesses
              </span>
            </motion.div>

            {/* Playfair Display Headline with Italic Phrase */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.22, ease: "easeOut" }}
              className="font-['Playfair_Display',Georgia,serif] text-5xl sm:text-6xl md:text-7xl font-normal leading-[1.04] tracking-[-0.02em] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.7)]"
            >
              Manage <em className="italic font-normal text-white">Your Business</em>
              <br />
              The Intelligent Way
            </motion.h1>

            {/* Subtext */}
            <motion.p
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
              className="mt-5 max-w-lg text-sm sm:text-base leading-relaxed text-white/80 font-normal drop-shadow-[0_1px_12px_rgba(0,0,0,0.6)]"
            >
              A unified operating system for bookkeeping, automated tax compliance, document intelligence, and real Chartered Accountant verification.
            </motion.p>

            {/* Premium Button */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.54, ease: "easeOut" }}
              className="mt-7 flex flex-wrap items-center gap-4"
            >
              <motion.a
                href="#pipeline"
                onClick={(e) => {
                  e.preventDefault();
                  begin();
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-3 rounded-2xl bg-[#1c1c22] hover:bg-[#25252e] border border-white/20 p-2 pr-6 text-white text-decoration-none shadow-[0_12px_35px_rgba(0,0,0,0.6)] transition-colors"
              >
                <span className="size-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Zap className="size-4 text-white fill-white" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-white">
                  Launch Your Workspace
                </span>
              </motion.a>

              <a
                href="#pulse"
                className="inline-flex items-center gap-2 text-xs font-semibold text-white/80 hover:text-white px-4 py-2 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md transition-colors"
              >
                Explore Live Demo
                <ChevronRight className="size-3.5" />
              </a>
            </motion.div>
          </div>
        </motion.div>

        {/* Bottom Steps Row (Frosted Glass Cards) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          className="relative z-10 container max-w-7xl mx-auto px-6 sm:px-10 mt-12 mb-4"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl">
            {heroSteps.map((step) => (
              <div key={step.n} className="group">
                <div className="h-24 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-xl p-3.5 flex flex-col justify-between transition-all shadow-lg">
                  <div className="flex items-center justify-between">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={INK}
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      {step.icon}
                    </svg>
                    <span className="text-[11px] font-mono font-semibold text-white/60">
                      {step.n}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-white tracking-tight">{step.label}</h3>
                    <p className="text-[10px] text-white/60 truncate">{step.desc}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex items-center gap-2 pl-1">
                  <div className="w-5 h-[2px] rounded-full bg-white/40 group-hover:bg-white transition-colors" />
                  <span className="text-[10px] font-mono font-medium text-white/60">{step.n}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 02: SCROLL-DRIVEN PIPELINE WORKFLOW */}
      {/* ========================================================================= */}
      <section id="pipeline" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#05070a]">
        <div className="container max-w-7xl mx-auto px-6 sm:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-14 border-b border-white/[0.08]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-mono uppercase tracking-widest text-white/80">
                <Sparkles className="size-3 text-white" />
                Automated Architecture
              </div>
              <h2 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal text-white mt-4">
                Five unified stages. <em className="italic">Zero chaos.</em>
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/70 font-normal">
              From the moment an invoice hits your email to the statutory filing certified by a Chartered Accountant, Prava orchestrates the entire lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-12">
            {workflowStages.map((stage, idx) => (
              <motion.div
                key={stage.step}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
                className="relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] hover:border-white/20 p-5 flex flex-col justify-between backdrop-blur-xl transition-all shadow-xl group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-white/50 group-hover:text-white transition-colors">
                      {stage.step}
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] text-white/70 border border-white/10">
                      {stage.tag}
                    </span>
                  </div>
                  <stage.icon className="size-6 text-white mb-3" />
                  <h3 className="text-sm font-semibold text-white mb-2">{stage.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed">{stage.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-white/70 font-mono">
                  <span>{stage.badge}</span>
                  <CheckCircle2 className="size-3.5 text-emerald-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 03: LIVE WORKSPACE SIMULATOR & METRICS */}
      {/* ========================================================================= */}
      <section id="pulse" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#070a0e] overflow-hidden">
        <div className="absolute top-1/2 -left-48 size-96 rounded-full bg-white/[0.02] blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 -right-48 size-96 rounded-full bg-white/[0.02] blur-[140px] pointer-events-none" />

        <div className="container max-w-7xl mx-auto px-6 sm:px-10 relative z-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-mono uppercase tracking-widest text-white/80">
              <TrendingUp className="size-3 text-emerald-400" />
              Real-Time Intelligence
            </div>
            <h2 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal text-white mt-4">
              Your financial pulse. <em className="italic">Crystal clear.</em>
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              No stale monthly reports. Real-time cash position, tax obligations, and supplier reconciliations continuously synced with verified source documents.
            </p>
          </div>

          {/* Interactive Workspace Console Card */}
          <div className="rounded-3xl border border-white/15 bg-white/[0.02] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
                <span className="ml-3 font-mono text-xs text-white/50">Acme Global Solutions · {profile.code} Workspace</span>
              </div>
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
                {(["overview", "tax", "documents", "ca"] as const).map((tab) => {
                  const isActive = activeWorkspaceTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveWorkspaceTab(tab)}
                      className={`relative rounded-lg px-3 py-1 text-xs font-medium uppercase tracking-wider transition-colors ${
                        isActive
                          ? "text-black font-semibold"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="workspace-simulator-tab"
                          transition={{ type: "spring", stiffness: 480, damping: 26 }}
                          className="absolute inset-0 rounded-lg bg-white shadow-md"
                        />
                      )}
                      <span className="relative z-10">{tab}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Animated Dashboard Tab Content */}
            <AnimatePresence mode="wait">
              {activeWorkspaceTab === "overview" && (
                <motion.div
                  key="overview-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  {/* Stat Card 1 */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>GROSS REVENUE (YTD)</span>
                      <TrendingUp className="size-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-semibold text-white">{profile.symbol}1,25,00,000</div>
                    <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 font-mono">
                      <span>+18.4% vs last quarter</span>
                      <span className="text-white/40">· 142 Invoices matched</span>
                    </div>
                  </div>

                  {/* Stat Card 2 */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>NET TAX LIABILITY ({profile.taxSystem})</span>
                      <Receipt className="size-4 text-amber-400" />
                    </div>
                    <div className="text-3xl font-semibold text-white">{profile.symbol}9,40,000</div>
                    <div className="mt-2 text-xs text-amber-300 flex items-center gap-1 font-mono">
                      <span>ITC Verified: {profile.symbol}4,80,000</span>
                      <span className="text-white/40">· GSTR-2B Ready</span>
                    </div>
                  </div>

                  {/* Stat Card 3 */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>STATUTORY AUDIT STATUS</span>
                      <ShieldCheck className="size-4 text-purple-400" />
                    </div>
                    <div className="text-xl font-semibold text-white flex items-center gap-2">
                      <span>CA Certified</span>
                      <span className="size-2 rounded-full bg-emerald-400" />
                    </div>
                    <div className="mt-2 text-xs text-purple-300 flex items-center gap-1 font-mono">
                      <span>CA Rajesh Verma, FCA #512398</span>
                    </div>
                  </div>

                  {/* Wide Ledger Table Preview */}
                  <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white">Live Verified Transaction Ledger</h3>
                      <span className="text-xs font-mono text-white/50">Auto-extracted via Gemini Flash 3.0</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-white/50 font-mono">
                            <th className="py-2.5 px-3">DOCUMENT</th>
                            <th className="py-2.5 px-3">VENDOR / CLIENT</th>
                            <th className="py-2.5 px-3">TAX IDENTIFIER</th>
                            <th className="py-2.5 px-3">TAXABLE AMOUNT</th>
                            <th className="py-2.5 px-3">TAX SLAB</th>
                            <th className="py-2.5 px-3">STATUS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-white/80">
                          <tr>
                            <td className="py-3 px-3 font-mono text-white">INV-2026-0801</td>
                            <td className="py-3 px-3 font-medium">Apex Global Supplies</td>
                            <td className="py-3 px-3 font-mono text-white/60">27AABCU9603R1ZM</td>
                            <td className="py-3 px-3">{profile.symbol}48,50,000</td>
                            <td className="py-3 px-3">18% GST</td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono">
                                <Check className="size-3" /> MATCHED
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-mono text-white">AWS-CL-88219</td>
                            <td className="py-3 px-3 font-medium">Amazon Web Services</td>
                            <td className="py-3 px-3 font-mono text-white/60">27AAACH2702H1ZK</td>
                            <td className="py-3 px-3">{profile.symbol}1,42,800</td>
                            <td className="py-3 px-3">18% GST</td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono">
                                <Check className="size-3" /> MATCHED
                              </span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 px-3 font-mono text-white">INV-2026-0814</td>
                            <td className="py-3 px-3 font-medium">Verma Logistics Ltd</td>
                            <td className="py-3 px-3 font-mono text-white/60">06AABCV4921N1ZY</td>
                            <td className="py-3 px-3">{profile.symbol}8,20,000</td>
                            <td className="py-3 px-3">12% GST</td>
                            <td className="py-3 px-3">
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono">
                                <ShieldCheck className="size-3" /> CA VERIFIED
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeWorkspaceTab === "tax" && (
                <motion.div
                  key="tax-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6"
                >
                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>OUTPUT GST LIABILITY</span>
                      <Receipt className="size-4 text-orange-400" />
                    </div>
                    <div className="text-3xl font-semibold text-white">{profile.symbol}14,20,000</div>
                    <p className="mt-2 text-xs text-white/50 font-mono">Across 86 customer invoices</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>ELIGIBLE INPUT TAX CREDIT (ITC)</span>
                      <BadgeCheck className="size-4 text-emerald-400" />
                    </div>
                    <div className="text-3xl font-semibold text-white">{profile.symbol}4,80,000</div>
                    <p className="mt-2 text-xs text-emerald-400 font-mono">100% matched with 2B portal</p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3 font-mono">
                      <span>NET CASH OUTFLOW</span>
                      <Wallet className="size-4 text-sky-400" />
                    </div>
                    <div className="text-3xl font-semibold text-white">{profile.symbol}9,40,000</div>
                    <p className="mt-2 text-xs text-sky-300 font-mono">Due on 20th of next month</p>
                  </div>

                  <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <h3 className="text-sm font-semibold text-white mb-3">Reconciliation Status</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
                      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                        <p className="text-[11px] text-emerald-400">GSTR-1 DRAFT</p>
                        <p className="mt-1 text-sm font-bold text-white">Reconciled & Ready</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                        <p className="text-[11px] text-cyan-400">GSTR-2B MATCH</p>
                        <p className="mt-1 text-sm font-bold text-white">56 / 56 Matched</p>
                      </div>
                      <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                        <p className="text-[11px] text-amber-400">SUPPLIER DEVIATIONS</p>
                        <p className="mt-1 text-sm font-bold text-white">0 Flags Detected</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeWorkspaceTab === "documents" && (
                <motion.div
                  key="documents-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="p-6 sm:p-8 space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h3 className="text-sm font-semibold text-white">AI OCR Vault Queue</h3>
                      <p className="text-xs text-white/50">Sub-second document parsing with 99.8% precision</p>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                      All Parsed (142 Docs)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { name: "Vendor_Tax_Invoice_Apex_August.pdf", size: "1.4 MB", confidence: "99.9%", time: "1.2s", status: "Extracted" },
                      { name: "AWS_Cloud_Services_INV88219.pdf", size: "840 KB", confidence: "100%", time: "0.8s", status: "Extracted" },
                      { name: "HDFC_Current_Account_Stmt_Aug2026.pdf", size: "3.2 MB", confidence: "99.7%", time: "1.8s", status: "Reconciled" },
                    ].map((doc, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs">
                        <div className="flex items-center gap-3">
                          <FileText className="size-4 text-sky-400" />
                          <div>
                            <p className="font-medium text-white">{doc.name}</p>
                            <p className="text-[10px] text-white/50 font-mono">{doc.size} · Parsed in {doc.time}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-emerald-400 text-[11px]">{doc.confidence} match</span>
                          <span className="rounded-full px-2.5 py-0.5 text-[10px] font-mono bg-white/10 text-white">
                            {doc.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeWorkspaceTab === "ca" && (
                <motion.div
                  key="ca-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="p-6 sm:p-8 space-y-5"
                >
                  <div className="rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="size-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                        <ShieldCheck className="size-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-white">Chartered Accountant Audit Stamp</h4>
                        <p className="text-xs text-purple-200">ICAI Membership #512398 · Firm Regn #018242N</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ✓ Audit Approved
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                      <span className="text-white/50 text-[10px]">AUDITOR OBSERVATION</span>
                      <p className="mt-1 text-white font-sans text-xs leading-relaxed">
                        "All inward tax credits for August 2026 reconciled against government GSTR-2B inward ledgers. No unvouched claims identified."
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-white/10 bg-white/[0.03]">
                      <span className="text-white/50 text-[10px]">STATUTORY SIGN-OFF</span>
                      <p className="mt-1 text-white font-sans text-xs leading-relaxed">
                        "Eligible for 1-click filing. Final statutory return digitally signed with Class-3 DSC."
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 04: ASK PRAVA INTERACTIVE AI CO-PILOT */}
      {/* ========================================================================= */}
      <section id="copilot" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#05070a]">
        <div className="container max-w-7xl mx-auto px-6 sm:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative */}
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-mono uppercase tracking-widest text-white/80">
                <Bot className="size-3 text-white" />
                Financial AI Co-Pilot
              </div>
              <h2 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal text-white mt-4 leading-tight">
                Ask anything. <br />
                <em className="italic">Get ledger-proven answers.</em>
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-white/70">
                Forget downloading CSVs and building pivot tables. Ask Prava reasons directly over your double-entry accounting records, tax draft schedules, and supplier invoices.
              </p>

              {/* Sample Quick Questions */}
              <div className="mt-8 space-y-2.5">
                <p className="text-xs font-mono uppercase tracking-wider text-white/50 mb-2">Try sample queries:</p>
                {interactivePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActivePromptIdx(i);
                      setCustomAnswer(null);
                    }}
                    className={`w-full text-left rounded-xl p-3 text-xs transition-all border ${
                      activePromptIdx === i && !customAnswer
                        ? "bg-white/10 border-white/30 text-white font-medium"
                        : "bg-white/[0.02] border-white/[0.06] text-white/60 hover:text-white hover:bg-white/[0.05]"
                    }`}
                  >
                    "{p.query}"
                  </button>
                ))}
              </div>
            </div>

            {/* Right Interactive AI Window */}
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-white/15 bg-white/[0.03] backdrop-blur-2xl shadow-2xl overflow-hidden p-6 sm:p-8">
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="size-8 rounded-xl bg-white/10 flex items-center justify-center">
                      <Sparkles className="size-4 text-white" />
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-white">Ask Prava Financial Assistant</h4>
                      <p className="text-[10px] font-mono text-white/50">Gemini 3.0 Flash · Real-time ledger grounding</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ONLINE
                  </span>
                </div>

                {/* Question & Answer Box */}
                <div className="my-6 space-y-4">
                  <div className="flex gap-3 items-start">
                    <div className="size-7 rounded-full bg-white/10 flex items-center justify-center shrink-0 text-[11px] font-bold">
                      YOU
                    </div>
                    <div className="rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-xs text-white">
                      {customQuestion && customAnswer ? customQuestion : interactivePrompts[activePromptIdx].query}
                    </div>
                  </div>

                  <div className="flex gap-3 items-start">
                    <div className="size-7 rounded-full bg-white text-black flex items-center justify-center shrink-0 font-bold text-[11px]">
                      AI
                    </div>
                    <div className="rounded-2xl bg-white/10 border border-white/15 p-4 text-xs text-white/90 leading-relaxed shadow-lg">
                      {isTyping ? (
                        <div className="flex items-center gap-2 text-white/60">
                          <RotateCw className="size-3.5 animate-spin" />
                          <span>Analyzing accounting ledgers and tax schedules…</span>
                        </div>
                      ) : (
                        <>
                          <p>{customAnswer ? customAnswer : interactivePrompts[activePromptIdx].answer}</p>
                          <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-mono text-white/50">Sources:</span>
                            {(customAnswer
                              ? ["Sales Invoices 2026", "Bank Statements"]
                              : interactivePrompts[activePromptIdx].sources
                            ).map((src) => (
                              <span
                                key={src}
                                className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-white/80 border border-white/10"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Input Form */}
                <form onSubmit={handleCustomAsk} className="flex gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    placeholder="Ask about revenue, taxes, overdue invoices, expenses..."
                    className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-4 py-2.5 text-xs text-white placeholder:text-white/40 outline-none focus:border-white/30"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-white text-black px-4 py-2.5 text-xs font-semibold hover:bg-white/90 transition-colors flex items-center gap-1.5"
                  >
                    <Send className="size-3.5" />
                    <span>Ask</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 05: CHARTERED ACCOUNTANT VERIFICATION HUB */}
      {/* ========================================================================= */}
      <section id="ca-hub" className="relative py-24 sm:py-32 border-t border-white/[0.08] bg-[#070a0e]">
        <div className="container max-w-7xl mx-auto px-6 sm:px-10">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs font-mono uppercase tracking-widest text-white/80">
              <Scale className="size-3 text-purple-400" />
              Human-in-the-Loop Verification
            </div>
            <h2 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal text-white mt-4">
              Certified CA review. <em className="italic">Built in.</em>
            </h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Software shouldn't replace statutory accountability. Prava pairs every workspace with licensed Chartered Accountants who review schedules before filing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl">
              <div className="size-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-5 text-purple-400">
                <ShieldCheck className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">ICAI Membership Validation</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                All reviewing professionals are verified with active institute registration numbers and direct credential audit trails.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl">
              <div className="size-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-5 text-emerald-400">
                <FileCheck2 className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Two-Factor Approval Protocol</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                No tax return or statutory schedule can be submitted without explicit two-man review: business owner approval plus CA sign-off.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7 backdrop-blur-xl">
              <div className="size-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5 text-blue-400">
                <Lock className="size-5" />
              </div>
              <h3 className="text-base font-semibold text-white mb-2">Immutable Audit Logging</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Every calculation, document review, and approval observation is cryptographically logged with timestamps and user IDs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* CHAPTER 06: CALL TO ACTION FOOTER */}
      {/* ========================================================================= */}
      <footer className="relative py-20 border-t border-white/10 bg-black overflow-hidden">
        <div className="container max-w-7xl mx-auto px-6 sm:px-10 text-center relative z-10">
          <PravaMark />
          <h2 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal text-white mt-6">
            Ready to upgrade <em className="italic">your business OS?</em>
          </h2>
          <p className="mt-3 text-sm text-white/70 max-w-md mx-auto">
            Join thousands of fast-growing businesses managing their financials with modern elegance and certified peace of mind.
          </p>

          <div className="mt-8 flex justify-center">
            <button
              onClick={begin}
              className="rounded-2xl bg-white text-black hover:bg-white/90 px-8 py-3.5 text-sm font-semibold transition-all shadow-[0_0_35px_rgba(255,255,255,0.3)] flex items-center gap-2"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="size-4" />
            </button>
          </div>

          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-white/40 font-mono">
            <p>© 2026 Prava Systems Inc. All rights reserved.</p>
            <div className="flex gap-6 mt-4 sm:mt-0">
              <a href="#pipeline" className="hover:text-white transition-colors">Architecture</a>
              <a href="#pulse" className="hover:text-white transition-colors">Pulse</a>
              <a href="#ca-hub" className="hover:text-white transition-colors">Chartered Accountants</a>
              <a href="#copilot" className="hover:text-white transition-colors">Ask Prava AI</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
