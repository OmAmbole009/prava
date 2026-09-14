import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { SEED_CA_DEFAULT_PASSWORD, SEED_CA_EMAIL } from "@shared/const";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileCheck2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CaLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  const caLogin = trpc.auth.caLogin.useMutation({
    onSuccess: (data) => {
      toast.success("Welcome to the Chartered Accountant Portal.");
      void utils.auth.me.invalidate();
      setLocation(data.redirectTo || "/ca/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    caLogin.mutate({ email, password });
  };

  const handleFillDemoCredentials = () => {
    setEmail(SEED_CA_EMAIL);
    setPassword(SEED_CA_DEFAULT_PASSWORD);
    toast.info("Filled with pre-seeded In-House CA credentials for local evaluation.");
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 dark:border-white/[0.06] bg-white/80 dark:bg-[#080B0F]/80 backdrop-blur-xl px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm">
              <UserCheck className="size-5" />
            </div>
            <div>
              <span className="font-['Playfair_Display',Georgia,serif] text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                Prava <span className="font-mono text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">CA Portal</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span className="hidden sm:inline">Need client or administrator access?</span>
            <button
              onClick={() => setLocation("/admin/login")}
              className="font-bold text-slate-900 dark:text-white hover:underline"
            >
              Admin Login
            </button>
            <span>·</span>
            <button
              onClick={() => setLocation("/dashboard")}
              className="font-bold text-slate-900 dark:text-white hover:underline"
            >
              Workspace
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Info Column */}
          <div className="space-y-6">
            <span className="prava-tag-purple">In-House Professional Verification</span>
            <h1 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal leading-[1.08] tracking-tight text-slate-900 dark:text-white">
              Qualified Chartered <em className="italic font-normal">Accountant Portal</em>.
            </h1>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Prava assigns dedicated Chartered Accountants to examine client tax returns, verify source invoice evidence, and provide statutory sign-offs before tax authorities receive any filing.
            </p>

            <div className="space-y-3.5 border-t border-slate-200/80 dark:border-white/[0.08] pt-6">
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Admin-Provisioned Access:</strong> CA credentials are created and managed exclusively by Prava Administrators.
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <FileCheck2 className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-400" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Independent Statutory Audit:</strong> Review ITC computations, sales registers, and issue official CA certificates.
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-700 dark:text-slate-300">
                <Lock className="mt-0.5 size-4 shrink-0 text-purple-600 dark:text-purple-400" />
                <span>
                  <strong className="text-slate-900 dark:text-white">Multi-Tenant Confidentiality:</strong> CAs only access client businesses explicitly assigned to them.
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-purple-400/30 bg-purple-500/[0.05] p-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wider text-purple-600 dark:text-purple-400 font-bold">Local Demo Testing</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemoCredentials}
                  className="h-7 rounded-lg border-purple-400/40 bg-purple-500/10 text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 shadow-sm"
                >
                  <Sparkles className="mr-1.5 size-3" />
                  Auto-fill CA Credentials
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Pre-configured account: <code className="font-mono font-bold text-slate-900 dark:text-white">{SEED_CA_EMAIL}</code>
              </p>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="prava-panel p-8 shadow-2xl border border-slate-200/80 dark:border-white/10 sm:p-10">
            <div className="mb-6">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shadow-sm">
                <KeyRound className="size-5" />
              </div>
              <h2 className="font-['Playfair_Display',Georgia,serif] mt-4 text-2xl font-normal text-slate-900 dark:text-white">CA Sign In</h2>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Enter your administrator-granted Chartered Accountant credentials to open your review desk.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ca-email" className="text-xs text-slate-700 dark:text-slate-300">
                  Account Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="ca-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ca.name@prava.audit"
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-xs text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0D131A] dark:text-white shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ca-password" className="text-xs text-slate-700 dark:text-slate-300">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <Input
                    id="ca-password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="h-11 rounded-xl border-slate-200 bg-white pl-10 text-xs text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-[#0D131A] dark:text-white shadow-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={caLogin.isPending || !email || !password}
                className="mt-2 h-11 w-full rounded-xl bg-slate-900 text-xs font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-100"
              >
                {caLogin.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Authenticating CA Profile…
                  </>
                ) : (
                  <>
                    Sign In to CA Review Desk
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
