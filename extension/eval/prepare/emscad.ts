/**
 * Convert EMSCAD (Kaggle "Real / Fake Job Posting Prediction") to the generic
 * scam-message CSV format used by the text evaluation:
 *
 *   id,text,label,category
 *   label    = 1 (scam) / 0 (legitimate)
 *   category = job_scam for scams, none for legitimate
 *
 *   npm run prepare:emscad
 *
 * text = title + company_profile + description + requirements + benefits.
 * EMSCAD already replaces URLs/emails/phones with #URL_…#, #EMAIL_…#, #PHONE_…#
 * placeholders, so sender-address rules can't fire on this data.
 */

import * as fs from "fs";
import * as path from "path";
import { parseCsv, csvEscape } from "../lib/csv";
import { EVAL_DIR, loadDatasetRegistry, sha256File } from "../lib/common";

function main(): void {
  const meta = loadDatasetRegistry().emscad;
  if (!meta.rawFile) throw new Error("datasets.json: emscad.rawFile missing");
  const src = path.resolve(EVAL_DIR, meta.rawFile);
  if (!fs.existsSync(src)) throw new Error(`EMSCAD not found at ${src}. See eval/README.md for the download command.`);
  const sha = sha256File(src);
  if (sha !== meta.rawSha256) console.warn(`WARNING: sha256 mismatch for ${src}: ${sha}`);

  let header: string[] = [];
  const rows: string[] = ["id,text,label,category"];
  let scams = 0;
  let legit = 0;
  parseCsv(fs.readFileSync(src, "utf-8"), (f, i) => {
    if (i === 0) { header = f; return; }
    const get = (name: string) => f[header.indexOf(name)] ?? "";
    const text = ["title", "company_profile", "description", "requirements", "benefits"]
      .map(get)
      .filter((s) => s.trim())
      .join("\n\n");
    const isScam = get("fraudulent").trim() === "1";
    isScam ? scams++ : legit++;
    rows.push([get("job_id"), csvEscape(text), isScam ? "1" : "0", isScam ? "job_scam" : "none"].join(","));
  });

  const dest = path.resolve(EVAL_DIR, meta.file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, rows.join("\n") + "\n");
  console.log(`Wrote ${dest}: ${scams} scam, ${legit} legitimate`);
}

main();
