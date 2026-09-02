import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import { AlertCircle, ArrowRight, BellRing, Building2, CheckCircle2, FileText, Loader2, Plus, Sparkles, WalletCards } from "lucide-react";
import { useLocation } from "wouter";

function formatMinor(minor: number, currency: string, locale: string) {
  return formatMinorAmount(minor, currency, locale);
}

function EmptyOverview({ onCreateWorkspace }: { onCreateWorkspace: () => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col justify-center py-10">
      <span className="prava-kicker w-fit">Your financial operating system starts here</span>
      <h1 className="prava-display mt-5 text-5xl leading-[0.92] text-[#153832] sm:text-6xl">Create the workspace your business will grow into.</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[#61726a]">A workspace keeps your people, settings, documents, and later financial records together — without mixing another business into the picture.</p>
      <div className="mt-8 flex flex-wrap gap-3"><Button onClick={onCreateWorkspace} className="rounded-full bg-[#153832] px-6 text-[#f7f1e4] hover:bg-[#102b26]"><Plus className="mr-2 size-4"/>Create business workspace</Button><a href="/#story" className="inline-flex h-10 items-center rounded-full border border-[#cfc6b3] px-5 text-sm font-semibold text-[#38584e] transition hover:bg-[#eee8dc]">See how Prava works<ArrowRight className="ml-2 size-4" /></a></div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">{[[Building2, "A separate business context", "Business settings and access stay scoped to one workspace."], [FileText, "A clean financial start", "No placeholder records or invented balances are created."], [WalletCards, "Billing-ready structure", "Subscription infrastructure can be added without rebuilding the core."]].map(([Icon, title, copy]) => { const Component = Icon as typeof Building2; return <div key={title as string} className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5"><Component className="size-5 text-[#62856f]"/><p className="mt-5 text-sm font-semibold text-[#23453d]">{title as string}</p><p className="mt-2 text-xs leading-5 text-[#708078]">{copy as string}</p></div> })}</div>
    </div>
  );
}

function WorkspaceOverview({ business }: { business: { id: number; name: string; currency: string; locale: string; taxSystem: string; timezone: string } }) {
  const summary = trpc.finance.latestSummary.useQuery({ businessId: business.id });
  const actions = trpc.actions.list.useQuery({ businessId: business.id });
  const gstNotifications = trpc.notifications.gstSubmissionDecisions.useQuery();
  const [, setLocation] = useLocation();
  const summaryData = summary.data;
  const cards = summaryData
    ? [
        ["Revenue", formatMinor(summaryData.revenueMinor, business.currency, business.locale), "Verified financial summary"],
        ["Expenses", formatMinor(summaryData.expensesMinor, business.currency, business.locale), "Verified financial summary"],
        ["Cash position", formatMinor(summaryData.cashMinor, business.currency, business.locale), "Verified financial summary"],
        [`${business.taxSystem} position`, formatMinor(summaryData.gstPositionMinor, business.currency, business.locale), "Verified financial summary"],
        ["Receivables", formatMinor(summaryData.receivablesMinor, business.currency, business.locale), "Verified financial summary"],
        ["Payables", formatMinor(summaryData.payablesMinor, business.currency, business.locale), "Verified financial summary"],
      ]
    : [["Documents", summary.isLoading ? "Loading…" : "No source records", summary.isLoading ? "Waiting for verified workspace data." : "Document intake is the next workflow to configure."], ["Cash position", summary.isLoading ? "Loading…" : "Not calculated", summary.isLoading ? "Waiting for verified workspace data." : "Requires reconciled transactions and bank context."], ["Tasks", "Start a workflow", "Use a guided workflow to collect source evidence."]];
  return <div className="mx-auto max-w-6xl py-2"><div className="flex flex-col gap-4 border-b border-[#ddd3c1] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">Workspace overview</p><h1 className="prava-display mt-2 text-4xl text-[#153832]">Good to see you in {business.name}.</h1><p className="mt-3 text-sm text-[#627269]">Start a guided task to collect documents, validate data, and prepare an accountable financial output.</p></div><Button onClick={() => setLocation("/tasks")} className="rounded-full bg-[#163a34] text-[#f7f1e4]"><Plus className="mr-2 size-4" />Start a workflow</Button></div><div className="mt-8 grid gap-4 md:grid-cols-3">{cards.map(([label, value, copy]) => <div key={label} className="prava-hover-lift rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#718279]">{label}</p><p className="mt-5 text-lg font-semibold text-[#163a34]">{value}</p><p className="mt-2 text-xs leading-5 text-[#728078]">{copy}</p></div>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-[#153832]">AI Action Center</p><p className="mt-1 text-xs text-[#75847c]">The next clearest action, grounded in your workspace state.</p></div><Sparkles className="size-5 text-[#b77a43]" /></div><div className="mt-5 space-y-3">{actions.isLoading ? <div className="flex items-center rounded-xl border border-dashed border-[#d7cdbb] p-5 text-sm text-[#6d7d74]"><Loader2 className="mr-2 size-4 animate-spin text-[#62856f]" />Loading open actions…</div> : actions.error ? <div className="rounded-xl border border-[#edc8bb] bg-[#fff7f4] p-5 text-sm text-[#7b5249]"><p>Open actions could not be loaded.</p><Button variant="outline" size="sm" onClick={() => actions.refetch()} className="mt-3 rounded-full">Try again</Button></div> : actions.data?.length ? actions.data.slice(0, 4).map(action => <button key={action.id} onClick={() => setLocation(action.documentId ? `/documents/${action.documentId}` : action.taskId ? `/tasks/${action.taskId}` : "/tasks")} className="flex w-full items-start gap-3 rounded-xl border border-[#e2d9c8] p-3 text-left transition hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62856f]"><AlertCircle className="mt-0.5 size-4 shrink-0 text-[#b77a43]" /><span><span className="block text-sm font-semibold text-[#24473e]">{action.title}</span><span className="mt-1 block text-xs leading-5 text-[#738078]">{action.description}</span><span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#668375]">{action.documentId ? "Open document review" : "Open workflow"}</span></span></button>) : <div className="rounded-xl border border-dashed border-[#d7cdbb] p-5 text-sm text-[#6d7d74]"><CheckCircle2 className="mb-2 size-4 text-[#62856f]" />No open actions yet. Start a tax-preparation or cash-intake workflow to build a live checklist.</div>}</div></section><section className="rounded-2xl bg-[#163a34] p-6 text-[#f7f1e4]"><p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#bdd79e]">Controlled automation</p><p className="prava-display mt-4 text-3xl leading-none">Preparation is not filing.</p><p className="mt-4 text-sm leading-6 text-[#c5d2c9]">Prava extracts and validates supported documents, then routes exceptions to user or professional review. Official submission is only shown when an authorized integration confirms it.</p><Button variant="outline" onClick={() => setLocation("/tasks")} className="mt-7 rounded-full border-[#7ea190] text-[#edf2db] hover:bg-[#275246] hover:text-white">Open task workflows<ArrowRight className="ml-2 size-4" /></Button></section></div>{gstNotifications.data?.length ? <section className="mt-5 rounded-2xl border border-[#d8dfd4] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BellRing className="size-4 text-[#b77a43]" /><div><p className="text-sm font-semibold text-[#153832]">Tax submission updates</p><p className="text-xs text-[#75847c]">Decision notices are in-app records. Email is not represented as sent until delivery is configured.</p></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{gstNotifications.data.slice(0, 4).map(({ notification, taskId }) => <button key={notification.id} onClick={() => setLocation(`/tasks/${taskId}`)} className="rounded-xl border border-[#e1e8dc] p-3 text-left transition hover:bg-[#f7f3e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#62856f]"><p className="text-sm font-semibold text-[#23473d]">{notification.subject}</p><p className="mt-1 text-xs leading-5 text-[#6f8078]">{notification.body}</p><p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#688175]">{new Date(notification.createdAt).toLocaleString()} · Open workflow</p></button>)}</div></section> : null}</div>;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });

  return (
    <DashboardLayout>
      {businesses.isLoading ? <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">Loading your workspace…</div> : businesses.error ? <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-[#e4c4ba] bg-[#fff7f4] p-7"><AlertCircle className="size-5 text-[#b7523d]"/><h1 className="mt-4 text-lg font-semibold text-[#5c241c]">We could not load your workspace.</h1><p className="mt-2 text-sm leading-6 text-[#7b5249]">{businesses.error.message}</p><Button onClick={() => businesses.refetch()} className="mt-5 rounded-full">Try again</Button></div> : businesses.data?.[0] ? <WorkspaceOverview business={businesses.data[0]} /> : <EmptyOverview onCreateWorkspace={() => setLocation("/onboarding")} />}
    </DashboardLayout>
  );
}
