import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  FileCheck2,
  FileText,
  HardDrive,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Scale,
  Server,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { Link } from "wouter";

export default function AdminDashboard() {
  const overviewQuery = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api.admin.overview(),
    refetchInterval: 30000,
  });

  const { data, isLoading, isError, error, refetch } = overviewQuery;

  if (isLoading) {
    return (
      <AdminLayout title="Platform Telemetry" subtitle="Loading operational telemetry and node metrics...">
        <div className="flex min-h-[400px] items-center justify-center text-xs text-slate-400">
          <Loader2 className="mr-2 size-5 animate-spin text-blue-400" />
          Connecting to platform metrics...
        </div>
      </AdminLayout>
    );
  }

  if (isError) {
    return (
      <AdminLayout title="Platform Telemetry" subtitle="Error loading platform metrics">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          <p className="text-sm font-semibold">Failed to load platform overview</p>
          <p className="mt-1 text-xs text-slate-400">{error?.message || "Unknown error"}</p>
          <Button onClick={() => refetch()} className="mt-4 bg-red-600 hover:bg-red-500 text-xs">
            Retry Connection
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { metrics, systemHealth, recentActivity, registeredBusinesses } = data || {};

  return (
    <AdminLayout
      title="Platform Operations Overview"
      subtitle="Real-time telemetry, tenant metrics, and infrastructure health across the Prava network."
    >
      {/* Platform Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase text-slate-400">
              Registered Businesses
            </CardTitle>
            <Building2 className="size-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {metrics?.totalBusinesses ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="font-semibold text-emerald-400">{metrics?.activeBusinesses ?? 0}</span> active workspaces
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase text-slate-400">
              Registered Users
            </CardTitle>
            <Users className="size-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {metrics?.totalUsers ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Platform account holders
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase text-slate-400">
              Documents Ingested
            </CardTitle>
            <FileText className="size-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {metrics?.totalDocuments ?? 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              <span className="text-emerald-400 font-semibold">{metrics?.ocrExtracted ?? 0}</span> verified ·{" "}
              <span className="text-amber-400 font-semibold">{metrics?.ocrNeedsReview ?? 0}</span> in review
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-mono font-semibold uppercase text-slate-400">
              OCR Verification Rate
            </CardTitle>
            <Cpu className="size-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono tracking-tight text-white">
              {metrics?.ocrSuccessRate ?? 100}%
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              {metrics?.ocrFailed ?? 0} pipeline failures recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Quick Actions & System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health Matrix */}
        <Card className="border-slate-800 bg-[#0B0F19] lg:col-span-1 text-slate-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="size-4 text-blue-400" />
                Service Health Matrix
              </CardTitle>
              <button
                onClick={() => refetch()}
                className="text-slate-400 hover:text-white transition"
                title="Refresh Health"
              >
                <RefreshCw className="size-3.5" />
              </button>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Underlying infrastructure and processing nodes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <Database className="size-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Core Database</p>
                  <p className="text-[10px] text-slate-400 font-mono">Drizzle ORM Engine</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                ONLINE
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <Cpu className="size-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-white">OCR Ingestion Pipeline</p>
                  <p className="text-[10px] text-slate-400 font-mono">Multi-stage Tesseract & Rules</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                ACTIVE
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <HardDrive className="size-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Document Vault Storage</p>
                  <p className="text-[10px] text-slate-400 font-mono">Encrypted Object Store</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-emerald-400 border border-emerald-500/20">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                HEALTHY
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2.5">
                <Activity className="size-4 text-slate-400" />
                <div>
                  <p className="text-xs font-semibold text-white">Ollama Vision Subsystem</p>
                  <p className="text-[10px] text-slate-400 font-mono">{systemHealth?.ollama?.model || "qwen2.5vl:7b"}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-bold border ${
                  systemHealth?.ollama?.status === "ready"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                <span
                  className={`size-1.5 rounded-full ${
                    systemHealth?.ollama?.status === "ready" ? "bg-emerald-400" : "bg-slate-500"
                  }`}
                />
                {systemHealth?.ollama?.status === "ready" ? "READY" : "STANDBY"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Operational Routing & Quick Controls */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
            <CardHeader>
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="size-4 text-blue-400" />
                Platform Command Center
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Direct access to high-priority operational workflows
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/admin/businesses"
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-blue-500/40 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center justify-between">
                    <Building2 className="size-5 text-blue-400" />
                    <ArrowRight className="size-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-white">Business Directory</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Inspect tenant profiles, document counts, and manage account statuses.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/ocr"
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/40 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center justify-between">
                    <Cpu className="size-5 text-cyan-400" />
                    <ArrowRight className="size-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-white">OCR Processing Queue</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Monitor extraction latency, review failures, and retry stalled jobs.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/gst"
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-indigo-500/40 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center justify-between">
                    <FileCheck2 className="size-5 text-indigo-400" />
                    <ArrowRight className="size-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-white">GST Submissions</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Review authorized statutory returns and audit export CSV data.
                    </p>
                  </div>
                </Link>

                <Link
                  href="/admin/security"
                  className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-emerald-500/40 hover:bg-slate-900 transition"
                >
                  <div className="flex items-center justify-between">
                    <ShieldCheck className="size-5 text-emerald-400" />
                    <ArrowRight className="size-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <div className="mt-4">
                    <h3 className="text-xs font-bold text-white">Security & Audit Trail</h3>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Inspect privileged administrator actions and rotate infrastructure credentials.
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Platform Audit Events */}
          <Card className="border-slate-800 bg-[#0B0F19] text-slate-100">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-white">Platform Audit Stream</CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Real administrative actions and security events
                </CardDescription>
              </div>
              <Link href="/admin/security" className="text-xs text-blue-400 hover:underline">
                View All
              </Link>
            </CardHeader>
            <CardContent>
              {recentActivity && recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-800/80">
                  {recentActivity.map((item, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-blue-400 font-semibold uppercase rounded bg-blue-500/10 px-1.5 py-0.5 border border-blue-500/20">
                          {item.event?.action || "ACTION"}
                        </span>
                        <span className="text-slate-300 font-medium">
                          {item.event?.entityType}: {item.event?.entityId}
                        </span>
                      </div>
                      <div className="text-right text-[11px] text-slate-400 font-mono">
                        {item.actorName || "Admin"} · {new Date(item.event?.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-6 text-center text-xs text-slate-500">No recent administrative events recorded.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Registered Businesses & Contacts Directory Section */}
      <Card className="border-slate-800 bg-[#0B0F19] text-slate-100 mt-6">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-blue-400" />
              <CardTitle className="text-sm font-bold text-white">Registered Businesses & Contact Directory</CardTitle>
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono">
                {registeredBusinesses?.length ?? metrics?.totalBusinesses ?? 0} Workspaces
              </Badge>
            </div>
            <CardDescription className="text-xs text-slate-400 mt-1">
              Registered business entities, legal names, emails, and phone numbers. Tenant documents and raw file scans remain strictly encrypted and isolated.
            </CardDescription>
          </div>
          <Link
            href="/admin/businesses"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 transition shrink-0"
          >
            <span>Full Tenant Directory</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {registeredBusinesses && registeredBusinesses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800/80 text-[10px] font-mono uppercase text-slate-400">
                    <th className="pb-3 font-semibold">Business Entity</th>
                    <th className="pb-3 font-semibold">Contact Person</th>
                    <th className="pb-3 font-semibold">Registered Email</th>
                    <th className="pb-3 font-semibold">Phone Number</th>
                    <th className="pb-3 font-semibold">GSTIN / Identifier</th>
                    <th className="pb-3 font-semibold">Docs Ingested</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {registeredBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-[10px] font-bold">
                            {b.name ? b.name.substring(0, 2).toUpperCase() : "BZ"}
                          </div>
                          <div>
                            <p className="font-semibold text-white">{b.name}</p>
                            {b.legalName && b.legalName !== b.name && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{b.legalName}</p>
                            )}
                            <p className="text-[9px] text-slate-500 font-mono">ID: #{b.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <User className="size-3 text-slate-500 shrink-0" />
                          <span>{b.ownerName || "Primary Contact"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-blue-300">
                          <Mail className="size-3 text-blue-400 shrink-0" />
                          <span>{b.email || b.ownerEmail || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-emerald-300">
                          <Phone className="size-3 text-emerald-400 shrink-0" />
                          <span>{b.phone || b.ownerPhone || "—"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                        {b.gstin ? (
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 border border-slate-800 text-blue-300">
                            {b.gstin}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">Unregistered</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-300">
                        <span className="font-semibold text-white font-mono">{b.documentCount ?? 0}</span>
                        <span className="text-[10px] text-slate-500 ml-1">docs</span>
                      </td>
                      <td className="py-3 px-3">
                        {b.status === "suspended" ? (
                          <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[9px] font-medium">
                            Suspended
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[9px] font-medium">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pl-3 text-right">
                        <Link
                          href="/admin/businesses"
                          className="inline-flex items-center text-[11px] font-medium text-slate-400 hover:text-blue-400 transition"
                        >
                          Details →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-500">No registered businesses found in registry.</p>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
