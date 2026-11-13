import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { createPool } from "mysql2/promise";
import { dismissDisclaimer, gotoAuthenticated } from "./helpers.mjs";

const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), "e2e", ".state.json"), "utf8"));
const auth = name => path.join(process.cwd(), "e2e", ".auth", `${name}.json`);

const pool = createPool({ uri: process.env.DATABASE_URL });
test.afterAll(async () => { await pool.end(); });

const caDecision = (overrides = {}) => ({
  taskId: state.taskId,
  businessId: state.businessId,
  decision: "approved",
  observationTitle: "E2E verification of the prepared working",
  detailedNotes: "Inspected the source invoice, the extraction and the prepared GST working before deciding.",
  ...overrides,
});

test.describe("business owner approval status", () => {
  test.use({ storageState: auth("owner") });

  test("shows awaiting review, then approval, then invalidation after evidence changes", async ({ page, browser }) => {
    await gotoAuthenticated(page, `/tasks/${state.taskId}`);

    await expect(page.getByText("Approval & review")).toBeVisible();
    await expect(page.getByText(/awaiting ca review/i).first()).toBeVisible();
    await expect(page.getByText(/CA E2E Reviewer|ICAI-E2E-0001/).first()).toBeVisible();

    // The assigned professional approves through the real API.
    const caContext = await browser.newContext({ storageState: auth("ca") });
    const decision = await caContext.request.post("/api/ca/submit-decision", { data: caDecision() });
    expect(decision.status(), await decision.text()).toBe(200);
    await caContext.close();

    await page.reload();
    await expect(page.getByText(/^approved$/i).first()).toBeVisible();

    // A correction to the reviewed evidence arrives after approval.
    const [doc] = await pool.query(
      `INSERT INTO documents (businessId, taskId, uploadedByUserId, storageKey, storageUrl, originalName, mimeType, sizeBytes, documentType, status)
       VALUES (?, ?, ?, 'e2e/correction.pdf', 'https://storage.example/e2e-correction.pdf', 'e2e-correction.pdf', 'application/pdf', 10, 'invoice', 'uploaded')`,
      [state.businessId, state.taskId, state.ownerId],
    );

    await page.reload();
    await expect(page.getByText(/approval invalidated/i).first()).toBeVisible();
    await expect(page.getByText(/evidence changed/i).first()).toBeVisible();
    await expect(page.getByText(/resubmit for a fresh review/i).first()).toBeVisible();

    // The backend refuses client authorization while the approval is invalid.
    const blocked = await page.request.post(`/api/tasks/${state.taskId}/request-authorized-submission`, {
      data: { acknowledgement: true, note: "Attempted while the approval is invalid." },
    });
    expect(blocked.ok()).toBeFalsy();

    // The professional re-approves the corrected evidence; history keeps both.
    const caContext2 = await browser.newContext({ storageState: auth("ca") });
    const reDecision = await caContext2.request.post("/api/ca/submit-decision", {
      data: caDecision({ observationTitle: "Re-review after corrected evidence" }),
    });
    expect(reDecision.status(), await reDecision.text()).toBe(200);
    await caContext2.close();

    await page.reload();
    await expect(page.getByText(/^approved$/i).first()).toBeVisible();
    await expect(page.getByText(/re-review after corrected evidence/i)).toBeVisible();
    await expect(page.getByText(/e2e verification of the prepared working/i)).toBeVisible();

    await pool.query("DELETE FROM documents WHERE id = ?", [doc.insertId]);
  });
});

test.describe("CA approval queue", () => {
  test.use({ storageState: auth("ca") });

  test("inspects evidence, requests changes, and approves the corrected task", async ({ page }) => {
    await gotoAuthenticated(page, "/ca/dashboard");
    await page.getByRole("tab", { name: /approvals/i }).click();

    await expect(page.getByRole("heading", { name: "Approval queue" })).toBeVisible();
    await expect(page.getByText("E2E Workspace Pvt Ltd").first()).toBeVisible();
    const row = page.locator("li", { hasText: "E2E CA queue task" });
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Inspect evidence" }).click();
    await expect(page.getByRole("dialog").getByText("Evidence review")).toBeVisible();
    await expect(page.getByText("e2e-ca-queue.pdf")).toBeVisible();
    await expect(page.getByText(/94(\.0)?%/).first()).toBeVisible();

    await page.getByRole("dialog").getByRole("button", { name: "Record decision" }).click();
    await expect(page.getByRole("dialog").getByText("Record professional decision")).toBeVisible();

    await page.locator("#ca-decision").selectOption("needs_revision");
    await page.locator("#ca-title").fill("Correction required on the purchase invoice");
    await page.locator("#ca-notes").fill("The reviewed invoice total does not match the prepared working; please correct it.");
    await page.getByLabel(/I inspected the source documents/).check();
    await page.getByRole("dialog").getByRole("button", { name: "Record decision" }).click();

    await expect(page.getByRole("dialog").getByText("Record professional decision")).toBeHidden();
    await expect(page.getByText(/changes requested/i).first()).toBeVisible();

    // Approve after the correction, using the freshly loaded evidence.
    await page.locator("li", { hasText: "E2E CA queue task" }).getByRole("button", { name: "Inspect evidence" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Record decision" }).click();
    await page.locator("#ca-title").fill("Approved after correction");
    await page.locator("#ca-notes").fill("Re-checked the corrected invoice against the prepared working and approved this version.");
    await page.getByLabel(/I inspected the source documents/).check();
    await page.getByLabel(/I confirm this decision for the evidence shown/).check();
    await page.getByRole("dialog").getByRole("button", { name: "Record decision" }).click();

    await expect(page.getByRole("dialog").getByText("Record professional decision")).toBeHidden();
    await page.getByRole("button", { name: "Approved", exact: true }).click();
    await expect(page.locator("li", { hasText: "E2E CA queue task" })).toBeVisible();
  });
});
