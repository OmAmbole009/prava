import { expect } from "@playwright/test";

/**
 * The privacy/disclaimer gate is intentionally blocking. A first-time browser
 * context must acknowledge it before any page content is visible.
 */
export async function dismissDisclaimer(page) {
  const agree = page.getByRole("button", { name: /i understand and agree/i });
  try {
    await agree.waitFor({ state: "visible", timeout: 5_000 });
    await agree.click();
    await agree.waitFor({ state: "hidden", timeout: 5_000 });
  } catch {
    // Already acknowledged in this context.
  }
}

export async function gotoAuthenticated(page, url) {
  await page.goto(url);
  await dismissDisclaimer(page);
}

export { expect };
