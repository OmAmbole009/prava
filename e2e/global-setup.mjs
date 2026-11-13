import fs from "node:fs";
import path from "node:path";
import { createPool } from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("E2E requires DATABASE_URL pointing at a disposable MySQL database.");
}

process.env.JWT_SECRET = process.env.JWT_SECRET
  || "prava-e2e-session-signing-secret-32-chars-minimum";

const { sdk } = await import("../server/_core/sdk.js");

const OPEN_IDS = {
  owner: "e2e-owner",
  ca: "e2e-ca",
  otherCa: "e2e-ca-unassigned",
  outsider: "e2e-outsider",
  expired: "e2e-owner",
};

const pool = createPool({ uri: DATABASE_URL, multipleStatements: false });

async function cleanup() {
  const [users] = await pool.query("SELECT id FROM users WHERE openId LIKE 'e2e-%'");
  const userIds = users.map(row => row.id);
  const [bizRows] = userIds.length
    ? await pool.query("SELECT id FROM businesses WHERE ownerUserId IN (?)", [userIds])
    : [[]];
  const bizIds = bizRows.map(row => row.id);

  if (bizIds.length) {
    await pool.query("DELETE FROM subscriptionItems WHERE subscriptionId IN (SELECT id FROM subscriptions WHERE businessId IN (?))", [bizIds]);
    await pool.query("DELETE FROM subscriptions WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM payments WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM billingInvoices WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM usageRecords WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM financialSummaries WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM accountingEntries WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM issuedInvoices WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM planChangeRequests WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM businessInvitations WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM caAuditObservations WHERE businessId IN (?)", [bizIds]);

    await pool.query("DELETE FROM gstSubmissionRequests WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM reviewRequests WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM actionItems WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM reconciliationItems WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM auditEvents WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM gstPreparations WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM taskRequirements WHERE taskId IN (SELECT id FROM operationalTasks WHERE businessId IN (?))", [bizIds]);
    await pool.query("DELETE FROM documentExtractions WHERE documentId IN (SELECT id FROM documents WHERE businessId IN (?))", [bizIds]);
    await pool.query("DELETE FROM documents WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM operationalTasks WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM caAssignments WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM businessMembers WHERE businessId IN (?)", [bizIds]);
    await pool.query("DELETE FROM businesses WHERE id IN (?)", [bizIds]);
  }
  if (userIds.length) {
    await pool.query("DELETE FROM gstSubmissionNotifications WHERE recipientUserId IN (?)", [userIds]);
    await pool.query("DELETE FROM adminAuditEvents WHERE actorUserId IN (?)", [userIds]);
    await pool.query("DELETE FROM caAuditObservations WHERE caUserId IN (?)", [userIds]);
    await pool.query("DELETE FROM caAssignments WHERE caUserId IN (?)", [userIds]);
    await pool.query("DELETE FROM caProfiles WHERE userId IN (?)", [userIds]);
    await pool.query("DELETE FROM caCredentials WHERE userId IN (?)", [userIds]);
    await pool.query("DELETE FROM users WHERE id IN (?)", [userIds]);
  }
}

async function insertUser(openId, name, role = "user") {
  const [result] = await pool.query(
    "INSERT INTO users (openId, name, email, role, loginMethod) VALUES (?, ?, ?, ?, 'e2e')",
    [openId, name, `${openId}@prava.test`, role],
  );
  return result.insertId;
}

export default async function globalSetup() {
  await cleanup();

  const ownerId = await insertUser(OPEN_IDS.owner, "E2E Business Owner");
  const caId = await insertUser(OPEN_IDS.ca, "CA E2E Reviewer", "ca");
  const otherCaId = await insertUser(OPEN_IDS.otherCa, "CA E2E Unassigned", "ca");
  const outsiderId = await insertUser(OPEN_IDS.outsider, "E2E Outsider");

  const [profile] = await pool.query(
    "INSERT INTO caProfiles (userId, fullName, email, membershipNumber, status, createdByAdminId) VALUES (?, 'CA E2E Reviewer', 'e2e-ca@prava.test', 'ICAI-E2E-0001', 'active', ?)",
    [caId, ownerId],
  );
  await pool.query(
    "INSERT INTO caProfiles (userId, fullName, email, membershipNumber, status, createdByAdminId) VALUES (?, 'CA E2E Unassigned', 'e2e-ca-unassigned@prava.test', 'ICAI-E2E-0002', 'active', ?)",
    [otherCaId, ownerId],
  );
  void profile;

  const [business] = await pool.query(
    "INSERT INTO businesses (ownerUserId, name, businessType, industry, gstStatus, gstin, currency, locale, timezone) VALUES (?, 'E2E Workspace Pvt Ltd', 'Private Limited Company', 'Testing', 'registered', '27ABCDE1234F1Z5', 'INR', 'en-IN', 'Asia/Kolkata')",
    [ownerId],
  );
  const businessId = business.insertId;

  // Business modules are entitlement-gated; give the workspace an active plan.
  let [planRows] = await pool.query("SELECT id FROM plans WHERE code = 'free' LIMIT 1");
  if (!planRows.length) {
    await pool.query(
      "INSERT INTO plans (code, name, status, billingPeriod, priceMinor, currency, featureConfig, memberLimit) VALUES ('free', 'Free', 'active', 'monthly', 0, 'INR', '{}', 5)",
    );
    [planRows] = await pool.query("SELECT id FROM plans WHERE code = 'free' LIMIT 1");
  }
  await pool.query(
    "INSERT INTO subscriptions (businessId, planId, provider, status, currentPeriodStart, currentPeriodEnd, planSelected) VALUES (?, ?, 'internal', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1)",
    [businessId, planRows[0].id],
  );
  await pool.query("INSERT INTO businessMembers (businessId, userId, role) VALUES (?, ?, 'owner')", [businessId, ownerId]);
  await pool.query("INSERT INTO caAssignments (caUserId, businessId, assignedByAdminId, status) VALUES (?, ?, ?, 'active')", [caId, businessId, ownerId]);

  // A second workspace, used only for cross-tenant attempts.
  const [otherBusiness] = await pool.query(
    "INSERT INTO businesses (ownerUserId, name, businessType, industry, gstStatus) VALUES (?, 'E2E Other Tenant', 'Proprietorship', 'Testing', 'registered')",
    [outsiderId],
  );
  const otherBusinessId = otherBusiness.insertId;
      await pool.query("INSERT INTO businessMembers (businessId, userId, role) VALUES (?, ?, 'owner')", [otherBusinessId, outsiderId]);
  await pool.query(
    "INSERT INTO subscriptions (businessId, planId, provider, status, currentPeriodStart, currentPeriodEnd, planSelected) VALUES (?, ?, 'internal', 'active', NOW(), DATE_ADD(NOW(), INTERVAL 1 YEAR), 1)",
    [otherBusinessId, planRows[0].id],
  );

  const [task] = await pool.query(
    `INSERT INTO operationalTasks (businessId, createdByUserId, type, title, status, requiresProfessionalReview, version, periodStart, periodEnd)
     VALUES (?, ?, 'gst_return_preparation', 'E2E GST review task', 'needs_review', 1, 0, '2026-04-01 00:00:00', '2026-05-01 00:00:00')`,
    [businessId, ownerId],
  );
  const taskId = task.insertId;

  await pool.query(
    `INSERT INTO taskRequirements (taskId, requirementKey, label, status) VALUES
     (?, 'purchase_invoices', 'Purchase invoices', 'complete'),
     (?, 'business_gstin', 'Business GSTIN', 'complete')`,
    [taskId, taskId],
  );

  const [document] = await pool.query(
    `INSERT INTO documents (businessId, taskId, uploadedByUserId, storageKey, storageUrl, originalName, mimeType, sizeBytes, documentType, status)
     VALUES (?, ?, ?, 'e2e/invoice.pdf', 'https://storage.example/e2e.pdf', 'e2e-invoice.pdf', 'application/pdf', 1024, 'invoice', 'extracted')`,
    [businessId, taskId, ownerId],
  );
  await pool.query(
    `INSERT INTO documentExtractions (documentId, model, status, confidenceBps, vendorName, gstin, invoiceNumber, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, totalMinor, extractedData)
     VALUES (?, 'e2e-harness', 'extracted', 9400, 'E2E Supplier', '27ABCDE1234F1Z5', 'INV-E2E-001', 100000, 9000, 9000, 0, 118000, '{}')`,
    [document.insertId],
  );

  await pool.query(
    `INSERT INTO gstPreparations (businessId, taskId, periodStart, periodEnd, status, salesMinor, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, inputTaxCreditMinor, netTaxPositionMinor)
     VALUES (?, ?, '2026-04-01 00:00:00', '2026-05-01 00:00:00', 'prepared', 118000, 100000, 9000, 9000, 0, 0, 18000)`,
    [businessId, taskId],
  );

  await pool.query(
    "INSERT INTO reviewRequests (businessId, taskId, requestedByUserId, note, status) VALUES (?, ?, ?, 'Please review the prepared GST working.', 'requested')",
    [businessId, taskId, ownerId],
  );

  // A prepared task, used to show that CA approval and client authorization are
  // separate steps and that a duplicate authorization request is refused.
  const [preparedTask] = await pool.query(
    `INSERT INTO operationalTasks (businessId, createdByUserId, type, title, status, requiresProfessionalReview, version, periodStart, periodEnd)
     VALUES (?, ?, 'gst_return_preparation', 'E2E prepared task', 'prepared', 1, 0, '2026-04-01 00:00:00', '2026-05-01 00:00:00')`,
    [businessId, ownerId],
  );
  await pool.query(
    `INSERT INTO gstPreparations (businessId, taskId, periodStart, periodEnd, status, salesMinor, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, inputTaxCreditMinor, netTaxPositionMinor)
     VALUES (?, ?, '2026-04-01 00:00:00', '2026-05-01 00:00:00', 'prepared', 59000, 50000, 4500, 4500, 0, 0, 9000)`,
    [businessId, preparedTask.insertId],
  );
  const [preparedDoc] = await pool.query(
         `INSERT INTO documents (businessId, taskId, uploadedByUserId, storageKey, storageUrl, originalName, mimeType, sizeBytes, documentType, status)
     VALUES (?, ?, ?, 'e2e/prepared.pdf', 'https://storage.example/e2e-prepared.pdf', 'e2e-prepared.pdf', 'application/pdf', 2048, 'invoice', 'extracted')`,
    [businessId, preparedTask.insertId, ownerId],
  );
  await pool.query(
    `INSERT INTO documentExtractions (documentId, model, status, confidenceBps, invoiceNumber, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, totalMinor, extractedData)
     VALUES (?, 'e2e-harness', 'extracted', 9100, 'INV-E2E-PREP', 50000, 4500, 4500, 0, 59000, '{}')`,
    [preparedDoc.insertId],
  );

  // A separate task for the reviewer's own queue flow.
  const [caTask] = await pool.query(
    `INSERT INTO operationalTasks (businessId, createdByUserId, type, title, status, requiresProfessionalReview, version, periodStart, periodEnd)
     VALUES (?, ?, 'gst_return_preparation', 'E2E CA queue task', 'needs_review', 1, 0, '2026-04-01 00:00:00', '2026-05-01 00:00:00')`,
    [businessId, ownerId],
  );
  const [caDoc] = await pool.query(
    `INSERT INTO documents (businessId, taskId, uploadedByUserId, storageKey, storageUrl, originalName, mimeType, sizeBytes, documentType, status)
     VALUES (?, ?, ?, 'e2e/ca-queue.pdf', 'https://storage.example/e2e-ca-queue.pdf', 'e2e-ca-queue.pdf', 'application/pdf', 4096, 'invoice', 'extracted')`,
    [businessId, caTask.insertId, ownerId],
  );
  await pool.query(
    `INSERT INTO documentExtractions (documentId, model, status, confidenceBps, invoiceNumber, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, totalMinor, extractedData)
     VALUES (?, 'e2e-harness', 'extracted', 9400, 'INV-E2E-CA', 100000, 9000, 9000, 0, 118000, '{}')`,
    [caDoc.insertId],
  );
  await pool.query(
    `INSERT INTO gstPreparations (businessId, taskId, periodStart, periodEnd, status, salesMinor, taxableValueMinor, cgstMinor, sgstMinor, igstMinor, inputTaxCreditMinor, netTaxPositionMinor)
     VALUES (?, ?, '2026-04-01 00:00:00', '2026-05-01 00:00:00', 'prepared', 118000, 100000, 9000, 9000, 0, 0, 18000)`,
    [businessId, caTask.insertId],
  );
  await pool.query(
    "INSERT INTO reviewRequests (businessId, taskId, requestedByUserId, note, status) VALUES (?, ?, ?, 'Queued for professional review.', 'requested')",
    [businessId, caTask.insertId, ownerId],
  );

  // A distinct task for the concurrent-decision API check.
  const [raceTask] = await pool.query(
    `INSERT INTO operationalTasks (businessId, createdByUserId, type, title, status, requiresProfessionalReview, version, periodStart, periodEnd)
     VALUES (?, ?, 'gst_return_preparation', 'E2E concurrency task', 'ready_for_review', 1, 0, '2026-04-01 00:00:00', '2026-05-01 00:00:00')`,
    [businessId, ownerId],
  );
  await pool.query(
    `INSERT INTO gstPreparations (businessId, taskId, periodStart, periodEnd, status, netTaxPositionMinor)
     VALUES (?, ?, '2026-04-01 00:00:00', '2026-05-01 00:00:00', 'prepared', 0)`,
    [businessId, raceTask.insertId],
  );

  const [otherTask] = await pool.query(
    `INSERT INTO operationalTasks (businessId, createdByUserId, type, title, status, requiresProfessionalReview, version, periodStart, periodEnd)
     VALUES (?, ?, 'gst_return_preparation', 'E2E other tenant task', 'needs_review', 1, 0, '2026-04-01 00:00:00', '2026-05-01 00:00:00')`,
    [otherBusinessId, outsiderId],
  );

  const [otherDocument] = await pool.query(
         `INSERT INTO documents (businessId, taskId, uploadedByUserId, storageKey, storageUrl, originalName, mimeType, sizeBytes, documentType, status)
     VALUES (?, ?, ?, 'e2e/other.pdf', 'https://storage.example/e2e-other.pdf', 'e2e-other.pdf', 'application/pdf', 10, 'invoice', 'uploaded')`,
    [otherBusinessId, otherTask.insertId, outsiderId],
  );

  const authDir = path.join(process.cwd(), "e2e", ".auth");
  fs.mkdirSync(authDir, { recursive: true });

  const expires = Math.floor(Date.now() / 1000) + 3600;
  async function writeState(name, openId, options = {}) {
    const token = await sdk.createSessionToken(openId, { name: openId, ...options });
    const state = {
      cookies: [{
        name: "app_session_id",
        value: token,
        domain: "127.0.0.1",
        path: "/",
        expires: options.expiresInMs && options.expiresInMs < 0 ? Math.floor(Date.now() / 1000) - 60 : expires,
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      }],
      origins: [],
    };
    fs.writeFileSync(path.join(authDir, `${name}.json`), JSON.stringify(state, null, 2));
  }

  await writeState("owner", OPEN_IDS.owner);
  await writeState("ca", OPEN_IDS.ca);
  await writeState("unassignedCa", OPEN_IDS.otherCa);
  await writeState("outsider", OPEN_IDS.outsider);
  await writeState("expired", OPEN_IDS.expired, { expiresInMs: -120_000 });

  fs.writeFileSync(
    path.join(process.cwd(), "e2e", ".state.json"),
    JSON.stringify({
      businessId,
      taskId,
      otherBusinessId,
      preparedTaskId: preparedTask.insertId,
      caTaskId: caTask.insertId,
      ownerId,
      caId,
      outsiderId,
      concurrencyTaskId: raceTask.insertId,
      otherTaskId: otherTask.insertId,
      otherDocumentId: otherDocument.insertId,
      documentId: document.insertId,
      openIds: OPEN_IDS,
    }, null, 2),
  );

  await pool.end();
}
