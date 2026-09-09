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
  ShieldAlert,
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
    <div className="flex min-h-screen flex-col bg-[#f7f3e9] text-[#1c3e37]">
      {/* Top Header */}
      <header className="border-b border-[#ded3bf] bg-[#fffdf8] px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#163a34] text-[#f7f1e4]">
              <UserCheck className="size-5 text-[#d9e8be]" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-[#163a34]">
                Prava <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#6a887c]">CA Portal</span>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#627269]">
            <span className="hidden sm:inline">Need client or administrator access?</span>
            <button
              onClick={() => setLocation("/admin/login")}
              className="font-semibold text-[#163a34] underline hover:text-[#0b221e]"
            >
              Admin Login
            </button>
            <span>·</span>
            <button
              onClick={() => setLocation("/dashboard")}
              className="font-semibold text-[#163a34] underline hover:text-[#0b221e]"
            >
              Workspace
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Info Column */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#b8cca8] bg-[#eef5e9] px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#244b3f]">
              <BadgeCheck className="size-4 text-[#437a63]" />
              In-House Professional Verification
            </div>
            <h1 className="prava-display text-4xl font-extrabold leading-[1.08] text-[#143831] sm:text-5xl">
              Qualified Chartered Accountant Portal.
            </h1>
            <p className="text-base leading-relaxed text-[#566c62]">
              Prava assigns dedicated Chartered Accountants to examine client tax returns, verify source invoice evidence, and provide statutory sign-offs before tax authorities receive any filing.
            </p>

            <div className="space-y-3.5 border-t border-[#dfd6c4] pt-6">
              <div className="flex items-start gap-3 text-sm text-[#274a3f]">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[#3c765f]" />
                <span>
                  <strong>Admin-Provisioned Access:</strong> CA credentials are created and managed exclusively by Prava Administrators.
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-[#274a3f]">
                <FileCheck2 className="mt-0.5 size-5 shrink-0 text-[#3c765f]" />
                <span>
                  <strong>Independent Statutory Audit:</strong> Review ITC computations, sales registers, and issue official CA certificates.
                </span>
              </div>
              <div className="flex items-start gap-3 text-sm text-[#274a3f]">
                <Lock className="mt-0.5 size-5 shrink-0 text-[#3c765f]" />
                <span>
                  <strong>Multi-Tenant Confidentiality:</strong> CAs only access client businesses explicitly assigned to them.
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[#cfe0c8] bg-[#f0f7ec] p-4 text-xs text-[#2b5646]">
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[#204437]">Local Demo Testing</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleFillDemoCredentials}
                  className="h-7 rounded-full border-[#a8c29b] bg-white text-[11px] font-semibold text-[#1a443b] hover:bg-[#e7f1e1]"
                >
                  <Sparkles className="mr-1.5 size-3 text-[#39725d]" />
                  Auto-fill CA Credentials
                </Button>
              </div>
              <p className="mt-1 text-[#456b5b]">
                Pre-configured account: <code className="font-mono font-bold text-[#143831]">{SEED_CA_EMAIL}</code>
              </p>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="rounded-3xl border border-[#ded3bf] bg-[#fffdf8] p-8 shadow-[0_20px_50px_rgba(20,56,49,0.08)] sm:p-10">
            <div className="mb-6">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-[#163a34] text-[#d9e8be]">
                <KeyRound className="size-5" />
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#153832]">CA Sign In</h2>
              <p className="mt-1 text-xs text-[#6e8076]">
                Enter your administrator-granted Chartered Accountant credentials to open your review desk.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ca-email" className="text-xs font-semibold uppercase tracking-wider text-[#35584e]">
                  CA Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 size-4 text-[#7e9287]" />
                  <Input
                    id="ca-email"
                    type="email"
                    placeholder="ca.name@prava.internal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 rounded-xl border-[#dcd1be] bg-white pl-10 text-sm focus-visible:ring-[#163a34]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ca-password" className="text-xs font-semibold uppercase tracking-wider text-[#35584e]">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 size-4 text-[#7e9287]" />
                  <Input
                    id="ca-password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 rounded-xl border-[#dcd1be] bg-white pl-10 text-sm focus-visible:ring-[#163a34]"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={caLogin.isPending || !email || !password}
                className="mt-2 h-11 w-full rounded-xl bg-[#163a34] text-sm font-semibold text-[#f7f1e4] shadow-md transition hover:bg-[#0e2723] active:scale-[0.98]"
              >
                {caLogin.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Verifying Credentials…
                  </>
                ) : (
                  <>
                    Sign In to CA Desk
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-xl border border-[#ece4d6] bg-[#faf6ee] p-3 text-center text-[11px] text-[#718279]">
              <span className="font-semibold text-[#1a443b]">Access Policy:</span> Only Chartered Accountants verified and granted by Prava Administrators can access this console.
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#ded3bf] bg-[#fffdf8] py-4 text-center text-xs text-[#75847c]">
        © 2026 Prava Chartered Accountant Compliance Network. Protected by administrative role authorization.
      </footer>
    </div>
  );
}
