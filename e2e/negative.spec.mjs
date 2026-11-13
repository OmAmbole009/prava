import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { dismissDisclaimer, gotoAuthenticated } from "./helpers.mjs";

const state = JSON.parse(fs.readFileSync(path.join(process.cwd(), "e2e", ".state.json"), "utf8"));
const auth = name => path.join(process.cwd(), "e2e", ".auth", `${name}.json`);

test.describe("access control", () => {
  test("an unassigned, verified professional sees no client work and cannot decide", async ({ browser }) => {
    const context = await browser.newContext({ storageState: auth("unassignedCa") });
    const request = context.request;

    const queue = await request.get("/api/ca/approval-queue");
    expect(queue.status()).toBe(200);
    expect((await queue.json()).data.items).toEqual([]);

    const task = await request.get(`/api/ca/tasks/${state.taskId}`);
    expect(task.status()).toBe(403);

    const decision = await request.post("/api/ca/submit-decision", {
      data: {
        taskId: state.taskId,
        businessId: state.businessId,
        decision: "approved",
        observationTitle: "Unassigned attempt",
        detailedNotes: "This decision must never be recorded because the professional is not assigned.",
      },
    });
    expect(decision.status()).toBe(403);
    await context.close();
  });

  test("a business user outside the workspace cannot read tasks or approvals", async ({ browser }) => {
    const context = await browser.newContext({ storageState: auth("outsider") });
    const request = context.request;

    expect((await request.get(`/api/tasks/approvals?businessId=${state.businessId}`)).status()).toBe(403);
    expect((await request.get(`/api/tasks/${state.taskId}/approval`)).status()).toBe(403);
    expect((await request.get(`/api/tasks/${state.taskId}`)).status()).toBe(403);
    await context.close();
  });

  test("a workspace owner cannot read another tenant's task", async ({ browser }) => {
    const context = await browser.newContext({ storageState: auth("owner") });
    const request = context.request;
    expect((await request.get(`/api/tasks/${state.otherTaskId}/approval`)).status()).toBe(403);
    expect((await request.get(`/api/tasks/${state.otherTaskId}`)).status()).toBe(403);
    await context.close();
  });

  test("an expired session is rejected", async ({ browser }) => {
    const context = await browser.newContext({ storageState: auth("expired") });
    const response = await context.request.get(`/api/tasks?businessId=${state.businessId}`);
    expect(response.status()).toBe(401);
    await context.close();
  });
});

test.describe("concurrent decisions over HTTP", () => {
  test.use({ storageState: auth("ca") });

  test("only one of two simultaneous decisions is accepted", async ({ request }) => {
    const payload = {
      taskId: state.concurrencyTaskId,
      businessId: state.businessId,
      observationTitle: "Concurrent E2E decision",
      detailedNotes: "Reviewed the same evidence version from two simultaneous requests.",
      expectedVersion: 0,
    };

    const [first, second] = await Promise.all([
      request.post("/api/ca/submit-decision", { data: { ...payload, decision: "approved" } }),
      request.post("/api/ca/submit-decision", { data: { ...payload, decision: "rejected" } }),
    ]);

    const statuses = [first.status(), second.status()].sort();
    expect(statuses).toEqual([200, 409]);

    const conflict = first.status() === 409 ? first : second;
    expect(await conflict.text()).toMatch(/changed after you opened it/i);

    const view = await request.get(`/api/ca/tasks/${state.concurrencyTaskId}`);
    expect(view.status()).toBe(200);
    const body = (await view.json()).data;
    expect(body.history).toHaveLength(1);
    expect(body.task.version).toBe(1);
  });
});

test.describe("client authorization is separate from CA approval", () => {
  test.use({ storageState: auth("owner") });

  test("requires an approval, then refuses a duplicate authorization request", async ({ request, browser }) => {
    // Without a professional approval the prepared task cannot be authorized.
    const beforeApproval = await request.post(`/api/tasks/${state.preparedTaskId}/request-authorized-submission`, {
      data: { acknowledgement: true, note: "Attempt before professional review." },
    });
    expect(beforeApproval.ok()).toBeFalsy();

    const caContext = await browser.newContext({ storageState: auth("ca") });
    const decision = await caContext.request.post("/api/ca/submit-decision", {
      data: {
        taskId: state.preparedTaskId,
        businessId: state.businessId,
        decision: "approved",
        observationTitle: "Approved for the authorization step",
        detailedNotes: "Verified the source invoice and preparation before the client authorization step.",
      },
    });
    expect(decision.status(), await decision.text()).toBe(200);
    await caContext.close();

    const first = await request.post(`/api/tasks/${state.preparedTaskId}/request-authorized-submission`, {
      data: { acknowledgement: true, note: "Client authorization requested after professional approval." },
    });
    expect(first.status(), await first.text()).toBe(200);

    const view = await request.get(`/api/tasks/${state.preparedTaskId}/approval`);
    const body = (await view.json()).data;
    expect(body.approvalStatus).toBe("awaiting_client_authorization");
    expect(body.execution.filingInitiated).toBe(false);
    expect(body.execution.acknowledgement).toBeNull();

    const duplicate = await request.post(`/api/tasks/${state.preparedTaskId}/request-authorized-submission`, {
      data: { acknowledgement: true, note: "Duplicate request." },
    });
    expect(duplicate.ok()).toBeFalsy();
  });
});

test.describe("error states", () => {
  test.use({ storageState: auth("owner") });

  test("a failed approval request shows an error instead of a status", async ({ page }) => {
    await page.route("**/api/tasks/*/approval", route => route.abort("failed"));
    await gotoAuthenticated(page, `/tasks/${state.taskId}`);
    await dismissDisclaimer(page);
    await expect(page.getByText(/approval details could not be loaded/i)).toBeVisible();
    await expect(page.getByText(/^approved$/i)).toHaveCount(0);
  });

  test("renders the approval section on a narrow viewport without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoAuthenticated(page, `/tasks/${state.taskId}`);
    await expect(page.getByText("Approval & review")).toBeVisible();
    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
