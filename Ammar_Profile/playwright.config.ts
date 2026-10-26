import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  workers: 2,
  timeout: 45_000,
  reporter: [["list"], ["json", { outputFile: ".local/test-results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
});
