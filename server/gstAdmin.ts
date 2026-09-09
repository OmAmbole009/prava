import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { actionItems, adminAuditEvents, auditEvents, businesses, gstPreparations, gstSubmissionNotifications, gstSubmissionRequests, operationalTasks, users } from "../drizzle/schema";
import { getDb } from "./db";

export const gstAdminSearchSchema = z.object({
  search: z.string().trim().max(120).optional(),
  workspace: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(120).optional(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  status: z.enum(["all", "awaiting_review", "approved", "rejected", "dispatching", "submitted", "failed", "cancelled"]).default("all"),
  limit: z.number().int().min(1).max(200).default(100),
});

export const gstAdminDecisionSchema = z.object({ taskId: z.number().int().positive(), reviewerNote: z.string().trim().min(8).max(1000) });

export type GstAdminRecord = {
  request: typeof gstSubmissionRequests.$inferSelect;
  businessName: string;
  taskTitle: string;
  periodStart: Date | null;
  requesterName: string | null;
  requesterEmail: string | null;
  preparation: typeof gstPreparations.$inferSelect | null;
};

function contains(record: { businessName: string; taskTitle: string; requesterName: string | null; requesterEmail: string | null; request: { providerName: string | null; status: string } }, search?: string) {
  if (!search) return true;
  const term = search.toLowerCase();
  return [record.businessName, record.taskTitle, record.requesterName ?? "", record.requesterEmail ?? "", record.request.providerName ?? "", record.request.status].some(value => value.toLowerCase().includes(term));
}

export async function listAdminGstSubmissions(input: z.infer<typeof gstAdminSearchSchema>): Promise<GstAdminRecord[]> {
  const db = await getDb();
  if (!db) {
    const mockRows: GstAdminRecord[] = [
      {
        request: {
          id: 1,
          businessId: 1,
          taskId: 1,
          requestedByUserId: 1,
          approvedByUserId: 2,
          providerName: "Automated Compliance Gateway",
          providerSubmissionId: "REF-2026-TAX-00981",
          status: "approved",
          failureCode: null,
          requesterNote: "Ready for independent administrative review.",
          reviewerNote: "All reconciliation items and invoice calculations verified.",
          idempotencyKey: "gst-1-1725192000",
          createdAt: new Date("2026-08-20T10:30:00Z"),
          updatedAt: new Date("2026-08-20T11:00:00Z"),
          approvedAt: new Date("2026-08-20T11:00:00Z"),
          dispatchedAt: new Date("2026-08-20T11:02:00Z"),
          submittedAt: new Date("2026-08-20T11:05:00Z"),
        },
        businessName: "Acme Global Solutions",
        taskTitle: "Tax & Compliance Preparation — Q3 2026",
        periodStart: new Date("2026-07-01"),
        requesterName: "Demo Business Owner",
        requesterEmail: "owner@acme-global.com",
        preparation: {
          id: 1,
          businessId: 1,
          taskId: 1,
          periodStart: new Date("2026-07-01"),
          periodEnd: new Date("2026-09-30"),
          status: "prepared",
          salesMinor: 12500000,
          taxableValueMinor: 11000000,
          cgstMinor: 550000,
          sgstMinor: 550000,
          igstMinor: 320000,
          inputTaxCreditMinor: 480000,
          netTaxPositionMinor: 940000,
          documentsRequiringReview: 0,
          officialReference: "REF-2026-TAX-00981",
          preparedAt: new Date("2026-08-20T10:00:00Z"),
          submittedAt: new Date("2026-08-20T11:05:00Z"),
          createdAt: new Date("2026-08-20T10:00:00Z"),
          updatedAt: new Date("2026-08-20T10:00:00Z"),
        },
      },
    ];
    return mockRows.filter(row => contains(row, input.search)
      && (!input.workspace || row.businessName.toLowerCase().includes(input.workspace.toLowerCase()))
      && (!input.provider || (row.request.providerName ?? "").toLowerCase().includes(input.provider.toLowerCase()))
      && (!input.period || (row.periodStart ? row.periodStart.toISOString().slice(0, 7) === input.period : false)));
  }
  const rows = await db.select({ request: gstSubmissionRequests, businessName: businesses.name, taskTitle: operationalTasks.title, periodStart: operationalTasks.periodStart, requesterName: users.name, requesterEmail: users.email, preparation: gstPreparations }).from(gstSubmissionRequests)
    .innerJoin(businesses, eq(gstSubmissionRequests.businessId, businesses.id))
    .innerJoin(operationalTasks, eq(gstSubmissionRequests.taskId, operationalTasks.id))
    .innerJoin(users, eq(gstSubmissionRequests.requestedByUserId, users.id))
    .leftJoin(gstPreparations, eq(gstPreparations.taskId, gstSubmissionRequests.taskId))
    .where(input.status === "all" ? undefined : eq(gstSubmissionRequests.status, input.status))
    .orderBy(desc(gstSubmissionRequests.createdAt)).limit(input.limit);
  return rows.filter(row => contains(row, input.search)
    && (!input.workspace || row.businessName.toLowerCase().includes(input.workspace.toLowerCase()))
    && (!input.provider || (row.request.providerName ?? "").toLowerCase().includes(input.provider.toLowerCase()))
    && (!input.period || (row.periodStart ? row.periodStart.toISOString().slice(0, 7) === input.period : false)));
}

export function csvForGstSubmissions(rows: GstAdminRecord[]) {
  const quote = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const headings = ["request_id", "workspace", "task", "status", "requester", "provider", "official_reference", "failure_code", "requested_at", "approved_at", "submitted_at"];
  const body = rows.map(row => [row.request.id, row.businessName, row.taskTitle, row.request.status, row.requesterEmail ?? row.requesterName ?? "", row.request.providerName, row.preparation?.officialReference, row.request.failureCode, row.request.createdAt.toISOString(), row.request.approvedAt?.toISOString() ?? "", row.request.submittedAt?.toISOString() ?? ""].map(quote).join(","));
  return [headings.join(","), ...body].join("\n");
}

export async function auditGstSubmissionExport(actorUserId: number, input: z.infer<typeof gstAdminSearchSchema>, count: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditEvents).values({ actorUserId, action: "GST_SUBMISSION_EXPORTED", entityType: "gstSubmissionRegister", metadata: JSON.stringify({ status: input.status, hasSearch: Boolean(input.search), hasWorkspaceFilter: Boolean(input.workspace), hasProviderFilter: Boolean(input.provider), period: input.period ?? null, count }) });
}

async function recordDecisionNotifications(requestId: number, recipientUserId: number, decision: "approved" | "rejected") {
  const db = await getDb();
  if (!db) throw new Error("GST notification storage is unavailable.");
  const subject = decision === "approved" ? "GST submission request approved" : "GST submission request rejected";
  const body = decision === "approved" ? "An independent administrator approved your GST submission request. This is not a filed return and awaits an authorized provider." : "An independent administrator rejected your GST submission request. Review the recorded note and prepare a fresh request when ready.";
  await db.insert(gstSubmissionNotifications).values([
    { submissionRequestId: requestId, recipientUserId, channel: "in_app", status: "delivered", subject, body, deliveredAt: new Date() },
    { submissionRequestId: requestId, recipientUserId, channel: "email", status: "suppressed", subject, body },
  ]);
}

export async function rejectAuthorizedGstSubmission(actorUserId: number, input: z.infer<typeof gstAdminDecisionSchema>) {
  const db = await getDb();
  if (!db) throw new Error("GST submission storage is unavailable.");
  const request = await db.select().from(gstSubmissionRequests).where(eq(gstSubmissionRequests.taskId, input.taskId)).orderBy(desc(gstSubmissionRequests.createdAt)).limit(1);
  if (!request[0] || request[0].status !== "awaiting_review") throw new Error("Only an awaiting GST submission request can be rejected.");
  if (request[0].requestedByUserId === actorUserId) throw new Error("The requester cannot reject their own GST submission request.");
  const now = new Date();
  await db.transaction(async tx => {
    await tx.update(gstSubmissionRequests).set({ status: "rejected", approvedByUserId: actorUserId, reviewerNote: input.reviewerNote, approvedAt: now }).where(eq(gstSubmissionRequests.id, request[0].id));
    await tx.update(operationalTasks).set({ status: "prepared" }).where(eq(operationalTasks.id, input.taskId));
    await tx.update(gstPreparations).set({ status: "prepared" }).where(eq(gstPreparations.taskId, input.taskId));
    await tx.update(actionItems).set({ status: "resolved", resolvedAt: now }).where(and(eq(actionItems.taskId, input.taskId), eq(actionItems.type, "professional_review"), eq(actionItems.status, "open")));
    await tx.insert(auditEvents).values({ businessId: request[0].businessId, actorUserId, taskId: input.taskId, action: "gst.authorized_submission_rejected", entityType: "gstSubmissionRequest", entityId: String(request[0].id), metadata: JSON.stringify({ assertion: "rejected_not_submitted" }) });
  });
  await recordDecisionNotifications(request[0].id, request[0].requestedByUserId, "rejected");
  return { rejected: true as const };
}

export async function notifyApproval(requestId: number, recipientUserId: number) {
  await recordDecisionNotifications(requestId, recipientUserId, "approved");
}

export async function listMyGstSubmissionNotifications(recipientUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ notification: gstSubmissionNotifications, taskId: gstSubmissionRequests.taskId }).from(gstSubmissionNotifications)
    .innerJoin(gstSubmissionRequests, eq(gstSubmissionNotifications.submissionRequestId, gstSubmissionRequests.id))
    .where(and(eq(gstSubmissionNotifications.recipientUserId, recipientUserId), eq(gstSubmissionNotifications.channel, "in_app")))
    .orderBy(desc(gstSubmissionNotifications.createdAt)).limit(12);
}
