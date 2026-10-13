import { ElectricHorizonBackground } from "@/components/ElectricHorizonBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function CaLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const caLogin = useMutation({
    mutationFn: (body) => api.auth.caLogin(body),
    onSuccess: (data) => {
      toast.success("Welcome to the Chartered Accountant Portal.");
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      setLocation(data.redirectTo || "/ca/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    caLogin.mutate({ email, password });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#030405] text-[#F5F7FA] overflow-hidden selection:bg-blue-600/30 selection:text-white">
      {/* Planetary Horizon Glow */}
      <ElectricHorizonBackground variant="hero" />

      {/* Top Header */}
      <header className="relative z-10 border-b border-white/[0.08] bg-[#030405]/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 shadow-sm">
              <UserCheck className="size-5" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-white">
                Prava <span className="font-mono text-xs font-semibold uppercase tracking-wider text-blue-400">CA Portal</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="hidden sm:inline">Need client or administrator access?</span>
            <button
              onClick={() => setLocation("/admin/login")}
              className="font-semibold text-white hover:text-blue-400 transition"
            >
              Admin Login
            </button>
            <span>·</span>
            <button
              onClick={() => setLocation("/dashboard")}
              className="font-semibold text-white hover:text-blue-400 transition"
            >
              Workspace
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Info Column */}
          <div className="space-y-6">
            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              In-House Professional Verification
            </span>
            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.08] tracking-tight text-white">
              Qualified Chartered <span className="text-blue-400">Accountant Portal</span>.
            </h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Prava assigns dedicated Chartered Accountants to examine client tax returns, verify source invoice evidence, and provide statutory sign-offs before tax authorities receive any filing.
            </p>

            <div className="space-y-3.5 border-t border-white/[0.08] pt-6">
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                <span>
                  <strong className="text-white">Admin-Provisioned Access:</strong> CA credentials are created and managed exclusively by Prava Administrators.
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <FileCheck2 className="mt-0.5 size-4 shrink-0 text-blue-400" />
                <span>
                  <strong className="text-white">Independent Statutory Audit:</strong> Review ITC computations, sales registers, and issue official CA certificates.
                </span>
              </div>
              <div className="flex items-start gap-3 text-xs text-slate-300">
                <Lock className="mt-0.5 size-4 shrink-0 text-blue-400" />
                <span>
                  <strong className="text-white">Multi-Tenant Confidentiality:</strong> CAs only access client businesses explicitly assigned to them.
                </span>
              </div>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#07090E] p-8 shadow-[0_8px_32px_rgba(0,0,0,0.8)] sm:p-10">
            <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
            <div className="pointer-events-none absolute left-1/2 -top-12 h-20 w-1/2 -translate-x-1/2 rounded-full bg-blue-500/10 blur-xl" />

            <div className="relative z-10 mb-6">
              <div className="flex size-11 items-center justify-center rounded-2xl border border-blue-500/30 bg-blue-500/15 text-blue-400 shadow-sm">
                <KeyRound className="size-5" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-white">CA Sign In</h2>
              <p className="mt-1 text-xs text-slate-400">
                Enter your administrator-granted Chartered Accountant credentials to open your review desk.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ca-email" className="text-xs text-slate-300">
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
                    className="h-11 rounded-xl border-white/[0.1] bg-[#0B0E14] pl-10 text-xs text-white placeholder:text-slate-500 shadow-sm focus:border-blue-500/60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ca-password" className="text-xs text-slate-300">
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
                    className="h-11 rounded-xl border-white/[0.1] bg-[#0B0E14] pl-10 text-xs text-white placeholder:text-slate-500 shadow-sm focus:border-blue-500/60"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={caLogin.isPending || !email || !password}
                className="mt-2 h-11 w-full inline-flex items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:bg-blue-500 transition disabled:opacity-50"
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
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
