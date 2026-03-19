import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "web", "dist");
const serverStaticDir = path.join(rootDir, "server", "static");

const html = await readFile(path.join(distDir, "index.html"), "utf8");
const cssMatches = [...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g)];
const jsMatches = [...html.matchAll(/<script type="module" crossorigin src="([^"]+)"><\/script>/g)];

const cssBlocks = await Promise.all(
  cssMatches.map(async ([, href]) => {
    const cssPath = path.join(distDir, href.replace(/^\//, ""));
    return await readFile(cssPath, "utf8");
  }),
);

const jsBlocks = await Promise.all(
  jsMatches.map(async ([, href]) => {
    const jsPath = path.join(distDir, href.replace(/^\//, ""));
    return await readFile(jsPath, "utf8");
  }),
);

let inlined = html
  .replace(/<link rel="stylesheet" crossorigin href="[^"]+">/g, "")
  .replace(/<script type="module" crossorigin src="[^"]+"><\/script>/g, "");

inlined = inlined.replace(
  "</head>",
  `${cssBlocks.map((block) => `<style>${block}</style>`).join("")}</head>`,
);

inlined = inlined.replace(
  "</body>",
  `${jsBlocks.map((block) => `<script type="module">${block}</script>`).join("")}</body>`,
);

await mkdir(serverStaticDir, { recursive: true });
await writeFile(path.join(serverStaticDir, "widget.html"), inlined, "utf8");
