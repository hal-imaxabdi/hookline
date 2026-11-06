# Hookline scam-text evaluation — EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)

- **Date:** 2026-11-06T04:41:36.620Z · ruleset `c41cfd80` · engine `e34438ef6127c3f5`
- **Dataset:** [EMSCAD — Employment Scam Aegean Dataset (Kaggle mirror: Real / Fake Job Posting Prediction)](https://www.kaggle.com/datasets/shivamb/real-or-fake-fake-jobposting-prediction) · sha256 `eeffa6347fc464fc…` · 17880 rows
- **Split:** dev (415 scam / 8520 legitimate in split) · **Sampling:** All rows in the split (no sampling) · text kind `posting`

## Binary metrics (positive = scam; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall | 5.8% (95% CI 3.9%–8.5%) |
| False-positive rate | 2.7% (95% CI 2.4%–3.1%) |
| Precision | 9.4% |
| F1 | 0.072 |
| Accuracy | 93.0% |

Confusion: TP 24 · FN 391 · FP 231 · TN 8289

## Per-category (one-vs-rest on the category label)

| Category | Support | Recall | Precision | F1 | FPR |
|---|---|---|---|---|---|
| credential_phishing | 0 | n/a | 0.0% | n/a | 0.0% |
| job_scam | 415 | 4.6% | 22.1% | 0.076 | 0.8% |
| shopping_scam | 0 | n/a | 0.0% | n/a | 1.8% |

## Rule fire counts

| Rule | On scams | On legitimate | Precision |
|---|---|---|---|
| EMAIL_URGENCY | 51 | 519 | 8.9% |
| SHOP_NO_CONTACT | 2 | 164 | 1.2% |
| JOB_TASK_DEPOSIT | 0 | 28 | 0.0% |
| JOB_UNREALISTIC_PAY | 17 | 3 | 85.0% |
| EMAIL_CREDENTIAL_REQUEST | 4 | 15 | 21.1% |
| JOB_SENSITIVE_INFO | 0 | 14 | 0.0% |
| JOB_CHECK_SCHEME | 1 | 10 | 9.1% |
| JOB_UPFRONT_FEE | 0 | 7 | 0.0% |
| JOB_OFFER_NO_INTERVIEW | 0 | 4 | 0.0% |
| JOB_MOVE_TO_CHAT | 1 | 1 | 50.0% |

## Example false positives

- id 47: JOB_TASK_DEPOSIT "In Egypt common practice has shown that most of the development banks have turned to current operations and deposit gathering, acting as mere commercial banks a"
- id 129: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 159: JOB_UPFRONT_FEE "…irst client certification and background check fees after 90 days of active client servicin…"
- id 219: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 266: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 465: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 575: JOB_SENSITIVE_INFO "Anyone with a UK bank account and a UK mobile phone can download the Moni app and start sending money.It is a simple, convenient and secure way to send money in"
- id 613: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 1204: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page
- id 1207: SHOP_NO_CONTACT No phone/tel: link and no recognisable street address found on the page | EMAIL_URGENCY 
