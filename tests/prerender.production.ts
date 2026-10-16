import { test, expect } from "@playwright/test";

test("HTML público contém conteúdo e cache públicos por rota", async ({
  request,
}) => {
  for (const path of [
    "/",
    "/nft/emerald-ape-042",
    "/nft/nft-18",
    "/nft/nft-36",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain('id="main"');
    const match = html.match(
      /<script id="kurio-prefetch" type="application\/json">(.*?)<\/script>/,
    );
    expect(match).toBeTruthy();
    const snapshot = JSON.parse(match![1]);
    expect(snapshot.path).toBe(path);
    expect(
      snapshot.state.queries.every((q: { queryKey: string[] }) =>
        ["nft", "nfts"].includes(q.queryKey[0]),
      ),
    ).toBeTruthy();
    expect(html).not.toContain("Kurio123!");
    expect(html).not.toContain("colecionador@kurio.test");
  }
});

test("hidratação ativa controles e preserva atualizações REST e Socket.IO", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (entry) => {
    if (entry.type() === "error") errors.push(entry.text());
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Destaque 2", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "ENCONTRE SUA",
  );
  await page.goto("/nft/emerald-ape-042");
  await expect(page.locator(".connection")).toHaveAttribute(
    "aria-label",
    "Atualizações em tempo real conectadas",
  );
  await page.evaluate(() =>
    fetch("/api/demo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "price" }),
    }),
  );
  await expect(page.locator(".detail-info .detail-price")).toContainText(
    "1.29",
  );
  await page.reload();
  await expect(page.locator(".detail-info .detail-price")).toContainText(
    "1.29",
  );
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  expect(errors).toEqual([]);
});

test("cenário lento preserva skeleton e falha não é mascarada pelo HTML estático", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  await page
    .getByRole("button", { name: "Cenários de teste", exact: true })
    .click();
  await page.getByLabel("Cenário", { exact: true }).selectOption("slow");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("kurio.scenario")))
    .toBe("slow");
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("status", { name: "Carregando", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    fetch("/api/demo/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "server-error" }),
    }),
  );
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
});
