import { describe, expect, it, beforeEach } from "vitest";
import {
  scheduleReminder,
  getRemindersForBusiness,
  getReminderPreferences,
  updateReminderPreferences,
  markReminderRead,
  dismissReminder,
  scanAndScheduleReminders,
  dispatchPendingReminders,
  __clearRemindersForTest,
  __getRemindersStore,
} from "./services/reminderService.js";
import { __clearDispatchedNotifications, __getDispatchedNotifications } from "./services/emailService.js";

describe("PHASE 8: Real Scheduled Reminders & Background Processing Tests", () => {
  const testBusinessId = 5501;
  const testEmail = "finance@zenithcloud.in";

  beforeEach(() => {
    __clearRemindersForTest();
    __clearDispatchedNotifications();
  });

  it("1. Schedules persistent reminders with correct tenant scoping", () => {
    const reminder = scheduleReminder({
      businessId: testBusinessId,
      type: "tax_deadline",
      eventKey: "gstr3b_nov_2026",
      title: "GSTR-3B Monthly Return",
      description: "Discharge tax liability on gst.gov.in portal",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      recipientEmail: testEmail,
      link: "/ca-suite",
    });

    expect(reminder).toBeDefined();
    expect(reminder.id).toMatch(/^rem_/);
    expect(reminder.businessId).toBe(testBusinessId);
    expect(reminder.status).toBe("scheduled");
    expect(reminder.isRead).toBe(false);

    const data = getRemindersForBusiness(testBusinessId);
    expect(data.reminders.length).toBe(1);
    expect(data.unreadCount).toBe(1);
  });

  it("2. Deduplicates repeated scheduling of the same eventKey", () => {
    scheduleReminder({
      businessId: testBusinessId,
      type: "tax_deadline",
      eventKey: "advance_tax_q3",
      title: "Advance Tax Q3 Installment",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      recipientEmail: testEmail,
    });

    // Schedule again with updated description
    scheduleReminder({
      businessId: testBusinessId,
      type: "tax_deadline",
      eventKey: "advance_tax_q3",
      title: "Advance Tax Q3 Installment (75% cumulative)",
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      recipientEmail: testEmail,
    });

    const store = __getRemindersStore();
    expect(store.length).toBe(1);
    expect(store[0].title).toBe("Advance Tax Q3 Installment (75% cumulative)");
  });

  it("3. Configures reminder preferences (advance notice days, cooldown, channels)", () => {
    const initialPrefs = getReminderPreferences(testBusinessId);
    expect(initialPrefs.emailEnabled).toBe(true);

    const updated = updateReminderPreferences(testBusinessId, {
      advanceDays: 5,
      cooldownHours: 48,
    });

    expect(updated.advanceDays).toBe(5);
    expect(updated.cooldownHours).toBe(48);

    const reloaded = getReminderPreferences(testBusinessId);
    expect(reloaded.advanceDays).toBe(5);
  });

  it("4. Automatically scans obligations, tasks, and OCR issues", async () => {
    await scanAndScheduleReminders(testBusinessId, testEmail);

    const data = getRemindersForBusiness(testBusinessId);
    expect(data.reminders.length).toBeGreaterThanOrEqual(3);

    // Verify statutory obligations are included
    const hasGstr3b = data.reminders.some(r => r.title.includes("GSTR-3B"));
    const hasGstr1 = data.reminders.some(r => r.title.includes("GSTR-1"));
    const hasTds = data.reminders.some(r => r.title.includes("TDS"));

    expect(hasGstr3b).toBe(true);
    expect(hasGstr1).toBe(true);
    expect(hasTds).toBe(true);
  });

  it("5. Dispatches pending reminders and enforces 24h spam cooldown", async () => {
    // Schedule an imminent reminder (due tomorrow)
    scheduleReminder({
      businessId: testBusinessId,
      type: "tax_deadline",
      eventKey: "imminent_gstr3b",
      title: "GSTR-3B Monthly Return Due Tomorrow",
      dueDate: new Date(Date.now() + 86400000).toISOString(), // 1 day remaining
      recipientEmail: testEmail,
    });

    // First dispatch
    const run1 = await dispatchPendingReminders();
    expect(run1.dispatched).toBe(1);

    const dispatched = __getDispatchedNotifications();
    expect(dispatched.length).toBe(1);
    expect(dispatched[0].to).toBe(testEmail);

    // Immediate second dispatch must skip due to 24h cooldown!
    const run2 = await dispatchPendingReminders();
    expect(run2.dispatched).toBe(0);
    expect(run2.skipped).toBeGreaterThanOrEqual(1);
    expect(__getDispatchedNotifications().length).toBe(1); // No duplicate email sent!
  });

  it("6. Marks reminders as read and dismisses cancelled reminders", () => {
    const rem = scheduleReminder({
      businessId: testBusinessId,
      type: "ocr_failure",
      eventKey: "ocr_review_sample",
      title: "OCR Verification Required",
      recipientEmail: testEmail,
    });

    expect(getRemindersForBusiness(testBusinessId).unreadCount).toBe(1);

    // Mark as read
    const marked = markReminderRead(rem.id, testBusinessId);
    expect(marked).toBe(true);
    expect(getRemindersForBusiness(testBusinessId).unreadCount).toBe(0);

    // Dismiss reminder
    const dismissed = dismissReminder(rem.id, testBusinessId);
    expect(dismissed).toBe(true);
    expect(getRemindersForBusiness(testBusinessId).reminders.length).toBe(0);
  });
});
