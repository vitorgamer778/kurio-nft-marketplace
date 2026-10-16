import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
const base = process.argv[2] || "http://127.0.0.1:4173";
await fs.mkdir("screenshots", { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 1000],
    ["tablet", 768, 1024],
    ["mobile", 390, 844],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    await page.goto(base);
    await page.locator(".nft-card").first().waitFor();
    await page.locator('#root:not([inert])').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.locator(".hero-art").evaluate((img) => img.decode());
    await page.screenshot({ path: "screenshots/" + name + ".png" });
    if (name === "mobile") {
      for (const slide of [2, 3]) {
        await page.getByRole("button", { name: "Destaque " + slide, exact: true }).click();
        await page.locator(".hero-art").evaluate((img) => img.decode());
        await page.screenshot({ path: "screenshots/mobile-slide-" + slide + ".png" });
      }
    }
    await page.goto(base + "/login");
    const social = page.locator(".social-auth");
    await social.waitFor();
    await page.evaluate(() => document.fonts.ready);
    await social.locator("img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode()));
    });
    await page.screenshot({ path: "screenshots/login-" + name + ".png" });
    await social.screenshot({ path: "screenshots/social-" + name + ".png" });
    await page.close();
  }
} finally {
  await browser.close();
}
