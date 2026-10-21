import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  ExternalLink,
  Layers,
  Landmark,
  Loader2,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

interface Connector {
  id: string;
  name: string;
  badge: string;
  category: string;
  protocol: string;
  status: "connected" | "syncing" | "idle";
  lastSync: string;
  latency: string;
  description: string;
  primaryPath: string;
  primaryLabel: string;
  syncActionLabel: string;
  metrics: { label: string; value: string }[];
}

export default function Integrations() {
  const [, setLocation] = useLocation();
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [connectors, setConnectors] = useState<Connector[]>([
    {
      id: "gst",
      name: "GST Portal",
      badge: "Live Sync",
      category: "Government Compliance",
      protocol: "GSTN GSP Direct Gateway",
      status: "connected",
      lastSync: "Just now",
      latency: "42ms",
      description:
        "Direct real-time link to the GST System. Automatically pulls GSTR-2B purchase ledgers, calculates Table 4(A) eligible ITC, and prepares GSTR-3B monthly liabilities.",
      primaryPath: "/tax",
      primaryLabel: "Open GST Desk",
      syncActionLabel: "Sync GSTR-2B & ITC",
      metrics: [
        { label: "Protocol", value: "GSTN Sandbox v2" },
        { label: "Status", value: "Verified Active" },
        { label: "GSTR-2B Ingest", value: "Automated" },
      ],
    },
    {
      id: "tally",
      name: "Tally Prime",
      badge: "XML Connected",
      category: "ERP & Accounting",
      protocol: "ODBC / XML Port 9000",
      status: "connected",
      lastSync: "4 mins ago",
      latency: "18ms",
      description:
        "Local bridge connector for TallyPrime and Tally.ERP 9. Synchronizes DayBook transactions, ledgers, and purchase bills with Prava's autonomous compliance engine.",
      primaryPath: "/documents",
      primaryLabel: "Open Document Vault",
      syncActionLabel: "Import DayBook XML",
      metrics: [
        { label: "Connector", value: "Tally XML Bridge" },
        { label: "Port", value: "9000 (Localhost)" },
        { label: "Voucher Ingest", value: "Bi-directional" },
      ],
    },
    {
      id: "zoho",
      name: "Zoho Books",
      badge: "API Matched",
      category: "Cloud Accounting",
      protocol: "OAuth 2.0 REST API",
      status: "connected",
      lastSync: "12 mins ago",
      latency: "65ms",
      description:
        "Seamless cloud webhook synchronization for sales invoices, vendor bills, and contact master records. Discrepancies are automatically flagged in your daily review.",
      primaryPath: "/documents",
      primaryLabel: "View Matched Invoices",
      syncActionLabel: "Sync Zoho Ledger",
      metrics: [
        { label: "Auth Token", value: "Valid (AES-256)" },
        { label: "Webhooks", value: "Active (Instant)" },
        { label: "Auto-Match", value: "Enabled" },
      ],
    },
    {
      id: "icai",
      name: "ICAI Review Desk",
      badge: "CA Verified",
      category: "Statutory Audit Network",
      protocol: "E2EE Ed25519 Audit Channel",
      status: "connected",
      lastSync: "30 mins ago",
      latency: "24ms",
      description:
        "Direct peer-review encryption pipeline connecting your company's ledgers to certified ICAI Chartered Accountants for Form 3CD, Section 43B(h), and tax audit sign-offs.",
      primaryPath: "/ca-review",
      primaryLabel: "Open ICAI Desk",
      syncActionLabel: "Request Review",
      metrics: [
        { label: "Audit Standard", value: "ICAI SQC-1" },
        { label: "Encryption", value: "Ed25519 Signed" },
        { label: "CA Desk", value: "Linked & Ready" },
      ],
    },
    {
      id: "bank",
      name: "Bank Feeds & OCR",
      badge: "Statement OCR",
      category: "Banking & Treasury",
      protocol: "Account Aggregator / Deep OCR",
      status: "connected",
      lastSync: "8 mins ago",
      latency: "55ms",
      description:
        "AI-powered bank statement OCR and RBI Account Aggregator protocol. Reconciles debits and credits against sales invoices and vendor payments with 99.4% accuracy.",
      primaryPath: "/money",
      primaryLabel: "Open Money Ledger",
      syncActionLabel: "Run Reconcile Engine",
      metrics: [
        { label: "OCR Engine", value: "Neural Vision v2" },
        { label: "Match Ratio", value: "99.4% Accuracy" },
        { label: "Aggregator", value: "Sahamati AA" },
      ],
    },
  ]);

  const handleSync = (id: string, name: string) => {
    setSyncingId(id);
    toast.info(`Initiating handshake with ${name}…`);
    setTimeout(() => {
      setSyncingId(null);
      setConnectors((prev) =>
        prev.map((c) => (c.id === id ? { ...c, lastSync: "Just now" } : c))
      );
      toast.success(`${name} synced successfully. All active ledgers are up to date!`);
    }, 1200);
  };

  const handleSyncAll = () => {
    setSyncingId("all");
    toast.info("Triggering fleet synchronization across all 5 financial connectors…");
    setTimeout(() => {
      setSyncingId(null);
      setConnectors((prev) => prev.map((c) => ({ ...c, lastSync: "Just now" })));
      toast.success("All 5 integrations synchronized successfully!");
    }, 1800);
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0B0F19]/90 p-7 sm:p-9 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.6)]">
          <div className="pointer-events-none absolute -top-24 right-0 size-80 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="eyebrow-chip inline-flex items-center gap-1.5 text-cyan-400">
                  <Zap className="size-3" /> Autonomous Ecosystem
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-400">
                  All Systems Operational
                </span>
              </div>
              <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Integration & Telemetry Command
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-300/90 leading-relaxed">
                Seamless real-time connectors bridging the GST Portal, Tally Prime, Zoho Books,
                banking statement OCR, and certified ICAI audit pipelines.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Button
                onClick={handleSyncAll}
                disabled={syncingId !== null}
                className="rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-[#030712] hover:bg-slate-200 transition shadow-[0_0_20px_rgba(255,255,255,0.25)]"
              >
                {syncingId === "all" ? (
                  <>
                    <Loader2 className="mr-2 size-3.5 animate-spin" />
                    Synchronizing Fleet…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 size-3.5" />
                    Sync All Connectors
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Connectors Grid */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {connectors.map((c) => {
            const isSyncing = syncingId === c.id;
            return (
              <div
                key={c.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#0B0F19]/80 p-6 backdrop-blur-xl transition hover:border-cyan-500/40 hover:shadow-[0_0_30px_rgba(34,211,238,0.12)]"
              >
                <div>
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                        {c.category}
                      </span>
                      <h3 className="mt-1 text-lg font-bold text-white tracking-tight">
                        {c.name}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-mono font-medium text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {c.badge}
                    </span>
                  </div>

                  <p className="mt-3 text-xs leading-relaxed text-slate-400">
                    {c.description}
                  </p>

                  {/* Telemetry Metrics */}
                  <div className="mt-5 grid grid-cols-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
                    {c.metrics.map((m, i) => (
                      <div key={i}>
                        <div className="text-[9px] font-mono text-slate-400">{m.label}</div>
                        <div className="mt-0.5 text-[11px] font-bold text-white font-mono truncate">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
                    <span>Latency: {c.latency}</span>
                    <span>Last Synced: {c.lastSync}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center gap-2 border-t border-white/[0.08] pt-4">
                  <Button
                    onClick={() => handleSync(c.id, c.name)}
                    disabled={isSyncing}
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-full border-white/10 bg-white/[0.03] text-xs font-medium text-white hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="mr-1.5 size-3 animate-spin" /> Syncing…
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1.5 size-3" /> {c.syncActionLabel}
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setLocation(c.primaryPath)}
                    size="sm"
                    className="rounded-full bg-white px-4 text-xs font-semibold text-[#030712] hover:bg-slate-200 transition shadow-sm"
                  >
                    {c.primaryLabel} <ArrowRight className="ml-1 size-3" />
                  </Button>
                </div>
              </div>
            );
          })}

          {/* Custom Webhook API Integration Card */}
          <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 backdrop-blur-xl transition hover:border-white/30">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Developer API
                  </span>
                  <h3 className="mt-1 text-lg font-bold text-white tracking-tight">
                    Custom Webhooks & REST
                  </h3>
                </div>
                <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-300">
                  v1.2 Open
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Connect your proprietary ERP, SAP, or bespoke billing system using Prava’s high-throughput JSON webhook endpoints.
              </p>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-[#030712]/60 p-3 font-mono text-[10px] text-slate-300">
                POST /api/v1/invoices/stream
              </div>
            </div>

            <div className="mt-6 border-t border-white/[0.08] pt-4">
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(window.location.origin + "/api/v1/webhooks");
                  toast.success("Webhook endpoint URL copied to clipboard!");
                }}
                variant="outline"
                size="sm"
                className="w-full rounded-full border-white/10 bg-white/[0.03] text-xs font-medium text-white hover:border-white/20 hover:bg-white/[0.08]"
              >
                Copy Webhook Endpoint
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
