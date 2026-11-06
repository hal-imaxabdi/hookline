/**
 * Hookline Evaluation Harness — CLI
 *
 *   npm run eval -- --dataset=kaggle-phishing-site-urls                 (25k/class, test split, seed 42)
 *   npm run eval -- --dataset=phiusiil --ablation
 *   npm run eval -- --dataset=emscad                                    (text mode: job-scam detector)
 *   npm run eval -- --dataset=kaggle-phishing-site-urls --split=dev --per-class=all --scheme=http --no-dedupe
 *
 * Options (URL datasets):
 *   --per-class=N|all   rows sampled per class           (default 25000)
 *   --seed=N            sampling seed                    (default 42)
 *   --split=dev|test|all  fixed hash split; tune on dev, report test (default test)
 *   --scheme=as-is|http|https  how to treat URLs with no scheme (default as-is = protocol check skipped)
 *   --no-dedupe         keep duplicate URLs
 *   --no-allowlist      disable the top-sites allow-list
 *   --ablation          per-rule ablation table
 *   --tag=name          suffix for the output file name
 *   --out=dir           output directory (default eval/results)
 * Text datasets (CSV text,label,category): --csv=path to use a custom file.
 *
 * Output: eval/results/<date>-<dataset>-<split>[-tag].json + .md
 */

import * as path from "path";
import { EVAL_DIR, loadDatasetRegistry, parseArgs, type DatasetMeta } from "./lib/common";
import { runUrlEval, type SchemePolicy } from "./urlEval";
import { runTextEval } from "./textEval";

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const registry = loadDatasetRegistry();
  const datasetId = args.get("dataset") ?? "";
  const csv = args.get("csv");

  let meta: DatasetMeta | undefined = registry[datasetId];
  if (!meta && csv) {
    meta = {
      kind: (args.get("kind") as "url" | "text") ?? "url",
      name: args.get("name") ?? path.basename(csv),
      sourceUrl: args.get("source-url") ?? "(custom file)",
      file: path.relative(EVAL_DIR, path.resolve(csv)),
      urlColumn: args.get("url-col") ?? "url",
      labelColumn: args.get("label-col") ?? "label",
      phishingLabels: (args.get("phish") ?? "phishing,bad,1").split(","),
      legitimateLabels: (args.get("safe") ?? "legitimate,good,0").split(","),
    };
  } else if (meta && csv) {
    meta = { ...meta, file: path.relative(EVAL_DIR, path.resolve(csv)) };
  }
  if (!meta) {
    console.error(`Usage: npm run eval -- --dataset=<${Object.keys(registry).filter((k) => registry[k].kind !== "allowlist").join("|")}> [options]\n       npm run eval -- --csv=path [--kind=url|text] ...`);
    process.exit(1);
  }

  const perClassRaw = args.get("per-class") ?? "25000";
  const common = {
    datasetId: datasetId || path.basename(meta.file, ".csv"),
    meta,
    seed: Number(args.get("seed") ?? 42),
    split: (args.get("split") ?? "test") as "dev" | "test" | "all",
    ablation: args.get("ablation") === "true",
    tag: args.get("tag") ?? "",
    outDir: path.resolve(args.get("out") ?? path.join(EVAL_DIR, "results")),
  };

  if (meta.kind === "text") {
    runTextEval({ ...common, perClass: perClassRaw === "all" || !args.has("per-class") ? "all" : Number(perClassRaw) });
  } else {
    runUrlEval({
      ...common,
      perClass: perClassRaw === "all" ? "all" : Number(perClassRaw),
      scheme: (args.get("scheme") ?? "as-is") as SchemePolicy,
      dedupe: args.get("no-dedupe") !== "true",
      allowlist: args.get("no-allowlist") !== "true",
    });
  }
}

main();
