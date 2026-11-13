import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT || 3210);
const baseURL = `http://127.0.0.1:${PORT}`;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    "Playwright E2E needs DATABASE_URL pointing at a disposable MySQL database (migrations applied).",
  );
}

const JWT_SECRET = process.env.JWT_SECRET || "prava-e2e-session-signing-secret-32-chars-minimum";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.mjs",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node server/_core/index.js",
    url: `${baseURL}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL,
      JWT_SECRET,
      NODE_ENV: "test",
      APP_ORIGIN: baseURL,
      APP_URL: baseURL,
    },
  },
});
