import { test, expect, type Page } from "@playwright/test";
const email = "colecionador@kurio.test",
  password = "Kurio123!";
async function scenario(page: Page, value: string) {
  await page.locator("#main").waitFor();
  await page.evaluate(async (value) => {
    await fetch("/api/demo/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: value }),
    });
  }, value);
}
async function event(page: Page, kind: string) {
  await page.evaluate(async (kind) => {
    await fetch("/api/demo/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
  }, kind);
}
async function login(page: Page, who = email) {
  await page.goto("/login");
  await page.getByRole("dialog", { name: "Entrar", exact: true }).waitFor();
  await page.getByLabel("E-mail", { exact: true }).fill(who);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}
async function add(page: Page) {
  await page.goto("/nft/emerald-ape-042");
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.locator(".summary .total")).toContainText("1.206 ETH");
}
async function checkout(page: Page) {
  await page.goto("/checkout");
  await page.getByLabel("Nome de exibição").fill("Alex Colecionador");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
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
  await expect(
    page.getByText("Conectada · MetaMask · Ethereum", { exact: true }),
  ).toBeVisible();
}
async function review(page: Page) {
  await page
    .getByRole("button", { name: "Revisar compra", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toBeVisible();
}
test("catálogo combina filtros, ordenação, busca e restaura histórico", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(9);
  await page.getByRole("button", { name: "Página 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  if (isMobile)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  await page
    .getByRole("checkbox", { name: "Fotografia (12)", exact: true })
    .check();
  await expect(page).toHaveURL(/collections=Fotografia/);
  await page
    .getByRole("checkbox", { name: "Polygon (78)", exact: true })
    .check();
  if (isMobile) {
    await page
      .getByRole("dialog", { name: "Filtrar NFTs" })
      .getByLabel("Ordenar resultados")
      .selectOption("price-asc");
    await page.getByRole("button", { name: "Ver resultados" }).click();
  }
  await expect(page).toHaveURL(/page=1/);
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(3);
  if (!isMobile) {
    await page.getByLabel("Ordenar NFTs").selectOption("price-asc");
    await expect(page).toHaveURL(/sort=price-asc/);
  }
  await page.reload();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(3);
  await page.goto("/?q=Emerald");
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(4);
  await page.goto("/?q=xxxxxxxx");
  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" }),
  ).toBeVisible();
  await page.goBack();
  await expect(page.locator(".nft-grid .nft-card")).toHaveCount(4);
});
test("detalhe direto, quantidade por edição e NFT inexistente", async ({
  page,
}) => {
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "1/1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Aumentar quantidade" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Ampliar arte" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/nft/inexistente");
  await expect(page.getByRole("alert")).toContainText("não foi encontrado");
});
test("cadastro valida confirmação e conflito de e-mail", async ({ page }) => {
  await page.goto("/register");
  await page
    .getByLabel("Nome de usuário", { exact: true })
    .fill("Novo Artista");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page
    .getByLabel("Confirmar senha", { exact: true })
    .fill("Diferente123!");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("não coincidem");
  await page.getByLabel("Confirmar senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Já existe");
  await page.getByLabel("E-mail", { exact: true }).fill("novo@kurio.test");
  await page.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page).not.toHaveURL(/register/);
  await page.goto("/profile");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Novo Artista");
});
test("sessão restaura, expira e isola troca de usuários", async ({ page }) => {
  await login(page);
  await page.goto("/profile");
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Alex Colecionador",
  );
  await page.evaluate(async () => {
    await fetch("/api/session/expire", { method: "POST" });
  });
  await page.goto("/wallets");
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/wallets/);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "artista@kurio.test");
  await page.goto("/profile");
  await expect(page.getByLabel("Nome de exibição")).toHaveValue("Nova Artista");
});
test("favorito otimista reverte falha e persiste sucesso", async ({ page }) => {
  await login(page);
  await page.goto("/nft/emerald-ape-042");
  await scenario(page, "favorite-error");
  const fav = page.getByRole("button", { name: "Favoritar", exact: true });
  await fav.click();
  await expect(
    page.getByRole("status").filter({ hasText: "seleção foi restaurada" }),
  ).toBeVisible();
  await expect(fav).toHaveAttribute("aria-pressed", "false");
  await scenario(page, "standard");
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await expect(fav).toBeEnabled();
  await page.reload();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  await page.goto("/favorites");
  await expect(page.locator(".nft-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "artista@kurio.test");
  await page.goto("/favorites");
  await expect(
    page.getByRole("heading", { name: "Você ainda não tem favoritos" }),
  ).toBeVisible();
});
test("carrinho preserva visitante, quantidade, cupom e login", async ({
  page,
}) => {
  await add(page);
  await page.getByRole("spinbutton").fill("2");
  await expect(page.locator(".summary .total")).toContainText("2.396 ETH");
  await page.getByLabel("Código do cupom").fill("ERRADO");
  await page
    .getByRole("button", { name: "Aplicar cupom", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Cupom inválido" }),
  ).toBeVisible();
  await page.getByLabel("Código do cupom").fill("EXPIRED");
  await page
    .getByRole("button", { name: "Aplicar cupom", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "expirou" }),
  ).toBeVisible();
  await page.getByLabel("Código do cupom").fill("KURIO10");
  await page
    .getByRole("button", { name: "Aplicar cupom", exact: true })
    .click();
  await expect(page.locator(".summary .total")).toContainText("2.158 ETH");
  await page.reload();
  await expect(page.getByRole("spinbutton")).toHaveValue("2");
  await page
    .getByRole("link", { name: "Finalizar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/checkout/);
  await expect(page.locator(".summary .total")).toContainText("2.158 ETH");
  await page.goto("/cart");
  await page.getByRole("button", { name: /Remover Emerald/ }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("compra completa gera recibo imutável e limpa itens comprados", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.locator(".receipt-body")).toContainText("1.206 ETH");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await event(page, "price");
  await expect(page.locator(".receipt-body")).toContainText("1.206 ETH");
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("pagamento recusado preserva carrinho", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await scenario(page, "declined");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado", exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});
test("timeout após criação recupera mesma tentativa e não duplica", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await scenario(page, "order-timeout");
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("tentativa está salva");
  await page
    .getByRole("dialog", { name: "Revise sua compra" })
    .getByRole("button", { name: "Fechar", exact: true })
    .click();
  await page.reload();
  await page
    .getByRole("button", { name: "Recuperar pedido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(page.locator(".order-list-item")).toHaveCount(1);
});
test("perfil, avatar, senha e carteiras validam e persistem", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.getByLabel("Nome de exibição").fill("Alex Atualizado");
  await page.getByLabel("Alterar avatar").setInputFiles({
    name: "avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Dados do perfil salvos" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Nome de exibição")).toHaveValue(
    "Alex Atualizado",
  );
  await expect(page.getByAltText("Seu avatar")).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("Errada123!");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NovaSenha123!");
  await page.getByRole("button", { name: "Salvar senha", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Senha atual incorreta");
  await page.getByLabel("Senha atual", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Salvar senha", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Senha alterada" }),
  ).toBeVisible();
  await page.goto("/wallets");
  const form = page.locator(".wallet-form").first();
  await form.getByLabel("Endereço da carteira ou ENS").fill("inválido");
  await form.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(page.getByRole("alert")).toContainText("endereço");
  await form.getByLabel("Endereço da carteira ou ENS").fill("alex.kurio.eth");
  await form.getByRole("button", { name: "Salvar carteira" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Carteira salva" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Endereço da carteira ou ENS").first(),
  ).toHaveValue("alex.kurio.eth");
});
test("Socket.IO altera cotação, ignora eventos antigos e reconcilia após desconexão", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await expect(page.locator(".connection")).toHaveAttribute(
    "aria-label",
    "Atualizações em tempo real conectadas",
  );
  await review(page);
  await event(page, "price");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Preço ou disponibilidade atualizado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("mudou");
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toHaveCount(0);
  await expect(page.locator(".summary .total")).toContainText("1.306 ETH");
  await event(page, "duplicate");
  await event(page, "old");
  await expect(page.locator(".summary .total")).toContainText("1.306 ETH");
  await event(page, "disconnect");
  await expect(page.locator(".connection")).toHaveAttribute(
    "aria-label",
    "Reconectando atualizações",
  );
  await expect(page.locator(".connection")).toHaveAttribute(
    "aria-label",
    "Atualizações em tempo real conectadas",
  );
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  await event(page, "disconnect");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("skeleton, falha de rede, retry e esgotamento", async ({ page }) => {
  await page.goto("/");
  await scenario(page, "slow");
  await page.goto("/nft/emerald-ape-042");
  await expect(page.getByRole("status", { name: "Carregando" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await scenario(page, "offline");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Não foi possível");
  await scenario(page, "standard");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await event(page, "stock");
  await expect(
    page.getByRole("button", { name: "ESGOTADO", exact: true }),
  ).toBeDisabled();
});
test("teclado, foco de diálogo e ausência de overflow", async ({
  page,
  isMobile,
}) => {
  await page.goto("/");
  await expect(page.locator(".nft-card")).toHaveCount(9);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Pular para conteúdo" }),
  ).toBeFocused();
  if (isMobile) {
    await page.getByRole("button", { name: "Abrir filtros" }).click();
    const dialog = page.getByRole("dialog", { name: "Filtrar NFTs" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Abrir filtros" }),
    ).toBeFocused();
  } else {
    await page.goto("/nft/emerald-ape-042");
    await page.getByRole("button", { name: "Ampliar arte" }).click();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("dialog")).toContainText("Emerald");
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Ampliar arte" }),
    ).toBeFocused();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});
test("regressão visual: início, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".nft-card")).toHaveCount(9);
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot("home.png", {
    fullPage: true,
    mask: [page.locator(".connection")],
  });
  await login(page);
  await page.goto("/nft/emerald-ape-042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveScreenshot("detail.png", {
    fullPage: true,
    mask: [page.locator(".notice"), page.locator(".connection")],
  });
  await add(page);
  await expect(page).toHaveScreenshot("cart.png", {
    fullPage: true,
    mask: [page.locator(".notice"), page.locator(".connection")],
  });
  await checkout(page);
  await expect(page).toHaveScreenshot("checkout.png", {
    fullPage: true,
    mask: [page.locator(".notice"), page.locator(".connection")],
  });
});

test("pedido pendente recupera após refresh com relógio controlado", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  await login(page);
  await add(page);
  await checkout(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  const url = page.url();
  await expect(
    page.getByRole("heading", { name: "Seu pedido está sendo processado" }),
  ).toBeVisible();
  await event(page, "disconnect");
  await page.reload();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", { name: "Seu pedido está sendo processado" }),
  ).toBeVisible();
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:05Z"));
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(page.locator(".order-list-item")).toHaveCount(1);
});
test("clique repetido cria um pedido e recibo permanece privado", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await review(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .dblclick();
  await expect(page).toHaveURL(/\/order\//);
  const receipt = page.url();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(page.locator(".order-list-item")).toHaveCount(1);
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "artista@kurio.test");
  await page.goto(receipt);
  await expect(page.getByRole("alert")).toContainText(
    "pertence a outro colecionador",
  );
});
test("tablet 768 mantém telas operáveis e sem overflow", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await login(page);
  await add(page);
  for (const route of [
    "/",
    "/nft/emerald-ape-042",
    "/cart",
    "/checkout",
    "/profile",
    "/wallets",
  ]) {
    await page.goto(route);
    await page.locator("#main").waitFor();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  }
});

test("login e cadastro preservam ícones do Figma e explicam o acesso social", async ({
  page,
}) => {
  for (const path of ["/login", "/register"]) {
    await page.goto(path);
    const social = page.locator(".social-auth");
    await expect(social).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await social.locator("img").evaluateAll(async (images) => {
      await Promise.all(
        images.map((image) => (image as HTMLImageElement).decode()),
      );
    });
    await expect(social).toHaveScreenshot(path.slice(1) + "-social.png");
    for (const provider of ["Google", "Facebook"]) {
      await page
        .getByRole("button", { name: "Continuar com " + provider })
        .click();
      const notice = page.getByRole("dialog", {
        name: "Acesso à demonstração",
      });
      await expect(notice).toContainText("Login social não está integrado");
      await page.keyboard.press("Escape");
      await expect(notice).not.toBeVisible();
      await expect(
        page.getByRole("button", { name: "Continuar com " + provider }),
      ).toBeFocused();
    }
  }
});
