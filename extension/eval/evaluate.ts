/**
 * Hookline Evaluation Harness — Phase 11
 *
 * Runs a phishing-URL dataset through the REAL detection engine (the same
 * analyzeUrl() the extension uses) and reports detection rate, false-positive
 * rate, precision, accuracy and F1 — plus a few example misses so you can see
 * where it fails.
 *
 * This measures the *lexical* engine only (typosquatting, homoglyphs, brand
 * impersonation, suspicious TLD/structure, IP hosts). It does NOT call the
 * backend, so the domain-age / DNS signals are not included here — running
 * WHOIS on hundreds of thousands of URLs would hit rate limits. The number you
 * get is therefore a conservative floor; the live extension scores higher.
 *
 * Usage:
 *   npm run eval -- path/to/dataset.csv
 *   npm run eval -- path/to/dataset.csv --limit=20000
 *
 * Works with common Kaggle formats, e.g.:
 *   - phishing_site_urls.csv   (columns: URL, Label  with good/bad)
 *   - malicious_phish.csv      (columns: url, type   with benign/phishing/...)
 */

import * as fs from "fs";
import { analyzeUrl } from "../src/shared/urlAnalyzer";

// ─── Args ────────────────────────────────────────────────────────────────────

const csvPath = process.argv[2];
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : Infinity;

if (!csvPath) {
  console.error("Usage: npm run eval -- <dataset.csv> [--limit=N]");
  process.exit(1);
}

// ─── Minimal CSV parsing ───────────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const URL_HEADERS = ["url", "urls", "link", "domain"];
const LABEL_HEADERS = ["label", "type", "status", "class", "result", "target", "is_phishing"];

const PHISH_LABELS = new Set(["phishing", "bad", "malicious", "malware", "defacement", "spam", "1", "true", "yes"]);
const SAFE_LABELS = new Set(["legitimate", "good", "benign", "safe", "ham", "0", "false", "no"]);

function labelToPhishing(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (PHISH_LABELS.has(v)) return true;
  if (SAFE_LABELS.has(v)) return false;
  return null; // unknown label — skip row
}

// ─── Normalisation ─────────────────────────────────────────────────────────────

function normaliseUrl(raw: string): string {
  const u = raw.trim();
  if (!u) return u;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `http://${u}`;
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  const text = fs.readFileSync(csvPath, "utf-8");
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) { console.error("Empty file."); process.exit(1); }

  // Header detection
  const header = splitCsvLine(lines[0]).map((h) => h.toLowerCase());
  let urlCol = header.findIndex((h) => URL_HEADERS.includes(h));
  let labelCol = header.findIndex((h) => LABEL_HEADERS.includes(h));
  let startRow = 1;

  // No recognisable header → assume positional (col0=url, col1=label), no header row
  if (urlCol === -1) { urlCol = 0; labelCol = labelCol === -1 ? 1 : labelCol; startRow = 0; }
  if (labelCol === -1) labelCol = 1;

  console.log(`\nDataset: ${csvPath}`);
  console.log(`URL column: ${urlCol}  |  Label column: ${labelCol}\n`);

  let tp = 0, fp = 0, tn = 0, fn = 0;
  let skipped = 0, parseFail = 0, processed = 0;
  const falseNeg: string[] = [];
  const falsePos: string[] = [];

  for (let i = startRow; i < lines.length && processed < limit; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length <= Math.max(urlCol, labelCol)) { skipped++; continue; }

    const rawUrl = cols[urlCol];
    const actualPhishing = labelToPhishing(cols[labelCol]);
    if (actualPhishing === null || !rawUrl) { skipped++; continue; }

    const result = analyzeUrl(normaliseUrl(rawUrl));
    if (result.verdict === "unknown") { parseFail++; continue; }

    const flagged = result.verdict !== "safe"; // suspicious or high_risk
    processed++;

    if (actualPhishing && flagged) tp++;
    else if (actualPhishing && !flagged) { fn++; if (falseNeg.length < 5) falseNeg.push(rawUrl); }
    else if (!actualPhishing && flagged) { fp++; if (falsePos.length < 5) falsePos.push(rawUrl); }
    else tn++;
  }

  const pct = (n: number, d: number) => (d === 0 ? "0.0" : ((100 * n) / d).toFixed(1));
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  console.log("──────────────────────────────────────────────");
  console.log(`Processed:        ${processed}`);
  console.log(`Skipped rows:     ${skipped}   (unknown label / malformed)`);
  console.log(`Unparseable URLs: ${parseFail}`);
  console.log("──────────────────────────────────────────────");
  console.log("Confusion matrix (positive = phishing):");
  console.log(`  True positives  (caught phishing): ${tp}`);
  console.log(`  False negatives (missed phishing): ${fn}`);
  console.log(`  True negatives  (cleared safe):    ${tn}`);
  console.log(`  False positives (flagged safe):    ${fp}`);
  console.log("──────────────────────────────────────────────");
  console.log(`Detection rate (recall):   ${pct(tp, tp + fn)}%   ← caught ${tp} of ${tp + fn} phishing URLs`);
  console.log(`False-positive rate:       ${pct(fp, fp + tn)}%   ← flagged ${fp} of ${fp + tn} safe URLs`);
  console.log(`Precision:                 ${(100 * precision).toFixed(1)}%`);
  console.log(`Accuracy:                  ${pct(tp + tn, processed)}%`);
  console.log(`F1 score:                  ${f1.toFixed(3)}`);
  console.log("──────────────────────────────────────────────");

  if (falseNeg.length) {
    console.log("\nExample MISSED phishing (false negatives):");
    falseNeg.forEach((u) => console.log("  - " + u.slice(0, 90)));
  }
  if (falsePos.length) {
    console.log("\nExample FALSE ALARMS on safe URLs (false positives):");
    falsePos.forEach((u) => console.log("  - " + u.slice(0, 90)));
  }
  console.log();
}

main();
