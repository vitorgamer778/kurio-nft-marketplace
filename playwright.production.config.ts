import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
const url = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
export default defineConfig(base, {
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: process.env.REVIEW_REPORT || "verification/production-tests.json" }]],
  testMatch: [
    "**/flows.spec.ts",
    "**/review.spec.ts",
    "**/prerender.production.ts",
  ],
  use: { ...base.use, baseURL: url },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run preview",
        url,
        reuseExistingServer: true,
        timeout: 30000,
      },
});
