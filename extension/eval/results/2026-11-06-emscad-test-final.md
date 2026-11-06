# Hookline scam-text evaluation — EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)

- **Date:** 2026-11-06T05:18:16.601Z · ruleset `c41cfd80` · engine `4552b5b8eb06301d`
- **Dataset:** [EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)](https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction) · sha256 `eeffa6347fc464fc…` · 17880 rows
- **Split:** test (451 scam / 8494 legitimate in split) · **Sampling:** All rows in the split (no sampling) · text kind `posting`

## Binary metrics (positive = scam; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall | 6.2% (95% CI 4.3%–8.8%) |
| False-positive rate | 0.1% (95% CI 0.0%–0.2%) |
| Precision | 82.4% |
| F1 | 0.115 |
| Accuracy | 95.2% |

Confusion: TP 28 · FN 423 · FP 6 · TN 8488

## Per-category (one-vs-rest on the category label)

| Category | Support | Recall | Precision | F1 | FPR |
|---|---|---|---|---|---|
| credential_phishing | 0 | n/a | n/a | n/a | 0.0% |
| job_scam | 451 | 6.2% | 82.4% | 0.115 | 0.1% |
| shopping_scam | 0 | n/a | n/a | n/a | 0.0% |

## Rule fire counts

| Rule | On scams | On legitimate | Precision |
|---|---|---|---|
| JOB_UNREALISTIC_PAY | 28 | 4 | 87.5% |
| JOB_URGENCY | 0 | 2 | 0.0% |
| JOB_MOVE_TO_CHAT | 0 | 1 | 0.0% |
| JOB_UPFRONT_FEE | 0 | 1 | 0.0% |

## Ablation (one rule disabled)

| Disabled rule | Recall | Δ Recall | FPR | Δ FPR | Δ F1 |
|---|---|---|---|---|---|
| JOB_UPFRONT_FEE | 6.2% | +0.00 pp | 0.1% | -0.01 pp | +0.000 |
| JOB_MOVE_TO_CHAT | 6.2% | +0.00 pp | 0.1% | -0.01 pp | +0.000 |
| JOB_UNREALISTIC_PAY | 0.0% | -6.21 pp | 0.0% | -0.05 pp | -0.115 |
| JOB_URGENCY | 6.2% | +0.00 pp | 0.1% | +0.00 pp | +0.000 |

## Example false positives

- id 3029: JOB_MOVE_TO_CHAT "While we currently communicate with customers via email and phone, your responsibilities will include creative thinking about future additional or alternative c"
- id 5336: JOB_UNREALISTIC_PAY earn $150,000 · "from home"
- id 8012: JOB_UNREALISTIC_PAY $120/hour · "from home"
- id 9435: JOB_UPFRONT_FEE "…for raises• Full coverage of Work Permit fee and visa• English speaking Thai consult…"
- id 13904: JOB_UNREALISTIC_PAY £47 per hour · "flexible hours"
- id 14138: JOB_UNREALISTIC_PAY Make up to $5,000 · "from your home"
