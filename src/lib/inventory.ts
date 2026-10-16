import type { NFT, CartItem } from "./contracts";
export function editionCapacity(edition: string) {
  const match = /^1\/(\d+)$/.exec(edition);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}
export function availableQuantity(
  nft: NFT,
  edition: string,
  otherLines: CartItem[] = [],
) {
  if (!nft.editions.includes(edition)) return 0;
  const allocated = otherLines
    .filter((i) => i.nftId === nft.id && i.edition !== edition)
    .reduce((sum, i) => sum + i.quantity, 0);
  return Math.max(
    0,
    Math.min(nft.stock - allocated, nft.editionStock[edition] ?? 0),
  );
}
