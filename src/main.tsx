import "./styles.css";
async function main() {
  const appPromise = import("./app");
  const mocksPromise =
    import.meta.env.VITE_ENABLE_MOCKS !== "false"
      ? import("./mocks/browser").then((m) => m.startMocks())
      : Promise.resolve();
  const [app] = await Promise.all([appPromise, mocksPromise]);
  app.render();
}
main().catch(() => {
  document.getElementById("root")!.textContent =
    "Não foi possível iniciar a demonstração. Recarregue a página em um contexto seguro (localhost ou HTTPS).";
});
