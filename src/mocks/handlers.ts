import { http, HttpResponse, delay, ws } from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  db,
  save,
  reset,
  account,
  currentCart,
  quote,
  digest,
  ApiError,
  settleOrders,
} from "./db";
import type { Scenario } from "./db";
import type { CartItem, Order, Wallet } from "../lib/contracts";
import { wei, eth } from "../lib/money";
const stream = ws.link("wss://kurio.mock/");
type Peer = {
  emit: (event: string, payload: unknown) => void;
  userId?: string;
};
const peers = new Set<Peer>();
function publish(name: string, payload: unknown, userId?: string) {
  for (const p of peers)
    if (!userId || p.userId === userId) p.emit(name, payload);
}
export function tick() {
  for (const order of settleOrders()) {
    publish(
      "order.updated",
      {
        id: order.id + ":" + order.version,
        resourceId: order.id,
        version: order.version,
        userId: order.userId,
      },
      order.userId,
    );
    if (order.status === "confirmed")
      for (const item of order.quote.items) {
        const n = db.nfts.find((n) => n.id === item.nftId)!;
        publish("nft.updated", {
          id: n.id + ":" + n.version,
          resourceId: n.id,
          version: n.version,
        });
      }
  }
}
const token = (request: Request) =>
  request.headers.get("Authorization")?.replace("Bearer ", "");
type Context = {
  request: Request;
  params: Record<string, string | readonly string[] | undefined>;
};
function endpoint(fn: (context: Context) => unknown | Promise<unknown>) {
  return async (context: Context) => {
    try {
      const url = new URL(context.request.url),
        control = url.pathname.startsWith("/api/demo");
      if (!control) {
        await delay(
          db.scenario === "slow"
            ? 1800
            : db.scenario === "variable"
              ? url.searchParams.get("q")?.length === 1
                ? 900
                : 120
              : 80,
        );
        if (db.scenario === "offline") return HttpResponse.error();
        if (db.scenario === "server-error")
          throw new ApiError(
            503,
            "Serviço temporariamente indisponível. Tente novamente.",
          );
      }
      tick();
      const data = await fn(context);
      return data instanceof Response
        ? data
        : HttpResponse.json(data ?? { ok: true });
    } catch (error) {
      if (error instanceof ApiError)
        return HttpResponse.json(
          { message: error.message, fields: error.fields },
          { status: error.status },
        );
      return HttpResponse.json(
        { message: "Falha inesperada na simulação." },
        { status: 500 },
      );
    }
  };
}
const body = async <T>(request: Request): Promise<T> =>
  request.json() as Promise<T>;
const handlers = [
  http.get(
    "/api/session",
    endpoint(({ request }) => {
      const a = account(token(request));
      return { user: a.user, expires: db.session!.expires };
    }),
  ),
  http.post(
    "/api/session/login",
    endpoint(async ({ request }) => {
      const { email, password } = await body<{
        email: string;
        password: string;
      }>(request);
      const a = db.accounts.find(
        (a) => a.user.email.toLowerCase() === email.toLowerCase(),
      );
      if (!a || (await digest(password, a.salt)) !== a.hash)
        throw new ApiError(422, "E-mail ou senha incorretos.");
      const combined = [...a.cart.items];
      for (const item of db.guest.items) {
        const old = combined.find(
          (i) => i.nftId === item.nftId && i.edition === item.edition,
        );
        const stock = db.nfts.find((n) => n.id === item.nftId)?.stock ?? 0;
        if (old) old.quantity = Math.min(stock, old.quantity + item.quantity);
        else
          combined.push({ ...item, quantity: Math.min(stock, item.quantity) });
      }
      a.cart.items = combined.filter((i) => i.quantity > 0);
      a.cart.coupon = a.cart.coupon || db.guest.coupon;
      db.guest = { items: [], coupon: "" };
      db.session = {
        userId: a.user.id,
        token: crypto.randomUUID(),
        expires: Date.now() + 30 * 60 * 1000,
      };
      save();
      return {
        user: a.user,
        token: db.session.token,
        expires: db.session.expires,
      };
    }),
  ),
  http.post(
    "/api/session/register",
    endpoint(async ({ request }) => {
      const { name, email, password } = await body<{
        name: string;
        email: string;
        password: string;
      }>(request);
      if (
        !name?.trim() ||
        !/^\S+@\S+\.\S+$/.test(email) ||
        password?.length < 8
      )
        throw new ApiError(
          422,
          "Preencha nome, e-mail e senha com pelo menos 8 caracteres.",
        );
      if (
        db.accounts.some(
          (a) => a.user.email.toLowerCase() === email.toLowerCase(),
        )
      )
        throw new ApiError(409, "Já existe uma conta com este e-mail.");
      const id = crypto.randomUUID(),
        salt = crypto.randomUUID();
      db.accounts.push({
        user: {
          id,
          email,
          name,
          username: email.split("@")[0],
          ens: "",
          nickname: "",
          avatar: "",
        },
        salt,
        hash: await digest(password, salt),
        favorites: [],
        wallets: [],
        cart: { items: [], coupon: "" },
      });
      save();
      return { ok: true };
    }),
  ),
  http.post(
    "/api/session/logout",
    endpoint(() => {
      db.session = null;
      save();
      return { ok: true };
    }),
  ),
  http.post(
    "/api/session/expire",
    endpoint(() => {
      if (db.session) db.session.expires = 0;
      save();
      return { ok: true };
    }),
  ),
  http.get(
    "/api/nfts",
    endpoint(({ request }) => {
      const p = new URL(request.url).searchParams;
      let list =
        db.scenario === "empty"
          ? []
          : db.nfts.filter(
              (n) =>
                (!p.get("q") ||
                  n.name.toLowerCase().includes(p.get("q")!.toLowerCase())) &&
                (!p.get("collections") ||
                  p.get("collections")!.split(",").includes(n.collection)) &&
                (!p.get("networks") ||
                  p.get("networks")!.split(",").includes(n.network)) &&
                (!p.get("min") || wei(n.price) >= wei(p.get("min")!)) &&
                (!p.get("max") || wei(n.price) <= wei(p.get("max")!)) &&
                (p.get("tab") !== "new" || n.created > 20) &&
                (p.get("tab") !== "trending" || n.rarity === "Raro"),
            );
      const sort = p.get("sort");
      list = [...list].sort((a, b) =>
        sort === "price-asc"
          ? wei(a.price) < wei(b.price)
            ? -1
            : 1
          : sort === "price-desc"
            ? wei(a.price) > wei(b.price)
              ? -1
              : 1
            : b.created - a.created,
      );
      const page = Math.max(1, Number(p.get("page")) || 1);
      return {
        items: list.slice((page - 1) * 9, page * 9),
        total: list.length,
        pages: Math.ceil(list.length / 9),
        page,
      };
    }),
  ),
  http.get(
    "/api/nfts/:id",
    endpoint(({ params }) => {
      const n = db.nfts.find((n) => n.id === params.id);
      if (!n) throw new ApiError(404, "Este NFT não foi encontrado.");
      return n;
    }),
  ),
  http.get(
    "/api/favorites",
    endpoint(({ request }) => account(token(request)).favorites),
  ),
  http.put(
    "/api/favorites/:id",
    endpoint(async ({ request, params }) => {
      const a = account(token(request));
      if (db.scenario === "favorite-error")
        throw new ApiError(
          503,
          "Não foi possível salvar o favorito. Sua seleção foi restaurada.",
        );
      if (!db.nfts.some((n) => n.id === params.id))
        throw new ApiError(404, "NFT não encontrado.");
      const { active } = await body<{ active: boolean }>(request);
      a.favorites = active
        ? [...new Set([...a.favorites, String(params.id)])]
        : a.favorites.filter((id) => id !== params.id);
      save();
      return a.favorites;
    }),
  ),
  http.get(
    "/api/cart",
    endpoint(({ request }) => currentCart(token(request))),
  ),
  http.put(
    "/api/cart/items",
    endpoint(async ({ request }) => {
      const cart = currentCart(token(request)),
        item = await body<CartItem>(request),
        n = db.nfts.find((n) => n.id === item.nftId);
      if (!n) throw new ApiError(404, "NFT não encontrado.");
      if (
        !Number.isInteger(item.quantity) ||
        item.quantity < 0 ||
        item.quantity >
          Math.min(
            n.stock,
            item.edition === "1/1" ? 1 : item.edition === "1/10" ? 10 : 50,
          ) ||
        item.quantity +
          cart.items
            .filter((i) => i.nftId === item.nftId && i.edition !== item.edition)
            .reduce((sum, i) => sum + i.quantity, 0) >
          n.stock ||
        !n.editions.includes(item.edition)
      )
        throw new ApiError(409, "Quantidade indisponível para esta edição.");
      cart.items = cart.items.filter(
        (i) => !(i.nftId === item.nftId && i.edition === item.edition),
      );
      if (item.quantity) cart.items.push(item);
      save();
      return cart;
    }),
  ),
  http.put(
    "/api/cart/coupon",
    endpoint(async ({ request }) => {
      const cart = currentCart(token(request)),
        { coupon } = await body<{ coupon: string }>(request);
      const next = { ...cart, coupon: coupon.trim().toUpperCase() };
      quote(next);
      cart.coupon = next.coupon;
      save();
      return cart;
    }),
  ),
  http.post(
    "/api/quote",
    endpoint(({ request }) => quote(currentCart(token(request)))),
  ),
  http.post(
    "/api/orders",
    endpoint(async ({ request }) => {
      const a = account(token(request)),
        input = await body<{
          fingerprint: string;
          walletId: string;
          network: string;
          collector: Order["collector"];
        }>(request),
        key = request.headers.get("Idempotency-Key");
      if (!key) throw new ApiError(422, "Chave de idempotência obrigatória.");
      const payload = JSON.stringify(input),
        existing = db.orders.find(
          (o) => o.userId === a.user.id && o.key === key,
        );
      if (existing) {
        if (existing.payload !== payload)
          throw new ApiError(
            409,
            "A tentativa já existe com dados diferentes.",
          );
        return existing;
      }
      const q = quote(a.cart);
      if (q.fingerprint !== input.fingerprint)
        throw new ApiError(
          409,
          "Os valores mudaram. Revise a nova cotação antes de confirmar.",
        );
      const wallet = a.wallets.find((w) => w.id === input.walletId);
      if (!wallet || wallet.network !== input.network)
        throw new ApiError(422, "Selecione uma carteira e rede compatíveis.");
      if (
        !input.collector.name.trim() ||
        !input.collector.username?.trim() ||
        !input.collector.profileName?.trim() ||
        !input.collector.referral?.trim() ||
        !input.collector.ens?.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.collector.email)
      )
        throw new ApiError(422, "Revise os dados do colecionador.");
      const id = crypto.randomUUID(),
        order: Order = {
          id,
          userId: a.user.id,
          status: "pending",
          quote: structuredClone(q),
          wallet: structuredClone(wallet),
          network: input.network,
          collector: input.collector,
          created: Date.now(),
          settleAt: Date.now() + 1700,
          outcome: db.scenario === "declined" ? "declined" : "confirmed",
          version: 1,
          transaction:
            "0x" +
            crypto.randomUUID().replaceAll("-", "") +
            crypto.randomUUID().replaceAll("-", ""),
          key,
          payload,
        };
      db.orders.push(order);
      save();
      publish(
        "order.updated",
        { id: id + ":1", resourceId: id, version: 1, userId: a.user.id },
        a.user.id,
      );
      if (db.scenario === "order-timeout") {
        await delay(1200);
        return HttpResponse.error();
      }
      return order;
    }),
  ),
  http.get(
    "/api/orders",
    endpoint(({ request }) => {
      const a = account(token(request));
      return db.orders.filter((o) => o.userId === a.user.id);
    }),
  ),
  http.get(
    "/api/orders/:id",
    endpoint(({ request, params }) => {
      const a = account(token(request)),
        o = db.orders.find((o) => o.id === params.id);
      if (!o) throw new ApiError(404, "Pedido não encontrado.");
      if (o.userId !== a.user.id)
        throw new ApiError(403, "Este pedido pertence a outro colecionador.");
      return o;
    }),
  ),
  http.get(
    "/api/profile",
    endpoint(({ request }) => account(token(request)).user),
  ),
  http.patch(
    "/api/profile",
    endpoint(async ({ request }) => {
      const a = account(token(request)),
        input = await body<Partial<typeof a.user>>(request);
      if (
        !input.name?.trim() ||
        !input.username?.trim() ||
        !/^\S+@\S+\.\S+$/.test(input.email || "")
      )
        throw new ApiError(422, "Revise nome, usuário e e-mail.");
      if (
        db.accounts.some(
          (b) =>
            b !== a &&
            (b.user.email === input.email ||
              b.user.username === input.username),
        )
      )
        throw new ApiError(409, "E-mail ou nome de usuário já utilizado.");
      if (
        input.avatar &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(input.avatar)
      )
        throw new ApiError(422, "Use uma imagem PNG, JPEG ou WebP.");
      a.user = {
        ...a.user,
        name: input.name,
        username: input.username,
        email: input.email!,
        ens: input.ens || "",
        nickname: input.nickname || "",
        avatar: input.avatar || "",
      };
      save();
      return a.user;
    }),
  ),
  http.put(
    "/api/profile/password",
    endpoint(async ({ request }) => {
      const a = account(token(request)),
        { current, password } = await body<{
          current: string;
          password: string;
        }>(request);
      if ((await digest(current, a.salt)) !== a.hash)
        throw new ApiError(422, "Senha atual incorreta.");
      if (password.length < 8)
        throw new ApiError(
          422,
          "A nova senha deve ter pelo menos 8 caracteres.",
        );
      a.salt = crypto.randomUUID();
      a.hash = await digest(password, a.salt);
      save();
      return { ok: true };
    }),
  ),
  http.post(
    "/api/wallets/connect",
    endpoint(async ({ request }) => {
      const a = account(token(request)),
        input = await body<{
          walletId: string;
          network: string;
          refuse: boolean;
        }>(request),
        wallet = a.wallets.find((w) => w.id === input.walletId);
      if (!wallet || wallet.network !== input.network)
        throw new ApiError(
          422,
          "A rede selecionada não corresponde à carteira.",
        );
      return { connected: !input.refuse };
    }),
  ),
  http.get(
    "/api/wallets",
    endpoint(({ request }) => account(token(request)).wallets),
  ),
  http.put(
    "/api/wallets/:id",
    endpoint(async ({ request, params }) => {
      const a = account(token(request)),
        input = await body<Wallet>(request);
      if (
        !input.name?.trim() ||
        !input.address ||
        !["Ethereum", "Polygon", "Solana"].includes(input.network) ||
        !["MetaMask", "WalletConnect", "Coinbase Wallet"].includes(
          input.provider,
        ) ||
        (!/^0x[0-9a-fA-F]{40}$/.test(input.address) &&
          !/^[-a-z0-9.]+\.eth$/.test(input.address))
      )
        throw new ApiError(
          422,
          "Informe nome, rede, provedor e endereço 0x válido ou ENS.",
        );
      const w = { ...input, id: String(params.id) };
      if (!a.wallets.length) w.primary = true;
      if (w.primary) a.wallets.forEach((w) => (w.primary = false));
      const index = a.wallets.findIndex((old) => old.id === w.id);
      if (index >= 0) a.wallets[index] = w;
      else a.wallets.push(w);
      if (!a.wallets.some((w) => w.primary)) a.wallets[0].primary = true;
      save();
      return a.wallets;
    }),
  ),
  http.post(
    "/api/demo/reset",
    endpoint(async () => {
      await reset();
      return { ok: true };
    }),
  ),
  http.get(
    "/api/demo",
    endpoint(() => ({ scenario: db.scenario })),
  ),
  http.post(
    "/api/demo/scenario",
    endpoint(async ({ request }) => {
      const { scenario } = await body<{ scenario: Scenario }>(request);
      db.scenario = scenario;
      save();
      return { ok: true };
    }),
  ),
  http.post(
    "/api/demo/event",
    endpoint(async ({ request }) => {
      const { kind } = await body<{ kind: string }>(request);
      if (kind === "disconnect") {
        for (const peer of [...peers]) peer.emit("demo.disconnect", {});
        return { ok: true };
      }
      const n = db.nfts[0];
      if (kind === "stock") n.stock = 0;
      else if (!["duplicate", "old"].includes(kind))
        n.price = eth(wei(n.price) + wei("0.1"));
      if (!["duplicate", "old"].includes(kind)) n.version++;
      save();
      const event = {
        id: n.id + ":" + (kind === "old" ? n.version - 1 : n.version),
        resourceId: n.id,
        version: kind === "old" ? n.version - 1 : n.version,
      };
      publish("nft.updated", event);
      if (kind === "duplicate") publish("nft.updated", event);
      return { ok: true };
    }),
  ),
  stream.addEventListener("connection", (connection) => {
    const io = toSocketIo(connection),
      peer: Peer = { emit: (name, payload) => io.client.emit(name, payload) };
    peers.add(peer);
    const heartbeat = setInterval(() => {
      connection.client.send("2");
    }, 20000);
    connection.client.addEventListener("close", () => clearInterval(heartbeat));
    io.client.on("subscribe", (_event, payload: { token: string }) => {
      try {
        peer.userId = account(payload.token).user.id;
      } catch {
        peer.userId = undefined;
      }
    });
    connection.client.addEventListener("close", () => peers.delete(peer));
  }),
];
export { handlers };
