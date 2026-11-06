# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T05:15:51.007Z  ·  **Hookline** 2.0.0  ·  ruleset `c41cfd80`  ·  engine `4552b5b8eb06301d`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** test (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49894 (106 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** on (Tranco K9YYW top 10000 (9846 registrable domains; user-content hosts and shorteners excluded))

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 25.5% (95% CI 25.0%–26.1%) |
| False-positive rate | 0.5% (95% CI 0.4%–0.6%) |
| Precision | 98.2% |
| F1 | 0.405 |
| Accuracy | 62.6% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 6359 | FN 18537 |
| **Actual legitimate** | FP 115 | TN 24883 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 42.8% | 7.8% | 84.6% | 0.568 |
| 20 | 25.5% | 0.5% | 98.2% | 0.405 |
| 30 | 10.8% | 0.0% | 99.8% | 0.196 |
| 40 | 7.1% | 0.0% | 99.7% | 0.133 |
| 50 | 6.0% | 0.0% | 100.0% | 0.112 |
| 60 | 5.9% | 0.0% | 100.0% | 0.112 |
| 70 | 0.1% | 0.0% | 100.0% | 0.003 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 5275 | 23 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 19621 | 24975 |

Allow-listed items in sample: 469 phishing, 8392 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_PATH_SCRIPT | 4873 | 1829 | 72.7% |
| URL_PATH_LOGIN | 1660 | 6 | 99.6% |
| URL_BRAND_IN_DOMAIN | 1654 | 5 | 99.7% |
| URL_LONG_DOMAIN | 1454 | 45 | 97.0% |
| URL_DEEP_SUBDOMAINS | 1485 | 6 | 99.6% |
| URL_PATH_VERIFY | 1179 | 5 | 99.6% |
| URL_MANY_HYPHENS | 765 | 43 | 94.7% |
| URL_IP_HOST | 767 | 0 | 100.0% |
| URL_SUSPICIOUS_TLD | 672 | 8 | 98.8% |
| URL_PATH_BRAND | 666 | 7 | 99.0% |
| URL_TYPOSQUAT_EDIT | 31 | 0 | 100.0% |
| URL_PUNYCODE | 25 | 1 | 96.2% |
| URL_NO_HTTPS | 21 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 3 | 0 | 100.0% |
| URL_MIXED_SCRIPT | 2 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 1 | 0 | 100.0% |
| URL_REDIRECTOR | 1 | 0 | 100.0% |

## Ablation (metric change when ONE rule is disabled)

| Disabled rule | Recall | Δ Recall | FPR | Δ FPR | Δ Precision | Δ F1 |
|---|---|---|---|---|---|---|
| URL_BRAND_IN_DOMAIN | 24.4% | -1.09 pp | 0.4% | -0.02 pp | +0.00 pp | -0.014 |
| URL_TYPOSQUAT_LEET | 25.5% | +0.00 pp | 0.5% | +0.00 pp | +0.00 pp | +0.000 |
| URL_TYPOSQUAT_KEYBOARD | 25.5% | -0.00 pp | 0.5% | +0.00 pp | -0.00 pp | -0.000 |
| URL_TYPOSQUAT_EDIT | 25.5% | -0.03 pp | 0.5% | +0.00 pp | -0.00 pp | -0.000 |
| URL_PUNYCODE | 25.5% | -0.01 pp | 0.5% | +0.00 pp | -0.00 pp | -0.000 |
| URL_MIXED_SCRIPT | 25.5% | -0.00 pp | 0.5% | +0.00 pp | -0.00 pp | -0.000 |
| URL_SUSPICIOUS_TLD | 23.3% | -2.21 pp | 0.4% | -0.03 pp | -0.03 pp | -0.028 |
| URL_PATH_VERIFY | 21.5% | -4.03 pp | 0.4% | -0.02 pp | -0.24 pp | -0.053 |
| URL_PATH_LOGIN | 21.6% | -3.98 pp | 0.4% | -0.02 pp | -0.21 pp | -0.052 |
| URL_PATH_BRAND | 23.4% | -2.19 pp | 0.4% | -0.03 pp | -0.05 pp | -0.028 |
| URL_PATH_SCRIPT | 25.5% | -0.05 pp | 0.5% | +0.00 pp | -0.00 pp | -0.001 |
| URL_LONG_DOMAIN | 25.2% | -0.32 pp | 0.3% | -0.14 pp | +0.52 pp | -0.004 |
| URL_MANY_HYPHENS | 25.3% | -0.23 pp | 0.3% | -0.14 pp | +0.51 pp | -0.003 |
| URL_IP_HOST | 22.6% | -2.97 pp | 0.5% | +0.00 pp | -0.23 pp | -0.039 |
| URL_DEEP_SUBDOMAINS | 25.0% | -0.52 pp | 0.4% | -0.02 pp | +0.04 pp | -0.007 |
| URL_NO_HTTPS | 25.5% | -0.04 pp | 0.5% | +0.00 pp | -0.00 pp | -0.001 |
| URL_REDIRECTOR | 25.5% | +0.00 pp | 0.5% | +0.00 pp | +0.00 pp | +0.000 |
| *(allow-list OFF)* | 25.8% | +0.22 pp | 0.8% | +0.32 pp | -1.19 pp | +0.002 |

## Example errors

False positives (legitimate flagged):
- `my-tangled-roots-links-to-past.com/obituaries  [URL_MANY_HYPHENS]`
- `johnmarkcalahanicehockeydiary.wordpress.com/  [URL_LONG_DOMAIN]`
- `drivermax.com/driver/update/MEDIA/Star-Imavision/SK-2000F-Audio-Driver  [URL_PATH_VERIFY]`
- `dreamfish.com/pg/page/login  [URL_PATH_LOGIN]`
- `kansasfootball-itsbusinesstime.blogspot.com/  [URL_LONG_DOMAIN]`
- `227s-youtube-chili-duke-blue-devils.hoops227.biz/?p=30  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `vancouver-island-british-columbia.blogspot.com/  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `respironicssleeptherapysystems.respironics.com/  [URL_LONG_DOMAIN]`
- `cali-timmins-nude.pic-celebrity.com/  [URL_MANY_HYPHENS]`
- `pauletvirginiehotelmauritius.accommodation.io/  [URL_LONG_DOMAIN]`
- `enchantedserenityperiodfilms.blogspot.com/2011/02/jane-eyre-2011-2-new-film-clips.html  [URL_LONG_DOMAIN]`
- `taxi-top-digital-signs.com/news/  [URL_MANY_HYPHENS]`
- `rose-gardening-made-easy.com/winterizing-roses.html  [URL_MANY_HYPHENS]`
- `fhvxmyx3whb.absolutetestofsometech.su/?n=6034&amp;tid=55498  [URL_SUSPICIOUS_TLD]`
- `michelebachmannforpresidentin2012.blogspot.com/  [URL_LONG_DOMAIN]`

False negatives (phishing missed):
- `geomat.gr/wp-includes/fonts/udp/payuk/dir/Information.html`
- `belabrazilspa.com/wwwow/hl.php`
- `nwedellco.com/oluwadey/panel/admin.php`
- `dynmsg.modpim.com:8081/api/data`
- `riegeevoo.com/data/feeder/`
- `camarasimoesfilho.ba.gov.br/anunciantes/decide/`
- `polykarpou.com/g766d4ft`
- `'www.pakistudio.com/.\%20/remax/'`
- `donazerty.goodluckwith.us/nets-dk/verifikationNets/Verifiedbyvisa/pay_form_ec_cvv2_fichiers/pay_form_ec_cvv2.html?cmd=_Processing&amp;dispat`
- `aktualizace.tripod.com/`
- `fenastras.depotzen.com/t3i9wj23n5.php\nwww.4-bid.com/index.html`
- `grupoprosur.com/zeta/cp.php?m=login`
- `q8mailsender.com/int/link.php?M=32859&amp;N=2&amp;L=1&amp;F=H`
- `velavanjewel.com/admin/web/AOL/index-aol.html`
- `bahutnorma.net/2pceo6`
