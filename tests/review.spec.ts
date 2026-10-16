import { test, expect, type Page } from "@playwright/test";
const email = "colecionador@kurio.test",
  password = "Kurio123!";
async function interactive(page: Page) {
  await page.locator(".connection").waitFor({ state: "attached" });
  await expect(page.locator("#root")).not.toHaveAttribute("inert");
  await expect(page.locator(".connection")).toHaveAttribute("aria-label", "Atualizações em tempo real conectadas");
}
async function ready(page: Page) {
  await page.goto("/");
  await interactive(page);
  await expect(page.locator("#catalog-panel .nft-card")).toHaveCount(9);
}
async function api(
  page: Page,
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  await interactive(page);
  return page.evaluate(
    async ({ path, method, body, headers }) => {
      const token = localStorage.getItem("kurio.token");
      const response = await fetch("/api" + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: "Bearer " + token } : {}),
          ...headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, data: await response.json() };
    },
    { path, method, body, headers },
  );
}
async function login(page: Page, who = email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(who);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/login/);
}
async function cart(page: Page, edition: string, quantity: number) {
  const result = await api(page, "/cart/items", "PUT", {
    nftId: "emerald-ape-042",
    edition,
    quantity,
  });
  expect(result.status).toBe(200);
  return result;
}
async function scenario(page: Page, scenario: string) {
  await api(page, "/demo/scenario", "POST", { scenario });
}
async function event(page: Page, kind: string) {
  await api(page, "/demo/event", "POST", { kind });
}
async function checkout(page: Page) {
  await login(page);
  await cart(page, "1/50", 1);
  await page.goto("/checkout");
  await page.getByLabel("Confirmo os dados").check();
  await page.getByRole("radio").first().check();
  await page
    .getByRole("button", { name: "Simular conexão", exact: true })
    .click();
  await expect(
    page.getByText("Conectada · MetaMask · Ethereum", { exact: true }),
  ).toBeVisible();
}
async function review(page: Page) {
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await page.getByRole("dialog", { name: "Revise sua compra" }).waitFor();
}
const collector = {
  name: "Audit",
  email,
  username: "audit",
  profileName: "Audit",
  referral: "KURIO",
  ens: "audit.eth",
};
async function order(page: Page, key: string) {
  const q = await api(page, "/quote", "POST");
  expect(q.status).toBe(200);
  const result = await api(
    page,
    "/orders",
    "POST",
    {
      fingerprint: q.data.fingerprint,
      walletId: "main",
      network: "Ethereum",
      collector,
    },
    { "Idempotency-Key": key },
  );
  expect(result.status).toBe(200);
  return result.data;
}

test("R01 conflito anterior à criação libera uma nova revisão", async ({
  page,
}) => {
  await checkout(page);
  await review(page);
  await scenario(page, "slow");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await page.waitForFunction(() =>
    Object.keys(sessionStorage).some((k) => k.startsWith("kurio.attempt.")),
  );
  await event(page, "price");
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toHaveCount(0);
  await expect(page.getByRole("alert")).toContainText(
    "Nenhum pedido foi criado",
  );
  expect((await api(page, "/orders")).data).toHaveLength(0);
  await scenario(page, "standard");
  await expect(
    page.getByRole("button", { name: "Revisar compra", exact: true }),
  ).toBeEnabled();
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  expect((await api(page, "/orders")).data).toHaveLength(1);
});

test("R02 liquidação agrega edições e nunca deixa estoque negativo", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  await login(page);
  await cart(page, "1/10", 8);
  await order(page, "first-demand");
  await cart(page, "1/50", 8);
  await order(page, "second-demand");
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:05Z"));
  const orders = (await api(page, "/orders")).data;
  expect(orders.map((o: { status: string }) => o.status)).toEqual([
    "confirmed",
    "declined",
  ]);
  const nft = (await api(page, "/nfts/emerald-ape-042")).data;
  expect(nft.stock).toBe(12);
  expect(nft.editionStock["1/10"]).toBe(2);
  await page.goto("/order/" + orders[1].id);
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado", exact: true }),
  ).toBeVisible();
});

test("R03 edição 1/1 esgota após confirmação e não pode ser revendida", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  await login(page);
  await cart(page, "1/1", 1);
  await order(page, "unique-edition");
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:05Z"));
  await api(page, "/orders");
  expect(
    (
      await api(page, "/cart/items", "PUT", {
        nftId: "emerald-ape-042",
        edition: "1/1",
        quantity: 1,
      })
    ).status,
  ).toBe(409);
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: "1/1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ESGOTADO", exact: true }),
  ).toBeDisabled();
  expect((await api(page, "/nfts/emerald-ape-042")).data.stock).toBe(19);
});

test("R04 duas edições esgotadas continuam removíveis", async ({ page }) => {
  await ready(page);
  await cart(page, "1/10", 1);
  await cart(page, "1/50", 1);
  await event(page, "stock");
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(2);
  await page
    .getByRole("button", { name: /Remover/ })
    .first()
    .click();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page
    .getByRole("button", { name: /Remover/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});

test("R05 login mescla carrinhos dentro dos limites da edição", async ({
  page,
}) => {
  await login(page);
  await cart(page, "1/1", 1);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/(\?page=1)?$/);
  await cart(page, "1/1", 1);
  await login(page);
  const merged = (await api(page, "/cart")).data;
  expect(merged.items).toEqual([
    { nftId: "emerald-ape-042", edition: "1/1", quantity: 1 },
  ]);
  expect((await api(page, "/quote", "POST")).status).toBe(200);
  await expect(
    page.getByRole("status").filter({ hasText: "ajustadas à disponibilidade" }),
  ).toBeVisible();
});

test("R06 perfil rejeita e-mail duplicado independentemente das maiúsculas", async ({
  page,
}) => {
  await login(page, "artista@kurio.test");
  await page.goto("/profile");
  await page
    .getByLabel("E-mail", { exact: true })
    .fill("COLECIONADOR@KURIO.TEST");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("já utilizado");
  expect((await api(page, "/profile")).data.email).toBe("artista@kurio.test");
  await page.reload();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
    "artista@kurio.test",
  );
});

test("R07 rascunho retorna após expiração sem restaurar conexão da carteira", async ({
  page,
}) => {
  await checkout(page);
  await page.getByLabel("Nome de exibição").fill("Rascunho de teste");
  await page
    .getByLabel("Observação do colecionador (opcional)")
    .fill("Minha observação");
  await api(page, "/session/expire", "POST");
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Rascunho de teste",
  );
  await expect(
    page.getByLabel("Observação do colecionador (opcional)"),
  ).toHaveValue("Minha observação");
  await expect(
    page.getByRole("button", { name: "Revisar compra", exact: true }),
  ).toBeDisabled();
});

test("R08 erro em favoritos apresenta feedback e permite recuperar", async ({
  page,
}) => {
  await login(page);
  await scenario(page, "slow");
  await page.goto("/favorites");
  await page
    .getByRole("heading", { name: "Lista de interesse", exact: true })
    .waitFor();
  await scenario(page, "server-error");
  await expect(page.getByRole("alert")).toContainText(
    "temporariamente indisponível",
  );
  await expect(
    page.getByRole("status", { name: "Carregando", exact: true }),
  ).toHaveCount(0);
  await scenario(page, "standard");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Você ainda não tem favoritos" }),
  ).toBeVisible();
});

test("R09 faixa de preço preserva URL direta, precisão, refresh e histórico", async ({
  page,
  isMobile,
}) => {
  await page.goto("/?min=100&max=101");
  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" }),
  ).toBeVisible();
  await page.goto("/?min=1.000000000000000001&max=2");
  if (isMobile)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  const filters = isMobile
    ? page.getByRole("dialog", { name: "Filtrar NFTs" })
    : page.locator(".catalog > aside .filters");
  const min = filters.getByLabel("Preço mínimo em ETH"),
    max = filters.getByLabel("Preço máximo em ETH");
  await expect(min).toHaveValue("1.000000000000000001");
  await min.fill("3");
  await max.fill("4");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await page.goBack();
  await expect(min).toHaveValue("1.000000000000000001");
  await expect(max).toHaveValue("2");
  await page.reload();
  if (isMobile)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  await expect(min).toHaveValue("1.000000000000000001");
});

test("R10 entrada documentada abre cenários e exibe o cenário ativo", async ({
  page,
}) => {
  await page.goto("/?demo=1");
  const toggle = page.getByRole("button", {
    name: "Cenários de teste",
    exact: true,
  });
  await toggle.click();
  await page.getByLabel("Cenário", { exact: true }).selectOption("slow");
  await expect
    .poll(async () => (await api(page, "/demo")).data.scenario)
    .toBe("slow");
  await page
    .getByRole("dialog", { name: "Cenários reproduzíveis" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await toggle.click();
  await expect(page.getByLabel("Cenário", { exact: true })).toHaveValue("slow");
  await page.getByLabel("Cenário", { exact: true }).selectOption("standard");
  await expect
    .poll(async () => (await api(page, "/demo")).data.scenario)
    .toBe("standard");
});

test("R11 carteira secundária participa do snapshot do pedido", async ({
  page,
}) => {
  await checkout(page);
  await page
    .getByLabel("ENS ou carteira secundária (opcional)")
    .fill("secundaria.audit.eth");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  expect((await api(page, "/orders")).data[0].collector.secondary).toBe(
    "secundaria.audit.eth",
  );
  await page.reload();
  expect((await api(page, "/orders")).data[0].collector.secondary).toBe(
    "secundaria.audit.eth",
  );
});

test("R12 conflito de formulário associa mensagem e foco ao campo", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  const field = page.getByLabel("E-mail", { exact: true });
  await field.fill("artista@kurio.test");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toBeFocused();
  const id = await field.getAttribute("aria-describedby");
  expect(id).toBeTruthy();
  await expect(page.locator(`[id="${id}"]`)).toContainText(
    "E-mail já utilizado",
  );
});

test("R13 abas suportam setas, Home, End e relações acessíveis", async ({
  page,
}) => {
  await page.goto("/nft/emerald-ape-042");
  await interactive(page);
  const first = page.getByRole("tab", { name: "Detalhes do NFT", exact: true });
  const last = page.getByRole("tab", {
    name: "Avaliações de colecionadores (19)",
    exact: true,
  });
  await first.focus();
  await page.keyboard.press("ArrowRight");
  await expect(last).toBeFocused();
  await expect(last).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#nft-info-panel")).toHaveAttribute(
    "aria-labelledby",
    "nft-info-reviews-tab",
  );
  await page.keyboard.press("Home");
  await expect(first).toBeFocused();
  await page.keyboard.press("End");
  await expect(last).toBeFocused();
  await ready(page);
  const all = page.getByRole("tab", { name: "Todos os NFTs", exact: true });
  await all.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Novos lançamentos", exact: true }),
  ).toBeFocused();
  await expect(page.locator("#catalog-panel")).toHaveAttribute(
    "aria-labelledby",
    "catalog-new-tab",
  );
});

test("R14 limite do carrinho usa disponibilidade da edição", async ({
  page,
}) => {
  await ready(page);
  await cart(page, "1/10", 1);
  await page.goto("/cart");
  await expect(page.getByRole("spinbutton")).toHaveAttribute("max", "10");
  await page.getByRole("spinbutton").fill("11");
  await expect(
    page.getByRole("status").filter({ hasText: "Quantidade indisponível" }),
  ).toBeVisible();
  expect((await api(page, "/cart")).data.items[0].quantity).toBe(1);
});

// R15 is checked by scripts/audit.mjs (12 real Lighthouse measurements).
test("R16 três destaques e páginas de relacionados são navegáveis", async ({
  page,
}) => {
  await ready(page);
  const hero = page.getByRole("region", { name: "Destaques", exact: true });
  for (const [index, phrase] of [
    "SEJA DONO",
    "ENCONTRE SUA",
    "COLECIONE ARTE",
  ].entries()) {
    const button = hero.getByRole("button", {
      name: "Destaque " + (index + 1),
      exact: true,
    });
    await button.click();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(hero.getByRole("heading")).toContainText(phrase);
    const cta = (await hero.getByRole("link", { name: "EXPLORAR" }).boundingBox())!;
    expect(cta.height).toBeGreaterThanOrEqual(24);
    for (const target of await hero.locator(".slide-controls button").all()) {
      const dot = (await target.boundingBox())!;
      expect(dot.width).toBeGreaterThanOrEqual(24);
      expect(dot.height).toBeGreaterThanOrEqual(24);
      const overlaps = cta.x < dot.x + dot.width && dot.x < cta.x + cta.width &&
        cta.y < dot.y + dot.height && dot.y < cta.y + cta.height;
      expect(overlaps).toBe(false);
    }
    await hero
      .locator(".hero-art")
      .evaluate((image: HTMLImageElement) => image.decode());
  }
  await page.goto("/nft/emerald-ape-042");
  const firstHref = await page
    .locator(".related-grid .art-wrap")
    .first()
    .getAttribute("href");
  await page
    .getByRole("button", { name: "Página da coleção 2", exact: true })
    .click();
  await expect(
    page.locator(".related-grid .art-wrap").first(),
  ).not.toHaveAttribute("href", firstHref!);
});

test("R17 contagens dos filtros correspondem às consultas REST", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  if (isMobile)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  const art = (await api(page, "/nfts?collections=Arte%20digital")).data.total;
  const ethereum = (await api(page, "/nfts?networks=Ethereum")).data.total;
  await expect(
    page.getByRole("checkbox", { name: `Arte digital (${art})`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: `Ethereum (${ethereum})`, exact: true }),
  ).toBeVisible();
});

test("R18 contrato e royalties aparecem sob os títulos corretos", async ({
  page,
}) => {
  await page.goto("/nft/emerald-ape-042");
  const contract = page.getByRole("heading", {
    name: "Contrato:",
    exact: true,
  });
  const royalties = page.getByRole("heading", {
    name: "Direitos autorais:",
    exact: true,
  });
  await expect(contract.locator("+ p")).toContainText("0x742");
  await expect(royalties.locator("+ p")).toContainText("5%");
});

test("zoom de 200% mantém navegação, formulário e conteúdo utilizáveis", async ({
  page,
  isMobile,
}) => {
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  const viewport = page.viewportSize()!;
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: isMobile ? viewport.width : Math.floor(viewport.width / 2),
    height: isMobile ? viewport.height : Math.floor(viewport.height / 2),
    deviceScaleFactor: 2,
    mobile: isMobile,
  });
  for (const path of ["/", "/nft/emerald-ape-042", "/login"]) {
    await page.goto(path);
    await interactive(page);
    if (path === "/login")
      await page.getByRole("dialog", { name: "Entrar", exact: true }).waitFor();
    else await page.locator("#main").waitFor();
    // Desktop: layout viewport and DPR equivalent to 200% browser zoom.
    // Mobile: 2x visual/pinch zoom keeps the layout viewport unchanged.
    if (isMobile)
      await cdp.send("Emulation.setPageScaleFactor", { pageScaleFactor: 2 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth <=
          document.documentElement.clientWidth + 1,
      ),
    ).toBeTruthy();
    if (path === "/login") {
      await page.getByLabel("E-mail", { exact: true }).fill(email);
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page
        .getByRole("button", { name: "Entrar", exact: true })
        .press("Enter");
      await expect(page).not.toHaveURL(/login/);
    }
  }
});
