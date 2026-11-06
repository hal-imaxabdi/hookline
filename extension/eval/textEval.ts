/**
 * Scam-message evaluation over a CSV with columns: text,label,category
 * (optional id). label: 1/scam/fraud = positive, 0/legit/ham = negative.
 * category: job_scam | shopping_scam | credential_phishing | none.
 *
 * Reports:
 *   - binary metrics: flagged (verdict ≠ safe) vs label
 *   - per-category one-vs-rest metrics: predicted category == C vs true category == C
 *   - per-rule fire counts and ablation (rescoring with one rule disabled)
 */

import * as fs from "fs";
import * as path from "path";
import { parseCsv } from "./lib/csv";
import { mulberry32, shuffle, splitOf } from "./lib/random";
import { addOutcome, computeMetrics, emptyConfusion, wilson95, type Metrics } from "./lib/metrics";
import { EVAL_DIR, fmt, runEnvironment, sha256File, signedPp, today, writeResults, type DatasetMeta } from "./lib/common";
import { collectTextEvidence } from "../src/shared/textAnalyzer";
import { scoreEvidence } from "../src/shared/riskEngine";
import { ALL_RULE_IDS, RULES, type RuleId } from "../src/shared/ruleRegistry";
import type { EvidenceItem, CategoryLabel, ScamCategory } from "../src/shared/types";

export interface TextEvalConfig {
  datasetId: string;
  meta: DatasetMeta;
  perClass: number | "all";
  seed: number;
  split: "dev" | "test" | "all";
  ablation: boolean;
  tag: string;
  outDir: string;
}

const POS = new Set(["1", "scam", "fraud", "fraudulent", "phishing", "spam", "true", "yes"]);
const NEG = new Set(["0", "legit", "legitimate", "ham", "genuine", "false", "no"]);
const CATS: ScamCategory[] = ["credential_phishing", "job_scam", "shopping_scam"];

interface Item { id: string; positive: boolean; category: CategoryLabel; evidence: EvidenceItem[] }

export function runTextEval(cfg: TextEvalConfig): void {
  const t0 = Date.now();
  const file = path.resolve(EVAL_DIR, cfg.meta.file);
  if (!fs.existsSync(file)) {
    throw new Error(`Text dataset not found: ${file}\nFor EMSCAD run: npm run prepare:emscad (see eval/README.md).`);
  }
  const fileSha = sha256File(file);

  let header: string[] = [];
  const rows: Array<{ id: string; text: string; positive: boolean; category: CategoryLabel }> = [];
  let unknownLabel = 0;
  parseCsv(fs.readFileSync(file, "utf-8"), (f, i) => {
    if (i === 0) { header = f.map((h) => h.trim().toLowerCase()); return; }
    const get = (n: string) => (header.indexOf(n) >= 0 ? f[header.indexOf(n)] ?? "" : "");
    const lab = get("label").trim().toLowerCase();
    const positive = POS.has(lab) ? true : NEG.has(lab) ? false : null;
    if (positive === null) { unknownLabel++; return; }
    const catRaw = get("category").trim().toLowerCase();
    const category = (CATS as string[]).includes(catRaw) ? (catRaw as ScamCategory) : "none";
    rows.push({ id: get("id") || String(i), text: get("text"), positive, category });
  });

  const inSplit = cfg.split === "all" ? rows : rows.filter((r) => splitOf(r.id + "|" + r.text.slice(0, 64)) === cfg.split);
  const posPool = inSplit.filter((r) => r.positive);
  const negPool = inSplit.filter((r) => !r.positive);
  const rand = mulberry32(cfg.seed);
  const take = (pool: typeof rows) => cfg.perClass === "all" ? pool : shuffle([...pool], rand).slice(0, cfg.perClass);
  const sampled = [...take(posPool), ...take(negPool)];
  const kind: "posting" | "email" = /emscad|posting/i.test(cfg.datasetId) ? "posting" : "email";

  const items: Item[] = sampled.map((r) => ({
    id: r.id, positive: r.positive, category: r.category, evidence: collectTextEvidence(r.text, kind),
  }));

  const evaluate = (disabled?: ReadonlySet<RuleId>) => {
    const bin = emptyConfusion();
    const perCat = Object.fromEntries(CATS.map((c) => [c, emptyConfusion()])) as Record<ScamCategory, ReturnType<typeof emptyConfusion>>;
    for (const it of items) {
      const s = scoreEvidence(it.evidence, { disabledRules: disabled });
      addOutcome(bin, it.positive, s.verdict !== "safe");
      for (const c of CATS) addOutcome(perCat[c], it.category === c, s.category.label === c);
    }
    return {
      binary: computeMetrics(bin),
      perCategory: Object.fromEntries(CATS.map((c) => [c, computeMetrics(perCat[c])])) as Record<ScamCategory, Metrics>,
    };
  };

  const main = evaluate();
  const ruleFires = new Map<RuleId, { positive: number; negative: number }>();
  const fpEx: string[] = [];
  const fnEx: string[] = [];
  const predicted: Record<CategoryLabel, { positive: number; negative: number }> = {
    credential_phishing: { positive: 0, negative: 0 }, job_scam: { positive: 0, negative: 0 },
    shopping_scam: { positive: 0, negative: 0 }, none: { positive: 0, negative: 0 },
  };
  for (const it of items) {
    const s = scoreEvidence(it.evidence);
    predicted[s.category.label][it.positive ? "positive" : "negative"]++;
    for (const id of new Set(s.active.map((e) => e.ruleId))) {
      const v = ruleFires.get(id) ?? { positive: 0, negative: 0 };
      v[it.positive ? "positive" : "negative"]++;
      ruleFires.set(id, v);
    }
    const flagged = s.verdict !== "safe";
    if (!it.positive && flagged && fpEx.length < 10) fpEx.push(`id ${it.id}: ${s.active.map((e) => `${e.ruleId} ${e.detail ?? ""}`).join(" | ").slice(0, 220)}`);
    if (it.positive && !flagged && fnEx.length < 10) fnEx.push(`id ${it.id}`);
  }

  const ablation = cfg.ablation
    ? ALL_RULE_IDS.filter((id) => ruleFires.has(id)).map((id) => {
        const m = evaluate(new Set([id])).binary;
        return { rule: id, fires: ruleFires.get(id)!, metrics: m, delta: { recall: m.recall - main.binary.recall, falsePositiveRate: m.falsePositiveRate - main.binary.falsePositiveRate, precision: m.precision - main.binary.precision, f1: m.f1 - main.binary.f1 } };
      })
    : [];

  const b = main.binary;
  const json = {
    kind: "text",
    environment: runEnvironment(),
    dataset: {
      id: cfg.datasetId, name: cfg.meta.name, sourceUrl: cfg.meta.sourceUrl, citation: cfg.meta.citation,
      file: cfg.meta.file, sha256: fileSha, rows: rows.length, unknownLabel,
      inSplit: { positive: posPool.length, negative: negPool.length },
    },
    sampling: {
      method: cfg.perClass === "all" ? "All rows in the split (no sampling)" : `Stratified ${cfg.perClass} per class, mulberry32 seed ${cfg.seed}`,
      seed: cfg.seed, split: cfg.split, splitMethod: `FNV-1a("hookline-split-v1" + id + "|" + first 64 chars) mod 2`,
      evaluated: items.length, textKind: kind,
    },
    metrics: b,
    confidenceIntervals95: { recall: wilson95(b.tp, b.tp + b.fn), falsePositiveRate: wilson95(b.fp, b.fp + b.tn) },
    perCategory: main.perCategory,
    predictedCategory: predicted,
    ruleFires: Object.fromEntries(ruleFires),
    ablation,
    examples: { falsePositives: fpEx, falseNegatives: fnEx },
    durationMs: Date.now() - t0,
  };

  const L: string[] = [];
  L.push(`# Hookline scam-text evaluation — ${cfg.meta.name}`, "");
  L.push(`- **Date:** ${json.environment.date} · ruleset \`${json.environment.rulesetFingerprint}\` · engine \`${json.environment.engineFingerprint}\``);
  L.push(`- **Dataset:** [${cfg.meta.name}](${cfg.meta.sourceUrl}) · sha256 \`${fileSha.slice(0, 16)}…\` · ${rows.length} rows`);
  L.push(`- **Split:** ${cfg.split} (${json.dataset.inSplit.positive} scam / ${json.dataset.inSplit.negative} legitimate in split) · **Sampling:** ${json.sampling.method} · text kind \`${kind}\``, "");
  L.push("## Binary metrics (positive = scam; flagged = suspicious or high risk)", "");
  L.push("| Metric | Value |", "|---|---|");
  L.push(`| Recall | ${fmt(b.recall)} (95% CI ${fmt(json.confidenceIntervals95.recall[0])}–${fmt(json.confidenceIntervals95.recall[1])}) |`);
  L.push(`| False-positive rate | ${fmt(b.falsePositiveRate)} (95% CI ${fmt(json.confidenceIntervals95.falsePositiveRate[0])}–${fmt(json.confidenceIntervals95.falsePositiveRate[1])}) |`);
  L.push(`| Precision | ${fmt(b.precision)} |`, `| F1 | ${b.f1.toFixed(3)} |`, `| Accuracy | ${fmt(b.accuracy)} |`, "");
  L.push(`Confusion: TP ${b.tp} · FN ${b.fn} · FP ${b.fp} · TN ${b.tn}`, "");
  L.push("## Per-category (one-vs-rest on the category label)", "");
  L.push("| Category | Support | Recall | Precision | F1 | FPR |", "|---|---|---|---|---|---|");
  for (const c of CATS) {
    const m = main.perCategory[c];
    L.push(`| ${c} | ${m.tp + m.fn} | ${m.tp + m.fn ? fmt(m.recall) : "n/a"} | ${m.tp + m.fp ? fmt(m.precision) : "n/a"} | ${m.tp + m.fn ? m.f1.toFixed(3) : "n/a"} | ${fmt(m.falsePositiveRate)} |`);
  }
  L.push("", "## Rule fire counts", "", "| Rule | On scams | On legitimate | Precision |", "|---|---|---|---|");
  for (const [id, v] of [...ruleFires.entries()].sort((a, b2) => b2[1].positive + b2[1].negative - a[1].positive - a[1].negative)) {
    L.push(`| ${id} | ${v.positive} | ${v.negative} | ${fmt(v.positive / Math.max(1, v.positive + v.negative))} |`);
  }
  if (ablation.length) {
    L.push("", "## Ablation (one rule disabled)", "", "| Disabled rule | Recall | Δ Recall | FPR | Δ FPR | Δ F1 |", "|---|---|---|---|---|---|");
    for (const a of ablation) L.push(`| ${a.rule} | ${fmt(a.metrics.recall)} | ${signedPp(a.delta.recall)} | ${fmt(a.metrics.falsePositiveRate)} | ${signedPp(a.delta.falsePositiveRate)} | ${a.delta.f1 >= 0 ? "+" : ""}${a.delta.f1.toFixed(3)} |`);
  }
  L.push("", "## Example false positives", "", ...fpEx.map((e) => `- ${e}`), "");
  const md = L.join("\n");
  const base = `${today()}-${cfg.datasetId}-${cfg.split}${cfg.tag ? "-" + cfg.tag : ""}`;
  const out = writeResults(base, json, md, cfg.outDir);
  console.log(md);
  console.log(`\nWrote ${out.json}\n      ${out.md}`);
  void RULES;
}
