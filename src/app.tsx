import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import { QueryClientProvider, hydrate } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { queryClient } from "./lib/api";
import { router } from "./router";
export async function render() {
  const root = document.getElementById("root")!;
  const snapshotElement = document.getElementById("kurio-prefetch");
  const snapshot = snapshotElement
    ? JSON.parse(snapshotElement.textContent || "null")
    : null;
  const params = new URLSearchParams(location.search);
  const standardSearch = [...params].every(
    ([key, value]) => key === "page" && value === "1",
  );
  const scenario = localStorage.getItem("kurio.scenario");
  const canHydrate =
    snapshot?.path === location.pathname &&
    standardSearch &&
    !localStorage.getItem("kurio.token") &&
    (!scenario || scenario === "standard") &&
    import.meta.env.VITE_ENABLE_MOCKS !== "false";
  if (canHydrate) {
    hydrate(queryClient, snapshot.state);
    router.ssr = { manifest: undefined };
  }
  await router.load();
  const app = (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>
  );
  if (canHydrate) hydrateRoot(root, app);
  else createRoot(root).render(app);
  root.removeAttribute("inert");
  root.removeAttribute("aria-busy");
  document.documentElement.removeAttribute("data-client-only");
}
