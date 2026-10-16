import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build, loadEnv } from "vite";

if (
  loadEnv("production", process.cwd(), "VITE_").VITE_ENABLE_MOCKS === "false"
) {
  await fs.copyFile("dist/index.html", "dist/spa.html");
  console.log("Prerender disabled for the real-backend build.");
  process.exit(0);
}

const result = await build({
  build: {
    ssr: "src/prerender.tsx",
    outDir: ".prerender",
    copyPublicDir: false,
  },
});
const entry = result.output.find(
  (item) => item.type === "chunk" && item.isEntry,
).fileName;
const storage = {
  getItem: () => null,
  setItem() {},
  removeItem() {},
  clear() {},
};
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
  configurable: true,
});
Object.defineProperty(globalThis, "sessionStorage", {
  value: storage,
  configurable: true,
});
Object.defineProperty(globalThis, "location", {
  value: { search: "" },
  configurable: true,
});
const { prerender, publicPaths } = await import(
  pathToFileURL(path.resolve(".prerender", entry)).href
);
const template = await fs.readFile("dist/index.html", "utf8");
// Unknown resources, private screens and filtered URLs retain the full SPA.
await fs.writeFile("dist/spa.html", template);
for (const url of publicPaths) {
  const rendered = await prerender(url);
  if (!rendered.html.includes('id="main"'))
    throw new Error(
      "Prerender failed: " + url + " " + rendered.html.slice(0, 2000),
    );
  const state = JSON.stringify({
    path: rendered.path,
    state: rendered.state,
  }).replaceAll("<", "\\u003c");
  const guard = `<style>html[data-client-only] #root{visibility:hidden}</style><script>try{const p=new URLSearchParams(location.search),s=localStorage.getItem("kurio.scenario");if(location.pathname!==${JSON.stringify(url)}||[...p].some(([k,v])=>k!=="page"||v!=="1")||localStorage.getItem("kurio.token")||(s&&s!=="standard"))document.documentElement.setAttribute("data-client-only","")}catch{document.documentElement.setAttribute("data-client-only","")}</script>`;
  const html = template
    .replace("</head>", guard + "</head>")
    .replace(
      '<div id="root"></div>',
      `<div id="root" inert aria-busy="true">${rendered.html}</div><script id="kurio-prefetch" type="application/json">${state}</script>`,
    );
  const target =
    url === "/" ? "dist/index.html" : path.join("dist", url.slice(1) + ".html");
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, html);
}
console.log(
  `Prerendered ${publicPaths.length} public pages from the shared mock fixtures.`,
);
