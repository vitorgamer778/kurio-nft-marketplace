import sharp from "sharp";
import fs from "node:fs/promises";
for (const name of ["8f387", "83794", "9add2", "b7cfc"]) {
  await sharp("public/assets/" + name + ".png")
    .resize({ width: 900, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile("public/assets/" + name + ".webp");
  for(const width of [300,600])await sharp("public/assets/"+name+".png").resize({width}).webp({quality:90}).toFile("public/assets/"+name+"-"+width+".webp");
}
for (const dir of ["src/pages", "src/components", "src/mocks"]) {
  for (const file of await fs.readdir(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    const p = dir + "/" + file,
      text = await fs.readFile(p, "utf8");
    await fs.writeFile(
      p,
      text.replace(/(8f387|83794|9add2|b7cfc)\.png/g, "$1.webp"),
    );
  }
}
console.log("Figma artwork optimized to local WebP, originals retained.");
