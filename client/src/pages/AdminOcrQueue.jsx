import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Cpu,
  FileCode,
  FileSearch,
  FileText,
  Filter,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminOcrQueue() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin", "ocrQueue", statusFilter],
    queryFn: () => api.admin.ocrQueue({ status: statusFilter }),
    refetchInterval: 15000,
  });

  const retryMutation = useMutation({
    mutationFn: (documentId) => api.admin.retryOcr(documentId),
    onSuccess: (res) => {
      toast.success(res.message || "OCR re-extraction dispatched successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin", "ocrQueue"] });
      setSelectedJob(null);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to trigger OCR retry.");
    },
  });

  const stats = data?.stats || {
    totalDocuments: 0,
    queued: 0,
    processing: 0,
    needsReview: 0,
    approved: 0,
    failed: 0,
    failureRate: "0.0%",
  };

  const queue = data?.queue || [];

  const handleRetry = (docId) => {
    retryMutation.mutate(docId);
  };

  return (
    <AdminLayout
      title="OCR Extraction Queue & Diagnostics"
      subtitle="Real-time telemetry, stage progression, failure monitoring, and safe re-extraction controls."
    >
      <div className="space-y-6">
        {/* Metric Badges */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Ingested</div>
            <div className="mt-1 text-xl font-bold text-white">{stats.totalDocuments}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">In Flight</div>
            <div className="mt-1 text-xl font-bold text-blue-400">
              {stats.queued + stats.processing}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Needs Review</div>
            <div className="mt-1 text-xl font-bold text-amber-400">{stats.needsReview}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Approved</div>
            <div className="mt-1 text-xl font-bold text-emerald-400">{stats.approved}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Failed Extraction</div>
            <div className="mt-1 text-xl font-bold text-red-400">{stats.failed}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Failure Rate</div>
            <div className="mt-1 text-xl font-bold text-slate-200">{stats.failureRate}</div>
          </div>
        </div>

        {/* Filter & Action Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-slate-800 bg-[#0B0F19] p-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Filter Queue:</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 bg-[#06090F] border-slate-800 text-xs text-slate-200">
                <SelectValue placeholder="All Queue Items" />
              </SelectTrigger>
              <SelectContent className="bg-[#0B0F19] border-slate-800 text-slate-200">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="queued">Queued / In Flight</SelectItem>
                <SelectItem value="needs_review">Needs Human Review</SelectItem>
                <SelectItem value="approved">Approved & Verified</SelectItem>
                <SelectItem value="failed">Extraction Failures</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="border-slate-800 bg-[#06090F] text-xs text-slate-300 hover:text-white"
          >
            <RefreshCw className={`mr-2 size-3.5 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        </div>

        {/* Queue Table */}
        <div className="rounded-xl border border-slate-800 bg-[#0B0F19] overflow-hidden">
          <div className="border-b border-slate-800/80 px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="size-4 text-blue-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Pipeline Ingestion Ledger ({queue.length})
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Auto-polls every 15s
            </span>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-500">
              <RefreshCw className="mx-auto size-5 animate-spin text-blue-500 mb-2" />
              Connecting to OCR pipeline stream...
            </div>
          ) : queue.length === 0 ? (
            <div className="py-16 text-center">
              <FileSearch className="mx-auto size-8 text-slate-600 mb-2" />
              <p className="text-xs font-medium text-slate-400">Queue is currently clear</p>
              <p className="text-[11px] text-slate-600 mt-1">No documents matching current filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Document / File</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Business Workspace</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Pipeline Status</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Extracted Type</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Review Reason / Error</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase">Ingested At</TableHead>
                    <TableHead className="text-[11px] text-slate-400 font-semibold uppercase text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((item) => {
                    const isFailed = item.status === "failed";
                    const isNeedsReview = item.status === "needs_review";
                    const isProcessing = item.status === "processing" || item.status === "queued";
                    const isApproved = item.status === "approved";

                    return (
                      <TableRow
                        key={item.id}
                        className="border-slate-800/60 hover:bg-slate-800/20 cursor-pointer"
                        onClick={() => setSelectedJob(item)}
                      >
                        <TableCell className="font-medium text-xs text-white">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4 text-slate-400 shrink-0" />
                            <div className="truncate max-w-[200px]" title={item.fileName}>
                              <div className="truncate">{item.fileName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">ID: {item.id}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">
                          <div>
                            <div>{item.businessName}</div>
                            <div className="text-[10px] text-slate-500 font-mono">ID: {item.businessId}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isFailed && (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/30 text-[10px]">
                              Failed
                            </Badge>
                          )}
                          {isNeedsReview && (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                              Review Required
                            </Badge>
                          )}
                          {isProcessing && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] animate-pulse">
                              Processing
                            </Badge>
                          )}
                          {isApproved && (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                              Verified
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-slate-300 font-mono">
                          {item.documentType || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-slate-400 max-w-[240px]">
                          {item.errorMessage ? (
                            <span className="text-red-400 truncate block" title={item.errorMessage}>
                              {item.errorMessage}
                            </span>
                          ) : item.reviewReason ? (
                            <span className="text-amber-300/80 truncate block" title={item.reviewReason}>
                              {item.reviewReason}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-[11px] text-slate-400">
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-slate-300 hover:text-white"
                              onClick={() => setSelectedJob(item)}
                            >
                              Inspect
                            </Button>
                            {(isFailed || isNeedsReview) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 border-slate-800 bg-[#06090F] text-xs text-blue-400 hover:text-blue-300"
                                onClick={() => handleRetry(item.id)}
                                disabled={retryMutation.isPending}
                              >
                                <RotateCcw className="size-3 mr-1" />
                                Retry
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Diagnostic Modal */}
        <Dialog open={!!selectedJob} onOpenChange={(open) => !open && setSelectedJob(null)}>
          <DialogContent className="max-w-xl bg-[#0B0F19] border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                <FileCode className="size-4 text-blue-400" />
                OCR Diagnostic Snapshot: {selectedJob?.fileName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Detailed extraction state and parser telemetry.
              </DialogDescription>
            </DialogHeader>

            {selectedJob && (
              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-800 bg-[#06090F] p-3">
                  <div>
                    <span className="text-slate-500">Document ID:</span>
                    <p className="font-mono text-slate-300 mt-0.5">{selectedJob.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Business Tenant:</span>
                    <p className="text-slate-300 mt-0.5">{selectedJob.businessName} (ID: {selectedJob.businessId})</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Current Status:</span>
                    <p className="font-mono text-slate-300 mt-0.5">{selectedJob.status}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Document Type:</span>
                    <p className="font-mono text-slate-300 mt-0.5">{selectedJob.documentType || "Unknown"}</p>
                  </div>
                </div>

                {selectedJob.errorMessage && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-1">
                    <div className="font-semibold text-red-400 flex items-center gap-1.5">
                      <AlertCircle className="size-3.5" />
                      Parser Execution Error
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] break-words">
                      {selectedJob.errorMessage}
                    </p>
                  </div>
                )}

                {selectedJob.reviewReason && (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
                    <div className="font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="size-3.5" />
                      Verification Flags Requiring Human Review
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      {selectedJob.reviewReason}
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-slate-500">
                  Retrying OCR will re-read the encrypted storage buffer, re-run image orientation/deskewing, re-invoke multi-pattern line reconstruction, and recalculate deterministic cross-field checks.
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedJob(null)}
                    className="border-slate-800 text-xs text-slate-400"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRetry(selectedJob.id)}
                    disabled={retryMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-500 text-xs text-white font-semibold"
                  >
                    <RotateCcw className="size-3.5 mr-1.5" />
                    {retryMutation.isPending ? "Executing Reprocess..." : "Retry OCR Extraction"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
