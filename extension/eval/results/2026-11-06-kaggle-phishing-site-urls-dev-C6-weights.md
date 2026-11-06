# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T04:32:14.075Z  ·  **Hookline** 1.0.0  ·  ruleset `9c4019a3`  ·  engine `02398244c7935381`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49905 (95 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** on (Tranco K9YYW top 10000 (9846 registrable domains; user-content hosts and shorteners excluded))

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 24.8% (95% CI 24.3%–25.4%) |
| False-positive rate | 0.4% (95% CI 0.3%–0.5%) |
| Precision | 98.4% |
| F1 | 0.396 |
| Accuracy | 62.3% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 6182 | FN 18726 |
| **Actual legitimate** | FP 102 | TN 24895 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 42.2% | 7.5% | 84.9% | 0.564 |
| 20 | 24.8% | 0.4% | 98.4% | 0.396 |
| 30 | 11.0% | 0.0% | 99.7% | 0.199 |
| 40 | 7.1% | 0.0% | 99.7% | 0.133 |
| 50 | 6.0% | 0.0% | 99.9% | 0.113 |
| 60 | 6.0% | 0.0% | 99.9% | 0.113 |
| 70 | 0.1% | 0.0% | 100.0% | 0.003 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 5077 | 18 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 19831 | 24979 |

Allow-listed items in sample: 459 phishing, 8500 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_PATH_SCRIPT | 4885 | 1766 | 73.4% |
| URL_BRAND_IN_DOMAIN | 1632 | 4 | 99.8% |
| URL_PATH_LOGIN | 1625 | 2 | 99.9% |
| URL_DEEP_SUBDOMAINS | 1486 | 9 | 99.4% |
| URL_LONG_DOMAIN | 1442 | 38 | 97.4% |
| URL_PATH_VERIFY | 1005 | 5 | 99.5% |
| URL_IP_HOST | 820 | 1 | 99.9% |
| URL_MANY_HYPHENS | 738 | 39 | 95.0% |
| URL_SUSPICIOUS_TLD | 671 | 9 | 98.7% |
| URL_PATH_BRAND | 654 | 3 | 99.5% |
| URL_TYPOSQUAT_EDIT | 36 | 3 | 92.3% |
| URL_NO_HTTPS | 20 | 0 | 100.0% |
| URL_PUNYCODE | 16 | 3 | 84.2% |
| URL_TYPOSQUAT_LEET | 4 | 0 | 100.0% |
| URL_TYPOSQUAT_KEYBOARD | 1 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `learnonline.cc/clozure/cats.php?c=American+businesspeople  [URL_SUSPICIOUS_TLD, URL_PATH_SCRIPT]`
- `television-argentina-televidente.blogspot.com/2010_12_01_archive.html  [URL_LONG_DOMAIN]`
- `littlebits.cc/  [URL_SUSPICIOUS_TLD]`
- `neal-berniesexcellentadventure.blogspot.com/  [URL_LONG_DOMAIN]`
- `arbitrationmediationcaliforniaorangecountysandiegolosangeles.com/index.html  [URL_LONG_DOMAIN]`
- `jamison.bucks.pa.foreclosuredatabank.com/  [URL_DEEP_SUBDOMAINS]`
- `divorcelawyerinaugustageorgia.blogspot.com/  [URL_LONG_DOMAIN]`
- `southwindgalleryatframewoods.camstreams.com/  [URL_LONG_DOMAIN]`
- `forums.ufc.production.sparkart.net/showthread.php?t=59522  [URL_PATH_SCRIPT, URL_DEEP_SUBDOMAINS]`
- `new-york-jets-blog.com/tag/mike-devito  [URL_MANY_HYPHENS]`
- `associates.10867204.eco.century21.com/  [URL_DEEP_SUBDOMAINS]`
- `christian-business-joint-venture-association.com/  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `www.high-search-engine-ranking.com/LookSmart_Answer_Their_Critics.htm  [URL_MANY_HYPHENS]`
- `ncaa-nba-basketball-playoffs-betting-gambling-wagering.com/  [URL_LONG_DOMAIN, URL_MANY_HYPHENS]`
- `tvbythenumbers.zap2it.com/2011/10/31/netflix-and-disney-abc-television-group-announce-extension-of-existing-licensing-agreement-to-stream-tv`

False negatives (phishing missed):
- `lugaojian.com/js/?us.battle.net/login/en/?ref=ogaezxfus.battle.net/d3/en/index&app=com-d3`
- `pepperdeybalms.com/sailwin/post.php`
- `awesometime4you.com/wp-admin/js/cmfr/e29e499a10648f0761f09483011be0d8/`
- `livejasminci.no-ip.biz:4444/123456.functions`
- `ndfhj.org/maxe/`
- `timothyalansalon.com/dropboxtax/2/hitech.document.htm`
- `masslung.com/viewfile`
- `hotclikz.com/ghanalead/products/id.php?l=_JeHFUq_VJOXK0QWHtoGYDw_Product-UserID&amp;userid=abuse@mixparts.com`
- `embratoor.ahlamontada.com/`
- `www.elegantwheelslt.com/xmlrpc/CieloFidelidade.com.br/`
- `captalclubdubai.com/5242dc187ccebf3f0346fbebac9b0540/`
- `qwestoverseas.com/css/images/prettyPhoto/default/boxMrenewal.php?Email=abuse@zhico.com&amp;.rand=13vqcr8bp0gud&amp;lc=1033&amp;id=64855&amp;`
- `ishigakidenzai.co.jp/tradekey.html`
- `papa-muminek.w.interia.pl/`
- `old.notforsalestore.org/apc/webscr.php?cmd=_login-run`
