/**
 * Reproduce every number in eval/RESULTS.md with one command:
 *
 *   npm run eval:all            (needs the datasets — see eval/README.md)
 *
 * Runs the FINAL (test-split) evaluations with ablation, plus the
 * allow-list-off and legacy-scheme sensitivity runs. Seed 42 throughout.
 */
import { execFileSync } from "child_process";
import * as path from "path";

const runs: string[][] = [
  ["--dataset=kaggle-phishing-site-urls", "--split=test", "--ablation", "--tag=final"],
  ["--dataset=phiusiil", "--split=test", "--ablation", "--tag=final"],
  ["--dataset=kaggle-phishing-site-urls", "--split=test", "--no-allowlist", "--tag=final-no-allowlist"],
  ["--dataset=phiusiil", "--split=test", "--no-allowlist", "--tag=final-no-allowlist"],
  ["--dataset=kaggle-phishing-site-urls", "--split=test", "--scheme=http", "--tag=final-legacy-http-prefix"],
  ["--dataset=emscad", "--split=test", "--ablation", "--tag=final"],
];

const tsx = path.join(__dirname, "..", "node_modules", ".bin", process.platform === "win32" ? "tsx.cmd" : "tsx");
for (const args of runs) {
  console.log(`\n=== eval ${args.join(" ")} ===`);
  execFileSync(tsx, [path.join(__dirname, "evaluate.ts"), ...args], { stdio: ["ignore", "ignore", "inherit"], shell: process.platform === "win32" });
  console.log("done");
}
