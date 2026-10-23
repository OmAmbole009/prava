import { describe, expect, it } from "vitest";
import {
  renderAccountVerificationEmail,
  renderPasswordResetEmail,
  renderSecurityEventEmail,
  renderOnboardingCompletionEmail,
  renderComplianceReminderEmail,
  renderOverdueTaskEmail,
  renderOcrFailureReviewEmail,
  renderFailedIntegrationEmail,
} from "./services/emailTemplates.js";
import {
  sendTransactionalNotification,
  verifySmtpConnection,
  __getDispatchedNotifications,
  __clearDispatchedNotifications,
} from "./services/emailService.js";

describe("PHASE 4: Transactional Email Templates & SMTP Handshake Tests", () => {
  it("1. Renders Account Verification template with OTP and expiry", () => {
    const rendered = renderAccountVerificationEmail({ otp: "749201", expiryMinutes: 5 });
    expect(rendered.subject).toContain("Verification Code");
    expect(rendered.text).toContain("749201");
    expect(rendered.html).toContain("749201");
    expect(rendered.html).toContain("5 minutes");
    expect(rendered.html).toContain("Prava");
  });

  it("2. Renders Password Reset template with security warning", () => {
    const rendered = renderPasswordResetEmail({ otp: "582104", expiryMinutes: 15 });
    expect(rendered.subject).toContain("Password Reset");
    expect(rendered.text).toContain("582104");
    expect(rendered.html).toContain("582104");
    expect(rendered.html).toContain("15 minutes");
  });

  it("3. Renders Security Event alert with IP and event name", () => {
    const rendered = renderSecurityEventEmail({
      eventType: "Password Modified",
      ip: "192.168.1.50",
      timestamp: "2026-10-23T02:00:00Z",
    });
    expect(rendered.subject).toContain("Password Modified");
    expect(rendered.html).toContain("192.168.1.50");
    expect(rendered.html).toContain("Password Modified");
  });

  it("4. Renders Business Onboarding Completion welcome", () => {
    const rendered = renderOnboardingCompletionEmail({
      businessName: "Zenith Cloud Corp",
      legalName: "Zenith Cloud Corporation India Pvt Ltd",
      currency: "INR",
      gstin: "27AABCZ1234F1Z1",
    });
    expect(rendered.subject).toContain("Zenith Cloud Corp");
    expect(rendered.html).toContain("Zenith Cloud Corp");
    expect(rendered.html).toContain("27AABCZ1234F1Z1");
    expect(rendered.html).toContain("INR");
  });

  it("5. Renders Compliance Reminder email with statutory deadline", () => {
    const rendered = renderComplianceReminderEmail({
      businessName: "Prava Technologies",
      obligationTitle: "Form GSTR-3B Monthly Return",
      dueDate: "20th November 2026",
      statutorySection: "Section 39 of CGST Act",
      daysRemaining: 3,
    });
    expect(rendered.subject).toContain("GSTR-3B");
    expect(rendered.html).toContain("Section 39");
    expect(rendered.html).toContain("20th November 2026");
    expect(rendered.html).toContain("3 DAYS REMAINING");
  });

  it("6. Renders Overdue Compliance Task email", () => {
    const rendered = renderOverdueTaskEmail({
      businessName: "Prava Technologies",
      taskTitle: "TDS Payment on Form 26Q",
      dueDate: "7th October 2026",
      daysOverdue: 16,
      statutoryPenalty: "1.5% monthly penal interest under Section 201(1A)",
    });
    expect(rendered.subject).toContain("OVERDUE");
    expect(rendered.html).toContain("16 DAYS");
    expect(rendered.html).toContain("Section 201(1A)");
  });

  it("7. Renders OCR Failure / Review Required email", () => {
    const rendered = renderOcrFailureReviewEmail({
      businessName: "Prava Technologies",
      documentName: "Vendor_Tax_Invoice_9821.pdf",
      documentId: "doc-9912",
      reason: "Conflicting tax component arithmetic (IGST vs CGST/SGST)",
    });
    expect(rendered.subject).toContain("Vendor_Tax_Invoice_9821.pdf");
    expect(rendered.html).toContain("Conflicting tax component arithmetic");
  });

  it("8. Renders Failed Integration alert email", () => {
    const rendered = renderFailedIntegrationEmail({
      businessName: "Prava Technologies",
      integrationName: "GSTN E-Way Bill Portal Sync",
      errorMessage: "Authentication token expired (Error Code 401)",
    });
    expect(rendered.subject).toContain("GSTN E-Way Bill");
    expect(rendered.html).toContain("Error Code 401");
  });

  it("9. sendTransactionalNotification records dispatch and supports test mode", async () => {
    __clearDispatchedNotifications();

    const result = await sendTransactionalNotification({
      to: "founder@clientcompany.com",
      templateType: "compliance_reminder",
      templateData: {
        businessName: "Client Company",
        obligationTitle: "Advance Tax Q3 Installment",
        dueDate: "15th December 2026",
        statutorySection: "Section 211",
        daysRemaining: 7,
      },
    });

    expect(result.success).toBe(true);
    const notifications = __getDispatchedNotifications();
    expect(notifications.length).toBe(1);
    expect(notifications[0].to).toBe("founder@clientcompany.com");
    expect(notifications[0].templateType).toBe("compliance_reminder");
  });

  it("10. verifySmtpConnection reports status without throwing an unhandled exception", async () => {
    const status = await verifySmtpConnection();
    expect(status).toBeDefined();
    expect(status.ok).toBeTypeOf("boolean");
    expect(status.message).toBeTypeOf("string");
  });
});
