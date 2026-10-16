import React from "react";
import { renderToString } from "react-dom/server";
import { QueryClientProvider, dehydrate } from "@tanstack/react-query";
import { RouterProvider, createMemoryHistory } from "@tanstack/react-router";
import { router } from "./router";
import { queryClient } from "./lib/api";
import { initialNFTs } from "./mocks/fixtures";

// Build-time public snapshots use the same fixtures/contracts as MSW. No
// sessions, account details, carts or orders are embedded in these documents.
const catalogue = {
  items: initialNFTs.slice(0, 9),
  total: initialNFTs.length,
  pages: 4,
  page: 1,
  facets: {
    collections: Object.fromEntries(
      [...new Set(initialNFTs.map((n) => n.collection))].map((name) => [
        name,
        initialNFTs.filter((n) => n.collection === name).length,
      ]),
    ),
    networks: Object.fromEntries(
      [...new Set(initialNFTs.map((n) => n.network))].map((name) => [
        name,
        initialNFTs.filter((n) => n.network === name).length,
      ]),
    ),
  },
};
export const publicPaths = ["/", ...initialNFTs.map((n) => "/nft/" + n.id)];
export async function prerender(path: string) {
  queryClient.clear();
  if (path === "/") queryClient.setQueryData(["nfts", "page=1"], catalogue);
  else {
    const nft = initialNFTs.find((n) => "/nft/" + n.id === path)!;
    queryClient.setQueryData(["nft", nft.id], nft);
    queryClient.setQueryData(["nfts", "related", 0], catalogue);
  }
  router.update({
    history: createMemoryHistory({
      initialEntries: [path === "/" ? "/?page=1" : path],
    }),
  });
  await router.load();
  const html = renderToString(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
  return { path, html, state: dehydrate(queryClient) };
}
