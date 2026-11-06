import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { HOOKLINE_VERSION } from "../../src/shared/version";
import { rulesetFingerprint } from "../../src/shared/ruleRegistry";

export const EVAL_DIR = path.resolve(__dirname, "..");
export const EXT_DIR = path.resolve(EVAL_DIR, "..");

export interface DatasetMeta {
  kind: "url" | "text" | "allowlist";
  name: string;
  sourceUrl: string;
  downloadUrl?: string;
  license?: string;
  citation?: string;
  file: string;
  sha256?: string;
  rows?: number;
  downloadedAt?: string;
  urlColumn?: string;
  labelColumn?: string;
  phishingLabels?: string[];
  legitimateLabels?: string[];
  notes?: string;
  /** Text datasets: raw source file before conversion. */
  rawFile?: string;
  rawSha256?: string;
  originalUrl?: string;
  /** Allow-list sources (Tranco list ID). */
  listId?: string;
}

export function loadDatasetRegistry(): Record<string, DatasetMeta> {
  return JSON.parse(fs.readFileSync(path.join(EVAL_DIR, "datasets.json"), "utf-8")) as Record<string, DatasetMeta>;
}

export function sha256File(p: string): string {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

/** Hash of all detection-engine source files, so results can be tied to code. */
export function engineFingerprint(): string {
  const dir = path.join(EXT_DIR, "src", "shared");
  const h = crypto.createHash("sha256");
  const walk = (d: string) => {
    for (const f of fs.readdirSync(d).sort()) {
      const p = path.join(d, f);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|json)$/.test(f)) h.update(f).update(fs.readFileSync(p));
    }
  };
  walk(dir);
  return h.digest("hex").slice(0, 16);
}

export function parseArgs(argv: string[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const a of argv) {
    if (!a.startsWith("--")) { m.set("_", a); continue; }
    const eq = a.indexOf("=");
    if (eq === -1) m.set(a.slice(2), "true");
    else m.set(a.slice(2, eq), a.slice(eq + 1));
  }
  return m;
}

export function runEnvironment() {
  return {
    hooklineVersion: HOOKLINE_VERSION,
    rulesetFingerprint: rulesetFingerprint(),
    engineFingerprint: engineFingerprint(),
    node: process.version,
    platform: process.platform,
    date: new Date().toISOString(),
  };
}

export function writeResults(baseName: string, json: unknown, markdown: string, outDir: string): { json: string; md: string } {
  fs.mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, `${baseName}.json`);
  const mdPath = path.join(outDir, `${baseName}.md`);
  fs.writeFileSync(jsonPath, JSON.stringify(json, null, 2) + "\n");
  fs.writeFileSync(mdPath, markdown);
  return { json: jsonPath, md: mdPath };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export const fmt = (x: number, d = 1) => `${(100 * x).toFixed(d)}%`;
export const signedPp = (x: number) => `${x >= 0 ? "+" : ""}${(100 * x).toFixed(2)} pp`;
