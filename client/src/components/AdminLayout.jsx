import { useAuth } from "@/_core/hooks/useAuth";
import { PravaLogoIcon, PravaMark } from "@/components/PravaMark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  Building2,
  Cpu,
  CreditCard,
  Database,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  Globe,
  LayoutDashboard,
  Layers,
  LogOut,
  Menu,
  RefreshCw,
  Scale,
  Server,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const adminNavGroups = [
  {
    category: "TELEMETRY & HEALTH",
    items: [
      { icon: LayoutDashboard, label: "Platform Overview", path: "/admin" },
      { icon: Activity, label: "Platform Analytics", path: "/admin/analytics" },
    ],
  },
  {
    category: "OPERATIONS & PIPELINE",
    items: [
      { icon: Building2, label: "Business Directory", path: "/admin/businesses" },
      { icon: Cpu, label: "OCR Queue & Health", path: "/admin/ocr" },
      { icon: FileSpreadsheet, label: "GST Submissions", path: "/admin/gst" },
    ],
  },
  {
    category: "GOVERNANCE & CONTROL",
    items: [
      { icon: Scale, label: "Chartered Accountants", path: "/admin/cas" },
      { icon: CreditCard, label: "Billing & Plans", path: "/admin/billing" },
      { icon: ShieldCheck, label: "Security & Audit Trail", path: "/admin/security" },
      { icon: Wrench, label: "Integration Gateway", path: "/admin/integrations" },
    ],
  },
];

export default function AdminLayout({ children, title, subtitle }) {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Authorization check: If logged in but not admin, show forbidden screen
  if (user && user.role !== "admin") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#06090F] px-6 text-center text-slate-300">
        <div className="max-w-md rounded-2xl border border-red-500/30 bg-[#0B0F19] p-8 shadow-2xl">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <ShieldAlert className="size-6" />
          </div>
          <h1 className="mt-4 text-lg font-bold text-white">Platform Administration Restricted</h1>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Your authenticated account ({user.email}) does not have administrative clearance for the Prava platform infrastructure.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button
              className="w-full bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
              onClick={() => setLocation("/dashboard")}
            >
              Return to Business Workspace
            </Button>
            <Button
              variant="outline"
              className="w-full border-slate-800 text-xs text-slate-400 hover:text-white"
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isCurrent = (p) => {
    if (p === "/admin") return location === "/admin" || location === "/admin/dashboard";
    return location === p || location.startsWith(`${p}/`);
  };

  return (
    <div className="flex min-h-screen bg-[#070A11] text-slate-200 antialiased font-sans">
      {/* Desktop Admin Left Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/80 bg-[#090D17]">
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <PravaLogoIcon size="sm" />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1 leading-none">
                <span className="font-serif text-sm font-bold tracking-tight text-white">Prava</span>
                <span className="text-[8px] font-mono font-bold tracking-widest text-emerald-400 uppercase">
                  OS
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold tracking-widest text-blue-400 uppercase mt-1">
                ADMIN CONSOLE
              </span>
            </div>
          </Link>
          <span className="flex size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" title="System Operational" />
        </div>

        {/* Navigation Groups */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {adminNavGroups.map((group) => (
            <div key={group.category} className="space-y-1">
              <p className="px-3 text-[10px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
                {group.category}
              </p>
              <div className="space-y-0.5 pt-1">
                {group.items.map((item) => {
                  const active = isCurrent(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-all ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold"
                          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-100"
                      }`}
                    >
                      <Icon className={`size-4 ${active ? "text-white" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer: Back to Workspace */}
        <div className="border-t border-slate-800/80 p-3 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-slate-300 hover:border-blue-500/40 hover:text-white transition"
          >
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-blue-400" />
              <span>Business Workspace</span>
            </div>
            <ArrowLeft className="size-3 text-slate-500 rotate-180" />
          </Link>

          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-400">
            <span className="font-mono">v1.2 · Enterprise</span>
            <span className="font-mono text-emerald-400">Node Online</span>
          </div>
        </div>
      </aside>

      {/* Main Administrative Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Admin Top Navbar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#090D17]/80 px-6 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden inline-flex size-9 items-center justify-center rounded-xl border border-slate-800 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase text-blue-400 border border-blue-500/20">
                  PLATFORM CORE
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">/</span>
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline">
                  {title || "Overview"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition"
            >
              <span>Exit Admin Console</span>
              <ExternalLink className="size-3 text-slate-500" />
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-1.5 pr-3 text-xs text-slate-300 hover:border-slate-700 transition">
                  <Avatar className="size-7 rounded-lg border border-slate-700">
                    <AvatarFallback className="bg-blue-600 text-white font-bold text-xs">
                      {user?.name?.slice(0, 2).toUpperCase() || "AD"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-semibold text-white leading-none">{user?.name || "Admin"}</p>
                    <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">Super Administrator</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-slate-800 bg-[#0B0F19] text-slate-200">
                <div className="p-2 border-b border-slate-800">
                  <p className="text-xs font-semibold text-white">{user?.name || "Administrator"}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => setLocation("/admin/security")}
                  className="cursor-pointer text-xs hover:bg-slate-800"
                >
                  <ShieldCheck className="mr-2 size-4 text-blue-400" />
                  Security & Password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setLocation("/dashboard")}
                  className="cursor-pointer text-xs hover:bg-slate-800"
                >
                  <Building2 className="mr-2 size-4 text-slate-400" />
                  Open Business Workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="mr-2 size-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-[#090D17] px-4 py-4 space-y-4">
            {adminNavGroups.map((g) => (
              <div key={g.category} className="space-y-1">
                <p className="text-[10px] font-mono text-slate-400 uppercase">{g.category}</p>
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {g.items.map((it) => (
                    <Link
                      key={it.path}
                      href={it.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                        isCurrent(it.path) ? "bg-blue-600 text-white font-semibold" : "text-slate-400 hover:bg-slate-800"
                      }`}
                    >
                      <it.icon className="size-3.5" />
                      <span>{it.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            {(title || subtitle) && (
              <div className="border-b border-slate-800/80 pb-4">
                {title && <h1 className="text-xl font-bold tracking-tight text-white">{title}</h1>}
                {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
