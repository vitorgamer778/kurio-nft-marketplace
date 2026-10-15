import { chromium, expect } from "@playwright/test";
import fs from "node:fs/promises";
const base = process.argv[2];
if (!base) throw new Error("Informe a URL da aplicação.");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  for (const route of ["/login", "/register"]) {
    await page.goto(base + route);
    const social = page.locator(".social-auth");
    await expect(social).toBeVisible();
    await social.locator("img").evaluateAll(async (images) => {
      await Promise.all(images.map((image) => image.decode()));
    });
    for (const provider of ["Google", "Facebook"]) {
      const button = page.getByRole("button", {
        name: "Continuar com " + provider,
      });
      await button.click();
      const notice = page.getByRole("dialog", {
        name: "Acesso à demonstração",
      });
      await expect(notice).toContainText("Login social não está integrado");
      await page.keyboard.press("Escape");
      await expect(notice).not.toBeVisible();
      await expect(button).toBeFocused();
    }
  }
  await page.goto(base + "/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".connection")).toHaveAttribute(
    "aria-label",
    "Atualizações em tempo real conectadas",
  );
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page.locator(".summary .total")).toContainText("1.206 ETH");
  await page
    .getByRole("link", { name: "Finalizar compra", exact: true })
    .click();
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("colecionador@kurio.test");
  await page.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByLabel("Nome de exibição").fill("Alex Colecionador");
  await page.getByLabel("Nome de usuário", { exact: true }).fill("alex");
  await page
    .getByLabel("Nome do perfil", { exact: true })
    .fill("Alex Colecionador");
  await page.getByLabel("Nome ENS", { exact: true }).fill("alex.kurio.eth");
  await page.getByLabel("Confirmo os dados").check();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Simular conexão", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toBeVisible();
  await page.evaluate(() =>
    fetch("/api/demo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "price" }),
    }),
  );
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Preço ou disponibilidade atualizado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("mudou");
  await expect(page.locator(".summary .total")).toContainText("1.306 ETH");
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  const receipt = page.url();
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto(base + "/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/");
  await expect(page.locator(".nft-card")).toHaveCount(9);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  const result = {
    base,
    status: "passed",
    checks: [
      "Figma Google/Facebook assets decoded on login and registration",
      "social notice Escape preserves authentication and restores focus",
      "public unauthenticated deep route",
      "real local assets",
      "Socket.IO mock connection",
      "guest cart and login return",
      "review rejects price update from Socket.IO",
      "confirmed simulated purchase",
      "receipt refresh",
      "purchased cart quantities removed",
      "mobile 390 without horizontal overflow",
    ],
    receipt,
    pageErrors: errors,
  };
  expect(errors).toEqual([]);
  await fs.mkdir("verification", { recursive: true });
  await fs.writeFile(
    "verification/deployment-smoke.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
