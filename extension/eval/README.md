# Hookline — evaluation harness

Runs datasets through the **real** detection engine (`src/shared`, the same
code as the Chrome build) and writes reproducible results.

- Results: [`RESULTS.md`](RESULTS.md) · every tuning step: [`TUNING_LOG.md`](TUNING_LOG.md) · rules: [`../../docs/RULES.md`](../../docs/RULES.md)
- Raw outputs: `results/<date>-<dataset>-<split>[-tag].json` and `.md`

## 1. Get the data (≈ 40 MB download, not committed to git)

Run from `extension/`. Kaggle's public download endpoint worked without a login on 2026-11-06; if it asks for authentication, download the same files from the Kaggle pages in `datasets.json` instead.

```bash
mkdir -p eval/data/raw && cd eval/data/raw

curl -L -o phishing-site-urls.zip https://www.kaggle.com/api/v1/datasets/download/taruntiwarihp/phishing-site-urls
curl -L -o fake-jobs.zip          https://www.kaggle.com/api/v1/datasets/download/shivamb/real-or-fake-fake-jobposting-prediction
curl -L -o phiusiil.zip           "https://archive.ics.uci.edu/static/public/967/phiusiil+phishing+url+dataset.zip"
curl -L -o tranco.zip             https://tranco-list.eu/top-1m.csv.zip    # only needed to REBUILD the allow-list

unzip -o phishing-site-urls.zip -d phishing-site-urls
unzip -o fake-jobs.zip          -d fake-jobs
unzip -o phiusiil.zip           -d phiusiil
unzip -o tranco.zip             -d tranco
cd ../../..
```

The harness checks each file's sha256 against `datasets.json` and warns on a mismatch. **Tranco publishes a new list daily:** the committed allow-list was built from list **K9YYW**. A fresh download is a different list, so to reproduce exactly, fetch that list ID from <https://tranco-list.eu/list/K9YYW>, or just keep the committed `src/shared/data/allowlist.generated.ts`.

```bash
npm run prepare:emscad        # EMSCAD → eval/data/derived/emscad_scam_messages.csv (text,label,category)
npm run prepare:allowlist     # optional: rebuild the allow-list from data/raw/tranco/top-1m.csv
```

## 2. Run

```bash
npm run eval:all                                           # everything in RESULTS.md (~2 min)

npm run eval -- --dataset=kaggle-phishing-site-urls        # one dataset, defaults below
npm run eval -- --dataset=phiusiil --ablation
npm run eval -- --dataset=emscad --ablation
npm run eval -- --csv=path/to/my.csv --kind=text           # your own text,label,category CSV
npm run eval -- --csv=urls.csv --url-col=url --label-col=label --phish=1 --safe=0
```

| Option | Default | Meaning |
|---|---|---|
| `--split=dev\|test\|all` | `test` | Fixed hash split, independent of seed. **Tune on dev, report test.** |
| `--per-class=N\|all` | 25000 (URL), all (text) | Stratified sample size per class |
| `--seed=N` | 42 | mulberry32 seed for sampling |
| `--scheme=as-is\|http\|https` | `as-is` | URLs without a scheme: `as-is` skips the HTTPS check (correct); `http` reproduces the v1.0.0 artifact |
| `--no-allowlist` | off | Disable the Tranco allow-list |
| `--ablation` | off | Re-score with each rule disabled |
| `--no-dedupe` | off | Keep duplicate URLs |
| `--tag=name` | — | Suffix for output file names |

## 3. What each output contains

Dataset name, source URL, sha256, row counts (duplicates, conflicting labels, unknown labels), split and sampling method with seed, the Hookline version, a **ruleset fingerprint** (rule IDs + weights) and an **engine fingerprint** (hash of `src/shared`). Metrics: precision, recall, FPR (with 95% Wilson intervals), F1, accuracy, the confusion matrix, a score-threshold sweep, predicted-category counts, per-rule fire counts with rule precision, the ablation table, and example errors.

## 4. Text dataset format

```csv
id,text,label,category
1,"Pay the $50 training fee to start…",1,job_scam
2,"We'd like to schedule a video interview…",0,none
```

`label`: 1/scam/fraud vs 0/legit/ham. `category`: `job_scam`, `shopping_scam`, `credential_phishing` or `none`. Use `--kind=text`. IDs containing "emscad" or "posting" are treated as job ads (job rules only); anything else as messages.

## 5. Unit tests and backend tests

```bash
npm test                 # extension: 96 tests (rules, FP regressions, Gmail/page extraction, eval lib)
cd ../backend && pytest  # backend: 42 tests, fully offline
```
