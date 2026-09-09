import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { formatMinorAmount } from "@shared/locale";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Bot,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
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
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

function formatMinor(minor: number, currency: string, locale: string) {
  return formatMinorAmount(minor, currency, locale);
}

function EmptyOverview({ onCreateWorkspace }: { onCreateWorkspace: () => void }) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-3xl flex-col justify-center py-10">
      <span className="prava-kicker w-fit">Your financial operating system starts here</span>
      <h1 className="prava-display mt-5 text-5xl leading-[0.92] text-[#153832] sm:text-6xl">
        Create the workspace your business will grow into.
      </h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-[#61726a]">
        A workspace keeps your people, settings, documents, and financial records together — without mixing another business into the picture.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button
          onClick={onCreateWorkspace}
          className="rounded-full bg-[#153832] px-6 text-[#f7f1e4] hover:bg-[#102b26]"
        >
          <Plus className="mr-2 size-4" />
          Create business workspace
        </Button>
        <a
          href="/#story"
          className="inline-flex h-10 items-center rounded-full border border-[#cfc6b3] px-5 text-sm font-semibold text-[#38584e] transition hover:bg-[#eee8dc]"
        >
          See how Prava works
          <ArrowRight className="ml-2 size-4" />
        </a>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          [Building2, "A separate business context", "Business settings and access stay scoped to one workspace."],
          [FileText, "A clean financial start", "No placeholder records or invented balances are created."],
          [WalletCards, "Billing-ready structure", "Subscription infrastructure can be added without rebuilding the core."],
        ].map(([Icon, title, copy]) => {
          const Component = Icon as typeof Building2;
          return (
            <div key={title as string} className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5">
              <Component className="size-5 text-[#62856f]" />
              <p className="mt-5 text-sm font-semibold text-[#23453d]">{title as string}</p>
              <p className="mt-2 text-xs leading-5 text-[#708078]">{copy as string}</p>
            </div>
          );
        })}
      </div>
    </div>
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
  };
}) {
  const summary = trpc.finance.latestSummary.useQuery({ businessId: business.id });
  const actions = trpc.actions.list.useQuery({ businessId: business.id });
  const gstNotifications = trpc.notifications.gstSubmissionDecisions.useQuery();
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");

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
      } catch (err) {
        console.error("Failed to set sessionStorage", err);
      }
      setLocation(`/assistant?q=${encodeURIComponent(cleanPrompt)}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl py-2 space-y-8">
      {/* 1. Greeting & Quick Assistant Search Bar */}
      <div className="flex flex-col gap-5 border-b border-[#dfd6c4] pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="prava-kicker">Business Overview</span>
          <h1 className="prava-display mt-2 text-4xl text-[#153832]">
            Good to see you in {business.name}.
          </h1>
          <p className="mt-2 text-sm text-[#627269]">
            Here is how your business is doing, what needs your attention, and what Prava can help you do.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Button
            onClick={() => setLocation("/assistant")}
            className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#102b26]"
          >
            <Sparkles className="mr-2 size-4 text-[#d9e8be]" />
            Ask Prava
          </Button>
          <Button
            variant="outline"
            onClick={() => setLocation("/documents")}
            className="rounded-full border-[#cfc4b1] text-[#24473e] hover:bg-[#eee8dc]"
          >
            <FileUp className="mr-2 size-4" />
            Upload Document
          </Button>
        </div>
      </div>

      {/* Quick Prompt Bar */}
      <form
        onSubmit={handleAsk}
        className="flex items-center gap-3 rounded-2xl border border-[#cfc4b1] bg-[#fffdf8] p-2.5 shadow-sm focus-within:border-[#62856f] focus-within:ring-2 focus-within:ring-[#62856f]/20"
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#163a34] text-[#d9e8be]">
          <Bot className="size-4" />
        </div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask Prava anything (e.g. 'How much did I earn this month?', 'Are any invoices overdue?')"
          className="flex-1 bg-transparent text-sm text-[#183a33] placeholder:text-[#88978f] outline-none"
        />
        <Button
          type="submit"
          className="rounded-xl bg-[#163a34] px-4 text-xs font-semibold text-[#f7f1e4] hover:bg-[#102b26]"
        >
          <Send className="mr-1.5 size-3.5" />
          Ask
        </Button>
      </form>

      {/* 2. Question 1: How is my business doing? */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">
              Financial Health
            </p>
            <h2 className="prava-display mt-1 text-2xl text-[#153832]">
              1. How is your business doing?
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/money")}
            className="text-xs font-semibold text-[#24473e]"
          >
            Detailed Money view
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Revenue */}
          <div
            onClick={() => setLocation("/money")}
            className="cursor-pointer rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#62856f] hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6a887c]">
                Revenue (Money In)
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#e5efe1] text-[#2c5847]">
                <TrendingUp className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#163a34]">{fmt(revenue)}</p>
            <p className="mt-1 text-xs text-[#718279]">Total verified earnings</p>
          </div>

          {/* Expenses */}
          <div
            onClick={() => setLocation("/money")}
            className="cursor-pointer rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#62856f] hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#8e6146]">
                Expenses (Money Out)
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#fbeef4] text-[#8f402c]">
                <TrendingDown className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#163a34]">{fmt(expenses)}</p>
            <p className="mt-1 text-xs text-[#718279]">Bills, supplier & operating costs</p>
          </div>

          {/* Cash */}
          <div
            onClick={() => setLocation("/money")}
            className="cursor-pointer rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-5 shadow-sm transition hover:border-[#62856f] hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4f7182]">
                Available Cash
              </span>
              <span className="flex size-7 items-center justify-center rounded-lg bg-[#e7f1f9] text-[#265377]">
                <Landmark className="size-3.5" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold text-[#163a34]">{fmt(cash)}</p>
            <p className="mt-1 text-xs text-[#718279]">Reconciled bank liquidity</p>
          </div>

          {/* Money owed to you */}
          <div
            onClick={() => setLocation("/money")}
            className="cursor-pointer rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5 transition hover:border-[#62856f]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d8076]">
                Money Owed to You
              </span>
              <ArrowDownLeft className="size-3.5 text-[#2d5c4b]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#1e463a]">{fmt(receivables)}</p>
            <p className="mt-0.5 text-xs text-[#75847c]">Unpaid customer invoices</p>
          </div>

          {/* Money you owe */}
          <div
            onClick={() => setLocation("/money")}
            className="cursor-pointer rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5 transition hover:border-[#62856f]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d8076]">
                Money You Owe
              </span>
              <ArrowUpRight className="size-3.5 text-[#9b512c]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#1e463a]">{fmt(payables)}</p>
            <p className="mt-0.5 text-xs text-[#75847c]">Pending supplier bills</p>
          </div>

          {/* Estimated Tax Position */}
          <div
            onClick={() => setLocation("/tax")}
            className="cursor-pointer rounded-2xl border border-[#e5decb] bg-[#faf6ec] p-5 transition hover:border-[#62856f]"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d8076]">
                Estimated {business.taxSystem}
              </span>
              <Receipt className="size-3.5 text-[#916b34]" />
            </div>
            <p className="mt-2 text-xl font-bold text-[#1e463a]">{fmt(taxPosition)}</p>
            <p className="mt-0.5 text-xs text-[#75847c]">Tax to keep aside before filing</p>
          </div>
        </div>
      </section>

      {/* 3. Question 2: What needs my attention? */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b77a43]">
              Action Items
            </p>
            <h2 className="prava-display mt-1 text-2xl text-[#153832]">
              2. What needs your attention?
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/tasks")}
            className="text-xs font-semibold text-[#24473e]"
          >
            View all tasks
            <ArrowRight className="ml-1.5 size-3.5" />
          </Button>
        </div>

        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="space-y-3">
            {actions.isLoading ? (
              <div className="flex items-center py-6 text-sm text-[#6d7d74]">
                <Loader2 className="mr-2 size-4 animate-spin text-[#62856f]" />
                Checking for open items…
              </div>
            ) : actions.error ? (
              <div className="rounded-xl border border-[#edc8bb] bg-[#fff7f4] p-4 text-xs text-[#7b5249]">
                Action items could not be loaded.
              </div>
            ) : actions.data?.length ? (
              actions.data.slice(0, 5).map((action) => (
                <button
                  key={action.id}
                  onClick={() => setLocation(action.documentId ? `/documents/${action.documentId}` : action.taskId ? `/tasks/${action.taskId}` : "/tasks")}
                  className="flex w-full items-start gap-3.5 rounded-xl border border-[#e2d9c8] p-3.5 text-left transition hover:border-[#62856f] hover:bg-[#f7f3e9]"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#b77a43]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#24473e]">{action.title}</p>
                    <p className="mt-0.5 text-xs text-[#738078] leading-relaxed">
                      {action.description}
                    </p>
                    <span className="mt-2 inline-block text-[11px] font-semibold text-[#305949] underline">
                      {action.documentId ? "Verify Document" : "Open Task Checklist"} →
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-[#d7cdbb] p-5 text-xs text-[#6d7d74]">
                <CheckCircle2 className="size-5 shrink-0 text-[#62856f]" />
                <span>
                  Everything is in order! No pending document reviews or missing records.
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 4. Question 3: What can Prava help me do? */}
      <section className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6a887c]">
            Quick Actions
          </p>
          <h2 className="prava-display mt-1 text-2xl text-[#153832]">
            3. What can Prava help you do?
          </h2>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: Sparkles,
              title: "Ask Prava",
              desc: "Get instant plain-language answers about your finances.",
              path: "/assistant",
              highlight: true,
            },
            {
              icon: FileUp,
              title: "Upload Invoices or Bills",
              desc: "Extract vendor data, tax IDs, and totals automatically.",
              path: "/documents",
            },
            {
              icon: Receipt,
              title: "Prepare GST / Sales Tax",
              desc: "Check tax credits, find discrepancies, and ready for CA.",
              path: "/tax",
            },
            {
              icon: WalletCards,
              title: "Check Income & Expenses",
              desc: "See who owes you money and what you owe suppliers.",
              path: "/money",
            },
            {
              icon: UserCheck,
              title: "Send to CA for Review",
              desc: "Track returns currently being verified by your accountant.",
              path: "/ca-review",
            },
            {
              icon: Landmark,
              title: "Reconcile Bank Statement",
              desc: "Stage statement evidence and verify incoming payments.",
              path: "/tasks",
            },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => setLocation(item.path)}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-sm ${
                  item.highlight
                    ? "border-[#163a34] bg-[#163a34] text-[#f7f1e4]"
                    : "border-[#dfd6c4] bg-[#fffdf8] text-[#163a34] hover:border-[#62856f]"
                }`}
              >
                <div>
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      item.highlight
                        ? "bg-[#224b42] text-[#d9e8be]"
                        : "bg-[#efe9dc] text-[#335a4d]"
                    }`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <p className="mt-3.5 text-sm font-bold">{item.title}</p>
                  <p
                    className={`mt-1 text-xs leading-relaxed ${
                      item.highlight ? "text-[#c5d3ca]" : "text-[#708078]"
                    }`}
                  >
                    {item.desc}
                  </p>
                </div>
                <span
                  className={`mt-4 inline-flex items-center text-xs font-semibold ${
                    item.highlight ? "text-[#d9e8be]" : "text-[#345d50]"
                  }`}
                >
                  Start →
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Notification updates if any */}
      {gstNotifications.data?.length ? (
        <section className="rounded-2xl border border-[#d8dfd4] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <BellRing className="size-4 text-[#b77a43]" />
            <div>
              <p className="text-sm font-semibold text-[#153832]">Tax & CA Review Notices</p>
              <p className="text-xs text-[#75847c]">Latest updates on your filings</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {gstNotifications.data.slice(0, 4).map(({ notification, taskId }) => (
              <button
                key={notification.id}
                onClick={() => setLocation(`/tasks/${taskId}`)}
                className="rounded-xl border border-[#e1e8dc] p-3 text-left transition hover:bg-[#f7f3e9]"
              >
                <p className="text-sm font-semibold text-[#23473d]">{notification.subject}</p>
                <p className="mt-1 text-xs leading-5 text-[#6f8078]">{notification.body}</p>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#688175]">
                  {new Date(notification.createdAt).toLocaleString()} · Open workflow
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const businesses = trpc.businesses.list.useQuery(undefined, { retry: false });

  return (
    <DashboardLayout>
      {businesses.isLoading ? (
        <div className="grid min-h-[60vh] place-items-center text-sm text-muted-foreground">
          Loading your workspace…
        </div>
      ) : businesses.error ? (
        <div className="mx-auto mt-20 max-w-lg rounded-2xl border border-[#e4c4ba] bg-[#fff7f4] p-7">
          <AlertCircle className="size-5 text-[#b7523d]" />
          <h1 className="mt-4 text-lg font-semibold text-[#5c241c]">
            We could not load your workspace.
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#7b5249]">{businesses.error.message}</p>
          <Button onClick={() => businesses.refetch()} className="mt-5 rounded-full">
            Try again
          </Button>
        </div>
      ) : businesses.data?.[0] ? (
        <WorkspaceOverview business={businesses.data[0]} />
      ) : (
        <EmptyOverview onCreateWorkspace={() => setLocation("/onboarding")} />
      )}
    </DashboardLayout>
  );
}
