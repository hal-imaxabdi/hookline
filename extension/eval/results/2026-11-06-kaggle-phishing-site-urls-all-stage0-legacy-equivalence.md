# Hookline URL evaluation — Phishing Site URLs (Kaggle, taruntiwarihp)

- **Date:** 2026-11-06T04:21:29.873Z  ·  **Hookline** 1.0.0  ·  ruleset `03331b21`  ·  engine `52f88df88e1212fe`
- **Dataset:** [Phishing Site URLs (Kaggle, taruntiwarihp)](https://www.kaggle.com/datasets/taruntiwarihp/phishing-site-urls) · sha256 `b1a7c26b354632c8…` · 549346 rows (0 duplicates removed, 0 conflicting labels dropped, 0 unknown labels)
- **Split:** all (FNV-1a("hookline-split-v1" + url) mod 2 (0 = dev, 1 = test); independent of seed)
- **Sampling:** All rows in the split (no sampling); evaluated 548405 (941 unparseable)
- **Scheme policy:** `http` · **Allow-list:** off

## Metrics (positive = phishing; flagged = suspicious or high risk)

| Metric | Value |
|---|---|
| Recall (detection rate) | 41.4% (95% CI 41.2%–41.7%) |
| False-positive rate | 11.3% (95% CI 11.2%–11.4%) |
| Precision | 59.2% |
| F1 | 0.487 |
| Accuracy | 75.3% |

**Confusion matrix**

| | Predicted phishing | Predicted safe |
|---|---|---|
| **Actual phishing** | TP 64439 | FN 91120 |
| **Actual legitimate** | FP 44502 | TN 348344 |

## Score-threshold sweep

| Flag if score ≥ | Recall | FPR | Precision | F1 |
|---|---|---|---|---|
| 10 | 100.0% | 100.0% | 28.4% | 0.442 |
| 20 | 41.4% | 11.3% | 59.2% | 0.487 |
| 30 | 39.2% | 11.2% | 58.1% | 0.468 |
| 40 | 11.9% | 0.5% | 90.7% | 0.210 |
| 50 | 5.4% | 0.5% | 82.0% | 0.102 |
| 60 | 4.5% | 0.1% | 96.1% | 0.086 |
| 70 | 4.5% | 0.0% | 98.0% | 0.085 |

## Predicted scam category

| Category | Phishing URLs | Legitimate URLs |
|---|---|---|
| credential_phishing | 16657 | 8697 |
| job_scam | 0 | 0 |
| shopping_scam | 0 | 0 |
| none | 138902 | 384149 |

Allow-listed items in sample: 0 phishing, 0 legitimate.

## Rule fire counts (active evidence)

| Rule | Fires on phishing | Fires on legitimate | Precision of rule |
|---|---|---|---|
| URL_NO_HTTPS | 155530 | 392846 | 28.4% |
| URL_PATH_SCRIPT | 31267 | 32176 | 49.3% |
| URL_DEEP_SUBDOMAINS | 7460 | 2425 | 75.5% |
| URL_BRAND_IN_DOMAIN | 8261 | 1586 | 83.9% |
| URL_LONG_DOMAIN | 6798 | 1365 | 83.3% |
| URL_PATH_LOGIN | 7990 | 68 | 99.2% |
| URL_IP_HOST | 7818 | 26 | 99.7% |
| URL_TYPOSQUAT_EDIT | 518 | 7055 | 6.8% |
| URL_PATH_VERIFY | 5437 | 147 | 97.4% |
| URL_SUSPICIOUS_TLD | 5462 | 85 | 98.5% |
| URL_MANY_HYPHENS | 3695 | 654 | 85.0% |
| URL_PATH_BRAND | 3163 | 169 | 94.9% |
| URL_PUNYCODE | 130 | 12 | 91.5% |
| URL_TYPOSQUAT_KEYBOARD | 5 | 21 | 19.2% |
| URL_TYPOSQUAT_LEET | 12 | 0 | 100.0% |

## Example errors

False positives (legitimate flagged):
- `¾5092  [URL_PUNYCODE, URL_MANY_HYPHENS, URL_NO_HTTPS]`
- `ïC¿YÂO®  [URL_PUNYCODE, URL_MANY_HYPHENS, URL_NO_HTTPS]`
- `www.ficpa.org/content/home.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.continuingeducation.net/schedule.php?profession=Accountants  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.calcpa.org/Content/foundation.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.taxspecialistgroup.ca/public/index.asp?site=cadesky  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `w3.gorge.net/dede/  [URL_TYPOSQUAT_EDIT, URL_NO_HTTPS]`
- `www.accountantsworld.com/list/directorylist.aspx  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.sharpaviation.com.au/index.php/pt_home  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.users.globalnet.co.uk/~emanners/  [URL_NO_HTTPS, URL_DEEP_SUBDOMAINS]`
- `www.smi-online.co.uk/products/default.asp?pb_sect=1  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `www.prime-power.com/military-grade/  [URL_BRAND_IN_DOMAIN, URL_NO_HTTPS]`
- `www.invap.net/index-e.php  [URL_PATH_SCRIPT, URL_NO_HTTPS]`
- `users.vic.chariot.net.au/~agktech/  [URL_NO_HTTPS, URL_DEEP_SUBDOMAINS]`
- `www.imbc.gr/biblio_serv/  [URL_TYPOSQUAT_EDIT, URL_NO_HTTPS]`

False negatives (phishing missed):
- `mail.printakid.com/www.online.americanexpress.com/index.html`
- `thewhiskeydregs.com/wp-content/themes/widescreen/includes/temp/promocoessmiles/?84784787824HDJNDJDSJSHD//2724782784/`
- `super1000.info/docs`
- `docs.google.com/spreadsheet/viewform?formkey=dE5rVEdSV2pBdkpSRy11V3o2eDdwbnc6MQ`
- `www.coincoele.com.br/Scripts/smiles/?pt-br/Paginas/default.aspx`
- `perfectsolutionofall.net/wp-content/themes/twentyten/wiresource/`
- `lingshc.com/old_aol.1.3/?Login=&amp;Lis=10&amp;LigertID=1993745&amp;us=1`
- `anonymeidentity.net/remax./remax.htm`
- `dutchweb.gtphost.com/zimbra/exch/owa/uleth/index.html`
- `asladconcentration.com/paplkuk1/webscrcmd=_home-customer&nav=1/`
- `www.regaranch.info/grafika/file/2012/atualizacao/www.itau.com.br/`
- `optimistic-pessimism.com/aoluserupdatealert.info.htm`
- `www.everythinggoingon.net/~gpeveryt/home/Email/`
- `ebayisapidlld.altervista.org/`
- `promusic.co/components/interbank.com/`
