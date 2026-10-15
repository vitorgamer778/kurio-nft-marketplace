import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
await fs.mkdir("public/assets", { recursive: true });
const manifest = {};
for (const file of await fs.readdir("design-reference")) {
  const code = await fs.readFile(path.join("design-reference", file), "utf8");
  const prefix = code.match(/const assetPathPrefix = "([^"]+)"/)?.[1];
  if (!prefix) continue;
  for (const m of code.matchAll(
    /const (img\w+) = `\$\{assetPathPrefix\}\/([^`]+)`;/g,
  )) {
    const name = m[2];
    manifest[file + ":" + m[1]] = "/assets/" + name;
    try {
      await fs.access("public/assets/" + name);
    } catch {
      execFileSync("curl.exe", [
        "-fsSL",
        prefix + "/" + name,
        "-o",
        "public/assets/" + name,
      ]);
    }
  }
}
await fs.writeFile(
  "design-reference/assets.json",
  JSON.stringify(manifest, null, 2),
);
console.log(Object.keys(manifest).length + " asset references downloaded");
