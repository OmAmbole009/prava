import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Clipboard, KeyRound, Loader2, Search, Send, ShieldCheck, UserRoundPlus } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { toast } from "sonner";

type InviteRole = "admin" | "member" | "viewer";

function readable(action: string) {
  return action.replaceAll("_", " ").replaceAll(".", " · ");
}

export default function AdminSecurity() {
  const utils = trpc.useUtils();
  const overview = trpc.admin.securityOverview.useQuery(undefined, { retry: false });
  const [inviteEmail, setInviteEmail] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("member");
  const [expiry, setExpiry] = useState("7");
  const [latestLink, setLatestLink] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const audit = trpc.admin.auditLog.useQuery(
    { search: search || undefined, action: actionFilter === "all" ? undefined : actionFilter, limit: 50 },
    { retry: false }
  );
  const invite = trpc.admin.createInvitation.useMutation({
    onSuccess: (result) => {
      const link = `${window.location.origin}/invite/${result.token}`;
      setLatestLink(link);
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      toast.success(`Invitation prepared for ${result.businessName}. The secure link has been copied.`);
      setInviteEmail("");
      utils.admin.securityOverview.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const revoke = trpc.admin.revokeInvitation.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked.");
      utils.admin.securityOverview.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const rotate = trpc.admin.rotatePassword.useMutation({
    onSuccess: () => {
      toast.success("Administrator password rotated.");
      setCurrentPassword("");
      setNewPassword("");
      utils.admin.auditLog.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const actionOptions: string[] = useMemo(
    () => Array.from(new Set<string>(audit.data?.map((row: any) => String(row.event.action)) ?? [])).sort(),
    [audit.data]
  );
  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    invite.mutate({ businessId: Number(workspaceId), email: inviteEmail, role: inviteRole, expiresInDays: Number(expiry) });
  };
  const submitRotation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    rotate.mutate({ currentPassword, newPassword });
  };

  if (overview.isLoading)
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center text-xs text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin text-primary" />
          Loading security administration…
        </div>
      </DashboardLayout>
    );
  if (overview.error || !overview.data)
    return (
      <DashboardLayout>
        <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-7">
          <AlertCircle className="size-5 text-red-500" />
          <h1 className="font-serif mt-3 text-lg font-bold text-foreground">Administrative access is required.</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            {overview.error?.message ?? "This console is available only to authorized administrators."}
          </p>
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl py-2 space-y-7">
        {/* Banner */}
        <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-card/90 via-card/50 to-card/90 p-7 shadow-xl backdrop-blur-xl sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                <ShieldCheck className="size-3.5 text-primary" />
                Access & Governance
              </span>
              <h1 className="font-serif mt-4 text-3xl sm:text-4xl font-normal tracking-tight text-foreground">
                Invite deliberately. Rotate securely. <span className="italic font-normal text-muted-foreground">Audit privileged actions</span>.
              </h1>
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                Invitation links are generated securely. A recipient must sign in with their invited identity before membership is provisioned.
              </p>
            </div>
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/80 bg-secondary/50 text-foreground shadow-sm">
              <ShieldCheck className="size-6 text-foreground" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Invite Section */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                <UserRoundPlus className="size-4.5 text-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Prepare Workspace Invitation</h2>
                <p className="text-xs text-muted-foreground">No user is provisioned until the invited person accepts.</p>
              </div>
            </div>

            <form onSubmit={submitInvite} className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-workspace" className="text-xs text-foreground">
                  Workspace
                </Label>
                <Select value={workspaceId} onValueChange={setWorkspaceId}>
                  <SelectTrigger id="invite-workspace" className="border-border/60 bg-background/50 text-xs text-foreground">
                    <SelectValue placeholder="Select a workspace" />
                  </SelectTrigger>
                  <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                    {overview.data.workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={String(workspace.id)}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="invite-email" className="text-xs text-foreground">
                  Recipient Email
                </Label>
                <Input
                  id="invite-email"
                  type="email"
                  autoComplete="email"
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  className="border-border/60 bg-background/50 text-xs text-foreground"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label className="text-xs text-foreground">Workspace Role</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as InviteRole)}>
                    <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs text-foreground">Link Expiry</Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                disabled={invite.isPending || !workspaceId || !inviteEmail}
                className="mt-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                {invite.isPending ? (
                  "Preparing…"
                ) : (
                  <>
                    <Send className="mr-2 size-4" />
                    Prepare Secure Invite
                  </>
                )}
              </Button>
            </form>

            {latestLink ? (
              <div className="mt-5 rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <CheckCircle2 className="size-4" />
                  Secure Join Link Ready
                </div>
                <Input
                  aria-label="Prepared invitation link"
                  readOnly
                  value={latestLink}
                  className="mt-3 border-border/60 bg-background/80 font-mono text-xs text-foreground"
                />
                <Button
                  variant="outline"
                  type="button"
                  className="mt-3 rounded-xl border-border/60 bg-secondary/50 text-xs text-foreground hover:bg-secondary"
                  onClick={() =>
                    void navigator.clipboard?.writeText(latestLink).then(() => toast.success("Invitation link copied."))
                  }
                >
                  <Clipboard className="mr-2 size-4 text-foreground" />
                  Copy Link
                </Button>
              </div>
            ) : null}
          </section>

          {/* Password Rotation */}
          <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                <KeyRound className="size-4.5 text-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Rotate Administrator Password</h2>
                <p className="text-xs text-muted-foreground">Confirm current credentials before setting a 12-character minimum password.</p>
              </div>
            </div>

            <form onSubmit={submitRotation} className="mt-5 grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="current-admin-password" className="text-xs text-foreground">
                  Current Password
                </Label>
                <Input
                  id="current-admin-password"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="border-border/60 bg-background/50 text-xs text-foreground"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-admin-password" className="text-xs text-foreground">
                  New Password
                </Label>
                <Input
                  id="new-admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="border-border/60 bg-background/50 text-xs text-foreground"
                  minLength={12}
                  required
                />
                <p className="text-[11px] leading-5 text-muted-foreground">
                  Rotation protects future sign-ins. Your active session remains authenticated.
                </p>
              </div>

              <Button
                disabled={rotate.isPending || !currentPassword || newPassword.length < 12}
                className="mt-2 rounded-xl bg-primary text-xs font-semibold text-primary-foreground shadow-md transition-all hover:opacity-90"
              >
                {rotate.isPending ? (
                  "Rotating…"
                ) : (
                  <>
                    <KeyRound className="mr-2 size-4" />
                    Rotate Password
                  </>
                )}
              </Button>
            </form>
          </section>
        </div>

        {/* Audit Log Table */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/60 bg-secondary/50">
                <Search className="size-4.5 text-foreground" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Audited Administrator History</h2>
                <p className="text-xs text-muted-foreground">Search access, invitation, password, and configuration actions.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                aria-label="Search audit history"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search action or entity…"
                className="border-border/60 bg-background/50 text-xs text-foreground sm:w-60"
              />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="border-border/60 bg-background/50 text-xs text-foreground sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/80 bg-popover text-popover-foreground">
                  <SelectItem value="all">All actions</SelectItem>
                  {actionOptions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {readable(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {audit.isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-primary" />
              Loading audit history…
            </div>
          ) : audit.error ? (
            <p className="mt-6 text-xs text-destructive">{audit.error.message}</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="border-b border-border/60 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-3 font-semibold">Action</th>
                    <th className="px-3 py-3 font-semibold">Actor</th>
                    <th className="px-3 py-3 font-semibold">Entity</th>
                    <th className="px-3 py-3 font-semibold">When</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.data?.length ? (
                    audit.data.map(({ event, actorName, actorEmail }) => (
                      <tr key={event.id} className="border-b border-border/40 transition-colors hover:bg-secondary/30 last:border-none">
                        <td className="px-3 py-3 font-medium text-foreground">{readable(event.action)}</td>
                        <td className="px-3 py-3 text-muted-foreground">{actorName || actorEmail || "Administrator"}</td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">
                          {event.entityType}
                          {event.entityId ? ` #${event.entityId}` : ""}
                        </td>
                        <td className="px-3 py-3 font-mono text-muted-foreground/80">
                          {new Date(event.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                        No audit events match this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending Invitations */}
        <section className="rounded-2xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur-xl">
          <h2 className="text-sm font-semibold text-foreground">Pending Workspace Invitations</h2>
          <div className="mt-4 grid gap-3">
            {overview.data.invitations.length ? (
              overview.data.invitations.map(({ invitation, businessName }) => (
                <div
                  key={invitation.id}
                  className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{invitation.email}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {businessName} · {invitation.role} · {invitation.status} · expires{" "}
                      {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  {invitation.status === "pending" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={revoke.isPending}
                      onClick={() => revoke.mutate({ invitationId: invitation.id })}
                      className="rounded-xl border-destructive/30 bg-destructive/10 text-xs text-destructive hover:bg-destructive/20"
                    >
                      Revoke
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border/60 p-5 text-xs text-muted-foreground">
                No invitations have been prepared.
              </p>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
