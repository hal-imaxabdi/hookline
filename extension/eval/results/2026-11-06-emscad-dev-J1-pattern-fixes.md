# Hookline scam-text evaluation — EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)

- **Date:** 2026-11-06T04:44:01.729Z · ruleset `c41cfd80` · engine `49b8329efc5edea6`
- **Dataset:** [EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)](https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction) · sha256 `eeffa6347fc464fc…` · 17880 rows
- **Split:** dev (415 scam / 8520 legitimate in split) · **Sampling:** All rows in the split (no sampling) · text kind `posting`

## Binary metrics (positive = scam; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall | 4.1% (95% CI 2.6%–6.5%) |
| False-positive rate | 0.1% (95% CI 0.0%–0.2%) |
| Precision | 73.9% |
| F1 | 0.078 |
| Accuracy | 95.5% |

Confusion: TP 17 · FN 398 · FP 6 · TN 8514

## Per-category (one-vs-rest on the category label)

| Category | Support | Recall | Precision | F1 | FPR |
|---|---|---|---|---|---|
| credential_phishing | 0 | n/a | n/a | n/a | 0.0% |
| job_scam | 415 | 4.1% | 73.9% | 0.078 | 0.1% |
| shopping_scam | 0 | n/a | n/a | n/a | 0.0% |

## Rule fire counts

| Rule | On scams | On legitimate | Precision |
|---|---|---|---|
| JOB_UNREALISTIC_PAY | 17 | 3 | 85.0% |
| JOB_UPFRONT_FEE | 0 | 1 | 0.0% |
| JOB_SENSITIVE_INFO | 0 | 1 | 0.0% |
| JOB_MOVE_TO_CHAT | 0 | 1 | 0.0% |

## Example false positives

- id 159: JOB_UPFRONT_FEE "…irst client certification and background check fees after 90 days of active client servicin…"
- id 1353: JOB_SENSITIVE_INFO "…amic startup environment. We provide: • 14th monthly salary • Social security • Friendly work environment"
- id 5318: JOB_UNREALISTIC_PAY earn $100,000 · "from home"
- id 6295: JOB_UNREALISTIC_PAY $35per hour · "from home"
- id 13919: JOB_UNREALISTIC_PAY £47 per hour · "flexible hours"
- id 15654: JOB_MOVE_TO_CHAT "Familiarity with JavaScript frameworks like jQueryComfortable working with a distributed team using chat, Google Hangouts, etc."
