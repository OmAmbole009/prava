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
  const audit = trpc.admin.auditLog.useQuery({ search: search || undefined, action: actionFilter === "all" ? undefined : actionFilter, limit: 50 }, { retry: false });
  const invite = trpc.admin.createInvitation.useMutation({
    onSuccess: result => {
      const link = `${window.location.origin}/invite/${result.token}`;
      setLatestLink(link);
      void navigator.clipboard?.writeText(link).catch(() => undefined);
      toast.success(`Invitation prepared for ${result.businessName}. The secure link has been copied when supported.`);
      setInviteEmail("");
      utils.admin.securityOverview.invalidate();
      utils.admin.auditLog.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  const revoke = trpc.admin.revokeInvitation.useMutation({
    onSuccess: () => { toast.success("Invitation revoked."); utils.admin.securityOverview.invalidate(); utils.admin.auditLog.invalidate(); },
    onError: error => toast.error(error.message),
  });
  const rotate = trpc.admin.rotatePassword.useMutation({
    onSuccess: () => { toast.success("Administrator password rotated. Future local sign-ins require the new password."); setCurrentPassword(""); setNewPassword(""); utils.admin.auditLog.invalidate(); },
    onError: error => toast.error(error.message),
  });

  const actionOptions = useMemo(() => Array.from(new Set(audit.data?.map(row => row.event.action) ?? [])).sort(), [audit.data]);
  const submitInvite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    invite.mutate({ businessId: Number(workspaceId), email: inviteEmail, role: inviteRole, expiresInDays: Number(expiry) });
  };
  const submitRotation = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    rotate.mutate({ currentPassword, newPassword });
  };

  if (overview.isLoading) return <DashboardLayout><div className="grid min-h-[60vh] place-items-center text-sm text-[#708078]"><Loader2 className="mr-2 size-4 animate-spin" />Loading secure administration…</div></DashboardLayout>;
  if (overview.error || !overview.data) return <DashboardLayout><div className="mx-auto mt-16 max-w-xl rounded-2xl border border-[#edc8bb] bg-[#fff7f4] p-7"><AlertCircle className="size-5 text-[#b7523d]" /><h1 className="mt-3 text-lg font-semibold text-[#5c241c]">Administrative access is required.</h1><p className="mt-2 text-sm text-[#7b5249]">{overview.error?.message ?? "This console is available only to authorized administrators."}</p></div></DashboardLayout>;

  return <DashboardLayout><div className="mx-auto max-w-6xl py-2"><section className="rounded-3xl bg-[#163a34] p-7 text-[#f7f1e4] sm:p-9"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#cfe4ad]">Access control</p><h1 className="prava-display mt-3 text-4xl">Invite deliberately. Rotate securely. Review every privileged action.</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-[#c5d2c9]">Invitation links are prepared but do not create accounts. A recipient must sign in with the invited email before a workspace membership is created.</p></div><ShieldCheck className="size-7 text-[#d5bd90]" /></div></section><div className="mt-6 grid gap-5 lg:grid-cols-2"><section className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex items-center gap-3"><UserRoundPlus className="size-5 text-[#b77a43]" /><div><h2 className="text-sm font-semibold text-[#153832]">Prepare workspace invitation</h2><p className="text-xs text-[#75847c]">No user is provisioned until the invited person accepts.</p></div></div><form onSubmit={submitInvite} className="mt-5 grid gap-4"><div className="grid gap-2"><Label htmlFor="invite-workspace">Workspace</Label><Select value={workspaceId} onValueChange={setWorkspaceId}><SelectTrigger id="invite-workspace"><SelectValue placeholder="Select a workspace" /></SelectTrigger><SelectContent>{overview.data.workspaces.map(workspace => <SelectItem key={workspace.id} value={String(workspace.id)}>{workspace.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label htmlFor="invite-email">Recipient email</Label><Input id="invite-email" type="email" autoComplete="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} required /></div><div className="grid gap-4 sm:grid-cols-2"><div className="grid gap-2"><Label>Workspace role</Label><Select value={inviteRole} onValueChange={value => setInviteRole(value as InviteRole)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="admin">Admin</SelectItem><SelectItem value="member">Member</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent></Select></div><div className="grid gap-2"><Label>Link expiry</Label><Select value={expiry} onValueChange={setExpiry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1 day</SelectItem><SelectItem value="7">7 days</SelectItem><SelectItem value="14">14 days</SelectItem><SelectItem value="30">30 days</SelectItem></SelectContent></Select></div></div><Button disabled={invite.isPending || !workspaceId || !inviteEmail} className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]">{invite.isPending ? "Preparing…" : <><Send className="mr-2 size-4" />Prepare secure invite</>}</Button></form>{latestLink ? <div className="mt-5 rounded-xl border border-[#d8e3d2] bg-[#f0f6ea] p-4"><div className="flex items-center gap-2 text-xs font-semibold text-[#315b4c]"><CheckCircle2 className="size-4" />Secure join link ready</div><Input aria-label="Prepared invitation link" readOnly value={latestLink} className="mt-3 bg-white text-xs" /><Button variant="outline" type="button" className="mt-3 rounded-full" onClick={() => void navigator.clipboard?.writeText(latestLink).then(() => toast.success("Invitation link copied."))}><Clipboard className="mr-2 size-4" />Copy link</Button></div> : null}</section><section className="rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex items-center gap-3"><KeyRound className="size-5 text-[#b77a43]" /><div><h2 className="text-sm font-semibold text-[#153832]">Rotate administrator password</h2><p className="text-xs text-[#75847c]">Confirm the current password before setting a new 12-character minimum password.</p></div></div><form onSubmit={submitRotation} className="mt-5 grid gap-4"><div className="grid gap-2"><Label htmlFor="current-admin-password">Current password</Label><Input id="current-admin-password" type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} required /></div><div className="grid gap-2"><Label htmlFor="new-admin-password">New password</Label><Input id="new-admin-password" type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} minLength={12} required /><p className="text-xs leading-5 text-[#75847c]">Rotation protects future local sign-ins. Your current session remains active until you sign out.</p></div><Button disabled={rotate.isPending || !currentPassword || newPassword.length < 12} className="rounded-full bg-[#163a34] text-[#f7f1e4] hover:bg-[#0e2c26]">{rotate.isPending ? "Rotating…" : <><KeyRound className="mr-2 size-4" />Rotate password</>}</Button></form></section></div><section className="mt-5 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Search className="size-5 text-[#b77a43]" /><div><h2 className="text-sm font-semibold text-[#153832]">Audited administrator history</h2><p className="text-xs text-[#75847c]">Search access, invitation, password, plan, and subscription actions.</p></div></div><div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Search audit history" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search action or entity" className="sm:w-60" /><Select value={actionFilter} onValueChange={setActionFilter}><SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All actions</SelectItem>{actionOptions.map(action => <SelectItem key={action} value={action}>{readable(action)}</SelectItem>)}</SelectContent></Select></div></div>{audit.isLoading ? <div className="mt-6 flex items-center gap-2 text-sm text-[#75847c]"><Loader2 className="size-4 animate-spin" />Loading audit history…</div> : audit.error ? <p className="mt-6 text-sm text-[#a04e3d]">{audit.error.message}</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-[#e5dccb] text-xs uppercase tracking-[0.1em] text-[#75847c]"><tr><th className="px-3 py-3 font-semibold">Action</th><th className="px-3 py-3 font-semibold">Actor</th><th className="px-3 py-3 font-semibold">Entity</th><th className="px-3 py-3 font-semibold">When</th></tr></thead><tbody>{audit.data?.length ? audit.data.map(({ event, actorName, actorEmail }) => <tr key={event.id} className="border-b border-[#eee7da] last:border-none"><td className="px-3 py-3 font-semibold text-[#315b4c]">{readable(event.action)}</td><td className="px-3 py-3 text-[#566a60]">{actorName || actorEmail || "Administrator"}</td><td className="px-3 py-3 text-[#566a60]">{event.entityType}{event.entityId ? ` #${event.entityId}` : ""}</td><td className="px-3 py-3 text-[#75847c]">{new Date(event.createdAt).toLocaleString()}</td></tr>) : <tr><td colSpan={4} className="px-3 py-8 text-center text-[#75847c]">No audit events match this filter.</td></tr>}</tbody></table></div>}</section><section className="mt-5 rounded-2xl border border-[#dfd6c4] bg-[#fffdf8] p-6"><h2 className="text-sm font-semibold text-[#153832]">Pending invitations</h2><div className="mt-4 grid gap-3">{overview.data.invitations.length ? overview.data.invitations.map(({ invitation, businessName }) => <div key={invitation.id} className="flex flex-col gap-3 rounded-xl border border-[#ebe2d2] bg-[#faf7ef] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#315b4c]">{invitation.email}</p><p className="mt-1 text-xs text-[#75847c]">{businessName} · {invitation.role} · {invitation.status} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p></div>{invitation.status === "pending" ? <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate({ invitationId: invitation.id })} className="rounded-full">Revoke</Button> : null}</div>) : <p className="rounded-xl border border-dashed border-[#d9cfbb] p-5 text-sm text-[#718078]">No invitations have been prepared.</p>}</div></section></div></DashboardLayout>;
}
