import { PravaMark } from "@/components/PravaMark";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  GraduationCap,
  KeyRound,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Login() {
  const [, setLocation] = useLocation();

  // Mode: "login" | "register" | "forgot"
  const [mode, setMode] = useState("login");

  // Login steps: "credentials" | "otp"
  const [loginStep, setLoginStep] = useState("credentials");

  // Forgot password steps: "request" | "verify" | "reset"
  const [forgotStep, setForgotStep] = useState("request");

  // Form states
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // OTP Verification Challenge states
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otpMethod, setOtpMethod] = useState("email");
  const [otpCode, setOtpCode] = useState("");
  const [devOtpCode, setDevOtpCode] = useState(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password reset token
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const queryClient = useQueryClient();

  const isSuperAdmin = identifier.trim().toLowerCase() === "omambole2007@gmail.com";

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Auth Completion Handler
  const handleAuthComplete = (data) => {
    setErrorMessage("");
    setSuccessMessage("");
    void queryClient.invalidateQueries({ queryKey: ["auth"] });
    void queryClient.invalidateQueries({ queryKey: ["businesses"] });

    if (data.role === "admin") {
      toast.success("Administrator access authenticated. Opening Admin Console…", {
        description: `Logged in as Super Admin (${data.user?.name || "Om Ambole"})`,
      });
      window.location.href = data.redirectTo || "/admin/billing";
    } else {
      toast.success(
        data.hasWorkspace
          ? `Welcome back to Prava!`
          : `Business account created! Let's configure your business info.`,
        {
          description: `Session active for ${data.user?.name || data.user?.email || data.user?.phone}`,
        }
      );
      window.location.href = data.redirectTo || "/dashboard";
    }
  };

  // 1. Login Step 1: Validate Password -> Issue OTP
  const loginStep1Mutation = useMutation({
    mutationFn: (body) => api.auth.login(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setChallengeToken(data.challengeId || data.challengeToken);
      setMaskedTarget(data.maskedTarget);
      setOtpMethod(data.method || "email");
      setLoginStep("otp");
      setResendCooldown(60);
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
        setOtpCode(data.devOtpCode);
        toast.success(`Verification Code: ${data.devOtpCode}`, { duration: 15000, description: "Auto-filled (Development Mode)" });
      } else {
        setDevOtpCode(null);
        setOtpCode("");
        toast.info(data.message || `Verification code sent to ${data.maskedTarget}.`);
      }
    },
    onError: (error) => {
      const msg =
        error.message || "Invalid email or password. Please verify your credentials and try again.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 2. Login Step 2: Verify OTP -> Finalize Session
  const loginStep2Mutation = useMutation({
    mutationFn: (body) => api.auth.verifyOtp(body),
    onSuccess: handleAuthComplete,
    onError: (error) => {
      const msg = error.message || "Invalid or expired verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 3. Resend OTP
  const resendOtpMutation = useMutation({
    mutationFn: (body) => api.auth.resendOtp(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setResendCooldown(60);
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
        setOtpCode(data.devOtpCode);
        toast.success(`New Verification Code: ${data.devOtpCode}`, { duration: 15000 });
      } else {
        setOtpCode("");
        toast.success(data.message || "A new OTP has been sent to your email.");
      }
    },
    onError: (error) => {
      const msg = error.message || "Failed to resend verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 4. Register Account
  const registerMutation = useMutation({
    mutationFn: (body) => api.auth.register(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setChallengeToken(data.challengeId || data.challengeToken);
      setMaskedTarget(data.maskedTarget);
      setOtpMethod(data.method || "email");
      setLoginStep("otp");
      setResendCooldown(60);
      if (data.devOtpCode) {
        setDevOtpCode(data.devOtpCode);
        setOtpCode(data.devOtpCode);
        toast.success(`Verification Code: ${data.devOtpCode}`, { duration: 15000 });
      } else {
        setDevOtpCode(null);
        setOtpCode("");
        toast.success(data.message || `Account created! Verification code sent to ${data.maskedTarget}.`);
      }
    },
    onError: (error) => {
      const msg = error.message || "Registration failed. Please verify your details.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 5. Forgot Password: Request OTP
  const forgotRequestMutation = useMutation({
    mutationFn: (body) => api.auth.forgotPasswordRequest(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setChallengeToken(data.challengeId || data.challengeToken);
      setMaskedTarget(data.maskedTarget);
      setOtpMethod(data.method || "email");
      setForgotStep("verify");
      setOtpCode("");
      setResendCooldown(60);
      toast.info(data.message || "Password reset verification code dispatched.");
    },
    onError: (error) => {
      const msg = error.message || "Unable to initiate password reset.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 6. Forgot Password: Verify OTP
  const forgotVerifyMutation = useMutation({
    mutationFn: (body) => api.auth.forgotPasswordVerify(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setPasswordResetToken(data.resetToken);
      setForgotStep("reset");
      toast.success("Verification confirmed! Please set your new password.");
    },
    onError: (error) => {
      const msg = error.message || "Invalid or expired verification code.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // 7. Forgot Password: Submit New Password
  const forgotResetMutation = useMutation({
    mutationFn: (body) => api.auth.forgotPasswordReset(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setSuccessMessage(data.message || "Password reset successfully! Please sign in with your new password.");
      setMode("login");
      setLoginStep("credentials");
      setPassword("");
      toast.success(data.message || "Password updated successfully!");
    },
    onError: (error) => {
      const msg = error.message || "Failed to update password.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Handlers
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!identifier.trim() || !password) {
      setErrorMessage("Please enter your email or mobile number and password.");
      return;
    }
    loginStep1Mutation.mutate({
      email: identifier.trim(),
      identifier: identifier.trim(),
      password,
    });
  };

  const handleOtpSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!otpCode || otpCode.length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }
    loginStep2Mutation.mutate({
      challengeId: challengeToken,
      challengeToken,
      otp: otpCode.trim(),
      code: otpCode.trim(),
    });
  };

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!companyName.trim()) {
      setErrorMessage("Please enter your Company / Business Legal Name.");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      setErrorMessage("Please provide at least a work email or mobile number.");
      return;
    }
    if (!password || password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }
    registerMutation.mutate({
      companyName: companyName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      password,
    });
  };

  const handleForgotRequest = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    if (!identifier.trim()) {
      setErrorMessage("Please enter your registered email address or mobile number.");
      return;
    }
    forgotRequestMutation.mutate({
      email: identifier.trim(),
      identifier: identifier.trim(),
    });
  };

  const handleForgotVerify = (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!otpCode || otpCode.length !== 6) {
      setErrorMessage("Please enter the 6-digit verification code.");
      return;
    }
    forgotVerifyMutation.mutate({
      challengeId: challengeToken,
      challengeToken,
      otp: otpCode.trim(),
      code: otpCode.trim(),
    });
  };

  const handleForgotReset = (e) => {
    e.preventDefault();
    setErrorMessage("");
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirm password do not match.");
      return;
    }
    forgotResetMutation.mutate({
      resetToken: passwordResetToken,
      newPassword,
      confirmPassword,
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

      {/* Main Container */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: Context & Overview */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Production-Grade Authentication & Vault</span>
            </div>

            <h1 className="font-['Playfair_Display',Georgia,serif] text-4xl sm:text-5xl font-normal leading-[1.15] tracking-tight text-foreground">
              Autonomous Tax, Ledgers & <em className="italic font-normal">Audit Compliance</em>.
            </h1>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Two-step verified authentication ensures that corporate returns, Section 43B(h) MSME compliance ledgers, and Supabase cloud document vaults remain strictly isolated and cryptographically secured.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5 backdrop-blur-sm">
                <ShieldCheck className="size-5 shrink-0 text-emerald-500 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Two-Step Security Pipeline: </span>
                  <span className="text-muted-foreground">
                    Password verification is coupled with an enforced 6-digit one-time passcode sent directly to your verified email or mobile phone.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-3.5 backdrop-blur-sm">
                <Building2 className="size-5 shrink-0 text-primary mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-foreground">Audited Access Control: </span>
                  <span className="text-muted-foreground">
                    Role-verified sessions protect GSTIN filings, cash reconciliation tasks, and proprietary financial ledgers.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Box */}
          <div>
            <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-card p-6 sm:p-7 shadow-2xl backdrop-blur-2xl">
              {/* Mode Selector (When not in OTP step or forgot password reset) */}
              {loginStep === "credentials" && forgotStep === "request" && (
                <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-secondary/60 p-1 border border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`rounded-xl py-2 text-xs font-bold transition-all ${
                      mode === "login"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Business Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("register");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`rounded-xl py-2 text-xs font-bold transition-all ${
                      mode === "register"
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Register Business
                  </button>
                </div>
              )}

              {/* Box Header */}
              <div className="mb-5 flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <h2 className="font-['Playfair_Display',Georgia,serif] text-2xl font-bold tracking-tight text-foreground">
                    {mode === "forgot"
                      ? forgotStep === "reset"
                        ? "Set New Password"
                        : forgotStep === "verify"
                        ? "Verify Reset Code"
                        : "Reset Password"
                      : loginStep === "otp"
                      ? "Verify One-Time Code"
                      : mode === "register"
                      ? "Register Business"
                      : isSuperAdmin
                      ? "Administrator Console"
                      : "Business Sign In"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {mode === "forgot"
                      ? forgotStep === "reset"
                        ? "Enter your new secure password (minimum 8 characters)"
                        : forgotStep === "verify"
                        ? `Enter the 6-digit code dispatched to ${maskedTarget}`
                        : "Enter your registered email or mobile number to receive a verification code"
                      : loginStep === "otp"
                      ? `Enter the 6-digit verification code sent to ${maskedTarget}`
                      : mode === "register"
                      ? "Configure your corporate profile to launch autonomous tax workflows"
                      : isSuperAdmin
                      ? "Elevated system operator credentials detected"
                      : "Enter your registered email or mobile number with your password"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground shrink-0">
                  {loginStep === "otp" || (mode === "forgot" && forgotStep === "verify") ? (
                    <Smartphone className="size-3.5 text-emerald-500" />
                  ) : mode === "register" ? (
                    <Sparkles className="size-3.5 text-primary" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                  <span>
                    {loginStep === "otp" || (mode === "forgot" && forgotStep === "verify")
                      ? "Step 2 // OTP"
                      : "Step 1 // Auth"}
                  </span>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              {/* Success Message Alert */}
              {successMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* FLOW A: LOGIN (STEP 1 - PASSWORD / STEP 2 - OTP)            */}
              {/* ----------------------------------------------------------- */}
              {mode === "login" && loginStep === "credentials" && (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-identifier" className="text-xs font-medium text-foreground">
                      Email Address or Mobile Number
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="login-identifier"
                        type="text"
                        autoComplete="username"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. founder@enterprise.com or +91 98765 43210"
                        className="pl-10 text-xs bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs font-medium text-foreground">
                        Password
                      </Label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode("forgot");
                          setForgotStep("request");
                          setErrorMessage("");
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
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

                  <Button
                    type="submit"
                    disabled={loginStep1Mutation.isPending || !identifier || !password}
                    className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition mt-2"
                  >
                    {loginStep1Mutation.isPending ? (
                      "Verifying credentials…"
                    ) : isSuperAdmin ? (
                      <>
                        <ShieldCheck className="mr-2 size-4" />
                        Verify Admin & Dispatch OTP <ArrowRight className="ml-2 size-4" />
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 size-4" />
                        Proceed to Verification <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* FLOW A (STEP 2): OTP VERIFICATION FOR LOGIN / REGISTRATION */}
              {loginStep === "otp" && (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Verification code sent to:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setLoginStep("credentials");
                          setOtpCode("");
                          setErrorMessage("");
                        }}
                        className="font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <ArrowLeft className="size-3" /> Change email
                      </button>
                    </div>
                    <div className="font-semibold text-foreground">{maskedTarget}</div>
                    <p className="text-[11px] text-muted-foreground pt-0.5">
                      Check your inbox for the 6-digit code. Valid for 5 minutes.
                    </p>
                  </div>

                  {devOtpCode && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400 font-medium">
                      💡 <strong>Development Mode:</strong> Code <code className="font-mono font-bold bg-amber-500/20 px-1.5 py-0.5 rounded text-foreground">{devOtpCode}</code> was auto-filled for testing.
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="login-otp" className="text-xs font-medium text-foreground">
                      Enter 6-Digit One-Time Code
                    </Label>
                    <Input
                      id="login-otp"
                      type="text"
                      maxLength={6}
                      autoFocus
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="••••••"
                      className="text-center font-mono tracking-widest text-lg font-bold bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-11 rounded-xl"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Didn't receive the code?</span>
                    <button
                      type="button"
                      disabled={resendCooldown > 0 || resendOtpMutation.isPending}
                      onClick={() => resendOtpMutation.mutate({ challengeToken })}
                      className="font-semibold text-primary disabled:opacity-50 hover:underline flex items-center gap-1"
                    >
                      <RefreshCw className={`size-3 ${resendOtpMutation.isPending ? "animate-spin" : ""}`} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={loginStep2Mutation.isPending || otpCode.length !== 6}
                    className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition mt-2"
                  >
                    {loginStep2Mutation.isPending ? (
                      "Verifying code…"
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 size-4" />
                        Complete Sign In & Open Workspace <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* ----------------------------------------------------------- */}
              {/* FLOW B: REGISTER NEW BUSINESS                              */}
              {/* ----------------------------------------------------------- */}
              {mode === "register" && loginStep === "credentials" && (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="reg-company" className="text-xs font-semibold text-foreground">
                      Company / Business Legal Name <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="reg-company"
                        type="text"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                        className="pl-10 text-xs bg-background border-border/80 h-10 rounded-xl focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="reg-email" className="text-xs font-medium text-foreground">
                        Work Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          id="reg-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="founder@company.com"
                          className="pl-9 text-xs bg-background border-border/80 h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="reg-phone" className="text-xs font-medium text-foreground">
                        Mobile Phone
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                        <Input
                          id="reg-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="pl-9 text-xs bg-background border-border/80 h-10 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-password" className="text-xs font-medium text-foreground">
                      Password (min 8 chars) <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
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

                  <Button
                    type="submit"
                    disabled={registerMutation.isPending || !companyName.trim() || password.length < 8}
                    className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition mt-2"
                  >
                    {registerMutation.isPending ? (
                      "Creating business profile…"
                    ) : (
                      <>
                        <Building2 className="mr-2 size-4" />
                        Create Account & Send Verification Code <ArrowRight className="ml-2 size-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {/* ----------------------------------------------------------- */}
              {/* FLOW C: FORGOT PASSWORD                                    */}
              {/* ----------------------------------------------------------- */}
              {mode === "forgot" && (
                <div className="space-y-4">
                  {forgotStep === "request" && (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-identifier" className="text-xs font-medium text-foreground">
                          Registered Email Address or Mobile Number
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="forgot-identifier"
                            type="text"
                            required
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="e.g. founder@enterprise.com or +91 98765 43210"
                            className="pl-10 text-xs bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setMode("login");
                            setLoginStep("credentials");
                            setErrorMessage("");
                          }}
                          className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <ArrowLeft className="size-3" /> Back to Sign In
                        </button>
                        <Button
                          type="submit"
                          disabled={forgotRequestMutation.isPending || !identifier.trim()}
                          className="h-10 rounded-xl bg-primary text-xs font-bold px-4"
                        >
                          {forgotRequestMutation.isPending ? "Sending…" : "Send Reset Code →"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {forgotStep === "verify" && (
                    <form onSubmit={handleForgotVerify} className="space-y-4">
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Reset code sent to:</span>
                          <button
                            type="button"
                            onClick={() => setForgotStep("request")}
                            className="font-semibold text-primary hover:underline text-[11px]"
                          >
                            Change email
                          </button>
                        </div>
                        <div className="font-semibold text-foreground">{maskedTarget}</div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-otp" className="text-xs font-medium text-foreground">
                          Enter 6-Digit Password Reset Code
                        </Label>
                        <Input
                          id="forgot-otp"
                          type="text"
                          maxLength={6}
                          autoFocus
                          required
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                          placeholder="••••••"
                          className="text-center font-mono tracking-widest text-lg font-bold bg-background border-border/80 focus:ring-2 focus:ring-primary/20 h-11 rounded-xl"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Didn't receive the code?</span>
                        <button
                          type="button"
                          disabled={resendCooldown > 0 || resendOtpMutation.isPending}
                          onClick={() => resendOtpMutation.mutate({ challengeToken })}
                          className="font-semibold text-primary disabled:opacity-50 hover:underline flex items-center gap-1"
                        >
                          <RefreshCw className={`size-3 ${resendOtpMutation.isPending ? "animate-spin" : ""}`} />
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                        </button>
                      </div>

                      <Button
                        type="submit"
                        disabled={forgotVerifyMutation.isPending || otpCode.length !== 6}
                        className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition mt-2"
                      >
                        {forgotVerifyMutation.isPending ? "Verifying…" : "Authorize Password Reset →"}
                      </Button>
                    </form>
                  )}

                  {forgotStep === "reset" && (
                    <form onSubmit={handleForgotReset} className="space-y-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-new-pass" className="text-xs font-medium text-foreground">
                          New Password (min 8 chars)
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="forgot-new-pass"
                            type={showNewPassword ? "text" : "password"}
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="pl-10 pr-10 text-xs bg-background border-border/80 h-10 rounded-xl"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="forgot-confirm-pass" className="text-xs font-medium text-foreground">
                          Confirm New Password
                        </Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                          <Input
                            id="forgot-confirm-pass"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                            className="pl-10 text-xs bg-background border-border/80 h-10 rounded-xl"
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={forgotResetMutation.isPending || newPassword.length < 8 || newPassword !== confirmPassword}
                        className="w-full h-11 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-lg hover:opacity-90 active:scale-[0.99] transition mt-2"
                      >
                        {forgotResetMutation.isPending ? "Resetting Password…" : "Save New Password & Sign In"}
                      </Button>
                    </form>
                  )}
                </div>
              )}

              {/* Mode switch helper link */}
              {loginStep === "credentials" && (
                <div className="mt-4 text-center">
                  {mode === "register" ? (
                    <p className="text-xs text-muted-foreground">
                      Already registered?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("login");
                          setErrorMessage("");
                        }}
                        className="font-bold text-primary hover:underline"
                      >
                        Sign in with password & OTP →
                      </button>
                    </p>
                  ) : mode === "login" ? (
                    <p className="text-xs text-muted-foreground">
                      New business looking to automate tax & ledgers?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setMode("register");
                          setErrorMessage("");
                        }}
                        className="font-bold text-primary hover:underline"
                      >
                        Register New Business Workspace →
                      </button>
                    </p>
                  ) : null}
                </div>
              )}

              {/* Distinct CA Login Gate */}
              <div className="mt-5 border-t border-border/60 pt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Practicing Chartered Accountant with ICAI credentials?
                </p>
                <button
                  type="button"
                  onClick={() => setLocation("/ca/login")}
                  className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline"
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
