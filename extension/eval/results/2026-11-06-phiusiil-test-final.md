# Hookline URL evaluation — PhiUSIIL Phishing URL Dataset (UCI #967)

- **Date:** 2026-11-06T05:16:20.478Z  ·  **Hookline** 2.0.0  ·  ruleset `c41cfd80`  ·  engine `4552b5b8eb06301d`
- **Dataset:** [PhiUSIIL Phishing URL Dataset (UCI #967)](https://archive.ics.uci.edu/dataset/967/phiusiil+phishing+url+dataset) · sha256 `a236549cd369cd80…` · 235795 rows (425 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** test (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 50000 (0 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** on (Tranco K9YYW top 10000 (9846 registrable domains; user-content hosts and shorteners excluded))

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 23.9% (95% CI 23.4%–24.4%) |
| False-positive rate | 0.2% (95% CI 0.2%–0.3%) |
| Precision | 99.1% |
| F1 | 0.385 |
| Accuracy | 61.8% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 5973 | FN 19027 |
| **Actual legitimate** | FP 57 | TN 24943 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 65.2% | 0.2% | 99.7% | 0.788 |
| 20 | 23.9% | 0.2% | 99.1% | 0.385 |
| 30 | 14.3% | 0.0% | 99.9% | 0.250 |
| 40 | 5.2% | 0.0% | 99.6% | 0.098 |
| 50 | 2.6% | 0.0% | 100.0% | 0.051 |
| 60 | 0.7% | 0.0% | 100.0% | 0.014 |
| 70 | 0.3% | 0.0% | 100.0% | 0.005 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 1187 | 8 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 23813 | 24992 |

Allow-listed items in sample: 522 phishing, 646 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 12800 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 2506 | 21 | 99.2% |
| URL_LONG_DOMAIN | 2138 | 5 | 99.8% |
| URL_MANY_HYPHENS | 1243 | 24 | 98.1% |
| URL_PATH_SCRIPT | 939 | 0 | 100.0% |
| URL_PATH_LOGIN | 522 | 0 | 100.0% |
| URL_DEEP_SUBDOMAINS | 510 | 0 | 100.0% |
| URL_BRAND_IN_DOMAIN | 393 | 5 | 98.7% |
| URL_IP_HOST | 185 | 0 | 100.0% |
| URL_PATH_VERIFY | 88 | 0 | 100.0% |
| URL_PATH_BRAND | 75 | 0 | 100.0% |
| URL_TYPOSQUAT_EDIT | 45 | 3 | 93.8% |
| URL_PUNYCODE | 31 | 0 | 100.0% |
| URL_REDIRECTOR | 4 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 1 | 0 | 100.0% |
| URL_MIXED_SCRIPT | 1 | 0 | 100.0% |

## Ablation (metric change when ONE rule is disabled)

| Disabled rule | Recall | Δ Recall | FPR | Δ FPR | Δ Precision | Δ F1 |
|---|---|---|---|---|---|---|
| URL_BRAND_IN_DOMAIN | 23.0% | -0.94 pp | 0.2% | -0.02 pp | +0.05 pp | -0.012 |
| URL_TYPOSQUAT_LEET | 23.9% | -0.00 pp | 0.2% | +0.00 pp | -0.00 pp | -0.000 |
| URL_TYPOSQUAT_EDIT | 23.8% | -0.13 pp | 0.2% | -0.01 pp | +0.04 pp | -0.002 |
| URL_PUNYCODE | 23.8% | -0.05 pp | 0.2% | +0.00 pp | -0.00 pp | -0.001 |
| URL_MIXED_SCRIPT | 23.9% | +0.00 pp | 0.2% | +0.00 pp | +0.00 pp | +0.000 |
| URL_SUSPICIOUS_TLD | 16.8% | -7.13 pp | 0.1% | -0.08 pp | +0.09 pp | -0.098 |
| URL_PATH_VERIFY | 23.6% | -0.26 pp | 0.2% | +0.00 pp | -0.01 pp | -0.003 |
| URL_PATH_LOGIN | 22.7% | -1.24 pp | 0.2% | +0.00 pp | -0.05 pp | -0.016 |
| URL_PATH_BRAND | 23.6% | -0.28 pp | 0.2% | +0.00 pp | -0.01 pp | -0.004 |
| URL_PATH_SCRIPT | 23.2% | -0.66 pp | 0.2% | +0.00 pp | -0.03 pp | -0.009 |
| URL_LONG_DOMAIN | 20.8% | -3.12 pp | 0.2% | -0.02 pp | -0.06 pp | -0.042 |
| URL_MANY_HYPHENS | 22.0% | -1.93 pp | 0.1% | -0.09 pp | +0.33 pp | -0.025 |
| URL_IP_HOST | 23.5% | -0.35 pp | 0.2% | +0.00 pp | -0.01 pp | -0.005 |
| URL_DEEP_SUBDOMAINS | 23.3% | -0.61 pp | 0.2% | +0.00 pp | -0.02 pp | -0.008 |
| URL_NO_HTTPS | 23.2% | -0.70 pp | 0.2% | +0.00 pp | -0.03 pp | -0.009 |
| URL_REDIRECTOR | 23.9% | +0.00 pp | 0.2% | +0.00 pp | +0.00 pp | +0.000 |
| *(allow-list OFF)* | 24.8% | +0.88 pp | 0.2% | +0.00 pp | +0.02 pp | +0.011 |

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
- `http://www.sycg.oss-eu-west-1.aliyuncs.com`
- `http://bit.do/sicurezza3dscarte`
- `https://www.systemathailand.com`
- `http://anilreddydev.github.io/facebookloginpageclone`
