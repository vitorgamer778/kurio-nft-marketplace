import fs from "node:fs/promises";
import os from "node:os";
import lighthouse from "lighthouse";
import { chromium } from "@playwright/test";
await fs.mkdir("audits", { recursive: true });
const chrome = await chromium.launch({
  headless: true,
  args: ["--remote-debugging-port=9223"],
});
const results = [];
try {
  for (const profile of ["mobile", "desktop"])
    for (const [name, path] of [
      ["home", "/"],
      ["detail", "/nft/emerald-ape-042"],
    ])
      for (let run = 1; run <= 3; run++) {
        const settings =
          profile === "desktop"
            ? {
                formFactor: "desktop",
                screenEmulation: {
                  mobile: false,
                  width: 1440,
                  height: 1000,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
                throttling: {
                  rttMs: 40,
                  throughputKbps: 10240,
                  cpuSlowdownMultiplier: 1,
                  requestLatencyMs: 0,
                  downloadThroughputKbps: 0,
                  uploadThroughputKbps: 0,
                },
              }
            : {
                formFactor: "mobile",
                screenEmulation: {
                  mobile: true,
                  width: 390,
                  height: 844,
                  deviceScaleFactor: 1,
                  disabled: false,
                },
              };
        const result = await lighthouse("http://127.0.0.1:4173" + path, {
          port: 9223,
          logLevel: "error",
          output: ["html", "json"],
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          ...settings,
        });
        const label = name + "-" + profile + "-" + run;
        await fs.writeFile("audits/" + label + ".html", result.report[0]);
        await fs.writeFile("audits/" + label + ".json", result.report[1]);
        const a = result.lhr.audits,
          c = result.lhr.categories,
          row = {
            page: name,
            profile,
            run,
            scores: Object.fromEntries(
              Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]),
            ),
            lcp: a["largest-contentful-paint"].numericValue,
            cls: a["cumulative-layout-shift"].numericValue,
            tbt: a["total-blocking-time"].numericValue,
          };
        results.push(row);
        console.log(JSON.stringify(row));
      }
} finally {
  await chrome.close();
}
const median = (values) => [...values].sort((a, b) => a - b)[1];
const summary = [];
for (const page of ["home", "detail"])
  for (const profile of ["mobile", "desktop"]) {
    const set = results.filter((r) => r.page === page && r.profile === profile);
    summary.push({
      page,
      profile,
      scores: Object.fromEntries(
        ["performance", "accessibility", "best-practices", "seo"].map((k) => [
          k,
          median(set.map((r) => r.scores[k])),
        ]),
      ),
      lcp: median(set.map((r) => r.lcp)),
      cls: median(set.map((r) => r.cls)),
      tbt: median(set.map((r) => r.tbt)),
    });
  }
await fs.writeFile(
  "audits/summary.json",
  JSON.stringify(
    {
      environment: {
        node: process.version,
        platform: os.platform(),
        release: os.release(),
        cpu: os.cpus()[0].model,
        lighthouse: (
          await import("lighthouse/package.json", { with: { type: "json" } })
        ).default.version,
        playwright: (
          await import("@playwright/test/package.json", {
            with: { type: "json" },
          })
        ).default.version,
      },
      conditions:
        "Optimized Vite preview, real local Figma assets/fonts, MSW standard, headless Chromium, Lighthouse simulated throttling, 3 consecutive runs per page/profile.",
      summary,
      results,
    },
    null,
    2,
  ),
);
console.log("Audit summary saved to audits/summary.json");
