import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { Layout } from "./components/layout";
import { SessionProvider } from "./components/session";
import { Demo } from "./components/demo";
import { Home } from "./pages/home";
import { Detail } from "./pages/detail";
import { Cart } from "./pages/cart";
import { Checkout } from "./pages/checkout";
import { Order } from "./pages/order";
import { Auth } from "./pages/auth";
import { Profile, Wallets, Favorites, Orders } from "./pages/account";
import { Empty, ErrorState } from "./components/common";
import { get, queryClient, message } from "./lib/api";
import { isAxiosError } from "axios";
import type { Search, Session } from "./lib/contracts";
const root = createRootRoute({
  component: () => (
    <SessionProvider>
      <Layout />
      <Demo />
    </SessionProvider>
  ),
  notFoundComponent: () => <Empty title="Página não encontrada" />,
  errorComponent: ({ error, reset }) => (
    <ErrorState error={new Error(message(error))} retry={reset} />
  ),
});
const privateGuard = async ({ location }: { location: { href: string } }) => {
  try {
    const session = await get<Session>("/session");
    queryClient.setQueryData(
      ["session", localStorage.getItem("kurio.token")],
      session,
    );
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401)
      throw redirect({ to: "/login", search: { redirect: location.href } });
    throw error;
  }
};
const home = createRoute({
  getParentRoute: () => root,
  path: "/",
  component: Home,
  validateSearch: (s: Record<string, unknown>): Search => ({
    q: typeof s.q === "string" ? s.q : undefined,
    collections: typeof s.collections === "string" ? s.collections : undefined,
    networks: typeof s.networks === "string" ? s.networks : undefined,
    min:
      typeof s.min === "string" && /^\d+(\.\d{1,18})?$/.test(s.min)
        ? s.min
        : undefined,
    max:
      typeof s.max === "string" && /^\d+(\.\d{1,18})?$/.test(s.max)
        ? s.max
        : undefined,
    sort: typeof s.sort === "string" ? s.sort : undefined,
    tab: typeof s.tab === "string" ? s.tab : undefined,
    page: Math.max(1, Math.floor(Number(s.page) || 1)),
    demo: s.demo === "1" ? "1" : undefined,
  }),
});
const routes = [
  home,
  createRoute({
    getParentRoute: () => root,
    path: "/nft/$id",
    component: Detail,
  }),
  createRoute({ getParentRoute: () => root, path: "/cart", component: Cart }),
  ...["/login", "/register"].map((path) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component: Auth,
      validateSearch: (s: Record<string, unknown>) => ({
        redirect: typeof s.redirect === "string" ? s.redirect : undefined,
      }),
    }),
  ),
  createRoute({
    getParentRoute: () => root,
    path: "/checkout",
    component: Checkout,
    beforeLoad: privateGuard,
  }),
  createRoute({
    getParentRoute: () => root,
    path: "/order/$id",
    component: Order,
    beforeLoad: privateGuard,
  }),
  ...(
    [
      ["/profile", Profile],
      ["/wallets", Wallets],
      ["/favorites", Favorites],
      ["/orders", Orders],
    ] as const
  ).map(([path, component]) =>
    createRoute({
      getParentRoute: () => root,
      path,
      component,
      beforeLoad: privateGuard,
    }),
  ),
];
export const router = createRouter({
  routeTree: root.addChildren(routes),
  defaultPreload: "intent",
  defaultPendingComponent: () => <p role="status">Carregando…</p>,
});
