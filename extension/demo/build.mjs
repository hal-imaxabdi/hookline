import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const result = await build({
  entryPoints: [resolve(here, "demo.ts")],
  bundle: true, minify: true, format: "iife", target: "es2020", write: false, legalComments: "none",
});
const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(resolve(here, "template.html"), "utf8").replace("/*__HOOKLINE_DEMO_JS__*/", () => js);
const outDir = resolve(here, "../../docs/demo");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "index.html"), html);
console.log(`Wrote docs/demo/index.html (${Math.round(html.length / 1024)} KB)`);
