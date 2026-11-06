# Hookline 2.0.0 — evaluation results

Every number on this page comes from a run whose full JSON + Markdown output is
in [`eval/results/`](results/). Nothing is estimated or copied from elsewhere.
Re-create all of them with `npm run eval:all` (≈ 2 min; datasets per
[`eval/README.md`](README.md)).

| | |
|---|---|
| Hookline version | 2.0.0 |
| Ruleset fingerprint | `c41cfd80` (rule IDs + weights; see [`docs/RULES.md`](../../docs/RULES.md)) |
| Engine fingerprint | `4552b5b8eb06301d` (hash of `src/shared/**`) |
| Date of runs | 2026-11-06 |
| Seed | 42 (mulberry32), stratified 25,000 per class unless noted |
| Split | fixed hash split, FNV-1a(`"hookline-split-v1"` + item) mod 2. **All tuning used `dev`; this page reports `test` only** (evaluated once, after tuning was frozen) |
| Positive class | phishing / scam. *Flagged* = verdict *suspicious* or *high risk* (score ≥ 20) |
| What runs | The extension's own `src/shared` engine (same code as the Chrome build). Lexical/content rules only — **no backend (domain age, DNS) and no threat-intel lookups** in any number below |

## 1. Datasets

| ID | Dataset | Source | Size used | sha256 (file) |
|---|---|---|---|---|
| K | Phishing Site URLs (Kaggle, taruntiwarihp) | <https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls> | 549,346 rows → 507,191 unique after dedupe (42,154 duplicates, 1 conflicting label dropped); test split, 25k/class, 49,894 evaluated (106 unparseable) | `b1a7c26b…` |
| P | PhiUSIIL Phishing URL Dataset (Prasad & Chandra, *Computers & Security* 2024), CC BY 4.0 | <https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset> | 235,795 rows → 235,370 unique; test split, 25k/class, 50,000 evaluated | `a236549c…` |
| E | EMSCAD job postings (Vidros et al., *Future Internet* 2017), Kaggle mirror | <https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction> | 17,880 ads (866 fraudulent); test split, **all rows**: 451 fraudulent / 8,494 legitimate | raw `59253295…` |
| — | Tranco top-sites list **K9YYW** (allow-list source; Le Pochat et al., NDSS 2019) | <https://tranco-list.eu/list/K9YYW> | top 10,000 → 9,846 registrable domains after removing 35 user-content hosts / shorteners | `b4df866f…` |

Full checksums, download URLs and label mappings: [`eval/datasets.json`](datasets.json).

## 2. Headline results (test split)

### Phishing URLs

| Dataset | Recall | 95% CI | FPR | 95% CI | Precision | F1 | Accuracy | TP | FN | FP | TN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **K** Kaggle | **25.5%** | 25.0–26.1% | **0.5%** | 0.4–0.6% | 98.2% | 0.405 | 62.6% | 6,359 | 18,537 | 115 | 24,883 |
| **P** PhiUSIIL | **23.9%** | 23.4–24.4% | **0.2%** | 0.2–0.3% | 99.1% | 0.385 | 61.8% | 5,973 | 19,027 | 57 | 24,943 |

Files: `2026-11-06-kaggle-phishing-site-urls-test-final.*`, `2026-11-06-phiusiil-test-final.*`

Of the flagged phishing URLs, the category classifier labelled 5,275 / 6,359 (K) and 1,187 / 5,973 (P) as *Credential phishing*; the rest were flagged only by "general" rules (suspicious TLD, long hostname, …), which raise risk but don't name a category by design.

### Job-scam text (EMSCAD job advertisements)

| Recall | 95% CI | FPR | 95% CI | Precision | F1 | TP | FN | FP | TN |
|---|---|---|---|---|---|---|---|---|---|
| **6.2%** | 4.3–8.8% | **0.1%** | 0.0–0.2% | 82.4% | 0.115 | 28 | 423 | 6 | 8,488 |

File: `2026-11-06-emscad-test-final.*`. Per-category (job_scam one-vs-rest) is identical, since every positive is a job scam.

## 3. Why these differ from the v1.0.0 README (40.5% recall / 12.7% FPR)

The old number is reproducible — the old harness and engine give **41.4% recall / 11.3% FPR** on the full Kaggle file (`2026-11-06-baseline-legacy-harness-kaggle-full.txt`; the README's 40.5/12.7 was an unseeded 50k subset of the same file). But most of it was a **harness artifact**: the Kaggle URLs have no scheme, the old harness prepended `http://`, and the "No HTTPS" rule then added 12 points to *every* URL, phishing or not, so any single weak signal crossed the threshold.

| Same 2.0.0 engine, K test split | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| Scheme treated as unknown (correct; reported above) | 25.5% | 0.5% | 98.2% | 0.405 |
| `http://` prepended (legacy harness behaviour) | 42.8% | 7.8% | 84.6% | 0.568 |

File: `…-test-final-legacy-http-prefix.*`. On the old engine, the dev-split equivalent was 43.1% / 11.3% with the prefix vs **11.7% / 2.2%** without it (`eval/TUNING_LOG.md`, rows S0a/S0b) — i.e. the honest v1.0.0 baseline was ≈ 12% recall at ≈ 2% FPR. Version 2.0.0 roughly doubles recall and cuts FPR by ~4× against that honest baseline. Every intermediate step is logged with before/after numbers in [`TUNING_LOG.md`](TUNING_LOG.md).

## 4. Allow-list sensitivity

The legitimate side of both datasets overlaps with popular sites, so a top-sites allow-list could look better here than in the wild. Reported both ways:

| Test split | Allow-list | Recall | FPR | Precision | F1 |
|---|---|---|---|---|---|
| K | on | 25.5% | 0.5% | 98.2% | 0.405 |
| K | off | 25.8% | 0.8% | 97.0% | 0.407 |
| P | on | 23.9% | 0.2% | 99.1% | 0.385 |
| P | off | 24.8% | 0.2% | 99.1% | 0.396 |

In the K sample 8,392 legitimate and 469 phishing URLs were on allow-listed domains (P: 646 / 522) — the phishing ones are pages hosted on popular domains (compromised sites, open redirects, hosting platforms not covered by the exclusion list), where suppressing lexical rules costs recall. Files: `…-test-final-no-allowlist.*`.

## 5. Ablation — disable one rule at a time (test split, allow-list on)

Rules with no effect (Δ < 0.05 pp everywhere) omitted; full tables in the result files.

| Disabled rule | K Δ recall | K Δ FPR | K Δ F1 | P Δ recall | P Δ FPR | P Δ F1 |
|---|---|---|---|---|---|---|
| `URL_PATH_VERIFY` | −4.03 pp | −0.02 pp | −0.053 | −0.26 pp | 0.00 | −0.003 |
| `URL_PATH_LOGIN` | −3.98 pp | −0.02 pp | −0.052 | −1.24 pp | 0.00 | −0.016 |
| `URL_IP_HOST` | −2.97 pp | 0.00 | −0.039 | −0.35 pp | 0.00 | −0.005 |
| `URL_SUSPICIOUS_TLD` | −2.21 pp | −0.03 pp | −0.028 | **−7.13 pp** | −0.08 pp | −0.098 |
| `URL_PATH_BRAND` | −2.19 pp | −0.03 pp | −0.028 | −0.28 pp | 0.00 | −0.004 |
| `URL_BRAND_IN_DOMAIN` | −1.09 pp | −0.02 pp | −0.014 | −0.94 pp | −0.02 pp | −0.012 |
| `URL_DEEP_SUBDOMAINS` | −0.52 pp | −0.02 pp | −0.007 | −0.61 pp | 0.00 | −0.008 |
| `URL_LONG_DOMAIN` | −0.32 pp | **−0.14 pp** | −0.004 | −3.12 pp | −0.02 pp | −0.042 |
| `URL_MANY_HYPHENS` | −0.23 pp | **−0.14 pp** | −0.003 | −1.93 pp | −0.09 pp | −0.025 |
| `URL_NO_HTTPS` | −0.04 pp | 0.00 | −0.001 | −0.70 pp | 0.00 | −0.009 |
| `URL_PATH_SCRIPT` | −0.05 pp | 0.00 | −0.001 | −0.66 pp | 0.00 | −0.009 |
| `URL_TYPOSQUAT_EDIT` | −0.03 pp | 0.00 | 0.000 | −0.13 pp | −0.01 pp | −0.002 |
| *allow-list off* | +0.22 pp | +0.32 pp | +0.002 | +0.88 pp | 0.00 | +0.011 |

Reading: path keywords and IP hosts carry Kaggle; TLD and hostname-length signals carry PhiUSIIL. `URL_LONG_DOMAIN` and `URL_MANY_HYPHENS` cause most of Kaggle's remaining false positives. The brand/typosquat/homoglyph rules — the ones that matter most for targeted impersonation — fire on few URLs in these datasets (e.g. `URL_TYPOSQUAT_EDIT` 31 phishing / 0 legitimate in K).

EMSCAD ablation: disabling `JOB_UNREALISTIC_PAY` drops recall to 0.0% — it is the only job rule that fires on scam ads in this dataset (28 scam / 4 legitimate ads). `JOB_URGENCY`, `JOB_MOVE_TO_CHAT` and `JOB_UPFRONT_FEE` each fired only on legitimate ads (2, 1, 1).

## 6. Threshold sweep (test split)

| Flag if score ≥ | K recall | K FPR | K F1 | P recall | P FPR | P F1 |
|---|---|---|---|---|---|---|
| 10 | 42.8% | 7.8% | 0.568 | 65.2% | 0.2% | 0.788 |
| **20 (shipped)** | **25.5%** | **0.5%** | **0.405** | **23.9%** | **0.2%** | **0.385** |
| 30 | 10.8% | 0.0% | 0.196 | 14.3% | 0.0% | 0.250 |
| 50 (high risk) | 6.0% | 0.0% | 0.112 | 2.6% | 0.0% | 0.051 |

Lowering the threshold to 10 would look much better on PhiUSIIL (65.2% recall at 0.2% FPR), but that comes almost entirely from `URL_NO_HTTPS` (12,800 phishing / 0 legitimate URLs): **every** legitimate URL in PhiUSIIL is HTTPS, a property of how the dataset was built, not of the web. The threshold stays at 20, chosen before looking at the test split.

## 7. What was NOT evaluated (and why)

- **Shopping-scam detector:** no public, labelled dataset of fake-store *pages* (with text, prices, contact info) was found. The rules are covered by SYNTHETIC unit tests only (`tests/fixtures/synthetic/shop_pages.json`); **no performance is claimed.** The harness accepts any `text,label,category` CSV, so a dataset can be added later.
- **Job-scam detection on messages (emails/chats):** EMSCAD contains job *ads*; the strongest rules target the *conversation* stage (fees, fake checks, chat apps, ID requests, free-mail recruiters) and cannot fire on ads. No public labelled corpus of recruiter-scam messages was found. Unit tests use SYNTHETIC messages only (`tests/fixtures/synthetic/job_messages.json`) and are not used as metrics.
- **Backend signals (domain age, SPF/DMARC):** require live RDAP/DNS for every domain at the time of evaluation; the datasets are from 2020–2024, so today's WHOIS age of a long-dead phishing domain is meaningless.
- **Google Safe Browsing / URLhaus:** these list *currently* active threats; looking up years-old URLs would mostly miss, and would send ~100k URLs to third parties. Not evaluated.
- **Gmail extraction on live Gmail:** tested with SYNTHETIC DOM fixtures (JSDOM), not against the live Gmail UI in this evaluation.

## 8. Threats to validity

1. **Dataset artifacts.** PhiUSIIL's legitimate URLs are all HTTPS and mostly bare homepages; Kaggle's are scheme-less, include non-URL garbage rows labelled "good", and date from ≈2020. Lexical rules can partly learn *how the dataset was built*.
2. **Allow-list overlap.** Tranco (2026) overlaps with the legitimate URLs; §4 reports results with the allow-list off.
3. **Tuning on related data.** Weights were tuned on the `dev` half of the *same* datasets under a pre-registered criterion (TUNING_LOG C6); test numbers are a within-distribution estimate, not a guarantee on new phishing.
4. **Lexical-only.** A phishing page on a clean-looking, new domain with no keywords is invisible to these rules (≈ 75% of phishing URLs here were missed). The optional domain-age and threat-intel features exist precisely for that gap but are not measured above.
5. **Rule authorship bias.** The job/shopping rules were written by the same author as the synthetic tests; that is why synthetic data is never used for metrics.
