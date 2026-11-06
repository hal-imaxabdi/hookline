# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T04:26:34.177Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `bee2591892eda1a8`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 15.7% (95% CI 15.2%–16.1%) |
| False-positive rate | 1.4% (95% CI 1.3%–1.5%) |
| Precision | 91.8% |
| F1 | 0.268 |
| Accuracy | 57.1% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 3923 | FN 21077 |
| **Actual legitimate** | FP 349 | TN 24651 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 64.2% | 1.5% | 97.7% | 0.775 |
| 20 | 15.7% | 1.4% | 91.8% | 0.268 |
| 30 | 8.2% | 0.2% | 97.8% | 0.152 |
| 40 | 4.5% | 0.2% | 96.0% | 0.085 |
| 50 | 1.4% | 0.2% | 89.5% | 0.027 |
| 60 | 0.7% | 0.0% | 99.4% | 0.014 |
| 70 | 0.2% | 0.0% | 98.1% | 0.004 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 897 | 349 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 24103 | 24651 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 12722 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2550 | 24 | 99.1% |
| URL_LONG_DOMAIN | 2266 | 12 | 99.5% |
| URL_MANY_HYPHENS | 1371 | 22 | 98.4% |
| URL_PATH_SCRIPT | 989 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 271 | 342 | 44.2% |
| URL_DEEP_SUBDOMAINS | 562 | 0 | 100.0% |
| URL_PATH_LOGIN | 555 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 461 | 7 | 98.5% |
| URL_IP_HOST | 139 | 0 | 100.0% |
| URL_PATH_VERIFY | 87 | 0 | 100.0% |
| URL_PATH_BRAND | 82 | 0 | 100.0% |
| URL_PUNYCODE | 36 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 4 | 1 | 80.0% |
| URL_TYPOSQUAT_LEET | 2 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `https://www.jbang.dev  [URL_TYPOSQUAT_EDIT]`
- `https://www.lasd.net  [URL_TYPOSQUAT_EDIT]`
- `https://www.cpo.noaa.gov  [URL_TYPOSQUAT_EDIT]`
- `https://www.ilna.ir  [URL_TYPOSQUAT_EDIT]`
- `https://www.unsw.adfa.edu.au  [URL_TYPOSQUAT_EDIT]`
- `https://www.noaa.gov  [URL_TYPOSQUAT_EDIT]`
- `https://www.northcountyoutlook.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.cbeta.org  [URL_TYPOSQUAT_EDIT]`
- `https://www.cora.health  [URL_TYPOSQUAT_EDIT]`
- `https://www.aazp.in  [URL_TYPOSQUAT_EDIT]`
- `https://www.psta.net  [URL_TYPOSQUAT_EDIT]`
- `https://www.cpc.ncep.noaa.gov  [URL_TYPOSQUAT_EDIT]`
- `https://www.adime.cn  [URL_TYPOSQUAT_EDIT]`
- `https://www.lgkp.gov.pk  [URL_TYPOSQUAT_EDIT]`
- `https://www.atmail.com  [URL_TYPOSQUAT_EDIT]`

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
