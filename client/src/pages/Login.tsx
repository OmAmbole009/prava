import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const utils = trpc.useUtils();

  const isSuperAdminEmail = email.trim().toLowerCase() === "omambole2007@gmail.com";

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      void utils.auth.me.invalidate();
      void utils.businesses.list.invalidate();
      if (data.role === "admin") {
        toast.success("Administrator access authenticated. Opening Admin Console…", {
          description: `Logged in as Super Admin (${data.user.name})`,
        });
        window.location.href = data.redirectTo || "/admin/billing";
      } else {
        toast.success(
          data.hasWorkspace
            ? `Welcome back to Prava!`
            : `Business account created! Let's configure your business info.`,
          {
            description: `Session active for ${data.user.name || data.user.email}`,
          }
        );
        window.location.href = data.redirectTo || "/dashboard";
      }
    },
    onError: (error) => {
      toast.error(error.message || "Unable to sign in. Please verify your credentials.");
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter your email and password.");
      return;
    }
    if (mode === "register" && !companyName.trim()) {
      toast.error("Please enter your Company / Business Name to set up your workspace.");
      return;
    }
    loginMutation.mutate({
      email,
      password,
      companyName: companyName.trim() || undefined,
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="border-b border-border/60 bg-card/60 px-6 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
            <PravaMark size="md" />
            <span className="font-['Playfair_Display',Georgia,serif] text-xl font-bold tracking-tight text-foreground">
              Prava
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/ca/login")}
              className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3.5 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400 transition hover:bg-purple-500/20"
            >
              <GraduationCap className="size-3.5" />
              <span>CA Verification Portal</span>
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Center Form Section */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: Context & Overview */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production-Grade Compliance & Storage</span>
            </div>

            <h1 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal leading-[1.1] tracking-tight text-foreground">
              Autonomous Tax, Ledgers & <em className="italic font-normal">Audit Compliance</em>.
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Sign in to manage real Indian corporate returns, Section 43B(h) MSME compliance, GSTR-2B vs 3B
              reconciliations, and Supabase cloud document vaults.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5 backdrop-blur-sm">
                <ShieldCheck className="size-5 shrink-0 text-emerald-500 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Unified Role Intelligence: </span>
                  <span className="text-muted-foreground">
                    Entering admin credentials automatically elevates your session into the governance console; businesses land in their operational dashboard.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5 backdrop-blur-sm">
                <Building2 className="size-5 shrink-0 text-primary mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Cloud Storage Connected: </span>
                  <span className="text-muted-foreground">
                    Backed by Supabase document storage for high-security invoice parsing and signed statutory filing archives.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Box */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-7 shadow-2xl backdrop-blur-2xl">
              {/* Segmented Mode Selector */}
              <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1 border border-border/60">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    mode === "signin"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Business Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className={`rounded-xl py-2 text-xs font-bold transition-all ${
                    mode === "register"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Register New Business
                </button>
              </div>

              {/* Dynamic Role Banner */}
              <div className="mb-6 flex items-center justify-between border-b border-border/60 pb-5">
                <div>
                  <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl font-bold tracking-tight text-foreground">
                    {mode === "register" ? "Register Your Business" : isSuperAdminEmail ? "Administrator Console" : "Business Sign In"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode === "register"
                      ? "Create an account to configure your entity profile, GSTIN & launch CA works"
                      : isSuperAdminEmail
                      ? "Elevated system operator credentials detected"
                      : "Enter your registered credentials to access your organization workspace"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
                  {mode === "register" ? <Sparkles className="size-3.5 text-primary" /> : <Lock className="size-3.5" />}
                  <span>{mode === "register" ? "Instant Setup" : "Secure Login"}</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="login-company" className="text-xs font-semibold text-foreground">
                      Company / Business Legal Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="login-company"
                        type="text"
                        required={mode === "register"}
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                        className="pl-10 text-xs bg-background border-border/80 h-10 rounded-xl focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs font-medium text-foreground">
                    {mode === "register" ? "Work Email or Business Handle" : "Email or Business Identifier"}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="text"
                      autoComplete="username"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={mode === "register" ? "e.g. founder@enterprise.com or company handle" : "e.g. finance@enterprise.com or business identifier"}
                      className="pl-10 text-xs bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-10 pr-10 text-xs bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {mode === "signin" && !isSuperAdminEmail && (
                  <div className="space-y-1.5">
                    <Label htmlFor="login-company-optional" className="text-xs font-medium text-muted-foreground">
                      Company / Organization Name (Optional)
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="login-company-optional"
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Leave blank to use registered entity"
                        className="pl-10 text-xs bg-background border-border/80 h-10 rounded-xl"
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loginMutation.isPending || !email || !password || (mode === "register" && !companyName.trim())}
                  className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition"
                >
                  {loginMutation.isPending ? (
                    "Authenticating credentials…"
                  ) : isSuperAdminEmail ? (
                    <>
                      <ShieldCheck className="mr-2 size-4" />
                      Access Administration Console <ArrowRight className="ml-2 size-4" />
                    </>
                  ) : mode === "register" ? (
                    <>
                      <Building2 className="mr-2 size-4" />
                      Create Business & Configure Profile <ArrowRight className="ml-2 size-4" />
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 size-4" />
                      Sign In to Business Workspace <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Mode switch helper */}
              <div className="mt-4 text-center">
                {mode === "signin" ? (
                  <p className="text-xs text-muted-foreground">
                    New business looking to automate tax & ledgers?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("register")}
                      className="font-bold text-primary hover:underline"
                    >
                      Register New Business Workspace →
                    </button>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Already registered your business?{" "}
                    <button
                      type="button"
                      onClick={() => setMode("signin")}
                      className="font-bold text-primary hover:underline"
                    >
                      Sign in to your account →
                    </button>
                  </p>
                )}
              </div>

              {/* Distinct CA Login Gate */}
              <div className="mt-6 border-t border-border/60 pt-5 text-center">
                <p className="text-xs text-muted-foreground">
                  Practicing Chartered Accountant with ICAI credentials?
                </p>
                <button
                  type="button"
                  onClick={() => setLocation("/ca/login")}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
                >
                  <GraduationCap className="size-4" />
                  Access Dedicated CA Portal with Audit Sign-Off →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
