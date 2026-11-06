# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T05:17:23.039Z  ·  **Hookline** 2.0.0  ·  ruleset `c41cfd80`  ·  engine `4552b5b8eb06301d`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** test (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 24.8% (95% CI 24.2%–25.3%) |
| False-positive rate | 0.2% (95% CI 0.2%–0.3%) |
| Precision | 99.1% |
| F1 | 0.396 |
| Accuracy | 62.3% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 6193 | FN 18807 |
| **Actual legitimate** | FP 58 | TN 24942 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 66.5% | 0.2% | 99.7% | 0.798 |
| 20 | 24.8% | 0.2% | 99.1% | 0.396 |
| 30 | 14.9% | 0.0% | 99.9% | 0.259 |
| 40 | 5.3% | 0.0% | 99.6% | 0.101 |
| 50 | 2.7% | 0.0% | 100.0% | 0.053 |
| 60 | 0.8% | 0.0% | 100.0% | 0.016 |
| 70 | 0.3% | 0.0% | 100.0% | 0.005 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 1256 | 8 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 23744 | 24992 |

Allow-listed items in sample: 522 phishing, 646 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 13037 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2516 | 21 | 99.2% |
| URL_LONG_DOMAIN | 2251 | 6 | 99.7% |
| URL_MANY_HYPHENS | 1325 | 24 | 98.2% |
| URL_PATH_SCRIPT | 975 | 0 | 100.0% |
| URL_DEEP_SUBDOMAINS | 562 | 0 | 100.0% |
| URL_PATH_LOGIN | 556 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 427 | 5 | 98.8% |
| URL_IP_HOST | 185 | 0 | 100.0% |
| URL_PATH_VERIFY | 88 | 0 | 100.0% |
| URL_PATH_BRAND | 76 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 45 | 3 | 93.8% |
| URL_PUNYCODE | 32 | 0 | 100.0% |
| URL_REDIRECTOR | 4 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 1 | 0 | 100.0% |
| URL_MIXED_SCRIPT | 1 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `https://www.probloggertips.xyz  [URL_SUSPICIOUS_TLD]`
- `https://www.nuevaguia.xyz  [URL_SUSPICIOUS_TLD]`
- `https://www.saint-amand-les-eaux.fr  [URL_MANY_HYPHENS]`
- `https://www.enjoy-the-life-baby.com  [URL_MANY_HYPHENS]`
- `https://www.miles-and-more-kreditkarte.com  [URL_MANY_HYPHENS]`
- `https://www.chase.worcs.sch.uk  [URL_BRAND_IN_DOMAIN]`
- `https://www.ihr-immobilienmakler-in-heidelberg.de  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `https://www.izadi.xyz  [URL_SUSPICIOUS_TLD]`
- `https://www.clowns-sans-frontieres-france.org  [URL_MANY_HYPHENS]`
- `https://www.amazonias.net  [URL_TYPOSQUAT_EDIT]`
- `https://www.kittenbot.cc  [URL_SUSPICIOUS_TLD]`
- `https://www.g-o-o-d.eu  [URL_MANY_HYPHENS]`
- `https://www.where-are-they-now.co.uk  [URL_MANY_HYPHENS]`
- `https://www.googlefight.com  [URL_BRAND_IN_DOMAIN]`
- `https://www.european-flying-car-association.org  [URL_MANY_HYPHENS]`

False negatives (phishing missed):
- `https://daycoval.facildepagar.com.br/#/inicio`
- `https://obabanter36.web.app/`
- `http://emelicker-wixsite-com.usrfiles.com/html/0e472f_4d9b2a88f72eb4191a8eb158b004ca1f.html`
- `http://www.cosmetic1.4code.se`
- `http://www.f0594823.xsph.ru`
- `http://www.mining-help.ru`
- `http://www.piratenbucht.eu`
- `http://www.hostingerapp.com`
- `http://www.spbutoto.com`
- `https://maildinshaakckjnw529.web.app/`
- `http://ixiework.com/secure3a/ch/`
- `http://bit.do/sicurezza3dscarte`
- `https://www.systemathailand.com`
- `http://anilreddydev.github.io/facebookloginpageclone`
- `https://maildinshaakckjnw510.firebaseapp.com/`
