# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T04:28:08.152Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `005b4a2dd7263d5c`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 14.8% (95% CI 14.4%–15.3%) |
| False-positive rate | 0.0% (95% CI 0.0%–0.1%) |
| Precision | 99.7% |
| F1 | 0.258 |
| Accuracy | 57.4% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 3711 | FN 21289 |
| **Actual legitimate** | FP 10 | TN 24990 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 63.9% | 0.2% | 99.7% | 0.779 |
| 20 | 14.8% | 0.0% | 99.7% | 0.258 |
| 30 | 7.5% | 0.0% | 99.6% | 0.140 |
| 40 | 4.2% | 0.0% | 99.3% | 0.081 |
| 50 | 1.3% | 0.0% | 99.1% | 0.026 |
| 60 | 0.7% | 0.0% | 100.0% | 0.013 |
| 70 | 0.2% | 0.0% | 100.0% | 0.003 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 656 | 10 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 24344 | 24990 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 12722 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2550 | 24 | 99.1% |
| URL_LONG_DOMAIN | 2266 | 12 | 99.5% |
| URL_MANY_HYPHENS | 1371 | 22 | 98.4% |
| URL_PATH_SCRIPT | 989 | 0 | 100.0% |
| URL_DEEP_SUBDOMAINS | 562 | 0 | 100.0% |
| URL_PATH_LOGIN | 555 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 436 | 4 | 99.1% |
| URL_IP_HOST | 139 | 0 | 100.0% |
| URL_PATH_VERIFY | 87 | 0 | 100.0% |
| URL_PATH_BRAND | 82 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 49 | 6 | 89.1% |
| URL_PUNYCODE | 36 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 4 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 2 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `https://www.whats-on-netflix.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.coinpage.com  [URL_TYPOSQUAT_EDIT]`
- `https://www.dreamgames.com  [URL_TYPOSQUAT_EDIT]`
- `https://www.google.org  [URL_BRAND_IN_DOMAIN]`
- `https://www.microsat.com.pl  [URL_TYPOSQUAT_EDIT]`
- `https://www.blog.google  [URL_BRAND_IN_DOMAIN]`
- `https://www.mapple.co.jp  [URL_TYPOSQUAT_EDIT]`
- `https://www.inance.com  [URL_TYPOSQUAT_EDIT]`
- `https://www.huaweicloud.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.mcloud.de  [URL_TYPOSQUAT_EDIT]`

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
