# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T04:23:34.379Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `8af7c0cc12fcd9d9`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 15.6% (95% CI 15.1%–16.0%) |
| False-positive rate | 1.1% (95% CI 1.0%–1.3%) |
| Precision | 93.3% |
| F1 | 0.267 |
| Accuracy | 57.2% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 3888 | FN 21112 |
| **Actual legitimate** | FP 281 | TN 24719 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 64.3% | 1.3% | 98.1% | 0.776 |
| 20 | 15.6% | 1.1% | 93.3% | 0.267 |
| 30 | 8.1% | 0.4% | 95.2% | 0.150 |
| 40 | 4.7% | 0.4% | 92.0% | 0.090 |
| 50 | 1.6% | 0.2% | 91.1% | 0.031 |
| 60 | 0.7% | 0.0% | 98.4% | 0.015 |
| 70 | 0.2% | 0.0% | 95.4% | 0.005 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 856 | 281 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 24144 | 24719 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 12722 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2550 | 24 | 99.1% |
| URL_LONG_DOMAIN | 2266 | 12 | 99.5% |
| URL_MANY_HYPHENS | 1371 | 22 | 98.4% |
| URL_PATH_SCRIPT | 989 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 543 | 68 | 88.9% |
| URL_DEEP_SUBDOMAINS | 562 | 0 | 100.0% |
| URL_PATH_LOGIN | 555 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 153 | 215 | 41.6% |
| URL_IP_HOST | 139 | 0 | 100.0% |
| URL_PATH_VERIFY | 87 | 0 | 100.0% |
| URL_PATH_BRAND | 82 | 0 | 100.0% |
| URL_PUNYCODE | 36 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 4 | 1 | 80.0% |
| URL_TYPOSQUAT_LEET | 2 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `https://www.abasketfullofapples.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.cbeta.org  [URL_TYPOSQUAT_EDIT]`
- `https://www.psta.net  [URL_TYPOSQUAT_EDIT]`
- `https://www.adime.cn  [URL_TYPOSQUAT_EDIT]`
- `https://www.atmail.com  [URL_TYPOSQUAT_EDIT]`
- `https://www.ndti.org.uk  [URL_TYPOSQUAT_EDIT]`
- `https://www.dhimurru.com.au  [URL_BRAND_IN_DOMAIN]`
- `https://www.whats-on-netflix.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.mcts.edu  [URL_TYPOSQUAT_EDIT]`
- `https://www.city.aomori.aomori.jp  [URL_TYPOSQUAT_EDIT]`
- `https://www.meteo.gr  [URL_TYPOSQUAT_EDIT]`
- `https://www.peto.pet  [URL_TYPOSQUAT_EDIT]`
- `https://www.moha.gov.vn  [URL_TYPOSQUAT_EDIT]`
- `https://www.7cups.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.metrx.com  [URL_TYPOSQUAT_EDIT]`

False negatives (phishing missed):
- `http://www.stevenemily.com`
- `http://wsdownloads.cn/zh-cn`
- `https://fen-gero-della-fridio-keliko.web.app/`
- `https://frei-raus.eu/images/.indx/?email=redacted@redacted.tld&amp;-6e6b4799ff059a9762cb09e317f4d19c-hddas-rya72xq2545lat0173-h3z-yfolsj6qpu`
- `http://www.blakebyblake.com`
- `https://blacknativebeauty.com/mkq3vth3mw8xtddwoui=`
- `http://www.tr.csqoy.com`
- `https://bipprovincempress.click/`
- `https://ipfs.io/ipfs/qmtcopdemcbad1crq4adl2bvnxymvax7eewmodbfcuklzv`
- `https://ipfs.io/ipfs/qmatrrxfwqqdokdgme7hsipxya8jekjeskwaa2pychywhj`
- `https://digital3riverslogin.icu/cancel/`
- `https://connection-orangebank-certicode.derlma.com/8754329/`
- `https://goodsallegrol0-kalnie.7567576.xyz/ehskymzt?from_sms=1`
- `https://file-share-from-kerry-folder-view.web.app/`
- `https://dev-allstarsingprovin.pantheonsite.io`
