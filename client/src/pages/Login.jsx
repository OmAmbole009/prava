import { PravaMark } from "@/components/PravaMark";
import { ElectricHorizonBackground } from "@/components/ElectricHorizonBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { COOKIE_NAME } from "@shared/const";
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
  // Machine-readable delivery guidance from the API (e.g. EMAIL_PORT_BLOCKED).
  const [errorCode, setErrorCode] = useState("");
  const [errorHint, setErrorHint] = useState("");

  // OTP Verification Challenge states
  const [challengeToken, setChallengeToken] = useState("");
  const [maskedTarget, setMaskedTarget] = useState("");
  const [otpMethod, setOtpMethod] = useState("email");
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Forgot password reset token
  const [passwordResetToken, setPasswordResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Google Identity Services (GIS) state
  const [gisLoaded, setGisLoaded] = useState(false);

  const queryClient = useQueryClient();

  const isSuperAdmin = identifier.trim().toLowerCase() === "omambole2007@gmail.com";

  // Surface OAuth callback failures (/login?error=...) instead of failing silently.
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error");
      if (oauthError) {
        setErrorMessage(oauthError);
        toast.error(oauthError);
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}
  }, []);

  // Clear delivery guidance whenever the error itself is cleared.
  useEffect(() => {
    if (!errorMessage) {
      setErrorCode("");
      setErrorHint("");
    }
  }, [errorMessage]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Clear stale cached auth tokens and sessions on initial login page mount
  useEffect(() => {
    try {
      sessionStorage.clear();
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("prava-active-business-id");
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = "app_session_id=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "manus-cookie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    } catch {}

    void queryClient.clear();
    api.auth.logout().catch(() => {});
  }, []);

  // Auth Completion Handler
  const handleAuthComplete = (data) => {
    setErrorMessage("");
    setSuccessMessage("");
    if (data.token) {
      try {
        sessionStorage.setItem("manus-cookie", `${COOKIE_NAME}=${data.token}; path=/;`);
      } catch {}
    }
    void queryClient.invalidateQueries({ queryKey: ["auth"] });
    void queryClient.invalidateQueries({ queryKey: ["businesses"] });

    if (data.role === "admin") {
      toast.success(
        "Administrator access authenticated. Opening Admin Console…",
        {
          description: `Logged in as Super Admin (${data.user?.name || "Om Ambole"})`,
        }
      );
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
      setOtpCode("");
      toast.info(
        data.message || `Verification code sent to ${data.maskedTarget}. Please check your inbox.`
      );
    },
    onError: (error) => {
      // Clear any stale OTP state when password auth fails
      setChallengeToken("");
      setMaskedTarget("");
      setOtpMethod("email");
      setLoginStep("credentials");
      setOtpCode("");

      const msg =
        error.message ||
        "Invalid email or password. Please verify your credentials and try again.";
      setErrorMessage(msg);
      setErrorCode(error.code || "");
      setErrorHint(error.hint || "");
      toast.error(msg);
    },
  });

  // 2. Login Step 2: Verify OTP -> Finalize Session
  const loginStep2Mutation = useMutation({
    mutationFn: (body) => api.auth.verifyOtp(body),
    onSuccess: handleAuthComplete,
    onError: (error) => {
      // Reset to credentials step on OTP verification failure
      setLoginStep("credentials");
      setOtpCode("");
      setErrorMessage(
        error.message || "Invalid or expired verification code."
      );
      toast.error(
        error.message || "Invalid or expired verification code."
      );
    },
  });

  // 3. Resend OTP
  const resendOtpMutation = useMutation({
    mutationFn: (body) => api.auth.resendOtp(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setResendCooldown(60);
      setOtpCode("");
      toast.success(
        data.message || "A new verification code has been dispatched to your email."
      );
    },
    onError: (error) => {
      const msg =
        error.message || "Failed to resend verification code. Please try again.";
      setErrorMessage(msg);
      setErrorCode(error.code || "");
      setErrorHint(error.hint || "");
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
      setOtpCode("");
      toast.success(
        data.message || `Account created! Verification code sent to ${data.maskedTarget}.`
      );
    },
    onError: (error) => {
      const msg =
        error.message || "Registration failed. Please verify your details.";
      setErrorMessage(msg);
      setErrorCode(error.code || "");
      setErrorHint(error.hint || "");
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
      toast.info(
        data.message || "Password reset verification code dispatched."
      );
    },
    onError: (error) => {
      const msg =
        error.message || "Unable to initiate password reset. Please check your credentials.";
      setErrorMessage(msg);
      setErrorCode(error.code || "");
      setErrorHint(error.hint || "");
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
      const msg =
        error.message || "Invalid or expired verification code. Please request a new one.";
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

  // 8. Google OAuth Sign-in Mutation
  const googleLoginMutation = useMutation({
    mutationFn: (body) => api.auth.googleLogin(body),
    onSuccess: (data) => {
      handleAuthComplete(data);
    },
    onError: (error) => {
      const msg = error.message || "Google identity verification failed.";
      setErrorMessage(msg);
      toast.error(msg);
    },
  });

  // Initialize Google Identity Services (GIS) One-Tap and Button
  useEffect(() => {
    let isMounted = true;
    api.auth.googleConfig().then((cfg) => {
      if (!isMounted || !cfg?.configured || !cfg?.clientId) return;

      // Google rejects malformed client IDs; GIS then aborts to
      // accounts.google.com/gsi/transform. Validate before initialising.
      const clientId = String(cfg.clientId)
        .trim()
        .replace(/^["']+/, "")
        .replace(/["']+$/, "");
      if (!/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/i.test(clientId)) {
        return;
      }

      const renderGis = () => {
        if (window.google?.accounts?.id) {
          try {
            window.google.accounts.id.initialize({
              client_id: clientId,
              callback: (response) => {
                if (response?.credential) {
                  googleLoginMutation.mutate({ credential: response.credential });
                }
              },
              auto_select: false,
              cancel_on_tap_outside: true,
            });

            const btnContainer = document.getElementById("prava-gis-button-wrapper");
            if (btnContainer) {
              btnContainer.innerHTML = "";
              window.google.accounts.id.renderButton(btnContainer, {
                theme: "filled_black",
                size: "large",
                width: 340,
                text: "continue_with",
                shape: "rectangular",
              });
              setGisLoaded(true);
            }
            return true;
          } catch {
            return false;
          }
        }
        return false;
      };

      if (!renderGis()) {
        const interval = setInterval(() => {
          if (renderGis()) clearInterval(interval);
        }, 300);
        setTimeout(() => clearInterval(interval), 5000);
      }
    }).catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [mode, loginStep]);

  const handleGoogleSignIn = async () => {
    setErrorMessage("");
    try {
      const config = await api.auth.googleConfig();
      if (!config?.configured || !config?.clientId) {
        toast.info(
          "Google OAuth configuration is currently in development mode. Please configure GOOGLE_CLIENT_ID in your environment variables for live production OAuth.",
          {
            duration: 6000,
          }
        );
        return;
      }

      if (window.google?.accounts?.id) {
        window.google.accounts.id.prompt();
        return;
      }

      // The authorization-code redirect flow also needs a server-side client
      // secret; without it the callback cannot exchange the code.
      if (!config.clientSecretConfigured || !config.redirectUri) {
        toast.error(
          "Google sign-in is unavailable right now. Please sign in with your email and password.",
          { duration: 6000 }
        );
        return;
      }

      window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(config.clientId)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&response_type=code&scope=openid%20email%20profile&access_type=offline&prompt=select_account`;
    } catch (err) {
      toast.error("Unable to connect to Google OAuth service.");
    }
  };

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

  // Cleanup stale auth state when mode or loginStep changes
  useEffect(() => {
    // When switching away from OTP step, clear OTP-related state
    if (loginStep !== "otp") {
      setChallengeToken("");
      setMaskedTarget("");
      setOtpMethod("email");
      setOtpCode("");
      setResendCooldown(0);
    }
    // When switching away from forgot password reset, clear related state
    if (forgotStep !== "reset") {
      setPasswordResetToken("");
      setNewPassword("");
      setConfirmPassword("");
    }
    // When switching away from credentials step, clear error/success messages
    if (loginStep !== "credentials" && forgotStep !== "request") {
      setErrorMessage("");
      setSuccessMessage("");
    }
  }, [loginStep, forgotStep]);

  return (
    <div className="relative flex min-h-screen flex-col bg-[#030405] text-[#F5F7FA] overflow-hidden selection:bg-blue-600/30 selection:text-white">
      {/* Planetary Horizon Glow */}
      <ElectricHorizonBackground variant="hero" />

      {/* Top Navbar */}
      <header className="relative z-10 border-b border-white/[0.08] bg-[#030405]/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setLocation("/")}>
            <PravaMark size="md" inverse={true} />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/ca/login")}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1.5 text-xs font-semibold text-blue-300 transition hover:bg-blue-500/20"
            >
              <GraduationCap className="size-3.5 text-blue-400" />
              <span>CA Verification Portal</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* Left Column: Context & Overview */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              <span className="size-2 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
              <span>Production-Grade Authentication & Vault</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold leading-[1.15] tracking-tight text-white">
              Autonomous Tax, Ledgers & <span className="text-blue-400">Audit Compliance</span>.
            </h1>

            <p className="text-sm leading-relaxed text-slate-400">
              Two-step verified authentication ensures that corporate returns, Section 43B(h) MSME compliance ledgers, and Supabase cloud document vaults remain strictly isolated and cryptographically secured.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#07090E] p-3.5">
                <ShieldCheck className="size-5 shrink-0 text-emerald-400 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-white">Two-Step Security Pipeline: </span>
                  <span className="text-slate-400">
                    Password verification is coupled with an enforced 6-digit one-time passcode sent directly to your verified email or mobile phone.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-[#07090E] p-3.5">
                <Building2 className="size-5 shrink-0 text-blue-400 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-white">Audited Access Control: </span>
                  <span className="text-slate-400">
                    Role-verified sessions protect GSTIN filings, cash reconciliation tasks, and proprietary financial ledgers.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Box */}
          <div>
            <div className="relative overflow-hidden rounded-2xl border border-white/[0.1] bg-[#07090E] p-6 sm:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
              <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
              <div className="pointer-events-none absolute left-1/2 -top-12 h-20 w-1/2 -translate-x-1/2 rounded-full bg-blue-500/10 blur-xl" />

              {/* Mode Selector (When not in OTP step or forgot password reset) */}
              {loginStep === "credentials" && forgotStep === "request" && (
                <div className="relative z-10 mb-6 grid grid-cols-2 gap-1 rounded-full bg-[#0B0E14] p-1 border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setErrorMessage("");
                      setSuccessMessage("");
                    }}
                    className={`rounded-full py-2 text-xs font-semibold transition-all ${
                      mode === "login"
                        ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        : "text-slate-400 hover:text-white"
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
                    className={`rounded-full py-2 text-xs font-semibold transition-all ${
                      mode === "register"
                        ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        : "text-slate-400 hover:text-white"
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
                      : "Business Sign In"
                  }
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
                      : "Enter your registered email or mobile number with your password"
                  }
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
                      : "Step 1 // Auth"
                  }
                  </span>
                </div>
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1.5">
                    <div className="font-medium">{errorMessage}</div>
                    {errorHint && (
                      <p className="text-[11px] font-normal leading-relaxed text-destructive/80">
                        {errorHint}
                      </p>
                    )}
                    {errorCode.startsWith("EMAIL_") && (
                      <div className="flex flex-wrap items-center gap-3 pt-0.5">
                        {mode === "login" && loginStep === "credentials" && identifier.trim() && password && (
                          <button
                            type="button"
                            onClick={() =>
                              loginStep1Mutation.mutate({
                                email: identifier.trim(),
                                identifier: identifier.trim(),
                                password,
                              })
                            }
                            disabled={loginStep1Mutation.isPending}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold underline underline-offset-2 disabled:opacity-50"
                          >
                            <RefreshCw className={`size-3 ${loginStep1Mutation.isPending ? "animate-spin" : ""}`} />
                            Retry sending code
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleGoogleSignIn}
                          className="text-[11px] font-semibold underline underline-offset-2"
                        >
                          Sign in with Google instead
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Success Message Alert */}
              {successMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              {/* Google Sign In Option (Credentials Stage) */}
              {loginStep === "credentials" && forgotStep === "request" && (
                <div className="mb-5 space-y-3">
                  <div id="prava-gis-button-wrapper" className="flex justify-center w-full min-h-[40px] [&>div]:!w-full [&_iframe]:!mx-auto" />
                  {!gisLoaded && (
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoginMutation.isPending}
                      className="relative flex w-full items-center justify-center gap-3 rounded-xl border border-white/[0.12] bg-[#0E131F] py-2.5 px-4 text-xs font-semibold text-white transition hover:bg-white/[0.06] hover:border-white/[0.2] focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                      <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                      </svg>
                      <span>{googleLoginMutation.isPending ? "Connecting to Google…" : "Continue with Google"}</span>
                    </button>
                  )}

                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-white/[0.08]" />
                    </div>
                    <div className="relative bg-[#07090E] px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">
                      Or continue with {mode === "register" ? "registration details" : "credentials"}
                    </div>
                  </div>
                </div>
              )}

              {/* ----------------------------------------------------------- */}
              {/* FLOW A: LOGIN (STEP 1 - PASSWORD / STEP 2 - OTP) */}
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
              {/* FLOW B: REGISTER NEW BUSINESS */}
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
              {/* FLOW C: FORGOT PASSWORD */}
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
                  Practicing Chartered Accountant with ICAI credentials?{" "}
                  <a href="/ca/login" className="font-bold text-primary hover:underline">
                    Login to CA Portal
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}