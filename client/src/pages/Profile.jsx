import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Smartphone,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Profile() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { logout } = useAuth();

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

  // Business Profile Form States
  const [bizForm, setBizForm] = useState({
    name: "",
    legalName: "",
    businessType: "Private Limited Company",
    industry: "Financial Technology",
    gstin: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    financialYear: "April–March",
    currency: "INR",
  });
  const [bizSaveSuccess, setBizSaveSuccess] = useState(false);

  useEffect(() => {
    if (business) {
      setBizForm({
        name: business.name || "",
        legalName: business.legalName || business.name || "",
        businessType: business.businessType || "Private Limited Company",
        industry: business.industry || "Software & Technology",
        gstin: business.gstin || "",
        email: business.email || "",
        phone: business.phone || "",
        addressLine1: business.addressLine1 || "",
        city: business.city || "",
        state: business.state || "",
        postalCode: business.postalCode || "",
        financialYear: business.financialYear || "April–March",
        currency: business.currency || "INR",
      });
    }
  }, [business]);

  const updateBusinessMutation = useMutation({
    mutationFn: (body) => api.businesses.updateProfile(body),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["businesses"] });
      setBizSaveSuccess(true);
      setTimeout(() => setBizSaveSuccess(false), 4000);
      toast.success("Business profile saved successfully.", {
        description: `Workspace '${data.name}' settings updated.`,
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update business profile.");
    },
  });

  const handleBusinessSave = (e) => {
    e.preventDefault();
    if (!business?.id) {
      toast.error("No active business workspace detected.");
      return;
    }
    updateBusinessMutation.mutate({
      businessId: business.id,
      ...bizForm,
    });
  };

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
      <div className="space-y-6 max-w-5xl mx-auto pb-12 py-2">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-6">
          <div>
            <span className="eyebrow-chip inline-flex items-center gap-1.5 mb-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
              <ShieldCheck className="size-3 text-cyan-400" />
              IDENTITY & SECURITY TELEMETRY
            </span>
            <h1 className="text-2xl sm:text-3xl font-medium tracking-tight text-white">
              Account Security & Profile
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage multi-factor authentication, cryptographic passwords, and active workspace permissions.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => void logout()}
            className="h-9 rounded-full border border-[#C0625F]/30 bg-transparent text-[#C0625F] hover:bg-[#C0625F]/10 text-xs font-medium"
          >
            <LogOut className="mr-2 size-3.5" />
            Sign Out
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_1fr]">
          {/* -------------------- 1. IDENTITY & STATUS CARD -------------------- */}
          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                  <User className="size-4 text-sky-400" />
                  Account Identity
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-400 border border-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  ACTIVE // VERIFIED
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Your authenticated profile identity across this organization workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-[#0E1424] p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Display Name</span>
                  <span className="font-medium text-white">{user?.name || "Business User"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Email</span>
                  <span className="font-mono text-white">{user?.email || "Not registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Mobile Phone</span>
                  <span className="font-mono text-white">{user?.phone || "Not registered"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Account Role</span>
                  <span className="font-mono font-medium uppercase text-sky-400">
                    {user?.role === "admin" ? "Super Administrator" : user?.role || "Workspace Owner"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Associated Business</span>
                  <span className="font-medium text-white">{business?.name || "Prava Technologies"}</span>
                </div>
              </div>

              {/* 2FA Enforced Card */}
              <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-3.5 space-y-2">
                <div className="flex items-center gap-2 font-medium text-sky-400 text-xs">
                  <Smartphone className="size-4" />
                  <span>Two-Step OTP Security Enforced</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Every sign-in requires a valid 6-digit one-time passcode delivered through your registered Mobile SMS or Gmail address.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* -------------------- 2. CHANGE PASSWORD CARD -------------------- */}
          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-xs">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                <KeyRound className="size-4 text-sky-400" />
                Change Password
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Update your account password with cryptographic salted scrypt hashing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Alert Feedback */}
              {errorMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}
              {successMessage && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{successMessage}</div>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="curr-pass" className="text-xs font-medium text-[#8A9591]">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      id="curr-pass"
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="pl-9 pr-9 text-xs bg-[#0E1424] border border-white/[0.08] text-white h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showCurrent ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="new-pass" className="text-xs font-medium text-slate-300">
                    New Password (min 8 characters)
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      id="new-pass"
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="pl-9 pr-9 text-xs bg-[#0E1424] border border-white/[0.08] text-white h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showNew ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirm-pass" className="text-xs font-medium text-slate-300">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                    <Input
                      id="confirm-pass"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      className="pl-9 text-xs bg-[#0E1424] border border-white/[0.08] text-white h-10 rounded-xl focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending || !currentPassword || newPassword.length < 8}
                  className="w-full h-10 rounded-full bg-white text-xs font-semibold text-black hover:bg-slate-200 shadow-md transition mt-2"
                >
                  {changePasswordMutation.isPending ? "Updating Security Credentials…" : "Update Security Password"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* -------------------- 3. BUSINESS PROFILE & LEGAL ENTITY CARD -------------------- */}
        <div className="mt-6">
          <Card className="rounded-2xl border-white/[0.08] bg-gradient-to-b from-[#0B0F19] to-[#070A12] shadow-xs">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-sm font-medium text-white flex items-center gap-2">
                  <Building2 className="size-4 text-sky-400" />
                  Business Profile & Legal Entity Settings
                </CardTitle>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-mono font-medium text-sky-400 border border-sky-500/20">
                  <span className="size-1.5 rounded-full bg-sky-400" />
                  PERSISTENT WORKSPACE REGISTRATION
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Update legal entity details, official GSTIN, registered corporate address, and financial year cycles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bizSaveSuccess && (
                <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">Business profile successfully updated in database.</div>
                </div>
              )}

              <form onSubmit={handleBusinessSave} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Commercial / Trade Name *</Label>
                    <Input
                      required
                      value={bizForm.name}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Prava Technologies"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Legal Entity Corporate Name</Label>
                    <Input
                      value={bizForm.legalName}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, legalName: e.target.value }))}
                      placeholder="Full statutory registered name"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Business Structure</Label>
                    <Input
                      value={bizForm.businessType}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, businessType: e.target.value }))}
                      placeholder="e.g. Private Limited Company, LLP, Proprietorship"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Industry Sector</Label>
                    <Input
                      value={bizForm.industry}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, industry: e.target.value }))}
                      placeholder="e.g. Software, Financial Services, Manufacturing"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Tax Identifier / GSTIN</Label>
                    <Input
                      value={bizForm.gstin}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, gstin: e.target.value.toUpperCase() }))}
                      placeholder="e.g. 27AABCP8821F1Z2"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white uppercase font-mono focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Operating Currency</Label>
                    <Input
                      value={bizForm.currency}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
                      placeholder="INR, USD, EUR"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white uppercase font-mono focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Financial Year Cycle</Label>
                    <Input
                      value={bizForm.financialYear}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, financialYear: e.target.value }))}
                      placeholder="April–March"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-slate-300">Registered Office Address</Label>
                  <Input
                    value={bizForm.addressLine1}
                    onChange={(e) => setBizForm((prev) => ({ ...prev, addressLine1: e.target.value }))}
                    placeholder="Floor, building, street, tech park"
                    className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">City</Label>
                    <Input
                      value={bizForm.city}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="e.g. Mumbai"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">State / Region</Label>
                    <Input
                      value={bizForm.state}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, state: e.target.value }))}
                      placeholder="e.g. Maharashtra"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Postal PIN</Label>
                    <Input
                      value={bizForm.postalCode}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                      placeholder="e.g. 400069"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Business Billing Email</Label>
                    <Input
                      type="email"
                      value={bizForm.email}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="billing@prava.in"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-slate-300">Official Contact Phone</Label>
                    <Input
                      value={bizForm.phone}
                      onChange={(e) => setBizForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+91 98200 12345"
                      className="h-10 rounded-xl border border-white/[0.08] bg-[#0E1424] text-xs text-white focus-visible:ring-1 focus-visible:ring-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={updateBusinessMutation.isPending}
                    className="h-10 rounded-full bg-white px-6 text-xs font-semibold text-black hover:bg-slate-200 shadow-md transition"
                  >
                    {updateBusinessMutation.isPending ? "Persisting Business Profile…" : "Save Business Profile Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
