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
  const [selectedCaUserId, setSelectedCaUserId] = useState<number | null>(null);
  const [selectedCaName, setSelectedCaName] = useState("");

  // Grant CA Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipNumber, setMembershipNumber] = useState("");
  const [firmName, setFirmName] = useState("");
  const [specialization, setSpecialization] = useState("GST Filings, Direct Tax & Corporate Audit");
  const [initialPassword, setInitialPassword] = useState("");
  const [bio, setBio] = useState("");
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");

  // Reset Password State
  const [newPassword, setNewPassword] = useState("");

  // Assignment State
  const [assignWorkspaceId, setAssignWorkspaceId] = useState<string>("");
  const [assignNotes, setAssignNotes] = useState("");

  // Search/Filter
  const [search, setSearch] = useState("");

  // Mutations
  const grantCa = trpc.admin.grantCaAccess.useMutation({
    onSuccess: (data) => {
      toast.success(`CA Access granted to ${data.fullName} (${data.membershipNumber}).`);
      setIsGrantOpen(false);
      resetGrantForm();
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStatus = trpc.admin.updateCaStatus.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`CA status updated to ${vars.status}.`);
      utils.admin.listCas.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetPassword = trpc.admin.resetCaPassword.useMutation({
    onSuccess: () => {
      toast.success("Chartered Accountant password has been updated.");
      setIsResetPassOpen(false);
      setNewPassword("");
      utils.admin.auditLog.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const assignWorkspace = trpc.admin.assignCaToBusiness.useMutation({
    onSuccess: () => {
      toast.success("Workspace successfully assigned to Chartered Accountant.");
      setIsAssignOpen(false);
      setAssignWorkspaceId("");
      setAssignNotes("");
      utils.admin.listCas.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unassignWorkspace = trpc.admin.unassignCaFromBusiness.useMutation({
    onSuccess: () => {
      toast.success("Workspace unassigned from CA.");
      utils.admin.listCas.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetGrantForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setMembershipNumber("");
    setFirmName("");
    setSpecialization("GST Filings, Direct Tax & Corporate Audit");
    setInitialPassword("");
    setBio("");
    setSelectedWorkspaceId("");
  };

  const handleGrantSubmit = (e: FormEvent) => {
    e.preventDefault();
    grantCa.mutate({
      fullName,
      email,
      phone: phone || undefined,
      membershipNumber,
      firmName: firmName || undefined,
      specialization,
      initialPassword,
      bio: bio || undefined,
      assignedBusinessIds: selectedWorkspaceId ? [Number(selectedWorkspaceId)] : [],
    });
  };

  const handleResetPasswordSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCaUserId || !newPassword) return;
    resetPassword.mutate({
      caUserId: selectedCaUserId,
      newPassword,
    });
  };

  const handleAssignSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCaUserId || !assignWorkspaceId) return;
    assignWorkspace.mutate({
      caUserId: selectedCaUserId,
      businessId: Number(assignWorkspaceId),
      notes: assignNotes || undefined,
    });
  };

  const casList = casQuery.data ?? [];
  const workspacesList = workspacesQuery.data?.workspaces ?? [{ id: 1, name: "Acme Global Solutions" }];

  const filteredCas = casList.filter((ca) => {
    const term = search.toLowerCase();
    return (
      ca.fullName.toLowerCase().includes(term) ||
      ca.email.toLowerCase().includes(term) ||
      ca.membershipNumber.toLowerCase().includes(term) ||
      (ca.firmName && ca.firmName.toLowerCase().includes(term))
    );
  });

  const activeCasCount = casList.filter((c) => c.status === "active").length;
  const totalAssignmentsCount = casList.reduce((acc, c) => acc + c.assignedWorkspacesCount, 0);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-7 py-2">
        {/* Header Hero */}
        <section className="rounded-3xl bg-[#163a34] p-7 text-[#f7f1e4] sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#27534b] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#cfe4ad]">
                <ShieldCheck className="size-3.5" />
                Administrative Authority
              </div>
              <h1 className="prava-display mt-3 text-4xl">
                Chartered Accountant Network Management
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d2c9]">
                Only administrators can onboard, grant credentials, and assign Chartered Accountants to client businesses. CAs sign in through their dedicated portal to inspect records and provide statutory review certifications.
              </p>
            </div>
            <Button
              onClick={() => setIsGrantOpen(true)}
              className="rounded-full bg-[#f4eddf] text-sm font-semibold text-[#163a34] shadow-md hover:bg-white active:scale-95 shrink-0"
            >
              <UserPlus className="mr-2 size-4 text-[#163a34]" />
              Grant CA Access
            </Button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-[#26534b] pt-6">
            <div>
              <p className="text-xs text-[#a3b8ad]">Active CAs</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">{activeCasCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Assigned Workspaces</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">{totalAssignmentsCount}</p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Review Status</p>
              <p className="mt-1 text-2xl font-bold text-[#cfe4ad]">Operational</p>
            </div>
            <div>
              <p className="text-xs text-[#a3b8ad]">Access Policy</p>
              <p className="mt-1 text-2xl font-bold text-[#f4eddf]">Admin-Gated</p>
            </div>
          </div>
        </section>

        {/* Main CA Roster Card */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#ece4d6] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#163a34]">Onboarded Chartered Accountants</h2>
              <p className="text-xs text-[#718279]">
                Manage credentials, practice details, and client workspace allocations.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 size-4 text-[#75847c]" />
                <Input
                  placeholder="Search CA name, reg no, email…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-full border-[#dcd1be] pl-9 text-xs"
                />
              </div>
            </div>
          </div>

          {casQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-[#75847c]">
              <Loader2 className="mr-2 size-4 animate-spin" />
              Loading Chartered Accountants roster…
            </div>
          ) : filteredCas.length === 0 ? (
            <div className="py-12 text-center">
              <UserX className="mx-auto size-9 text-[#a8b8b0]" />
              <p className="mt-3 text-sm font-semibold text-[#1a443b]">No Chartered Accountants found</p>
              <p className="mt-1 text-xs text-[#75847c]">Click "Grant CA Access" above to onboard your first in-house CA.</p>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#ece4d6] text-[11px] font-bold uppercase tracking-wider text-[#75847c]">
                    <th className="py-3 px-3">Chartered Accountant</th>
                    <th className="py-3 px-3">Membership & Firm</th>
                    <th className="py-3 px-3">Specialization</th>
                    <th className="py-3 px-3">Assigned Workspaces</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e9dc]">
                  {filteredCas.map((ca) => (
                    <tr key={ca.id} className="hover:bg-[#fbf8f2] transition-colors">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e2ece0] text-[#1a443b] font-bold text-xs">
                            {ca.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#153832]">{ca.fullName}</p>
                            <p className="text-xs text-[#6e8076]">{ca.email}</p>
                            {ca.phone && <p className="text-[11px] text-[#8ea096]">{ca.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 rounded bg-[#ebf3e8] px-2 py-0.5 text-xs font-bold text-[#235041]">
                          <BadgeCheck className="size-3" />
                          {ca.membershipNumber}
                        </span>
                        {ca.firmName && <p className="mt-1 text-xs text-[#5d6f66] truncate max-w-[180px]">{ca.firmName}</p>}
                      </td>
                      <td className="py-3.5 px-3 text-xs text-[#4b6056] max-w-[200px]">
                        {ca.specialization}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-[#eee8dc] px-2.5 py-0.5 text-xs font-bold text-[#1f473e]">
                            {ca.assignedWorkspacesCount} Workspaces
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedCaUserId(ca.userId);
                              setSelectedCaName(ca.fullName);
                              setIsAssignOpen(true);
                            }}
                            className="h-6 px-2 text-[11px] font-semibold text-[#1a443b] hover:bg-[#e6efe2]"
                          >
                            + Assign
                          </Button>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            ca.status === "active"
                              ? "bg-[#e5efe1] text-[#2b5847]"
                              : ca.status === "suspended"
                              ? "bg-[#fdf4e4] text-[#8e6018]"
                              : "bg-[#fae8e5] text-[#933429]"
                          }`}
                        >
                          {ca.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCaUserId(ca.userId);
                              setSelectedCaName(ca.fullName);
                              setIsResetPassOpen(true);
                            }}
                            className="h-7 rounded-full border-[#d8cdba] text-xs font-medium text-[#244b41] hover:bg-[#f0e9dc]"
                          >
                            <KeyRound className="mr-1 size-3 text-[#587268]" />
                            Reset Password
                          </Button>

                          {/* Status Toggles */}
                          {ca.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  caUserId: ca.userId,
                                  status: "suspended",
                                  reason: "Suspended by Admin",
                                })
                              }
                              className="h-7 rounded-full text-xs font-medium text-[#8e6018] hover:bg-[#fdf4e4]"
                            >
                              Suspend
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                updateStatus.mutate({
                                  caUserId: ca.userId,
                                  status: "active",
                                })
                              }
                              className="h-7 rounded-full text-xs font-medium text-[#2b5847] hover:bg-[#e5efe1]"
                            >
                              Activate
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Privileged CA Audit Actions */}
        <div className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#ece4d6] pb-4">
            <div>
              <h2 className="text-base font-bold text-[#163a34]">Audited CA Access & Review Activity</h2>
              <p className="text-xs text-[#718279]">Immutable log of administrative CA provisioning and CA review submissions.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece4d6] text-[#75847c]">
                  <th className="py-2.5 px-3 font-semibold">Action</th>
                  <th className="py-2.5 px-3 font-semibold">Actor / Entity</th>
                  <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f2ede3]">
                {auditQuery.data?.slice(0, 8).map(({ event, actorName }) => (
                  <tr key={event.id}>
                    <td className="py-2 px-3 font-semibold text-[#1e483f]">
                      {event.action.replaceAll("_", " ")}
                    </td>
                    <td className="py-2 px-3 text-[#586b62]">
                      {actorName || "Administrator"} · {event.entityType} #{event.entityId}
                    </td>
                    <td className="py-2 px-3 text-[#798a81]">
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
        <DialogContent className="max-w-xl bg-[#fffdf8] border-[#dfd6c4]">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-[#163a34] text-[#d9e8be]">
                <UserCheck className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-[#163a34]">
                  Grant Chartered Accountant Access
                </DialogTitle>
                <DialogDescription className="text-xs text-[#6e8076]">
                  Provision credentials and register a qualified CA into Prava's professional review network.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleGrantSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">Full Legal Name *</Label>
                <Input
                  placeholder="e.g. CA Rajesh Verma, FCA"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">CA Email Address *</Label>
                <Input
                  type="email"
                  placeholder="ca.name@prava.internal"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">ICAI / CPA Reg Number *</Label>
                <Input
                  placeholder="e.g. ICAI #409212"
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value)}
                  required
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">Phone / Contact</Label>
                <Input
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">CA Firm / Practice Name</Label>
                <Input
                  placeholder="Verma & Associates CA"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[#30544a]">Initial Login Password *</Label>
                <Input
                  type="password"
                  placeholder="Min 8 characters"
                  value={initialPassword}
                  onChange={(e) => setInitialPassword(e.target.value)}
                  required
                  minLength={8}
                  className="rounded-xl border-[#dcd1be] text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Practice Specialization</Label>
              <Input
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Assign Initial Workspace (Optional)</Label>
              <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                <SelectTrigger className="rounded-xl border-[#dcd1be] text-xs">
                  <SelectValue placeholder="Select client workspace…" />
                </SelectTrigger>
                <SelectContent>
                  {workspacesList.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Professional Bio / Notes</Label>
              <Textarea
                placeholder="Senior Fellow CA with extensive experience in corporate GST audits…"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGrantOpen(false)}
                className="rounded-full border-[#d8cdba] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={grantCa.isPending || !fullName || !email || !membershipNumber || !initialPassword}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#0f2824]"
              >
                {grantCa.isPending ? "Granting Access…" : "Grant CA Access"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Reset CA Password */}
      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md bg-[#fffdf8] border-[#dfd6c4]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#163a34]">
              Reset CA Password
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6e8076]">
              Set a new secure password for <strong>{selectedCaName}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">New Password</Label>
              <Input
                type="password"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsResetPassOpen(false)}
                className="rounded-full border-[#d8cdba] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={resetPassword.isPending || !newPassword || newPassword.length < 8}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#0f2824]"
              >
                {resetPassword.isPending ? "Updating…" : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Assign Workspace */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent className="max-w-md bg-[#fffdf8] border-[#dfd6c4]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#163a34]">
              Assign Workspace to {selectedCaName}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6e8076]">
              Grant this Chartered Accountant review access to the selected client business.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Client Workspace</Label>
              <Select value={assignWorkspaceId} onValueChange={setAssignWorkspaceId}>
                <SelectTrigger className="rounded-xl border-[#dcd1be] text-xs">
                  <SelectValue placeholder="Select workspace…" />
                </SelectTrigger>
                <SelectContent>
                  {workspacesList.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-[#30544a]">Assignment Scope / Notes</Label>
              <Input
                placeholder="Lead CA for quarterly GST review"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                className="rounded-xl border-[#dcd1be] text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssignOpen(false)}
                className="rounded-full border-[#d8cdba] text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={assignWorkspace.isPending || !assignWorkspaceId}
                className="rounded-full bg-[#163a34] text-xs font-semibold text-[#f7f1e4] hover:bg-[#0f2824]"
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
