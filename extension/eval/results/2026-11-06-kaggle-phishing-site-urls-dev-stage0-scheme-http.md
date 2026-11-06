# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T04:21:54.036Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `52f88df88e1212fe`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49905 (95 unparseable)
- **Scheme policy:** `http` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 43.1% (95% CI 42.5%–43.7%) |
| False-positive rate | 11.3% (95% CI 10.9%–11.7%) |
| Precision | 79.2% |
| F1 | 0.558 |
| Accuracy | 65.9% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 10730 | FN 14178 |
| **Actual legitimate** | FP 2821 | TN 22176 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 100.0% | 100.0% | 49.9% | 0.666 |
| 20 | 43.1% | 11.3% | 79.2% | 0.558 |
| 30 | 41.3% | 11.1% | 78.7% | 0.542 |
| 40 | 11.5% | 0.5% | 95.9% | 0.205 |
| 50 | 7.1% | 0.5% | 93.7% | 0.132 |
| 60 | 6.1% | 0.1% | 98.5% | 0.115 |
| 70 | 6.1% | 0.0% | 99.2% | 0.114 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 2645 | 541 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 22263 | 24456 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 24903 | 24997 | 49.9% |
| URL_PATH_SCRIPT | 4897 | 2035 | 70.6% |
| URL_BRAND_IN_DOMAIN | 1728 | 103 | 94.4% |
| URL_DEEP_SUBDOMAINS | 1630 | 172 | 90.5% |
| URL_PATH_LOGIN | 1633 | 4 | 99.8% |
| URL_LONG_DOMAIN | 1446 | 101 | 93.5% |
| URL_PATH_VERIFY | 1018 | 6 | 99.4% |
| URL_IP_HOST | 820 | 1 | 99.9% |
| URL_MANY_HYPHENS | 769 | 41 | 94.9% |
| URL_SUSPICIOUS_TLD | 672 | 9 | 98.7% |
| URL_PATH_BRAND | 660 | 5 | 99.2% |
| URL_TYPOSQUAT_EDIT | 97 | 433 | 18.3% |
| URL_PUNYCODE | 16 | 3 | 84.2% |
| URL_TYPOSQUAT_LEET | 4 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 0 | 2 | 0.0% |

## Example errors

False positives (legitimate flagged):
- `legacy.com/obituaries/hickoryrecord/obituary-browse.aspx?page=2&recentdate=4&entriesperpage=10  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `collegefootballfanatics.com/collegeteams/oklahoma-football.php  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `gopherpucklive.com/forum/viewtopic.php?f=36&p=314832  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `tools.ietf.org/html/rfc2857  [URL_TYPOSQUAT_EDIT, URL_NO_HTTPS]`
- `comingsoon.net/news/movienews.php?id=84591  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `forums.pesfan.com/archive/index.php/t-124650.html  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `cobrecordsbangor.com/gigs.php  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `zoominfo.com/people/Mackinnon_Edwina_758127954.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `ticketwood.com/concerts/Morris-Day-and-the-Time-Tickets/tour.php  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `freepages.genealogy.rootsweb.ancestry.com/~taitandtate/Lin/roberttatesr.htm  [URL_LONG_DOMAIN, URL_NO_HTTPS, URL_DEEP_SUBDOMAINS]`
- `baseball-almanac.com/teamstats/roster.php?y=1993&t=KCA  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `roadrunnerrecords.com/blabbermouth.net/news.aspx?mode=Article&newsitemID=163291  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `hormelfoods.com/brands/hormel/HormelBaconToppings.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `manta.com/c/mm3mcv2/ion-media-networks-inc  [URL_TYPOSQUAT_EDIT, URL_NO_HTTPS]`
- `investbulgaria.com/SubCategory.php?c=47&s=3  [URL_PATH_SCRIPT, URL_NO_HTTPS]`

False negatives (phishing missed):
- `lugaojian.com/js/?us.battle.net/login/en/?ref=ogaezxfus.battle.net/d3/en/index&app=com-d3`
- `awesometime4you.com/wp-admin/js/cmfr/e29e499a10648f0761f09483011be0d8/`
- `livejasminci.no-ip.biz:4444/123456.functions`
- `ndfhj.org/maxe/`
- `timothyalansalon.com/dropboxtax/2/hitech.document.htm`
- `masslung.com/viewfile`
- `embratoor.ahlamontada.com/`
- `www.elegantwheelslt.com/xmlrpc/CieloFidelidade.com.br/`
- `captalclubdubai.com/5242dc187ccebf3f0346fbebac9b0540/`
- `ishigakidenzai.co.jp/tradekey.html`
- `papa-muminek.w.interia.pl/`
- `pastehtml.com/view/bfnv1htvo.html`
- `celinadelgado.com/1/fledin.html`
- `dadinthebox.com/old_aol.1.3/?Lis=10&amp;Login&amp;LigertID=1993745&amp;us=1`
- `pfa17.fr/Mspro.exe`
