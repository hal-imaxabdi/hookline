# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T05:17:53.688Z  ·  **Hookline** 2.0.0  ·  ruleset `c41cfd80`  ·  engine `4552b5b8eb06301d`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** test (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49894 (106 unparseable)
- **Scheme policy:** `http` · **Allow-list:** on (Tranco K9YYW top 10000 (9846 registrable domains; user-content hosts and shorteners excluded))

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 42.8% (95% CI 42.2%–43.4%) |
| False-positive rate | 7.8% (95% CI 7.5%–8.1%) |
| Precision | 84.6% |
| F1 | 0.568 |
| Accuracy | 67.6% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 10654 | FN 14242 |
| **Actual legitimate** | FP 1944 | TN 23054 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 98.1% | 66.4% | 59.5% | 0.741 |
| 20 | 42.8% | 7.8% | 84.6% | 0.568 |
| 30 | 42.7% | 7.8% | 84.6% | 0.568 |
| 40 | 10.8% | 0.0% | 99.8% | 0.195 |
| 50 | 7.7% | 0.0% | 99.7% | 0.143 |
| 60 | 6.0% | 0.0% | 100.0% | 0.112 |
| 70 | 5.9% | 0.0% | 100.0% | 0.112 |

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
| URL_NO_HTTPS | 24426 | 16606 | 59.5% |
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
| URL_TYPOSQUAT_LEET | 3 | 0 | 100.0% |
| URL_MIXED_SCRIPT | 2 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 1 | 0 | 100.0% |
| URL_REDIRECTOR | 1 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `allaboutjazz.com/php/profile_editor_list.php?id=1  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `leaguelineup.com/welcome.asp?url=cflsting_jimmy  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `utne.com/arts-culture/Which-Metal-Singers-Have-the-Best-Vocal-Technique.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `veromi.com/FL/Vicki-Brady.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `gocatawbaindians.com/article.asp?articleID=2655  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `lakehouse.com/browse_map.php?cat=2  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `comingsoon.net/films.php?id=46275  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `archive.gg.ca/gg/fgg/bios/01/vanier_e.asp  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `nationalpost.stats.com/golf/golfer.asp?golfer=0265&tour=PGA  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `baseball-almanac.com/teamstats/roster.php?y=2000&t=MON  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `carnaticindia.com/signguestbook.asp  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `baseballprospectus.com/article.php?articleid=15061  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `hcso.org/PublicServices/InmateInfo/InmateInfoMain.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `peppiattfineart.co.uk/display.php?KT_artists=Albert+Goodwin%2C+R.W.S  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `rsmrichter.com/highlight.aspx?ID=233  [URL_PATH_SCRIPT, URL_NO_HTTPS]`

False negatives (phishing missed):
- `geomat.gr/wp-includes/fonts/udp/payuk/dir/Information.html`
- `dynmsg.modpim.com:8081/api/data`
- `riegeevoo.com/data/feeder/`
- `camarasimoesfilho.ba.gov.br/anunciantes/decide/`
- `polykarpou.com/g766d4ft`
- `'www.pakistudio.com/.\%20/remax/'`
- `donazerty.goodluckwith.us/nets-dk/verifikationNets/Verifiedbyvisa/pay_form_ec_cvv2_fichiers/pay_form_ec_cvv2.html?cmd=_Processing&amp;dispat`
- `aktualizace.tripod.com/`
- `velavanjewel.com/admin/web/AOL/index-aol.html`
- `bahutnorma.net/2pceo6`
- `dentistkart.com/images/.impots/d4f134546819d194b8c4c89d30f94ba3/`
- `cdn-logichosting.com/`
- `zgqz11315.com/rt7vl`
- `dwmfile3.com`
- `bookinghotworld.ws/18p0no4e`
