import type { NFT, User, Wallet, Cart, Order, Quote } from "../lib/contracts";
import { initialNFTs, initialUsers, initialWallets } from "./fixtures";
import { eth, wei } from "../lib/money";
export type Scenario =
  | "standard"
  | "slow"
  | "variable"
  | "offline"
  | "server-error"
  | "empty"
  | "expired"
  | "favorite-error"
  | "declined"
  | "order-timeout";
type Account = {
  user: User;
  salt: string;
  hash: string;
  favorites: string[];
  wallets: Wallet[];
  cart: Cart;
};
type Database = {
  nfts: NFT[];
  accounts: Account[];
  guest: Cart;
  session: { userId: string; token: string; expires: number } | null;
  orders: Order[];
  scenario: Scenario;
};
const key = "kurio.mock.v1";
const emptyCart = (): Cart => ({ items: [], coupon: "" });
const fresh = (): Database => ({
  nfts: structuredClone(initialNFTs),
  accounts: initialUsers.map((user) => ({
    user: structuredClone(user),
    salt: user.id,
    hash: "",
    favorites: [],
    wallets: structuredClone(initialWallets),
    cart: emptyCart(),
  })),
  guest: emptyCart(),
  session: null,
  orders: [],
  scenario: "standard",
});
function restore(): Database {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fresh();
  } catch {
    return fresh();
  }
}
export let db = restore();
export function save() {
  localStorage.setItem(key, JSON.stringify(db));
}
export async function digest(password: string, salt: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salt + ":" + password),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export async function initialize() {
  for (const a of db.accounts)
    if (!a.hash) a.hash = await digest("Kurio123!", a.salt);
  save();
}
export function reset() {
  db = fresh();
  return initialize();
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
  }
}
export function account(token?: string | null) {
  const s = db.session;
  if (
    !s ||
    s.expires < Date.now() ||
    token !== s.token ||
    db.scenario === "expired"
  )
    throw new ApiError(
      401,
      "Sua sessão expirou. Entre novamente para continuar.",
    );
  return db.accounts.find((a) => a.user.id === s.userId)!;
}
export function currentCart(token?: string | null) {
  return token ? account(token).cart : db.guest;
}
export function quote(cart: Cart): Quote {
  if (!cart.items.length)
    throw new ApiError(422, "Adicione um NFT ao carrinho.");
  if (cart.coupon && !["KURIO10"].includes(cart.coupon))
    throw new ApiError(
      422,
      cart.coupon === "EXPIRED"
        ? "Este cupom expirou."
        : "Cupom inválido. Experimente KURIO10.",
    );
  const items = cart.items.map((item) => {
    const n = db.nfts.find((n) => n.id === item.nftId);
    if (!n) throw new ApiError(404, "NFT não encontrado.");
    if (
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity >
        Math.min(
          n.stock,
          item.edition === "1/1" ? 1 : item.edition === "1/10" ? 10 : 50,
        ) ||
      cart.items
        .filter((i) => i.nftId === item.nftId)
        .reduce((sum, i) => sum + i.quantity, 0) > n.stock ||
      !n.editions.includes(item.edition)
    )
      throw new ApiError(
        409,
        "A edição de " + n.name + " não tem quantidade disponível.",
      );
    return {
      ...item,
      name: n.name,
      image: n.image,
      price: n.price,
      subtotal: eth(wei(n.price) * BigInt(item.quantity)),
      version: n.version,
    };
  });
  const subtotal = items.reduce((sum, i) => sum + wei(i.subtotal), 0n),
    discount = cart.coupon ? subtotal / 10n : 0n,
    fee = wei("0.016");
  const result = {
    items,
    subtotal: eth(subtotal),
    discount: eth(discount),
    fee: eth(fee),
    total: eth(subtotal - discount + fee),
    coupon: cart.coupon,
  };
  return { ...result, fingerprint: JSON.stringify(result) };
}
export function settleOrders() {
  const changed: Order[] = [];
  for (const order of db.orders) {
    if (order.status !== "pending" || Date.now() < order.settleAt) continue;
    const buyer = db.accounts.find((a) => a.user.id === order.userId)!;
    const available = order.quote.items.every((i) => {
      const n = db.nfts.find((n) => n.id === i.nftId);
      return n && n.stock >= i.quantity;
    });
    order.status = available ? order.outcome : "declined";
    order.version++;
    if (order.status === "confirmed") {
      for (const line of order.quote.items) {
        const nft = db.nfts.find((n) => n.id === line.nftId)!;
        nft.stock -= line.quantity;
        nft.version++;
        const item = buyer.cart.items.find(
          (i) => i.nftId === line.nftId && i.edition === line.edition,
        );
        if (item) item.quantity = Math.max(0, item.quantity - line.quantity);
      }
      buyer.cart.items = buyer.cart.items.filter((i) => i.quantity > 0);
      if (!buyer.cart.items.length) buyer.cart.coupon = "";
    }
    changed.push(order);
  }
  if (changed.length) save();
  return changed;
}
