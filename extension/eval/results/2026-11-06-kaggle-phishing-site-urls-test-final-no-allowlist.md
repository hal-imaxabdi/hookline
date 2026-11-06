# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T05:16:50.400Z  ·  **Hookline** 2.0.0  ·  ruleset `c41cfd80`  ·  engine `4552b5b8eb06301d`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** test (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49894 (106 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 25.8% (95% CI 25.2%–26.3%) |
| False-positive rate | 0.8% (95% CI 0.7%–0.9%) |
| Precision | 97.0% |
| F1 | 0.407 |
| Accuracy | 62.6% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 6415 | FN 18481 |
| **Actual legitimate** | FP 196 | TN 24802 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 43.1% | 9.3% | 82.2% | 0.565 |
| 20 | 25.8% | 0.8% | 97.0% | 0.407 |
| 30 | 10.9% | 0.0% | 99.8% | 0.196 |
| 40 | 7.1% | 0.0% | 99.7% | 0.133 |
| 50 | 6.0% | 0.0% | 100.0% | 0.112 |
| 60 | 5.9% | 0.0% | 100.0% | 0.112 |
| 70 | 0.1% | 0.0% | 100.0% | 0.003 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 5300 | 34 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 19596 | 24964 |

Allow-listed items in sample: 469 phishing, 8392 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_PATH_SCRIPT | 4890 | 2132 | 69.6% |
| URL_PATH_LOGIN | 1670 | 8 | 99.5% |
| URL_BRAND_IN_DOMAIN | 1655 | 6 | 99.6% |
| URL_DEEP_SUBDOMAINS | 1507 | 66 | 95.8% |
| URL_LONG_DOMAIN | 1458 | 110 | 93.0% |
| URL_PATH_VERIFY | 1188 | 7 | 99.4% |
| URL_MANY_HYPHENS | 784 | 45 | 94.6% |
| URL_IP_HOST | 767 | 0 | 100.0% |
| URL_PATH_BRAND | 671 | 13 | 98.1% |
| URL_SUSPICIOUS_TLD | 672 | 8 | 98.8% |
| URL_TYPOSQUAT_EDIT | 31 | 0 | 100.0% |
| URL_PUNYCODE | 25 | 1 | 96.2% |
| URL_NO_HTTPS | 21 | 0 | 100.0% |
| URL_TYPOSQUAT_LEET | 3 | 0 | 100.0% |
| URL_MIXED_SCRIPT | 2 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 1 | 0 | 100.0% |
| URL_REDIRECTOR | 1 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `my-tangled-roots-links-to-past.com/obituaries  [URL_MANY_HYPHENS]`
- `muse.jhu.edu/login?uri=/journals/scottish_historical_review/v087/87.2.armstrong.html  [URL_PATH_LOGIN]`
- `johnmarkcalahanicehockeydiary.wordpress.com/  [URL_LONG_DOMAIN]`
- `drivermax.com/driver/update/MEDIA/Star-Imavision/SK-2000F-Audio-Driver  [URL_PATH_VERIFY]`
- `dreamfish.com/pg/page/login  [URL_PATH_LOGIN]`
- `kansasfootball-itsbusinesstime.blogspot.com/  [URL_LONG_DOMAIN]`
- `227s-youtube-chili-duke-blue-devils.hoops227.biz/?p=30  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `freepages.genealogy.rootsweb.ancestry.com/~treasures/pa/westmoreland/sewickley/newmarsgr.htm  [URL_LONG_DOMAIN, URL_DEEP_SUBDOMAINS]`
- `vancouver-island-british-columbia.blogspot.com/  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `freepages.genealogy.rootsweb.ancestry.com/~devalter/Audoir/dat295.htm  [URL_LONG_DOMAIN, URL_DEEP_SUBDOMAINS]`
- `freepages.genealogy.rootsweb.ancestry.com/~hutch/DABBS/FosterHaney.htm  [URL_LONG_DOMAIN, URL_DEEP_SUBDOMAINS]`
- `respironicssleeptherapysystems.respironics.com/  [URL_LONG_DOMAIN]`
- `financial-dictionary.thefreedictionary.com/Transactional+account  [URL_LONG_DOMAIN]`
- `google.com/support/forum/p/Google+Apps/thread?tid=23621a96a0b511c1&hl=en  [URL_PATH_BRAND]`
- `cali-timmins-nude.pic-celebrity.com/  [URL_MANY_HYPHENS]`

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
