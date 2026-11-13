import fs from "node:fs";
import path from "node:path";
import { test } from "@playwright/test";
import { expect } from "@playwright/test";
import { gotoAuthenticated } from "./helpers.mjs";

const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), "e2e", ".state.json"), "utf8"));
const auth = name => path.join(process.cwd(), "e2e", ".auth", `${name}.json`);
const shots = path.join(process.cwd(), "e2e", "screenshots");
fs.mkdirSync(shots, { recursive: true });

test.describe("approval screen captures", () => {
  test.use({ storageState: auth("owner") });

  test("task approval section at desktop and mobile widths", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, `/tasks/${state.taskId}`);
    await expect(page.getByText("Approval & review")).toBeVisible();
    await page.screenshot({ path: path.join(shots, "task-approval-desktop.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/tasks/${state.taskId}`);
    await expect(page.getByText("Approval & review")).toBeVisible();
    await page.screenshot({ path: path.join(shots, "task-approval-mobile.png"), fullPage: true });
  });
});

test.describe("CA screen capture", () => {
  test.use({ storageState: auth("ca") });

  test("approval queue and evidence dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await gotoAuthenticated(page, "/ca/dashboard");
    await page.getByRole("tab", { name: /approvals/i }).click();
    await page.getByRole("heading", { name: "Approval queue" }).waitFor();
    await page.screenshot({ path: path.join(shots, "ca-approval-queue.png"), fullPage: true });

    const row = page.locator("li", { hasText: "E2E CA queue task" });
    if (await row.count()) {
      await row.getByRole("button", { name: "Inspect evidence" }).click();
      await page.screenshot({ path: path.join(shots, "ca-evidence-dialog.png") });
    }
  });
});
