import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { actionItems, adminAuditEvents, auditEvents, businesses, gstPreparations, gstSubmissionNotifications, gstSubmissionRequests, operationalTasks, users } from "../drizzle/schema.js";
import { getDb } from "./db.js";

export const gstAdminSearchSchema = z.object({
  search: z.string().trim().max(120).optional(),
  workspace: z.string().trim().max(120).optional(),
  provider: z.string().trim().max(120).optional(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  status: z.enum(["all", "awaiting_review", "approved", "rejected", "dispatching", "submitted", "failed", "cancelled"]).default("all"),
  limit: z.number().int().min(1).max(200).default(100),
});

export const gstAdminDecisionSchema = z.object({ taskId: z.number().int().positive(), reviewerNote: z.string().trim().min(8).max(1000) });

function contains(record, search) {
  if (!search) return true;
  const term = search.toLowerCase();
  return [record.businessName, record.taskTitle, record.requesterName ?? "", record.requesterEmail ?? "", record.request.providerName ?? "", record.request.status].some(value => value.toLowerCase().includes(term));
}

export async function listAdminGstSubmissions(input) {
  const db = await getDb();
  if (!db) {
    const { inMemoryGstSubmissions, inMemoryTasks, inMemoryGstPreparations } = await import("./operations.js");
    const { inMemoryBusinesses, inMemoryUsers } = await import("./db.js");
    const rows = inMemoryGstSubmissions.map(sub => {
      const biz = inMemoryBusinesses.find(b => b.id === sub.businessId) || {};
      const task = inMemoryTasks.find(t => t.id === sub.taskId) || {};
      const prep = inMemoryGstPreparations.find(p => p.taskId === sub.taskId) || null;
      const user = Array.from(inMemoryUsers.values()).find(u => u.id === sub.requestedByUserId) || {};
      return {
        request: sub,
        businessName: biz.name || "Default Business",
        taskTitle: task.title || "GST Submission",
        periodStart: task.periodStart || new Date(),
        requesterName: user.name || "User",
        requesterEmail: user.email || "",
        preparation: prep,
      };
    });
    return rows.filter(row => contains(row, input.search)
      && (!input.workspace || row.businessName.toLowerCase().includes(input.workspace.toLowerCase()))
      && (!input.provider || (row.request.providerName ?? "").toLowerCase().includes(input.provider.toLowerCase()))
      && (!input.period || (row.periodStart ? new Date(row.periodStart).toISOString().slice(0, 7) === input.period : false)));
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

export function csvForGstSubmissions(rows) {
  const quote = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const headings = ["request_id", "workspace", "task", "status", "requester", "provider", "official_reference", "failure_code", "requested_at", "approved_at", "submitted_at"];
  const body = rows.map(row => [row.request.id, row.businessName, row.taskTitle, row.request.status, row.requesterEmail ?? row.requesterName ?? "", row.request.providerName, row.preparation?.officialReference, row.request.failureCode, row.request.createdAt.toISOString(), row.request.approvedAt?.toISOString() ?? "", row.request.submittedAt?.toISOString() ?? ""].map(quote).join(","));
  return [headings.join(","), ...body].join("\n");
}

export async function auditGstSubmissionExport(actorUserId, input, count) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditEvents).values({ actorUserId, action: "GST_SUBMISSION_EXPORTED", entityType: "gstSubmissionRegister", metadata: JSON.stringify({ status: input.status, hasSearch: Boolean(input.search), hasWorkspaceFilter: Boolean(input.workspace), hasProviderFilter: Boolean(input.provider), period: input.period ?? null, count }) });
}

async function recordDecisionNotifications(requestId, recipientUserId, decision) {
  const db = await getDb();
  if (!db) return;
  const subject = decision === "approved" ? "GST submission request approved" : "GST submission request rejected";
  const body = decision === "approved" ? "An independent administrator approved your GST submission request. This is not a filed return and awaits an authorized provider." : "An independent administrator rejected your GST submission request. Review the recorded note and prepare a fresh request when ready.";
  await db.insert(gstSubmissionNotifications).values([
    { submissionRequestId: requestId, recipientUserId, channel: "in_app", status: "delivered", subject, body, deliveredAt: new Date() },
    { submissionRequestId: requestId, recipientUserId, channel: "email", status: "suppressed", subject, body },
  ]);
}

export async function rejectAuthorizedGstSubmission(actorUserId, input) {
  const db = await getDb();
  if (!db) {
    const { inMemoryGstSubmissions, inMemoryTasks, inMemoryGstPreparations, inMemoryActionItems } = await import("./operations.js");
    const request = inMemoryGstSubmissions.filter(s => s.taskId === input.taskId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    if (!request || request.status !== "awaiting_review") throw new Error("Only an awaiting GST submission request can be rejected.");
    if (request.requestedByUserId === actorUserId) throw new Error("The requester cannot reject their own GST submission request.");
    const now = new Date();
    request.status = "rejected";
    request.approvedByUserId = actorUserId;
    request.reviewerNote = input.reviewerNote;
    request.approvedAt = now;
    const task = inMemoryTasks.find(t => t.id === input.taskId);
    if (task) task.status = "prepared";
    const prep = inMemoryGstPreparations.find(p => p.taskId === input.taskId);
    if (prep) prep.status = "prepared";
    for (const a of inMemoryActionItems) {
      if (a.taskId === input.taskId && a.type === "professional_review" && a.status === "open") {
        a.status = "resolved";
        a.resolvedAt = now;
      }
    }
    return { rejected: true };
  }
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
  return { rejected: true };
}

export async function notifyApproval(requestId, recipientUserId) {
  await recordDecisionNotifications(requestId, recipientUserId, "approved");
}

export async function listMyGstSubmissionNotifications(recipientUserId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ notification: gstSubmissionNotifications, taskId: gstSubmissionRequests.taskId }).from(gstSubmissionNotifications)
    .innerJoin(gstSubmissionRequests, eq(gstSubmissionNotifications.submissionRequestId, gstSubmissionRequests.id))
    .where(and(eq(gstSubmissionNotifications.recipientUserId, recipientUserId), eq(gstSubmissionNotifications.channel, "in_app")))
    .orderBy(desc(gstSubmissionNotifications.createdAt)).limit(12);
}
