import "./styles.css";
async function main() {
  const appPromise = import("./app");
  // Deep links can download their route alongside MSW instead of waiting for
  // the router to mount. Importing a component does not mount it or call APIs.
  const path = window.location.pathname;
  const routePromise = path.startsWith("/nft/")
    ? import("./pages/detail")
    : path === "/login" || path === "/register"
      ? import("./pages/auth")
      : path === "/cart"
        ? import("./pages/cart")
        : path === "/checkout"
          ? import("./pages/checkout")
          : path.startsWith("/order/")
            ? import("./pages/order")
            : ["/profile", "/wallets", "/favorites", "/orders"].includes(path)
              ? import("./pages/account")
              : Promise.resolve();
  const mocksPromise =
    import.meta.env.VITE_ENABLE_MOCKS !== "false"
      ? import("./mocks/browser").then((m) => m.startMocks())
      : Promise.resolve();
  const [app] = await Promise.all([appPromise, mocksPromise, routePromise]);
  app.render();
}
main().catch(() => {
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Recarregue a página em um contexto seguro (localhost ou HTTPS).";
});
