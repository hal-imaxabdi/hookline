/**
 * URL-dataset evaluation: runs every URL through the REAL extension engine
 * (collectUrlEvidence + scoreEvidence — the same code analyzeUrl() uses).
 *
 * Evidence is collected once per URL, then re-scored for each ablation
 * (rule disabled / allow-list off), so ablations are exact and cheap.
 */

import * as fs from "fs";
import * as path from "path";
import { parseCsv } from "./lib/csv";
import { mulberry32, shuffle, splitOf } from "./lib/random";
import { addOutcome, computeMetrics, emptyConfusion, wilson95, type Metrics } from "./lib/metrics";
import { EVAL_DIR, fmt, runEnvironment, sha256File, signedPp, today, writeResults, type DatasetMeta } from "./lib/common";
import { collectUrlEvidence } from "../src/shared/urlAnalyzer";
import { scoreEvidence } from "../src/shared/riskEngine";
import { isAllowlisted, ALLOWLIST_META } from "../src/shared/allowlist";
import { ALL_RULE_IDS, RULES, type RuleId } from "../src/shared/ruleRegistry";
import type { EvidenceItem, CategoryLabel } from "../src/shared/types";

export type SchemePolicy = "as-is" | "http" | "https";

export interface UrlEvalConfig {
  datasetId: string;
  meta: DatasetMeta;
  perClass: number | "all";
  seed: number;
  split: "dev" | "test" | "all";
  scheme: SchemePolicy;
  dedupe: boolean;
  allowlist: boolean;
  ablation: boolean;
  tag: string;
  outDir: string;
}

interface Item {
  url: string;
  phishing: boolean;
  evidence: EvidenceItem[];
  allowlisted: boolean;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

function prepareUrl(raw: string, scheme: SchemePolicy): { url: string; schemeKnown: boolean } {
  const u = raw.trim();
  if (HAS_SCHEME.test(u)) return { url: u, schemeKnown: true };
  if (scheme === "http") return { url: `http://${u}`, schemeKnown: true };
  if (scheme === "https") return { url: `https://${u}`, schemeKnown: true };
  return { url: `http://${u}`, schemeKnown: false };
}

export function runUrlEval(cfg: UrlEvalConfig): void {
  const t0 = Date.now();
  const file = path.resolve(EVAL_DIR, cfg.meta.file);
  if (!fs.existsSync(file)) {
    throw new Error(`Dataset file not found: ${file}\nDownload it from ${cfg.meta.downloadUrl ?? cfg.meta.sourceUrl} (see eval/README.md).`);
  }
  const fileSha = sha256File(file);
  if (cfg.meta.sha256 && cfg.meta.sha256 !== fileSha) {
    console.warn(`WARNING: sha256 mismatch for ${file}\n  expected ${cfg.meta.sha256}\n  actual   ${fileSha}`);
  }

  const phishSet = new Set((cfg.meta.phishingLabels ?? []).map((s) => s.toLowerCase()));
  const safeSet = new Set((cfg.meta.legitimateLabels ?? []).map((s) => s.toLowerCase()));

  // ── 1. Load ─────────────────────────────────────────────────────────────
  let header: string[] | null = null;
  let urlCol = -1;
  let labelCol = -1;
  let totalRows = 0;
  let unknownLabel = 0;
  let emptyUrl = 0;
  const byUrl = new Map<string, boolean | "conflict">();
  const ordered: Array<{ url: string; phishing: boolean }> = [];

  parseCsv(fs.readFileSync(file, "utf-8"), (fields, idx) => {
    if (idx === 0) {
      header = fields.map((h) => h.trim());
      urlCol = header.indexOf(cfg.meta.urlColumn ?? "url");
      labelCol = header.indexOf(cfg.meta.labelColumn ?? "label");
      if (urlCol < 0 || labelCol < 0) throw new Error(`Columns not found. Header: ${header.join(",")}`);
      return;
    }
    totalRows++;
    const url = (fields[urlCol] ?? "").trim();
    const label = (fields[labelCol] ?? "").trim().toLowerCase();
    if (!url) { emptyUrl++; return; }
    let phishing: boolean;
    if (phishSet.has(label)) phishing = true;
    else if (safeSet.has(label)) phishing = false;
    else { unknownLabel++; return; }

    if (!cfg.dedupe) { ordered.push({ url, phishing }); return; }
    const prev = byUrl.get(url);
    if (prev === undefined) byUrl.set(url, phishing);
    else if (prev !== "conflict" && prev !== phishing) byUrl.set(url, "conflict");
  });

  let duplicatesRemoved = 0;
  let conflictingLabels = 0;
  let rows: Array<{ url: string; phishing: boolean }>;
  if (cfg.dedupe) {
    rows = [];
    for (const [url, v] of byUrl) {
      if (v === "conflict") { conflictingLabels++; continue; }
      rows.push({ url, phishing: v });
    }
    duplicatesRemoved = totalRows - unknownLabel - emptyUrl - byUrl.size;
  } else {
    rows = ordered;
  }

  // ── 2. Split + stratified seeded sample ─────────────────────────────────
  const inSplit = cfg.split === "all" ? rows : rows.filter((r) => splitOf(r.url) === cfg.split);
  const phishPool = inSplit.filter((r) => r.phishing);
  const legitPool = inSplit.filter((r) => !r.phishing);
  const rand = mulberry32(cfg.seed);
  const take = (pool: typeof rows) => {
    if (cfg.perClass === "all") return pool;
    return shuffle([...pool], rand).slice(0, Math.min(cfg.perClass, pool.length));
  };
  const sampled = [...take(phishPool), ...take(legitPool)];

  // ── 3. Collect evidence once ────────────────────────────────────────────
  const items: Item[] = [];
  let unparseable = 0;
  for (const r of sampled) {
    const { url, schemeKnown } = prepareUrl(r.url, cfg.scheme);
    const c = collectUrlEvidence(url, { schemeKnown });
    if ("error" in c) { unparseable++; continue; }
    items.push({ url: r.url, phishing: r.phishing, evidence: c.evidence, allowlisted: isAllowlisted(c.domain) });
  }

  // ── 4. Score ────────────────────────────────────────────────────────────
  const evaluate = (opts: { disabled?: ReadonlySet<RuleId>; allowlist: boolean }) => {
    const conf = emptyConfusion();
    for (const it of items) {
      const s = scoreEvidence(it.evidence, { disabledRules: opts.disabled, allowlisted: opts.allowlist && it.allowlisted });
      addOutcome(conf, it.phishing, s.verdict !== "safe");
    }
    return computeMetrics(conf);
  };

  const main = evaluate({ allowlist: cfg.allowlist });

  // Threshold sweep, predicted categories, examples, rule fire stats.
  const thresholds = [10, 20, 30, 40, 50, 60, 70];
  const sweep = thresholds.map((t) => ({ threshold: t, conf: emptyConfusion() }));
  const categoryCounts: Record<CategoryLabel, { phishing: number; legitimate: number }> = {
    credential_phishing: { phishing: 0, legitimate: 0 },
    job_scam: { phishing: 0, legitimate: 0 },
    shopping_scam: { phishing: 0, legitimate: 0 },
    none: { phishing: 0, legitimate: 0 },
  };
  const ruleFires = new Map<RuleId, { phishing: number; legitimate: number }>();
  const fpExamples: string[] = [];
  const fnExamples: string[] = [];
  let allowlistedPhish = 0;
  let allowlistedLegit = 0;

  for (const it of items) {
    const s = scoreEvidence(it.evidence, { allowlisted: cfg.allowlist && it.allowlisted });
    for (const sw of sweep) addOutcome(sw.conf, it.phishing, s.riskScore >= sw.threshold);
    categoryCounts[s.category.label][it.phishing ? "phishing" : "legitimate"]++;
    for (const id of new Set(s.active.map((e) => e.ruleId))) {
      const rf = ruleFires.get(id) ?? { phishing: 0, legitimate: 0 };
      rf[it.phishing ? "phishing" : "legitimate"]++;
      ruleFires.set(id, rf);
    }
    const flagged = s.verdict !== "safe";
    if (!it.phishing && flagged && fpExamples.length < 15) fpExamples.push(`${it.url}  [${s.active.map((e) => e.ruleId).join(", ")}]`);
    if (it.phishing && !flagged && fnExamples.length < 15) fnExamples.push(it.url);
    if (it.allowlisted) it.phishing ? allowlistedPhish++ : allowlistedLegit++;
  }

  // ── 5. Ablation ─────────────────────────────────────────────────────────
  let ablation: Array<{ rule: string; fires: { phishing: number; legitimate: number }; metrics: Metrics; delta: Record<string, number> }> = [];
  let allowlistAblation: { metrics: Metrics; delta: Record<string, number> } | null = null;
  if (cfg.ablation) {
    const urlRules = ALL_RULE_IDS.filter((id) => (RULES[id].scope as readonly string[]).includes("url"));
    ablation = urlRules
      .filter((id) => ruleFires.has(id))
      .map((id) => {
        const m = evaluate({ disabled: new Set([id]), allowlist: cfg.allowlist });
        return { rule: id, fires: ruleFires.get(id)!, metrics: m, delta: deltaOf(m, main) };
      });
    const flipped = evaluate({ allowlist: !cfg.allowlist });
    allowlistAblation = { metrics: flipped, delta: deltaOf(flipped, main) };
  }

  const durationMs = Date.now() - t0;
  const env = runEnvironment();
  const [rLo, rHi] = wilson95(main.tp, main.tp + main.fn);
  const [fLo, fHi] = wilson95(main.fp, main.fp + main.tn);

  const json = {
    kind: "url",
    environment: env,
    dataset: {
      id: cfg.datasetId,
      name: cfg.meta.name,
      sourceUrl: cfg.meta.sourceUrl,
      license: cfg.meta.license,
      citation: cfg.meta.citation,
      file: cfg.meta.file,
      sha256: fileSha,
      downloadedAt: cfg.meta.downloadedAt,
      totalRows,
      unknownLabel,
      emptyUrl,
      duplicatesRemoved,
      conflictingLabelsDropped: conflictingLabels,
      uniqueUsable: rows.length,
      inSplit: { phishing: phishPool.length, legitimate: legitPool.length },
    },
    sampling: {
      method: cfg.perClass === "all"
        ? "All rows in the split (no sampling)"
        : `Stratified: ${cfg.perClass} per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed ${cfg.seed})`,
      seed: cfg.seed,
      perClass: cfg.perClass,
      split: cfg.split,
      splitMethod: `FNV-1a(\"hookline-split-v1\" + url) mod 2 (0 = dev, 1 = test); independent of seed`,
      dedupe: cfg.dedupe,
      schemePolicy: cfg.scheme,
      sampled: sampled.length,
      unparseable,
      evaluated: items.length,
    },
    config: { allowlist: cfg.allowlist, allowlistMeta: ALLOWLIST_META, positiveClass: "phishing", flaggedMeans: "verdict ∈ {suspicious, high_risk} (score ≥ 20)" },
    metrics: main,
    confidenceIntervals95: { recall: [rLo, rHi], falsePositiveRate: [fLo, fHi] },
    thresholdSweep: sweep.map((s) => ({ threshold: s.threshold, ...computeMetrics(s.conf) })),
    predictedCategory: categoryCounts,
    allowlistedItems: { phishing: allowlistedPhish, legitimate: allowlistedLegit },
    ruleFires: Object.fromEntries([...ruleFires.entries()].sort((a, b) => b[1].phishing + b[1].legitimate - (a[1].phishing + a[1].legitimate))),
    ablation,
    allowlistAblation,
    examples: { falsePositives: fpExamples, falseNegatives: fnExamples },
    durationMs,
  };

  const base = `${today()}-${cfg.datasetId}-${cfg.split}${cfg.tag ? "-" + cfg.tag : ""}`;
  const md = renderMarkdown(json, cfg);
  const out = writeResults(base, json, md, cfg.outDir);

  console.log(md);
  console.log(`\nWrote ${out.json}\n      ${out.md}\n(${(durationMs / 1000).toFixed(1)} s)`);
}

function deltaOf(m: Metrics, base: Metrics): Record<string, number> {
  return {
    recall: m.recall - base.recall,
    falsePositiveRate: m.falsePositiveRate - base.falsePositiveRate,
    precision: m.precision - base.precision,
    f1: m.f1 - base.f1,
    accuracy: m.accuracy - base.accuracy,
  };
}

type Json = ReturnType<typeof JSON.parse>;

function renderMarkdown(j: Json, cfg: UrlEvalConfig): string {
  const m = j.metrics as Metrics;
  const L: string[] = [];
  L.push(`# Hookline URL evaluation — ${j.dataset.name}`);
  L.push("");
  L.push(`- **Date:** ${j.environment.date}  ·  **Hookline** ${j.environment.hooklineVersion}  ·  ruleset \`${j.environment.rulesetFingerprint}\`  ·  engine \`${j.environment.engineFingerprint}\``);
  L.push(`- **Dataset:** [${j.dataset.name}](${j.dataset.sourceUrl}) · sha256 \`${String(j.dataset.sha256).slice(0, 16)}…\` · ${j.dataset.totalRows} rows (${j.dataset.duplicatesRemoved} duplicates removed, ${j.dataset.conflictingLabelsDropped} conflicting labels dropped, ${j.dataset.unknownLabel} unknown labels)`);
  L.push(`- **Split:** ${j.sampling.split} (${j.sampling.splitMethod})`);
  L.push(`- **Sampling:** ${j.sampling.method}; evaluated ${j.sampling.evaluated} (${j.sampling.unparseable} unparseable)`);
  L.push(`- **Scheme policy:** \`${cfg.scheme}\` · **Allow-list:** ${cfg.allowlist ? `on (${j.config.allowlistMeta.description})` : "off"}`);
  L.push("");
  L.push("## Metrics (positive = phishing; flagged = suspicious or high risk)");
  L.push("");
  L.push("| Metric | Value |");
  L.push("|---|---|");
  L.push(`| Recall (detection rate) | ${fmt(m.recall)} (95% CI ${fmt(j.confidenceIntervals95.recall[0])}–${fmt(j.confidenceIntervals95.recall[1])}) |`);
  L.push(`| False-positive rate | ${fmt(m.falsePositiveRate)} (95% CI ${fmt(j.confidenceIntervals95.falsePositiveRate[0])}–${fmt(j.confidenceIntervals95.falsePositiveRate[1])}) |`);
  L.push(`| Precision | ${fmt(m.precision)} |`);
  L.push(`| F1 | ${m.f1.toFixed(3)} |`);
  L.push(`| Accuracy | ${fmt(m.accuracy)} |`);
  L.push("");
  L.push("**Confusion matrix**");
  L.push("");
  L.push("| | Predicted phishing | Predicted safe |");
  L.push("|---|---|---|");
  L.push(`| **Actual phishing** | TP ${m.tp} | FN ${m.fn} |`);
  L.push(`| **Actual legitimate** | FP ${m.fp} | TN ${m.tn} |`);
  L.push("");
  L.push("## Score-threshold sweep");
  L.push("");
  L.push("| Flag if score ≥ | Recall | FPR | Precision | F1 |");
  L.push("|---|---|---|---|---|");
  for (const s of j.thresholdSweep) L.push(`| ${s.threshold} | ${fmt(s.recall)} | ${fmt(s.falsePositiveRate)} | ${fmt(s.precision)} | ${s.f1.toFixed(3)} |`);
  L.push("");
  L.push("## Predicted scam category");
  L.push("");
  L.push("| Category | Phishing URLs | Legitimate URLs |");
  L.push("|---|---|---|");
  for (const [k, v] of Object.entries(j.predictedCategory as Record<string, { phishing: number; legitimate: number }>)) L.push(`| ${k} | ${v.phishing} | ${v.legitimate} |`);
  L.push("");
  L.push(`Allow-listed items in sample: ${j.allowlistedItems.phishing} phishing, ${j.allowlistedItems.legitimate} legitimate.`);
  L.push("");
  L.push("## Rule fire counts (active evidence)");
  L.push("");
  L.push("| Rule | Fires on phishing | Fires on legitimate | Precision of rule |");
  L.push("|---|---|---|---|");
  for (const [id, v] of Object.entries(j.ruleFires as Record<string, { phishing: number; legitimate: number }>)) {
    L.push(`| ${id} | ${v.phishing} | ${v.legitimate} | ${fmt(v.phishing / Math.max(1, v.phishing + v.legitimate))} |`);
  }
  if (j.ablation.length) {
    L.push("");
    L.push("## Ablation (metric change when ONE rule is disabled)");
    L.push("");
    L.push("| Disabled rule | Recall | Δ Recall | FPR | Δ FPR | Δ Precision | Δ F1 |");
    L.push("|---|---|---|---|---|---|---|");
    for (const a of j.ablation) L.push(`| ${a.rule} | ${fmt(a.metrics.recall)} | ${signedPp(a.delta.recall)} | ${fmt(a.metrics.falsePositiveRate)} | ${signedPp(a.delta.falsePositiveRate)} | ${signedPp(a.delta.precision)} | ${a.delta.f1 >= 0 ? "+" : ""}${a.delta.f1.toFixed(3)} |`);
    if (j.allowlistAblation) {
      const a = j.allowlistAblation;
      L.push(`| *(allow-list ${cfg.allowlist ? "OFF" : "ON"})* | ${fmt(a.metrics.recall)} | ${signedPp(a.delta.recall)} | ${fmt(a.metrics.falsePositiveRate)} | ${signedPp(a.delta.falsePositiveRate)} | ${signedPp(a.delta.precision)} | ${a.delta.f1 >= 0 ? "+" : ""}${a.delta.f1.toFixed(3)} |`);
    }
  }
  L.push("");
  L.push("## Example errors");
  L.push("");
  L.push("False positives (legitimate flagged):");
  for (const e of j.examples.falsePositives) L.push(`- \`${String(e).slice(0, 140)}\``);
  L.push("");
  L.push("False negatives (phishing missed):");
  for (const e of j.examples.falseNegatives) L.push(`- \`${String(e).slice(0, 140)}\``);
  L.push("");
  return L.join("\n");
}
