import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FolderOpen,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function AdminBusinesses() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBusinessId, setSelectedBusinessId] = useState(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState("suspended");
  const [statusReason, setStatusReason] = useState("");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "businesses", statusFilter, searchQuery],
    queryFn: () => api.admin.businesses({ status: statusFilter, search: searchQuery }),
    refetchInterval: 30000,
  });

  const { data: businessDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ["admin", "businessDetail", selectedBusinessId],
    queryFn: () => api.admin.businessDetail(selectedBusinessId),
    enabled: !!selectedBusinessId,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, reason }) => api.admin.setBusinessStatus(id, { status, reason }),
    onSuccess: (_, variables) => {
      toast.success(`Business status updated to ${variables.status}. Audit entry recorded.`);
      queryClient.invalidateQueries({ queryKey: ["admin", "businesses"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "businessDetail", variables.id] });
      setStatusModalOpen(false);
      setStatusReason("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update business status");
    },
  });

  const businesses = Array.isArray(data) ? data : data?.businesses || [];

  const handleOpenStatusModal = (status) => {
    setTargetStatus(status);
    setStatusReason("");
    setStatusModalOpen(true);
  };

  const handleConfirmStatusChange = () => {
    if (!selectedBusinessId) return;
    statusMutation.mutate({
      id: selectedBusinessId,
      status: targetStatus,
      reason: statusReason.trim() || `Administrative state transition to ${targetStatus}`,
    });
  };

  return (
    <AdminLayout
      title="Business Directory & Tenancy"
      subtitle="Comprehensive ledger of registered tenant entities, operational quotas, and state governance."
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
              <Input
                placeholder="Search by legal name, GSTIN, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-[#06090F] border-slate-800 text-xs text-white placeholder:text-slate-600 focus:border-blue-500"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-[#06090F] border-slate-800 text-xs text-slate-300">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F19] border-slate-800 text-slate-200">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active Tenants</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending_verification">Pending Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-slate-800 bg-[#06090F] text-xs text-slate-300 hover:text-white"
            >
              <RefreshCw className={`mr-2 size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Directory Table */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] overflow-hidden">
          <div className="border-b border-slate-800/80 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-blue-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Registered Workspaces ({businesses.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Deterministic multi-tenant query scope
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <RefreshCw className="mx-auto size-5 animate-spin text-blue-500 mb-2" />
              Loading verified tenant registry...
            </div>
          ) : businesses.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="mx-auto size-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">No matching business entities found</p>
              <p className="text-[11px] text-slate-600 mt-1">Adjust search parameters or status filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Business Name</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Contact Person</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Registered Email</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Phone Number</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">GSTIN / ID</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Docs Ingested</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Status</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Registered</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((biz) => {
                    const isSuspended = biz.status === "suspended" || biz.accountStatus === "suspended";
                    const displayEmail = biz.email || biz.ownerEmail || "—";
                    const displayPhone = biz.phone || biz.ownerPhone || "—";
                    const displayOwner = biz.ownerName || "Primary Contact";
                    const docCount = biz.documentCount ?? biz.docCount ?? 0;

                    return (
                      <TableRow
                        key={biz.id}
                        className="border-slate-800/60 hover:bg-slate-800/20 cursor-pointer"
                        onClick={() => setSelectedBusinessId(biz.id)}
                      >
                        <TableCell className="font-medium text-xs text-white">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono text-xs font-bold">
                              {biz.name ? biz.name.substring(0, 2).toUpperCase() : "BZ"}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-white truncate max-w-[180px]">{biz.name || "Unnamed Workspace"}</div>
                              {biz.legalName && biz.legalName !== biz.name && (
                                <div className="text-[10px] text-slate-400 truncate max-w-[180px]">{biz.legalName}</div>
                              )}
                              <div className="text-[9px] text-slate-500 font-mono">ID: #{biz.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <User className="size-3.5 text-slate-500 shrink-0" />
                            <span className="font-medium">{displayOwner}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Mail className="size-3.5 text-blue-400 shrink-0" />
                            <span className="font-mono text-[11px]">{displayEmail}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Phone className="size-3.5 text-emerald-400 shrink-0" />
                            <span className="font-mono text-[11px]">{displayPhone}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-300">
                          {biz.gstin ? (
                            <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800 text-blue-300 text-[11px]">
                              {biz.gstin}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic text-[11px]">Unregistered</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white font-mono">{docCount}</span>
                            <span className="text-[10px] text-slate-500">docs</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isSuspended ? (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px] font-medium">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-medium">
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-400 font-mono">
                          {biz.createdAt ? new Date(biz.createdAt).toLocaleDateString() : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-slate-400 hover:text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBusinessId(biz.id);
                            }}
                          >
                            <Eye className="size-3.5 mr-1 text-blue-400" />
                            Inspect
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Business Inspection Detail Drawer / Modal */}
        <Dialog open={!!selectedBusinessId} onOpenChange={(open) => !open && setSelectedBusinessId(null)}>
          <DialogContent className="max-w-2xl bg-[#0B0F19] border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="size-5 text-blue-400" />
                {businessDetail?.business?.name || "Workspace Profile"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Registered business profile, contact identity, and administrative controls.
              </DialogDescription>
            </DialogHeader>

            {isLoadingDetail || !businessDetail ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw className="mx-auto size-5 animate-spin text-blue-500 mb-2" />
                Fetching entity records...
              </div>
            ) : (
              <div className="space-y-5 pt-2">
                {/* Privacy & Security Guarantee Banner */}
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-300">
                  <ShieldCheck className="size-4 shrink-0 mt-0.5 text-blue-400" />
                  <div>
                    <span className="font-semibold text-white">Tenant Document Privacy Protected:</span> Financial profile data and registered contacts are available for account governance. Raw invoice scans, files, and line items remain encrypted and exclusive to the tenant workspace.
                  </div>
                </div>

                {/* Metric Summary Cards (Count only) */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-[#06090F] p-3">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Total Docs</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {businessDetail.stats?.totalDocuments ?? businessDetail.documentStats?.total ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#06090F] p-3">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Approved</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {businessDetail.stats?.approvedDocuments ?? businessDetail.documentStats?.extracted ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#06090F] p-3">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">In Review</div>
                    <div className="text-lg font-bold text-amber-400 mt-1">
                      {businessDetail.stats?.pendingReview ?? businessDetail.documentStats?.needsReview ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#06090F] p-3">
                    <div className="text-[10px] uppercase font-semibold text-slate-500">Status</div>
                    <div className="text-sm font-bold text-blue-400 mt-1.5 capitalize">
                      {businessDetail.business?.status || "Active"}
                    </div>
                  </div>
                </div>

                {/* Profile Details Grid */}
                <div className="rounded-lg border border-slate-800 bg-[#06090F] p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-y-3 gap-x-4">
                    <div>
                      <span className="text-slate-500 font-medium">Business Legal Name:</span>
                      <p className="font-semibold text-white mt-0.5">
                        {businessDetail.business?.legalName || businessDetail.business?.name || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Trade / Display Name:</span>
                      <p className="text-slate-300 mt-0.5">{businessDetail.business?.name || "—"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Primary Contact Person:</span>
                      <p className="text-slate-300 mt-0.5 flex items-center gap-1.5">
                        <User className="size-3.5 text-slate-500" />
                        {businessDetail.owner?.name || businessDetail.business?.ownerName || "Primary Contact"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Registered Email Address:</span>
                      <p className="text-blue-300 font-mono mt-0.5 flex items-center gap-1.5">
                        <Mail className="size-3.5 text-blue-400" />
                        {businessDetail.business?.email || businessDetail.owner?.email || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Registered Phone Number:</span>
                      <p className="text-emerald-300 font-mono mt-0.5 flex items-center gap-1.5">
                        <Phone className="size-3.5 text-emerald-400" />
                        {businessDetail.business?.phone || businessDetail.owner?.phone || "—"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Statutory GSTIN:</span>
                      <p className="font-mono text-slate-300 mt-0.5">
                        {businessDetail.business?.gstin ? (
                          <span className="rounded bg-slate-900 px-2 py-0.5 border border-slate-800 text-blue-300">
                            {businessDetail.business.gstin}
                          </span>
                        ) : (
                          "Unregistered"
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Entity Type & Industry:</span>
                      <p className="text-slate-300 mt-0.5">
                        {businessDetail.business?.businessType || "Private Limited"} · {businessDetail.business?.industry || "Commercial"}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Registration Date:</span>
                      <p className="text-slate-300 mt-0.5">
                        {businessDetail.business?.createdAt ? new Date(businessDetail.business.createdAt).toLocaleString() : "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Operational Governance Controls */}
                <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    Administrative governance actions are audited under Super Admin privileges.
                  </div>
                  <div className="flex gap-2">
                    {businessDetail.business?.status === "suspended" ? (
                      <Button
                        size="sm"
                        onClick={() => handleOpenStatusModal("active")}
                        className="bg-emerald-600 hover:bg-emerald-500 text-xs text-white"
                      >
                        <CheckCircle2 className="size-3.5 mr-1.5" />
                        Reactivate Workspace
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleOpenStatusModal("suspended")}
                        className="bg-red-600/90 hover:bg-red-600 text-xs text-white"
                      >
                        <AlertTriangle className="size-3.5 mr-1.5" />
                        Suspend Workspace
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Status Confirmation Modal */}
        <Dialog open={statusModalOpen} onOpenChange={setStatusModalOpen}>
          <DialogContent className="max-w-md bg-[#0B0F19] border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="size-4 text-amber-400" />
                Confirm Account State Transition
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                You are transitioning this tenant to{" "}
                <strong className={targetStatus === "suspended" ? "text-red-400" : "text-emerald-400"}>
                  {targetStatus.toUpperCase()}
                </strong>
                .
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <label className="text-slate-400">Administrative Justification / Reason</label>
              <Input
                placeholder="e.g. Audit non-compliance, requested by owner, payment failure..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                className="bg-[#06090F] border-slate-800 text-xs text-white placeholder:text-slate-600"
              />
              <p className="text-[11px] text-slate-500">
                This rationale will be permanently recorded in the immutable audit log with your administrative user ID.
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusModalOpen(false)}
                className="border-slate-800 text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmStatusChange}
                disabled={statusMutation.isPending}
                className={
                  targetStatus === "suspended"
                    ? "bg-red-600 hover:bg-red-500 text-xs text-white font-semibold"
                    : "bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold"
                }
              >
                {statusMutation.isPending ? "Applying..." : "Confirm & Record Audit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
