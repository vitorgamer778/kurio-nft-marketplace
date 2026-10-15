import type { NFT, User, Wallet } from "../lib/contracts";
import { collections, networks } from "../lib/contracts";
const names = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Golden Frequency #071",
  "Golden Signal #160",
];
const images = [
  "8f387.webp",
  "83794.webp",
  "9add2.webp",
  "83794.webp",
  "83794.webp",
  "9add2.webp",
  "b7cfc.webp",
  "b7cfc.webp",
  "b7cfc.webp",
];
const prices = [
  "1.19",
  "1.69",
  "1.99",
  "1.29",
  "1.39",
  "1.79",
  "0.99",
  "0.59",
  "0.39",
];
export const initialNFTs: NFT[] = Array.from({ length: 36 }, (_, i) => ({
  id: i === 0 ? "emerald-ape-042" : "nft-" + (i + 1),
  name: names[i % 9] + (i > 8 ? " · " + (Math.floor(i / 9) + 1) : ""),
  image: "/assets/" + images[i % 9],
  price: prices[i % 9],
  previousPrice: i % 9 === 2 ? "2.29" : undefined,
  collection: i < 9 ? "Arte digital" : collections[(i - 9) % 9],
  network: i < 9 ? "Ethereum" : networks[i % 3],
  stock: i === 35 ? 0 : 20,
  version: 1,
  rarity: i % 3 === 0 ? "Raro" : "Comum",
  editions: ["1/1", "1/10", "1/50", "ABERTA"],
  created: 36 - i,
}));
export const initialUsers: User[] = [
  {
    id: "collector-1",
    email: "colecionador@kurio.test",
    name: "Alex Colecionador",
    username: "alex",
    ens: "alex.kurio.eth",
    nickname: "Principal",
    avatar: "",
  },
  {
    id: "collector-2",
    email: "artista@kurio.test",
    name: "Nova Artista",
    username: "nova",
    ens: "nova.kurio.eth",
    nickname: "Reserva",
    avatar: "",
  },
];
export const initialWallets: Wallet[] = [
  {
    id: "main",
    name: "Principal",
    address: "0xA91F00000000000000000000000000000000E82C",
    network: "Ethereum",
    provider: "MetaMask",
    primary: true,
  },
  {
    id: "reserve",
    name: "Reserva",
    address: "nova.kurio.eth",
    network: "Polygon",
    provider: "WalletConnect",
    primary: false,
  },
];
