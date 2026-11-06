# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T04:32:37.866Z  ·  **Hookline** 1.0.0  ·  ruleset `9c4019a3`  ·  engine `02398244c7935381`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** on (Tranco K9YYW top 10000 (9846 registrable domains; user-content hosts and shorteners excluded))

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 24.2% (95% CI 23.7%–24.7%) |
| False-positive rate | 0.2% (95% CI 0.2%–0.3%) |
| Precision | 99.0% |
| F1 | 0.389 |
| Accuracy | 62.0% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 6052 | FN 18948 |
| **Actual legitimate** | FP 62 | TN 24938 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 64.3% | 0.2% | 99.6% | 0.781 |
| 20 | 24.2% | 0.2% | 99.0% | 0.389 |
| 30 | 14.1% | 0.0% | 99.9% | 0.248 |
| 40 | 5.2% | 0.0% | 99.7% | 0.099 |
| 50 | 2.9% | 0.0% | 99.6% | 0.057 |
| 60 | 0.6% | 0.0% | 100.0% | 0.012 |
| 70 | 0.3% | 0.0% | 100.0% | 0.005 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 1194 | 7 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 23806 | 24993 |

Allow-listed items in sample: 476 phishing, 616 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 12500 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2535 | 24 | 99.1% |
| URL_LONG_DOMAIN | 2156 | 11 | 99.5% |
| URL_MANY_HYPHENS | 1284 | 22 | 98.3% |
| URL_PATH_SCRIPT | 943 | 0 | 100.0% |
| URL_PATH_LOGIN | 524 | 0 | 100.0% |
| URL_DEEP_SUBDOMAINS | 503 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 403 | 1 | 99.8% |
| URL_IP_HOST | 139 | 0 | 100.0% |
| URL_PATH_VERIFY | 87 | 0 | 100.0% |
| URL_PATH_BRAND | 82 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 49 | 6 | 89.1% |
| URL_PUNYCODE | 36 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 4 | 0 | 100.0% |
| URL_REDIRECTOR | 2 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 2 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `https://www.classicgaming.cc  [URL_SUSPICIOUS_TLD]`
- `https://www.nortoninternetsecurity.cc  [URL_SUSPICIOUS_TLD]`
- `https://www.whats-on-netflix.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.the-girl-who-ate-everything.com  [URL_MANY_HYPHENS]`
- `https://www.coinpage.com  [URL_TYPOSQUAT_EDIT]`
- `https://www.right-to-clean-air.eu  [URL_MANY_HYPHENS]`
- `https://www.stcloudriversedgeconventioncenter.com  [URL_LONG_DOMAIN]`
- `https://www.mut-gegen-rechte-gewalt.de  [URL_MANY_HYPHENS]`
- `https://www.to.click  [URL_SUSPICIOUS_TLD]`
- `https://www.jamaica-land-we-love.com  [URL_MANY_HYPHENS]`
- `https://www.red-hot-chili-stickers.com  [URL_MANY_HYPHENS]`
- `https://www.qr.startech.su  [URL_SUSPICIOUS_TLD]`
- `https://www.ludwig-donau-main-kanal.de  [URL_MANY_HYPHENS]`
- `https://www.tout-equateur-blog-forum.com  [URL_MANY_HYPHENS]`
- `https://www.dreamgames.com  [URL_TYPOSQUAT_EDIT]`

False negatives (phishing missed):
- `http://www.stevenemily.com`
- `http://wsdownloads.cn/zh-cn`
- `https://frei-raus.eu/images/.indx/?email=redacted@redacted.tld&amp;-6e6b4799ff059a9762cb09e317f4d19c-hddas-rya72xq2545lat0173-h3z-yfolsj6qpu`
- `http://www.blakebyblake.com`
- `https://blacknativebeauty.com/mkq3vth3mw8xtddwoui=`
- `http://www.tr.csqoy.com`
- `https://ipfs.io/ipfs/qmtcopdemcbad1crq4adl2bvnxymvax7eewmodbfcuklzv`
- `https://ipfs.io/ipfs/qmatrrxfwqqdokdgme7hsipxya8jekjeskwaa2pychywhj`
- `https://digital3riverslogin.icu/cancel/`
- `https://dev-allstarsingprovin.pantheonsite.io`
- `https://wapdacityfsd.pk/chronopost-alertee/`
- `http://www.sapphiregraphicsarts.com`
- `https://maildinshaakckjnw47.web.app/`
- `http://www.zaxesoutdoor.com`
- `http://www.sasv.ru`
