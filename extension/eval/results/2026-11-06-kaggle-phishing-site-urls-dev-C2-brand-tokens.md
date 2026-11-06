# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T04:26:05.948Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `bee2591892eda1a8`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (42154 duplicates removed, 1 conflicting labels dropped, 0 unknown labels)
- **Split:** dev (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** Stratified: 25000 per class drawn uniformly without replacement (Fisher–Yates, mulberry32 seed 42); evaluated 49905 (95 unparseable)
- **Scheme policy:** `as-is` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 11.8% (95% CI 11.4%–12.2%) |
| False-positive rate | 2.2% (95% CI 2.0%–2.4%) |
| Precision | 84.3% |
| F1 | 0.206 |
| Accuracy | 54.9% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 2927 | FN 21981 |
| **Actual legitimate** | FP 545 | TN 24452 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 42.8% | 10.8% | 79.8% | 0.557 |
| 20 | 11.8% | 2.2% | 84.3% | 0.206 |
| 30 | 10.3% | 0.2% | 98.3% | 0.186 |
| 40 | 6.9% | 0.2% | 97.5% | 0.128 |
| 50 | 6.0% | 0.1% | 98.5% | 0.113 |
| 60 | 5.9% | 0.0% | 99.9% | 0.112 |
| 70 | 0.2% | 0.0% | 100.0% | 0.003 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 2659 | 544 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 22249 | 24453 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_PATH_SCRIPT | 4897 | 2035 | 70.6% |
| URL_BRAND_IN_DOMAIN | 1636 | 6 | 99.6% |
| URL_PATH_LOGIN | 1633 | 4 | 99.8% |
| URL_DEEP_SUBDOMAINS | 1507 | 74 | 95.3% |
| URL_LONG_DOMAIN | 1446 | 101 | 93.5% |
| URL_PATH_VERIFY | 1018 | 6 | 99.4% |
| URL_IP_HOST | 820 | 1 | 99.9% |
| URL_MANY_HYPHENS | 769 | 41 | 94.9% |
| URL_TYPOSQUAT_EDIT | 210 | 524 | 28.6% |
| URL_SUSPICIOUS_TLD | 672 | 9 | 98.7% |
| URL_PATH_BRAND | 660 | 5 | 99.2% |
| URL_NO_HTTPS | 20 | 0 | 100.0% |
| URL_PUNYCODE | 16 | 3 | 84.2% |
| URL_TYPOSQUAT_KEYBOARD | 1 | 10 | 9.1% |
| URL_TYPOSQUAT_LEET | 4 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `tools.ietf.org/html/rfc2857  [URL_TYPOSQUAT_EDIT]`
- `www.iona.com/products/orbix/?WT.mc_id=1234516  [URL_TYPOSQUAT_EDIT]`
- `abdn.ac.uk/obsgynae/staff/details/e.ferguson  [URL_TYPOSQUAT_EDIT]`
- `manta.com/c/mm3mcv2/ion-media-networks-inc  [URL_TYPOSQUAT_EDIT]`
- `learnonline.cc/clozure/cats.php?c=American+businesspeople  [URL_SUSPICIOUS_TLD, URL_PATH_SCRIPT]`
- `manta.com/c/mt1kvvz/rj-distributing-inc  [URL_TYPOSQUAT_EDIT]`
- `tools.ietf.org/html/rfc1872  [URL_TYPOSQUAT_EDIT]`
- `nola.com/saints/index.ssf/2011/01/drew_brees_and_family_to_appea.html  [URL_TYPOSQUAT_EDIT]`
- `intair.dk/  [URL_TYPOSQUAT_EDIT]`
- `manta.com/c/mmnm4fh/trans-executive-airlines-of-hawaii-inc  [URL_TYPOSQUAT_EDIT]`
- `hurricanesports.cstv.com/sports/m-baskbl/mtt/larranaga_jim00.html  [URL_TYPOSQUAT_EDIT]`
- `fifa.com/worldcup/preliminaries/nccamerica/matches/round=258361/match=300172488/index.html  [URL_TYPOSQUAT_EDIT]`
- `quebec.cioc.ca/record/MAU0485?UseCICVw=15  [URL_TYPOSQUAT_EDIT]`
- `tools.ietf.org/html/rfc2516  [URL_TYPOSQUAT_EDIT]`
- `www.tsac.co.uk/javavm/  [URL_TYPOSQUAT_EDIT]`

False negatives (phishing missed):
- `lugaojian.com/js/?us.battle.net/login/en/?ref=ogaezxfus.battle.net/d3/en/index&app=com-d3`
- `pepperdeybalms.com/sailwin/post.php`
- `awesometime4you.com/wp-admin/js/cmfr/e29e499a10648f0761f09483011be0d8/`
- `livejasminci.no-ip.biz:4444/123456.functions`
- `ndfhj.org/maxe/`
- `timothyalansalon.com/dropboxtax/2/hitech.document.htm`
- `bilgeder.org.tr/login-cgi-bin.session-true.confirm5885d80a13c0db1f8e263663d3faee8dcbcd55a50598f04d/8bb265c409eb258e743a8cc3364cfb46/`
- `salomonsanchez.com/images/insidenow/login/085f53ec6a238e16922edc2b97f421b3/finish.php`
- `masslung.com/viewfile`
- `hotclikz.com/ghanalead/products/id.php?l=_JeHFUq_VJOXK0QWHtoGYDw_Product-UserID&amp;userid=abuse@mixparts.com`
- `embratoor.ahlamontada.com/`
- `www.elegantwheelslt.com/xmlrpc/CieloFidelidade.com.br/`
- `captalclubdubai.com/5242dc187ccebf3f0346fbebac9b0540/`
- `qwestoverseas.com/css/images/prettyPhoto/default/boxMrenewal.php?Email=abuse@zhico.com&amp;.rand=13vqcr8bp0gud&amp;lc=1033&amp;id=64855&amp;`
- `ishigakidenzai.co.jp/tradekey.html`
