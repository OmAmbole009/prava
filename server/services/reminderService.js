import fs from "node:fs";
import path from "node:path";
import { sendTransactionalNotification } from "./emailService.js";
import { getBusinessesForUser, getBusinessForUser, getUserByEmail } from "../db.js";
import { inMemoryDocuments, inMemoryTasks } from "../operations.js";

const REMINDER_STORAGE_FILE = path.resolve(process.cwd(), "data", "scheduled_reminders.json");

// In-memory store backed by disk persistence
let remindersStore = [];
let preferencesStore = new Map();

function loadRemindersFromDisk() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }
  try {
    if (fs.existsSync(REMINDER_STORAGE_FILE)) {
      const raw = fs.readFileSync(REMINDER_STORAGE_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.reminders)) remindersStore = parsed.reminders;
      if (Array.isArray(parsed.preferences)) {
        preferencesStore = new Map(parsed.preferences);
      }
    }
  } catch (err) {
    console.warn("[ReminderService] Could not load reminders from disk:", err.message);
  }
}

function saveRemindersToDisk() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return;
  }
  try {
    const dir = path.dirname(REMINDER_STORAGE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      REMINDER_STORAGE_FILE,
      JSON.stringify(
        {
          reminders: remindersStore,
          preferences: Array.from(preferencesStore.entries()),
        },
        null,
        2
      ),
      "utf-8"
    );
  } catch (err) {
    console.warn("[ReminderService] Could not save reminders to disk:", err.message);
  }
}

loadRemindersFromDisk();

export function __clearRemindersForTest() {
  remindersStore.length = 0;
  preferencesStore.clear();
}

export function __getRemindersStore() {
  return remindersStore;
}

/**
 * Returns user or business notification preferences.
 */
export function getReminderPreferences(businessId) {
  const defaultPrefs = {
    businessId,
    emailEnabled: true,
    inAppEnabled: true,
    advanceDays: 3,
    cooldownHours: 24,
  };
  return preferencesStore.get(Number(businessId)) || defaultPrefs;
}

export function updateReminderPreferences(businessId, updates = {}) {
  const current = getReminderPreferences(businessId);
  const updated = { ...current, ...updates, businessId: Number(businessId) };
  preferencesStore.set(Number(businessId), updated);
  saveRemindersToDisk();
  return updated;
}

/**
 * Creates or updates a scheduled reminder.
 * Avoids duplicate active reminders for the same event key.
 */
export function scheduleReminder(reminderData) {
  const {
    businessId,
    userId = null,
    type,
    eventKey,
    title,
    description,
    dueDate,
    channel = "email_and_inapp",
    recipientEmail,
    link = "/dashboard",
    metadata = {},
  } = reminderData;

  const now = new Date().toISOString();

  // Deduplicate against active existing reminders with the same eventKey
  const existingIndex = remindersStore.findIndex(
    r => r.businessId === Number(businessId) && r.eventKey === eventKey && r.status !== "cancelled"
  );

  if (existingIndex !== -1) {
    const existing = remindersStore[existingIndex];
    existing.title = title;
    existing.description = description;
    existing.dueDate = dueDate;
    existing.link = link;
    existing.updatedAt = now;
    saveRemindersToDisk();
    return existing;
  }

  const newReminder = {
    id: `rem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    businessId: Number(businessId),
    userId: userId ? Number(userId) : null,
    type,
    eventKey,
    title,
    description,
    dueDate: dueDate ? new Date(dueDate).toISOString() : null,
    channel,
    recipientEmail: recipientEmail || null,
    status: "scheduled",
    isRead: false,
    lastSentAt: null,
    sentCount: 0,
    link,
    metadata,
    createdAt: now,
    updatedAt: now,
  };

  remindersStore.unshift(newReminder);
  saveRemindersToDisk();
  return newReminder;
}

/**
 * Evaluates pending obligations and scans for reminder needs across:
 * 1. Statutory Compliance Calendar (GSTR-3B, GSTR-1, Advance Tax, TDS)
 * 2. Overdue operational tasks
 * 3. Document OCR failures requiring review
 */
export async function scanAndScheduleReminders(businessId, recipientEmail) {
  const numBizId = Number(businessId);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 1. Statutory Compliance Obligations
  const statutoryDeadlines = [
    {
      type: "tax_deadline",
      eventKey: `gst_gstr3b_${currentYear}_${currentMonth}`,
      title: "Form GSTR-3B Monthly Return Filing",
      description: "Monthly summary return of inward and outward supplies and tax liability discharge.",
      dueDate: new Date(currentYear, currentMonth, 20, 23, 59, 59),
      statutorySection: "Section 39 of CGST Act",
      link: "/ca-suite",
    },
    {
      type: "tax_deadline",
      eventKey: `gst_gstr1_${currentYear}_${currentMonth}`,
      title: "Form GSTR-1 Outward Supplies Statement",
      description: "Statutory reporting of sales invoices, credit notes, and zero-rated exports.",
      dueDate: new Date(currentYear, currentMonth, 11, 23, 59, 59),
      statutorySection: "Section 37 of CGST Act",
      link: "/ca-suite",
    },
    {
      type: "tax_deadline",
      eventKey: `tds_challan_281_${currentYear}_${currentMonth}`,
      title: "TDS Deposit on Challan ITNS 281",
      description: "Monthly statutory deposit of tax deducted at source under 194C, 194J, and 194I.",
      dueDate: new Date(currentYear, currentMonth, 7, 23, 59, 59),
      statutorySection: "Section 200(1) / Rule 30",
      link: "/ca-suite",
    },
  ];

  for (const s of statutoryDeadlines) {
    scheduleReminder({
      businessId: numBizId,
      type: s.type,
      eventKey: s.eventKey,
      title: s.title,
      description: s.description,
      dueDate: s.dueDate.toISOString(),
      recipientEmail,
      link: s.link,
      metadata: { statutorySection: s.statutorySection },
    });
  }

  // 2. Overdue Operational Tasks
  const bizTasks = inMemoryTasks.filter(t => t.businessId === numBizId && t.status !== "complete");
  for (const t of bizTasks) {
    if (t.dueAt) {
      const taskDueDate = new Date(t.dueAt);
      const isOverdue = taskDueDate.getTime() < now.getTime();
      const eventKey = `task_${t.id}_${isOverdue ? "overdue" : "due"}`;

      scheduleReminder({
        businessId: numBizId,
        type: isOverdue ? "overdue_task" : "pending_approval",
        eventKey,
        title: isOverdue ? `Overdue Task: ${t.title}` : `Upcoming Task: ${t.title}`,
        description: t.description || "Action required on operational task.",
        dueDate: taskDueDate.toISOString(),
        recipientEmail,
        link: `/tasks/${t.id}`,
        metadata: { taskId: t.id, status: t.status },
      });
    }
  }

  // 3. OCR Review Required Documents
  const bizDocs = inMemoryDocuments.filter(
    d => d.businessId === numBizId && (d.status === "review" || d.status === "failed")
  );
  for (const doc of bizDocs) {
    const eventKey = `doc_ocr_${doc.id}`;
    scheduleReminder({
      businessId: numBizId,
      type: "ocr_failure",
      eventKey,
      title: `OCR Review Required: ${doc.filename || "Uploaded Invoice"}`,
      description: doc.ocrError || "Human verification required to confirm extracted tax values.",
      dueDate: now.toISOString(),
      recipientEmail,
      link: `/documents/${doc.id}/review`,
      metadata: { documentId: doc.id, filename: doc.filename },
    });
  }
}

/**
 * Processes all scheduled reminders:
 * - Checks due dates against preferences advanceDays.
 * - Enforces 24-hour cooldown between duplicate email transmissions.
 * - Safely dispatches transactional notification emails.
 */
export async function dispatchPendingReminders() {
  const now = new Date();
  const results = { dispatched: 0, skipped: 0, failed: 0 };

  for (const rem of remindersStore) {
    if (rem.status === "cancelled" || !rem.recipientEmail) {
      continue;
    }

    const prefs = getReminderPreferences(rem.businessId);
    if (!prefs.emailEnabled) {
      results.skipped++;
      continue;
    }

    // Cooldown check: prevent sending more than once every cooldownHours
    if (rem.lastSentAt) {
      const timeSinceLast = now.getTime() - new Date(rem.lastSentAt).getTime();
      const cooldownMs = (prefs.cooldownHours || 24) * 60 * 60 * 1000;
      if (timeSinceLast < cooldownMs) {
        results.skipped++;
        continue;
      }
    }

    // Check if within the advance notice window or overdue
    let shouldSend = false;
    let daysRemaining = 0;
    let daysOverdue = 0;

    if (rem.dueDate) {
      const dueTime = new Date(rem.dueDate).getTime();
      const diffMs = dueTime - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue!
        shouldSend = true;
        daysOverdue = Math.abs(diffDays);
      } else if (diffDays <= (prefs.advanceDays || 3)) {
        // Due soon
        shouldSend = true;
        daysRemaining = diffDays;
      }
    } else {
      // Immediate reminder (e.g. OCR failure)
      shouldSend = true;
    }

    if (!shouldSend) {
      results.skipped++;
      continue;
    }

    // Map reminder type to transactional email template
    let templateType = "compliance_reminder";
    let templateData = {
      businessName: "Prava Technologies",
      obligationTitle: rem.title,
      dueDate: rem.dueDate ? new Date(rem.dueDate).toLocaleDateString("en-IN") : "Immediate",
      statutorySection: rem.metadata?.statutorySection || "Statutory Compliance",
      daysRemaining: Math.max(0, daysRemaining),
    };

    if (rem.type === "overdue_task") {
      templateType = "overdue_task";
      templateData = {
        businessName: "Prava Technologies",
        taskTitle: rem.title,
        dueDate: rem.dueDate ? new Date(rem.dueDate).toLocaleDateString("en-IN") : "Past Due",
        daysOverdue: Math.max(1, daysOverdue),
        statutoryPenalty: rem.metadata?.statutoryPenalty || "Statutory interest charges may apply",
      };
    } else if (rem.type === "ocr_failure") {
      templateType = "ocr_failure";
      templateData = {
        businessName: "Prava Technologies",
        documentName: rem.metadata?.filename || rem.title,
        documentId: rem.metadata?.documentId || "doc",
        reason: rem.description,
      };
    }

    try {
      await sendTransactionalNotification({
        to: rem.recipientEmail,
        templateType,
        templateData,
      });

      rem.status = "sent";
      rem.lastSentAt = now.toISOString();
      rem.sentCount = (rem.sentCount || 0) + 1;
      rem.updatedAt = now.toISOString();
      results.dispatched++;
    } catch (err) {
      console.error(`[ReminderService] Delivery error for ${rem.id}:`, err.message);
      rem.status = "failed";
      rem.lastError = err.message;
      results.failed++;
    }
  }

  saveRemindersToDisk();
  return results;
}

/**
 * Returns reminders for a business with unread counts.
 */
export function getRemindersForBusiness(businessId, { unreadOnly = false } = {}) {
  const numBizId = Number(businessId);
  let list = remindersStore.filter(r => r.businessId === numBizId && r.status !== "cancelled");
  if (unreadOnly) {
    list = list.filter(r => !r.isRead);
  }
  const unreadCount = remindersStore.filter(r => r.businessId === numBizId && !r.isRead && r.status !== "cancelled").length;
  return {
    reminders: list,
    unreadCount,
    totalCount: list.length,
  };
}

export function markReminderRead(reminderId, businessId) {
  const reminder = remindersStore.find(
    r => r.id === reminderId && (!businessId || r.businessId === Number(businessId))
  );
  if (reminder) {
    reminder.isRead = true;
    reminder.updatedAt = new Date().toISOString();
    saveRemindersToDisk();
    return true;
  }
  return false;
}

export function dismissReminder(reminderId, businessId) {
  const reminder = remindersStore.find(
    r => r.id === reminderId && (!businessId || r.businessId === Number(businessId))
  );
  if (reminder) {
    reminder.status = "cancelled";
    reminder.updatedAt = new Date().toISOString();
    saveRemindersToDisk();
    return true;
  }
  return false;
}

// Background scheduler timer: runs every 15 minutes, unref'd so it doesn't prevent clean shutdown
if (process.env.NODE_ENV !== "test" && !process.env.VITEST) {
  const schedulerTimer = setInterval(() => {
    dispatchPendingReminders().catch(err => {
      console.warn("[ReminderService] Background dispatch notice:", err.message);
    });
  }, 15 * 60 * 1000);
  if (schedulerTimer.unref) schedulerTimer.unref();
}
