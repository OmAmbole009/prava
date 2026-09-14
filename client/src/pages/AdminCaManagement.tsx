import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BadgeCheck,
  Building2,
  CheckCircle2,
  FileCheck2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserPlus,
  UserX,
  Users,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

export default function AdminCaManagement() {
  const utils = trpc.useUtils();
  const casQuery = trpc.admin.listCas.useQuery(undefined, { retry: false });
  const workspacesQuery = trpc.admin.securityOverview.useQuery(undefined, { retry: false });
  const auditQuery = trpc.admin.auditLog.useQuery({ action: "CA_", limit: 20 }, { retry: false });

  // Dialog States
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);

  // Form States - Grant Access
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [firmName, setFirmName] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [specialization, setSpecialization] = useState("GST & Corporate Audit");
  const [bio, setBio] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  // Form States - Reset Password
  const [selectedCaId, setSelectedCaId] = useState<number | null>(null);
  const [selectedCaName, setSelectedCaName] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Form States - Assign Workspace
  const [assignCaId, setAssignCaId] = useState<number | null>(null);
  const [assignWorkspaceId, setAssignWorkspaceId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");

  // Search filter
  const [search, setSearch] = useState("");

  // Mutations
  const grantCa = trpc.admin.grantCaAccess.useMutation({
    onSuccess: (data) => {
      toast.success(`CA Access granted to ${data.fullName}. Credentials provisioned successfully.`);
      setIsGrantOpen(false);
      resetGrantForm();
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPassword = trpc.admin.resetCaPassword.useMutation({
    onSuccess: (data) => {
      toast.success(`Password reset for ${data.caName}. Action recorded in audit trail.`);
      setIsResetPassOpen(false);
      setNewPassword("");
      setSelectedCaId(null);
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const setStatus = trpc.admin.setCaStatus.useMutation({
    onSuccess: (data) => {
      toast.success(`CA status updated to ${data.status}.`);
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignWorkspace = trpc.admin.assignCaToWorkspace.useMutation({
    onSuccess: (data) => {
      toast.success(`CA assigned to ${data.businessName}.`);
      setIsAssignOpen(false);
      setAssignWorkspaceId("");
      setAssignNotes("");
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unassignWorkspace = trpc.admin.unassignCaFromWorkspace.useMutation({
    onSuccess: () => {
      toast.success("Workspace assignment removed.");
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetGrantForm = () => {
    setFullName("");
    setEmail("");
    setMembershipNumber("");
    setPhone("");
    setFirmName("");
    setInitialPassword("");
    setSpecialization("GST & Corporate Audit");
    setBio("");
    setSelectedWorkspaceId("");
  };

  const handleGrantSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !membershipNumber || !initialPassword) return;
    grantCa.mutate({
      fullName,
      email,
      membershipNumber,
      phone: phone || undefined,
      firmName: firmName || undefined,
      initialPassword,
      specialization: specialization || undefined,
      bio: bio || undefined,
      assignBusinessId: selectedWorkspaceId ? Number(selectedWorkspaceId) : undefined,
    });
  };

  const handleResetPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCaId || !newPassword) return;
    resetPassword.mutate({
      caProfileId: selectedCaId,
      newPassword,
    });
  };

  const handleAssignSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!assignCaId || !assignWorkspaceId) return;
    assignWorkspace.mutate({
      caProfileId: assignCaId,
      businessId: Number(assignWorkspaceId),
      assignmentNotes: assignNotes || undefined,
    });
  };

  const casList = casQuery.data ?? [];
  const workspacesList = workspacesQuery.data?.workspaces ?? [];

  const filteredCas = casList.filter((ca) => {
    const q = search.toLowerCase();
    return (
      ca.fullName.toLowerCase().includes(q) ||
      ca.membershipNumber.toLowerCase().includes(q) ||
      ca.email.toLowerCase().includes(q) ||
      (ca.firmName && ca.firmName.toLowerCase().includes(q))
    );
  });

  const activeCasCount = casList.filter((c) => c.status === "active").length;
  const totalAssignmentsCount = casList.reduce((acc, c) => acc + (c.assignedBusinesses?.length ?? 0), 0);

  if (casQuery.error) {
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-destructive/20 bg-destructive/10 p-7 text-foreground">
          <AlertCircle className="size-5 text-destructive" />
          <h1 className="font-serif mt-3 text-lg font-bold">Administrative access is required.</h1>
          <p className="mt-2 text-xs text-muted-foreground">{casQuery.error.message}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* CA Management Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-card/90 p-7 shadow-xl backdrop-blur-xl sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                CA Governance & Credentials
              </span>
              <h1 className="font-serif mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Chartered Accountant <span className="italic font-normal text-muted-foreground">Network Management</span>
              </h1>
              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
                Only administrators can onboard, grant credentials, and assign Chartered Accountants to client businesses.
                CAs sign in through their dedicated portal to inspect records and provide statutory review certifications.
              </p>
            </div>
            <Button
              onClick={() => setIsGrantOpen(true)}
              className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90 shrink-0"
            >
              <UserPlus className="mr-1.5 size-4" />
              Grant CA Access
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-border/60 pt-6 sm:grid-cols-4">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Active CAs</p>
              <p className="font-serif mt-1 text-2xl font-normal text-foreground">{activeCasCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Assigned Workspaces</p>
              <p className="font-serif mt-1 text-2xl font-normal text-foreground">{totalAssignmentsCount}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Review Status</p>
              <p className="font-serif mt-1 text-2xl font-normal text-foreground">Operational</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Access Policy</p>
              <p className="font-serif mt-1 text-2xl font-normal text-foreground">Admin-Gated</p>
            </div>
          </div>
        </section>

        {/* Main CA Roster Card */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-normal text-foreground">Onboarded Chartered Accountants</h2>
              <p className="text-xs text-muted-foreground">
                Manage credentials, practice details, and client workspace allocations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  placeholder="Search CA name, reg no, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-xl border-border/60 bg-background/50 pl-9 text-xs text-foreground"
                />
              </div>
            </div>
          </div>

          {casQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-xs text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin text-primary" />
              Loading Chartered Accountants roster…
            </div>
          ) : filteredCas.length === 0 ? (
            <div className="py-12 text-center">
              <UserX className="mx-auto size-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-semibold text-foreground">No Chartered Accountants found</p>
              <p className="mt-1 text-xs text-muted-foreground">Click "Grant CA Access" above to onboard your first in-house CA.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-3 font-semibold">Chartered Accountant</th>
                    <th className="py-3 px-3 font-semibold">Membership & Firm</th>
                    <th className="py-3 px-3 font-semibold">Specialization</th>
                    <th className="py-3 px-3 font-semibold">Assigned Workspaces</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCas.map((ca) => (
                    <tr key={ca.id} className="transition-colors hover:bg-secondary/30">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-secondary/50 font-semibold text-xs text-foreground">
                            {ca.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{ca.fullName}</p>
                            <p className="text-[11px] text-muted-foreground">{ca.email}</p>
                            {ca.phone && <p className="font-mono text-[10px] text-muted-foreground">{ca.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-secondary/60 px-2 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                          <BadgeCheck className="size-3 text-primary" />
                          {ca.membershipNumber}
                        </span>
                        <p className="mt-1 text-[11px] text-muted-foreground">{ca.firmName || "Independent Practice"}</p>
                      </td>
                      <td className="py-3.5 px-3 text-muted-foreground">{ca.specialization}</td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {ca.assignedBusinesses?.length ? (
                            ca.assignedBusinesses.map((b) => (
                              <span
                                key={b.businessId}
                                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-secondary/40 px-2 py-0.5 text-[11px] text-foreground"
                              >
                                {b.businessName}
                                <button
                                  type="button"
                                  onClick={() =>
                                    unassignWorkspace.mutate({
                                      caProfileId: ca.id,
                                      businessId: b.businessId,
                                    })
                                  }
                                  className="text-destructive hover:opacity-80 ml-1 text-xs"
                                  title="Unassign workspace"
                                >
                                  ×
                                </button>
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">No active assignments</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                            ca.status === "active"
                              ? "border border-border/60 bg-secondary/80 text-foreground"
                              : "border border-destructive/30 bg-destructive/10 text-destructive"
                          }`}
                        >
                          {ca.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAssignCaId(ca.id);
                              setSelectedCaName(ca.fullName);
                              setIsAssignOpen(true);
                            }}
                            className="h-8 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            Assign Client
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCaId(ca.id);
                              setSelectedCaName(ca.fullName);
                              setIsResetPassOpen(true);
                            }}
                            className="h-8 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
                          >
                            <KeyRound className="size-3.5 mr-1" />
                            Pass
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setStatus.mutate({
                                caProfileId: ca.id,
                                status: ca.status === "active" ? "suspended" : "active",
                              })
                            }
                            className={`h-8 rounded-lg text-xs ${
                              ca.status === "active"
                                ? "text-amber-500 hover:bg-amber-500/10"
                                : "text-primary hover:bg-primary/10"
                            }`}
                          >
                            {ca.status === "active" ? "Suspend" : "Activate"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Activity Card */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
          <div className="border-b border-border/60 pb-4">
            <h2 className="font-serif text-base font-normal text-foreground">Audited CA Access & Review Activity</h2>
            <p className="text-xs text-muted-foreground">Immutable log of administrative CA provisioning and CA review submissions.</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Actor / Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {auditQuery.data?.slice(0, 8).map(({ event, actorName }) => (
                  <tr key={event.id} className="transition-colors hover:bg-secondary/30">
                    <td className="py-2.5 px-3 font-medium text-foreground">{event.action.replaceAll("_", " ")}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {actorName || "Administrator"} · {event.entityType} #{event.entityId}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: Grant CA Access */}
      <Dialog open={isGrantOpen} onOpenChange={setIsGrantOpen}>
        <DialogContent className="max-w-xl border-border/60 bg-popover text-popover-foreground shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-foreground">
                <UserCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg font-normal text-foreground">
                  Grant Chartered Accountant Access
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Provision credentials and register a qualified CA into Prava's professional review network.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleGrantSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Full Legal Name *</Label>
                <Input
                  placeholder="e.g. CA Rajesh Verma, FCA"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">CA Email Address *</Label>
                <Input
                  type="email"
                  placeholder="ca.name@prava.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">ICAI / CPA Reg Number *</Label>
                <Input
                  placeholder="e.g. ICAI #409212"
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value)}
                  required
                  className="rounded-xl border-border/60 bg-background/50 text-xs font-mono text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Phone / Contact</Label>
                <Input
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">CA Firm / Practice Name</Label>
                <Input
                  placeholder="Verma & Associates CA"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground">Initial Login Password *</Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  required
                  minLength={8}
                  className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Practice Specialization</Label>
              <Input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Assign Initial Workspace (Optional)</Label>
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground">
                  <SelectValue placeholder="Select client workspace…" />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  {workspacesList.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Professional Bio / Notes</Label>
              <Textarea
                placeholder="Senior Fellow CA with extensive experience in corporate GST audits…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGrantOpen(false)}
                className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={grantCa.isPending || !fullName || !email || !membershipNumber || !initialPassword}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                {grantCa.isPending ? "Granting Access…" : "Grant CA Access"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Reset CA Password */}
      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md border-border/60 bg-popover text-popover-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-base font-normal text-foreground">
              Reset CA Password
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set a new secure password for <strong className="text-foreground">{selectedCaName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">New Password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetPassOpen(false)}
                className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetPassword.isPending || !newPassword || newPassword.length < 8}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                {resetPassword.isPending ? "Updating…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Assign Workspace */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md border-border/60 bg-popover text-popover-foreground shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-base font-normal text-foreground">
              Assign Workspace to {selectedCaName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Grant this Chartered Accountant review access to the selected client business.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Client Workspace</Label>
              <Select value={assignWorkspaceId} onValueChange={setAssignWorkspaceId}>
                <SelectTrigger className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground">
                  <SelectValue placeholder="Select workspace…" />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  {workspacesList.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground">Assignment Scope / Notes</Label>
              <Input
                placeholder="Lead CA for quarterly GST review"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                className="rounded-xl border-border/60 bg-background/50 text-xs text-foreground"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignWorkspace.isPending || !assignWorkspaceId}
                className="rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                {assignWorkspace.isPending ? "Assigning…" : "Confirm Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
