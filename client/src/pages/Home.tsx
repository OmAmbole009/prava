import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { prefetchWorkspace, startLogin } from "@/const";
import { countryOptions, profileForCountry, type CountryCode } from "@shared/locale";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  Check,
  FileText,
  Globe,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

const demoStates = {
  documents: { eyebrow: "Document intelligence", title: "Structured before it reaches your books.", metric: "48,500", label: "Invoice total", detail: "Vendor, tax, due date, and category are presented for review.", icon: FileText },
  invoices: { eyebrow: "Receivables", title: "Know what is outstanding — and what needs attention.", metric: "2,100", label: "Open receivables", detail: "Prepare, send, and track invoices from a single operating view.", icon: ReceiptText },
  reports: { eyebrow: "Financial clarity", title: "The signal, not just the spreadsheet.", metric: "18%", label: "Expense movement", detail: "Inspect trend changes with traceable records underneath every answer.", icon: BarChart3 },
  assistant: { eyebrow: "Guided analysis", title: "Ask a finance question. Review a verified result.", metric: "3", label: "Items requiring attention", detail: "Prava explains what the ledger supports; it does not invent financial data.", icon: Bot },
};

type DemoKey = keyof typeof demoStates;

function ScrollReveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const revealRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = revealRef.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    element.dataset.revealReady = "true";
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      element.dataset.visible = "true";
      observer.unobserve(element);
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={revealRef} className={`prava-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

function ProductScene({ selectedCountry }: { selectedCountry: string }) {
  const sceneRef = useRef<HTMLElement>(null);
  const frameRef = useRef<number | null>(null);
  const nearViewport = useRef(false);
  const profile = profileForCountry(selectedCountry);

  useEffect(() => {
    const update = () => {
      frameRef.current = null;
      if (!nearViewport.current || !sceneRef.current) return;
      const rect = sceneRef.current.getBoundingClientRect();
      const distance = window.innerHeight + rect.height;
      const progress = Math.max(0, Math.min(1, (window.innerHeight - rect.top) / distance));
      sceneRef.current.style.setProperty("--scene-progress", progress.toFixed(3));
    };
    const requestUpdate = () => {
      if (frameRef.current === null) frameRef.current = window.requestAnimationFrame(update);
    };
    const observer = new IntersectionObserver(([entry]) => {
      nearViewport.current = Boolean(entry?.isIntersecting);
      if (nearViewport.current) requestUpdate();
    }, { rootMargin: "22% 0px" });
    if (sceneRef.current) observer.observe(sceneRef.current);
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <section ref={sceneRef} id="story" className="prava-scroll-scene prava-deferred-section relative bg-[#f1ecdf] py-20 sm:py-28">
      <div className="container grid gap-12 lg:grid-cols-[0.76fr_1.24fr] lg:items-center">
        <ScrollReveal className="max-w-md">
          <span className="prava-kicker">One continuous operating model</span>
          <h2 className="prava-display mt-5 text-4xl leading-[0.95] text-[#10302b] sm:text-5xl">From document to decision, with the record intact.</h2>
          <p className="mt-6 text-base leading-7 text-[#50605a]">Prava turns incoming business documents into a reviewable financial picture. The work moves in sequence; the evidence stays connected.</p>
          <div className="mt-9 space-y-4 border-l border-[#c9bfa9] pl-5">
            {["Capture the source document", "Review structured financial data", "Understand what needs action"].map((item, index) => (
              <div key={item} className="flex items-center gap-3 text-sm font-medium text-[#24443d]">
                <span className="grid size-6 place-items-center rounded-full bg-[#d9e4d4] text-xs font-bold">0{index + 1}</span>
                {item}
              </div>
            ))}
          </div>
        </ScrollReveal>
        <ScrollReveal delay={90} className="relative min-h-[480px] [perspective:1100px] sm:min-h-[560px]">
          <div className="prava-stats-grid absolute inset-0 rounded-[2rem] border border-[#d5ccb9]" />
          <div className="absolute inset-x-5 top-5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-[#60706a] sm:inset-x-8 sm:top-8"><span>Incoming evidence</span><span>Verified context ({profile.flag} {profile.currency})</span></div>
          <article className="prava-scroll-card-a absolute left-[6%] top-[19%] w-[54%] rounded-2xl border border-[#e1d8c7] bg-[#fffdf8] p-5 shadow-[0_25px_60px_rgb(35_48_39_/_0.16)]">
            <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#829088]">Supplier invoice</p><h3 className="mt-3 text-lg font-semibold text-[#173832]">Apex Supplies Co.</h3></div><ReceiptText className="size-5 text-[#b77a43]" /></div>
            <div className="mt-7 h-px bg-[#ebe2d1]" />
            <div className="mt-4 flex justify-between text-sm text-[#53635d]"><span>{profile.taxSystem}</span><span>{profile.symbol}8,730</span></div>
            <div className="mt-3 flex justify-between text-base font-semibold text-[#173832]"><span>Total</span><span>{profile.symbol}48,500</span></div>
          </article>
          <article className="prava-scroll-card-b absolute right-[7%] top-[34%] w-[54%] rounded-2xl border border-[#2f574d] bg-[#153832] p-5 text-[#f9f4e9] shadow-[0_28px_60px_rgb(17_42_38_/_0.26)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b9cab9]">Ledger preview</p>
            <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between border-b border-white/10 pb-3"><span>Inventory</span><span>{profile.symbol}39,770</span></div><div className="flex justify-between border-b border-white/10 pb-3"><span>Input tax</span><span>{profile.symbol}8,730</span></div><div className="flex justify-between font-semibold"><span>Balanced</span><BadgeCheck className="size-4 text-[#bddb9d]" /></div></div>
          </article>
          <article className="prava-scroll-card-c absolute bottom-[10%] left-[23%] w-[58%] rounded-2xl border border-[#b8cdb7] bg-[#e7f0e2] p-5 shadow-[0_22px_40px_rgb(44_85_69_/_0.13)]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#547260]">Business insight</p><p className="mt-2 text-sm font-semibold text-[#193d35]">Inventory spend is up 18%</p></div><div className="prava-pulse size-9 rounded-full border-[6px] border-[#97b38f]" /></div></article>
          <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-[#dfd6c4] bg-[#faf7f0]/85 px-4 py-3 text-xs text-[#567068] backdrop-blur sm:bottom-8 sm:left-8 sm:right-8"><div className="flex items-center gap-3"><Sparkles className="size-4 shrink-0 text-[#b77a43]" /><span>Scroll-driven product model. Configured for global business operations.</span></div><div className="mt-2 h-px overflow-hidden bg-[#d8cfbd]"><span className="prava-scroll-progress block h-full origin-left bg-[#b77a43]" /></div></div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ProductDemo({ selectedCountry }: { selectedCountry: string }) {
  const [activeDemo, setActiveDemo] = useState<DemoKey>("documents");
  const active = demoStates[activeDemo];
  const DemoIcon = active.icon;
  const profile = profileForCountry(selectedCountry);

  const formattedMetric = activeDemo === "documents" || activeDemo === "invoices"
    ? `${profile.symbol}${active.metric}`
    : active.metric;

  return (
    <section id="product" className="prava-deferred-section bg-[#fbf8f0] py-20 sm:py-28">
      <div className="container">
        <ScrollReveal className="max-w-2xl"><span className="prava-kicker">A product, not a pile of tools</span><h2 className="prava-display mt-5 text-4xl leading-[0.95] text-[#10302b] sm:text-5xl">One calm place to run the financial work that moves your business.</h2></ScrollReveal>
        <ScrollReveal delay={90} className="mt-12 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="flex flex-col gap-2">
            {(Object.keys(demoStates) as DemoKey[]).map(key => {
              const item = demoStates[key];
              const Icon = item.icon;
              return <button key={key} onClick={() => setActiveDemo(key)} className={`flex items-center gap-4 rounded-xl px-4 py-4 text-left transition ${activeDemo === key ? "bg-[#163c35] text-[#f7f2e7] shadow-lg" : "text-[#4e625b] hover:bg-[#e9e4d8]"}`}><Icon className="size-5" /><span className="text-sm font-semibold">{item.eyebrow}</span><ArrowRight className={`ml-auto size-4 ${activeDemo === key ? "opacity-100" : "opacity-0"}`} /></button>;
            })}
          </div>
          <div className="relative overflow-hidden rounded-[1.5rem] border border-[#d9d0bf] bg-[#f0ede4] p-5 sm:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgb(152_185_143_/_0.32),transparent_28%)]" />
            <div className="relative"><div className="flex items-start justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#567267]">{active.eyebrow}</p><h3 className="prava-display mt-3 max-w-lg text-3xl leading-none text-[#173b34] sm:text-4xl">{active.title}</h3></div><div className="grid size-12 place-items-center rounded-xl bg-[#173b34] text-[#e3efcf]"><DemoIcon className="size-6" /></div></div><div className="mt-10 grid gap-5 sm:grid-cols-[0.9fr_1.1fr]"><div className="rounded-xl border border-[#d6cfbd] bg-[#fffdf8] p-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#73817b]">{active.label}</p><p className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#173b34]">{formattedMetric}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#e8e1d1]"><div className="h-full w-[68%] rounded-full bg-[#72986d]" /></div></div><div className="rounded-xl bg-[#173b34] p-5 text-[#eff3e8]"><p className="text-sm leading-6 text-[#d3dfd0]">{active.detail}</p><div className="mt-8 flex items-center gap-2 text-xs font-semibold text-[#cfe3ad]"><Check className="size-4" />Evidence linked to the decision</div></div></div></div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function Hero({ begin, prefetch, selectedCountry }: { begin: () => void; prefetch: () => Promise<unknown>; selectedCountry: string }) {
  const profile = profileForCountry(selectedCountry);
  return <section className="prava-shell prava-grid relative isolate overflow-hidden bg-[#12322e] pb-20 pt-32 text-[#f9f4e9] sm:pb-28 sm:pt-40"><div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_26%,rgb(125_154_121_/_0.22),transparent_25%),linear-gradient(100deg,transparent_45%,rgb(0_0_0_/_0.12))]" /><div className="container relative grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div className="max-w-2xl"><span className="inline-flex items-center gap-2 rounded-full border border-[#cf9c6c]/40 bg-[#b77a43]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#e8d0b1]"><span className="size-1.5 rounded-full bg-[#d8aa71]" />Global finance operations for growing businesses</span><h1 className="prava-display mt-7 text-5xl leading-[0.9] sm:text-6xl lg:text-7xl">Your AI finance team<br /><span className="text-[#c7ddaa]">for everyday business.</span></h1><div className="prava-copper-rule mt-7 max-w-36" /><p className="mt-6 max-w-xl text-base leading-7 text-[#d2ddd5] sm:text-lg">Run your finances, not your paperwork. Prava connects documents, records, invoices, tax context, and clear next steps in one accountable operating system.</p><div className="mt-9 flex flex-wrap gap-3"><Button onClick={begin} onPointerEnter={prefetch} onFocus={prefetch} size="lg" className="rounded-full bg-[#f5eee0] px-6 text-[#13342e] hover:bg-white">Build your workspace<ArrowRight className="ml-2 size-4" /></Button><a href="#story" className="inline-flex h-10 items-center rounded-full border border-[#dae4d5]/25 px-5 text-sm font-medium text-[#f4eddf] transition hover:bg-white/10">See the operating model</a></div><p className="mt-5 text-xs text-[#b9c8bf]">Secure sign-in takes you directly to your workspace.</p></div><div className="relative mx-auto aspect-[1.05] w-full max-w-[650px]"><div className="absolute inset-0 rounded-[2rem] border border-[#d9e5d7]/15 bg-[#12332f]/40 shadow-[0_40px_80px_rgb(0_0_0_/_0.25)]" /><img src="/manus-storage/prava-finance-hero_c72f0eb8.jpg" alt="Financial documents organized into a calm, modern business workspace" width="650" height="619" fetchPriority="high" decoding="async" sizes="(min-width: 1024px) 50vw, 100vw" className="absolute inset-0 h-full w-full rounded-[2rem] object-cover opacity-80 mix-blend-screen" /><div className="absolute inset-0 rounded-[2rem] bg-gradient-to-r from-[#13342e] via-transparent to-transparent" /><div className="absolute right-5 top-[22%] w-44 rounded-xl border border-[#e2bd8d]/45 bg-[#fffaf0]/95 p-3 text-[#153832] shadow-xl"><p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#8a6c4e]">Verified extraction</p><p className="mt-2 text-sm font-bold">Invoice · {profile.symbol}48,500</p><div className="mt-3 space-y-1.5 text-[10px] text-[#60736a]"><div className="flex justify-between"><span>Vendor</span><span>Matched</span></div><div className="flex justify-between"><span>{profile.taxSystem}</span><span>{profile.symbol}8,730</span></div><div className="flex justify-between"><span>Ledger</span><span className="text-[#3f755f]">Ready</span></div></div></div><div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-[#d8e7d1]/20 bg-[#143832]/85 p-4 backdrop-blur"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b7c8ba]">Financial position ({profile.code})</p><p className="mt-1 text-xl font-semibold">Clear, connected, reviewable.</p></div><div className="grid size-12 place-items-center rounded-xl bg-[#d7e9b7] text-[#153832]"><BarChart3 className="size-6" /></div></div></div></div></div></section>;
}

export default function Home() {
  const begin = () => startLogin("/dashboard");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>("US");

  return <div className="min-h-screen overflow-x-hidden bg-[#f7f3e9] text-[#12332e]">
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="container flex h-20 items-center justify-between gap-4">
        <PravaMark inverse />
        <nav className="hidden items-center gap-6 text-sm text-[#d5dfd6] md:flex">
          <a href="#story">How it works</a>
          <a href="#product">Product</a>
          <a href="#security">Security</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-[#f4eddf]">
            <Globe className="size-3.5 text-[#c7ddaa]" />
            <select
              aria-label="Select Country"
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value as CountryCode)}
              className="bg-transparent text-xs font-medium text-[#f4eddf] outline-none cursor-pointer [&>option]:bg-[#12322e] [&>option]:text-[#f4eddf]"
            >
              {countryOptions.map(c => (
                <option key={c.code} value={c.code}>
                  {c.flag} {c.code} ({c.symbol} {c.currency})
                </option>
              ))}
            </select>
          </div>
          <ThemeToggle />
          <Button onClick={begin} onPointerEnter={prefetchWorkspace} onFocus={prefetchWorkspace} className="rounded-full bg-[#f4eddf] px-5 text-[#153832] hover:bg-white">
            Open workspace<ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </header>
    <main>
      <Hero begin={begin} prefetch={prefetchWorkspace} selectedCountry={selectedCountry} />
      <section className="border-b border-[#ded5c4] bg-[#fbf8f0] py-6">
        <div className="container grid gap-5 text-sm text-[#547067] sm:grid-cols-3">
          <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-[#507563]" />Financial records stay traceable</div>
          <div className="flex items-center gap-3"><LockKeyhole className="size-5 text-[#507563]" />Workspace-aware access controls</div>
          <div className="flex items-center gap-3"><BadgeCheck className="size-5 text-[#507563]" />Professional review stays in the loop</div>
        </div>
      </section>
      <ProductScene selectedCountry={selectedCountry} />
      <ProductDemo selectedCountry={selectedCountry} />
      <section id="security" className="prava-deferred-section bg-[#163a34] py-20 text-[#f7f1e4] sm:py-28">
        <div className="container grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <ScrollReveal>
            <div>
              <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#b9d19f]"><LockKeyhole className="size-4" />Designed for accountable financial work</span>
              <h2 className="prava-display mt-5 text-4xl leading-[0.95] sm:text-5xl">Software can automate the routine without pretending to replace professional judgment.</h2>
              <p className="mt-6 max-w-xl leading-7 text-[#cbd7cf]">Prava is built so that records are the source of truth. Automation assists the work; qualified review remains available when the work requires it.</p>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-6">
              <div className="space-y-5">
                {[
                  "Business workspaces are kept separate by membership.",
                  "Financial answers must be traceable to verified records.",
                  "Tax & compliance assistance is guidance — not a claim that a filing is complete.",
                  "Sensitive actions are designed to require confirmation."
                ].map(item => <div key={item} className="flex gap-4 border-b border-white/10 pb-5 last:border-none last:pb-0"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#bcd895] text-[#143831]"><Check className="size-4" /></span><p className="text-sm leading-6 text-[#e3eade]">{item}</p></div>)}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
      <section className="prava-deferred-section bg-[#f7f3e9] py-20 sm:py-28">
        <div className="container">
          <ScrollReveal>
            <div className="rounded-[2rem] bg-[#dce8d5] px-6 py-12 text-center sm:px-12 sm:py-16">
              <PravaMark className="justify-center text-[#153832]" />
              <h2 className="prava-display mx-auto mt-6 max-w-2xl text-4xl leading-[0.95] text-[#153832] sm:text-5xl">The beginning of a finance team that fits your business.</h2>
              <p className="mx-auto mt-5 max-w-lg text-sm leading-6 text-[#476258]">Create a secure workspace now. Your connected finance operating system can grow from there.</p>
              <Button onClick={begin} onPointerEnter={prefetchWorkspace} onFocus={prefetchWorkspace} size="lg" className="mt-8 rounded-full bg-[#153832] px-6 text-[#f7f1e4] hover:bg-[#0d2823]">Start with your workspace<ArrowRight className="ml-2 size-4" /></Button>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </main>
    <footer className="border-t border-[#dcd3c2] bg-[#f7f3e9] py-8">
      <div className="container flex flex-col gap-4 text-xs text-[#627269] sm:flex-row sm:items-center sm:justify-between">
        <PravaMark className="text-[#153832]" />
        <div className="flex items-center gap-4">
          <p>© 2026 Prava. Global finance operations, built with care.</p>
          <a href="/ca/login" className="font-semibold text-[#153832] underline hover:text-[#0b221e]">CA Portal</a>
          <a href="/admin/login" className="font-semibold text-[#153832] underline hover:text-[#0b221e]">Admin</a>
        </div>
        <p>Tax and compliance guidance is informational; professional review may be required.</p>
      </div>
    </footer>
  </div>;
}
