import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  (process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : undefined);

if (!baseURL) {
  throw new Error(
    "Set PLAYWRIGHT_BASE_URL (or REPLIT_DEV_DOMAIN) to the shared Afrotextile web/API preview.",
  );
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL,
    browserName: "chromium",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    launchOptions: {
      executablePath:
        process.env.REPLIT_PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
        "/repl/tools/bin/chromium",
    },
  },
});