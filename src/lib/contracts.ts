export type NFT = {
  id: string;
  name: string;
  image: string;
  price: string;
  previousPrice?: string;
  collection: string;
  network: string;
  stock: number;
  editionStock: Record<string, number>;
  version: number;
  rarity: string;
  editions: string[];
  created: number;
};
export type Search = {
  q?: string;
  collections?: string;
  networks?: string;
  min?: string;
  max?: string;
  sort?: string;
  page?: number;
  tab?: string;
  demo?: string;
};
export type User = {
  id: string;
  email: string;
  name: string;
  username: string;
  ens: string;
  nickname: string;
  avatar: string;
};
export type Wallet = {
  id: string;
  name: string;
  address: string;
  network: string;
  provider: string;
  primary: boolean;
};
export type CartItem = { nftId: string; edition: string; quantity: number };
export type Cart = { items: CartItem[]; coupon: string };
export type QuoteLine = CartItem & {
  name: string;
  image: string;
  price: string;
  subtotal: string;
  version: number;
};
export type Quote = {
  items: QuoteLine[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  fingerprint: string;
  coupon: string;
};
export type Order = {
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  wallet: Wallet;
  network: string;
  collector: {
    name: string;
    email: string;
    username?: string;
    profileName?: string;
    referral?: string;
    ens?: string;
    note?: string;
    secondary?: string;
  };
  created: number;
  settleAt: number;
  outcome: "confirmed" | "declined";
  version: number;
  transaction: string;
  key: string;
  payload: string;
};
export type Session = { user: User | null; expires: number };
export type ResourceEvent = {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
};
export const collections = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
export const networks = ["Ethereum", "Polygon", "Solana"];
