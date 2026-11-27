import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://alameedtraining.com",
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
      : undefined,
  },
  projects: [
    { name: "mobile-320", use: { ...devices["Pixel 5"], viewport: { width: 320, height: 640 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // The default release matrix stays on the browser installed by CI.
    { name: "tablet", use: { ...devices["Galaxy Tab S4"], viewport: { width: 768, height: 1024 } } },
    ...(process.env.E2E_WEBKIT === "1"
      ? [{
          name: "tablet-webkit",
          use: {
            ...devices["iPad (gen 7)"],
            viewport: { width: 768, height: 1024 },
            // Do not pass a local Chromium executable to the optional WebKit run.
            launchOptions: {},
          },
        }]
      : []),
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } },
    { name: "desktop-wide", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } },
  ],
});
