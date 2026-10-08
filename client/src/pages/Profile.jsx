import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Fetch Current User & Profile
  const authQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.auth.me(),
  });

  const profileQuery = useQuery({
    queryKey: ["user", "profile"],
    queryFn: () => api.user.profile(),
  });

  const businessesQuery = useQuery({
    queryKey: ["businesses", "list"],
    queryFn: () => api.businesses.list(),
  });

  const user = authQuery.data;
  const profile = profileQuery.data;
  const business = businessesQuery.data?.[0];

  // Change Password Mutation
  const changePasswordMutation = useMutation({
    mutationFn: (body) => api.user.changePassword(body),
    onSuccess: (data) => {
      setErrorMessage("");
      setSuccessMessage(data.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(data.message || "Password changed successfully!");
    },
    onError: (error) => {
      const msg = error.message || "Failed to update password. Please check your credentials.";
      setErrorMessage(msg);
      setSuccessMessage("");
      toast.error(msg);
    },
  });

  // Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      toast.success("Signed out safely.");
      queryClient.clear();
      window.location.href = "/login";
    },
    onError: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation password do not match.");
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage("New password cannot be the same as your current password.");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto pb-12">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-500 mb-2">
              <ShieldCheck className="size-3.5" />
              <span>Identity & Security Telemetry</span>
            </div>
            <h1 className="font-['Playfair_Display',Georgia,serif] text-3xl font-bold tracking-tight text-foreground">
              Account Security & Profile
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Manage multi-factor authentication, cryptographic passwords, and active workspace permissions.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="h-9 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-xs font-semibold"
          >
            <LogOut className="mr-2 size-3.5" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          {/* -------------------- 1. IDENTITY & STATUS CARD -------------------- */}
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <User className="size-4 text-primary" />
                  Account Identity
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE // VERIFIED
                </span>
              </div>
              <CardDescription className="text-xs">
                Your authenticated profile identity across this organization workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Display Name</span>
                  <span className="font-semibold text-foreground">{user?.name || "Business User"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Primary Email</span>
                  <span className="font-mono text-foreground">{user?.email || "Not registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mobile Phone</span>
                  <span className="font-mono text-foreground">{user?.phone || "Not registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Account Role</span>
                  <span className="font-mono font-bold uppercase text-primary">
                    {user?.role === "admin" ? "Super Administrator" : user?.role || "Workspace Owner"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Associated Business</span>
                  <span className="font-semibold text-foreground">{business?.name || "Prava Technologies"}</span>
                </div>
              </div>

              {/* 2FA Enforced Card */}
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 text-xs">
                  <Smartphone className="size-4" />
                  <span>Two-Step OTP Security Enforced</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Every sign-in requires a valid 6-digit one-time passcode delivered through your registered Mobile SMS or Gmail address.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* -------------------- 2. CHANGE PASSWORD CARD -------------------- */}
          <Card className="rounded-2xl border-border bg-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs">
                Update your account password with cryptographic salted scrypt hashing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Alert Feedback */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="curr-pass" className="text-xs font-medium text-foreground">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="curr-pass"
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 pr-9 text-xs bg-background h-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-pass" className="text-xs font-medium text-foreground">
                    New Password (min 8 characters)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="new-pass"
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pl-9 pr-9 text-xs bg-background h-10 rounded-xl"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirm-pass" className="text-xs font-medium text-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input
                      id="confirm-pass"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pl-9 text-xs bg-background h-10 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending || !currentPassword || newPassword.length < 8}
                  className="w-full h-10 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-md hover:opacity-90 active:scale-[0.99] transition mt-2"
                >
                  {changePasswordMutation.isPending ? "Updating Security Credentials…" : "Update Security Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
