/**
 * Prava Enterprise Financial Cloud - Reusable Transactional Email Templates
 *
 * Designed with restrained, professional typography and dark/neutral surfaces.
 * Compatible with all modern desktop and mobile email clients.
 */

function baseLayout({ title, preheader, contentHtml }) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050811; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-font-smoothing: antialiased;">
  <!-- Hidden Preheader -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0; font-size: 1px; color: #050811;">
    ${preheader || title}
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #050811; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background: #0B0F19; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; overflow: hidden; box-shadow: 0 12px 32px rgba(0, 0, 0, 0.6);">
          <!-- Top Accent Bar -->
          <tr>
            <td style="height: 3px; background: linear-space(90deg, #38bdf8, #818cf8);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td style="padding: 28px 32px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.06); text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Prava</span>
                    <span style="display: inline-block; margin-left: 8px; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-family: monospace; font-weight: 600; background: rgba(56, 189, 248, 0.12); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.25);">AUTONOMOUS FINANCE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #070A12; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px; line-height: 1.5;">
                This is an automated communication dispatched from Prava Financial Cloud.<br>
                All data transfers and tax obligations are cryptographically secured and strictly tenant-isolated.
              </p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 10px; font-family: monospace;">
                © ${year} Prava Technologies Inc. • Enterprise Compliance Infrastructure
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. Account Verification OTP Template
export function renderAccountVerificationEmail({ otp, expiryMinutes = 5 }) {
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Account Verification Passcode</h2>
    <p style="margin: 0 0 24px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      Use the secure 6-digit one-time code below to complete your sign in or account registration on Prava.
    </p>

    <div style="margin: 24px 0; padding: 20px; background: #0E1424; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 12px; text-align: center;">
      <span style="font-family: monospace, Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #38bdf8;">
        ${otp}
      </span>
    </div>

    <p style="margin: 0; color: #64748b; font-size: 12px;">
      This verification code will expire in <strong style="color: #cbd5e1;">${expiryMinutes} minutes</strong>. If you did not request this verification, please disregard this email.
    </p>
  `;

  return {
    subject: "Prava Verification Code",
    text: `Your Prava verification code is ${otp}. It will expire in ${expiryMinutes} minutes.`,
    html: baseLayout({
      title: "Prava Verification Code",
      preheader: `Your 6-digit verification code is ${otp}`,
      contentHtml: content,
    }),
  };
}

// 2. Password Reset OTP Template
export function renderPasswordResetEmail({ otp, expiryMinutes = 15 }) {
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Security Password Reset Request</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      We received a request to reset the security password for your Prava organization workspace account.
    </p>

    <div style="margin: 20px 0; padding: 18px; background: #0E1424; border: 1px solid rgba(244, 63, 94, 0.25); border-radius: 12px; text-align: center;">
      <span style="font-family: monospace, Courier, monospace; font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #fb7185;">
        ${otp}
      </span>
    </div>

    <p style="margin: 0 0 12px; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      Enter this code on the password reset screen. Valid for <strong>${expiryMinutes} minutes</strong>.
    </p>
    <p style="margin: 0; color: #e2e8f0; font-size: 11px;">
      If you did not initiate this password change, your credentials may be targeted. Please notify support immediately.
    </p>
  `;

  return {
    subject: "Prava Password Reset Request",
    text: `Your password reset code is ${otp}. Valid for ${expiryMinutes} minutes.`,
    html: baseLayout({
      title: "Reset Your Prava Password",
      preheader: `Your password reset code is ${otp}`,
      contentHtml: content,
    }),
  };
}

// 3. Important Account Security Event
export function renderSecurityEventEmail({ eventType, ip = "Unknown IP", timestamp = new Date().toISOString() }) {
  const dateStr = new Date(timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Security Alert: ${eventType}</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      A key security event was recorded for your Prava workspace account:
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Event:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${eventType}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Timestamp:</td>
        <td style="color: #94a3b8; font-size: 12px; font-family: monospace; text-align: right;">${dateStr}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Origin IP:</td>
        <td style="color: #38bdf8; font-size: 12px; font-family: monospace; text-align: right;">${ip}</td>
      </tr>
    </table>

    <p style="margin: 0; color: #64748b; font-size: 12px;">
      If this was authorized by you, no further action is necessary.
    </p>
  `;

  return {
    subject: `Security Alert: ${eventType}`,
    text: `Security event "${eventType}" was recorded at ${dateStr} from IP ${ip}.`,
    html: baseLayout({
      title: "Security Event Notification",
      preheader: `Security event logged: ${eventType}`,
      contentHtml: content,
    }),
  };
}

// 4. Business Onboarding Completion
export function renderOnboardingCompletionEmail({ businessName, legalName, currency = "INR", gstin = "" }) {
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Workspace Configured: ${businessName}</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      Your commercial operating workspace has been successfully initialized and connected to the Autonomous CA audit engine.
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Workspace:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${businessName}</td>
      </tr>
      ${legalName ? `
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Legal Entity:</td>
        <td style="color: #cbd5e1; font-size: 12px; text-align: right;">${legalName}</td>
      </tr>` : ""}
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Currency / Ledger:</td>
        <td style="color: #38bdf8; font-size: 12px; font-family: monospace; text-align: right;">${currency}</td>
      </tr>
      ${gstin ? `
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">GSTIN:</td>
        <td style="color: #34d399; font-size: 12px; font-family: monospace; text-align: right;">${gstin}</td>
      </tr>` : ""}
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6;">
      You can now upload vendor bills for automated OCR, generate GST-compliant e-invoices, and run live Section 43B(h) MSME compliance audits.
    </p>
  `;

  return {
    subject: `Workspace Activated: ${businessName}`,
    text: `Workspace ${businessName} is ready. Upload invoices and run audits in your Prava dashboard.`,
    html: baseLayout({
      title: "Workspace Activated",
      preheader: `Welcome to Prava - ${businessName} is configured`,
      contentHtml: content,
    }),
  };
}

// 5. Compliance Reminder
export function renderComplianceReminderEmail({ businessName, obligationTitle, dueDate, statutorySection, daysRemaining }) {
  const content = `
    <div style="margin-bottom: 12px;">
      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-family: monospace; font-weight: 700; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3);">
        ${daysRemaining <= 1 ? "DUE TODAY // URGENT" : `${daysRemaining} DAYS REMAINING`}
      </span>
    </div>
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">${obligationTitle}</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      Statutory compliance obligation for <strong>${businessName}</strong> requires your immediate attention before statutory cut-off.
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Statutory Provision:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${statutorySection || "Statutory Compliance"}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Statutory Deadline:</td>
        <td style="color: #f59e0b; font-size: 12px; font-weight: 700; font-family: monospace; text-align: right;">${dueDate}</td>
      </tr>
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      Please log in to your Prava Command Center to reconcile records and file before interest penalties apply.
    </p>
  `;

  return {
    subject: `[Prava Action Required] ${obligationTitle} due ${dueDate}`,
    text: `Compliance alert for ${businessName}: ${obligationTitle} is due on ${dueDate}.`,
    html: baseLayout({
      title: `Compliance Reminder: ${obligationTitle}`,
      preheader: `${obligationTitle} due on ${dueDate} for ${businessName}`,
      contentHtml: content,
    }),
  };
}

// 6. Overdue Compliance Task Alert
export function renderOverdueTaskEmail({ businessName, taskTitle, dueDate, daysOverdue, statutoryPenalty = "" }) {
  const content = `
    <div style="margin-bottom: 12px;">
      <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-family: monospace; font-weight: 700; background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.35);">
        OVERDUE BY ${daysOverdue} DAYS
      </span>
    </div>
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Action Required: Overdue Task</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      A statutory or operational task for <strong>${businessName}</strong> has exceeded its statutory deadline:
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Task:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${taskTitle}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Original Due Date:</td>
        <td style="color: #f87171; font-size: 12px; font-family: monospace; text-align: right;">${dueDate}</td>
      </tr>
      ${statutoryPenalty ? `
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Late Penalty / Risk:</td>
        <td style="color: #fbbf24; font-size: 12px; text-align: right;">${statutoryPenalty}</td>
      </tr>` : ""}
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      Complete this item immediately in Prava to prevent compounding penal interest and regulatory notices.
    </p>
  `;

  return {
    subject: `[OVERDUE ALERT] ${taskTitle} for ${businessName}`,
    text: `Overdue task alert for ${businessName}: ${taskTitle} was due on ${dueDate} and is now overdue by ${daysOverdue} days.`,
    html: baseLayout({
      title: "Overdue Compliance Task",
      preheader: `OVERDUE: ${taskTitle} for ${businessName}`,
      contentHtml: content,
    }),
  };
}

// 7. OCR Failure / Document Review Required Notification
export function renderOcrFailureReviewEmail({ businessName, documentName, documentId, reason }) {
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Document Review Required</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      An uploaded document in workspace <strong>${businessName}</strong> requires human verification before financial figures can be committed to your official ledger:
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Document:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${documentName}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Review Reason:</td>
        <td style="color: #38bdf8; font-size: 12px; text-align: right;">${reason || "Arithmetic discrepancy or uncertain tax rate"}</td>
      </tr>
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      Prava strictly prevents unverified OCR values from silently entering balance sheets. Open the side-by-side Document Review console in Prava to confirm or edit the line items.
    </p>
  `;

  return {
    subject: `[Prava Review] Document requires verification: ${documentName}`,
    text: `Document review required for ${businessName}: ${documentName} (${reason || "Uncertain OCR fields"}).`,
    html: baseLayout({
      title: "Document Review Required",
      preheader: `Human review required for ${documentName}`,
      contentHtml: content,
    }),
  };
}

// 8. Integration Failure Alert
export function renderFailedIntegrationEmail({ businessName, integrationName, errorMessage }) {
  const content = `
    <h2 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: 700;">Integration Sync Notice</h2>
    <p style="margin: 0 0 20px; color: #94a3b8; font-size: 13px; line-height: 1.6;">
      A connected external synchronization for workspace <strong>${businessName}</strong> encountered an error:
    </p>

    <table role="presentation" width="100%" style="background: #0E1424; border: 1px solid rgba(244, 63, 94, 0.2); border-radius: 12px; padding: 16px; margin-bottom: 20px;">
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Integration:</td>
        <td style="color: #ffffff; font-size: 12px; font-weight: 600; text-align: right;">${integrationName}</td>
      </tr>
      <tr>
        <td style="color: #64748b; font-size: 12px; padding: 4px 0;">Error:</td>
        <td style="color: #fb7185; font-size: 12px; font-family: monospace; text-align: right;">${errorMessage}</td>
      </tr>
    </table>

    <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
      Please inspect your API credentials and re-authenticate the connection in your Prava Integrations settings.
    </p>
  `;

  return {
    subject: `[Integration Issue] ${integrationName} sync error in ${businessName}`,
    text: `Integration error for ${businessName}: ${integrationName} failed with: ${errorMessage}.`,
    html: baseLayout({
      title: "Integration Notice",
      preheader: `Integration error: ${integrationName}`,
      contentHtml: content,
    }),
  };
}
