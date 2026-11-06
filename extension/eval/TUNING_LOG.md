# Hookline tuning log

Every change to detection logic or weights, with before/after numbers from a
real run. **All tuning was done on the `dev` split.** The `test` split was only
evaluated once, after tuning was frozen (see RESULTS.md).

Protocol for each row unless stated otherwise:
`npx tsx eval/evaluate.ts --dataset=<id> --split=dev --per-class=25000 --seed=42 [--no-allowlist]`
(stratified 25,000 phishing + 25,000 legitimate, deduplicated, scheme-less URLs
treated as "scheme unknown"). Full JSON/MD for every run is in `eval/results/`.

K = Kaggle phishing-site-urls (dev, 49,905 evaluated) · P = PhiUSIIL (dev, 50,000 evaluated)

| # | Change | K recall | K FPR | K F1 | P recall | P FPR | P F1 | Result file tag |
|---|---|---|---|---|---|---|---|---|
| B0 | **Legacy v1.0.0 harness + engine, full file, no dedupe, `http://` prepended** (reproduces README) | 41.4% | 11.3% | 0.487 | — | — | — | `baseline-legacy-harness-kaggle-full.txt` |
| S0 | Refactor to rule registry (behaviour-preserving). Same settings as B0. Identical TP/FN/FP; +3 TN from the new RFC-4180 CSV parser reading 12 malformed rows the old line-splitter skipped | 41.4% | 11.3% | 0.487 | — | — | — | `all-stage0-legacy-equivalence` |
| S0a | New protocol (dev, 25k/class, dedupe) but still prepending `http://` | 43.1% | 11.3% | 0.558 | — | — | — | `dev-stage0-scheme-http` |
| S0b | New protocol, scheme unknown ⇒ http check skipped. **The `http://` artifact explains most of the old recall *and* FPR** | 11.7% | 2.2% | 0.206 | 16.5% | 0.9% | 0.281 | `dev-stage0-scheme-as-is`, `dev-stage0` |
| C1 | Public Suffix List (tldts, incl. private section) for registrable domain / subdomains; `www.` not counted as a subdomain level; IPv6 hosts recognised | 11.7% | 2.2% | 0.206 | 15.6% | 1.1% | 0.267 | `dev-C1-psl` |
| C2 | Brand keywords matched per hostname token (`.`/`-`/`_`) instead of raw substring; ≥6-char distinctive keywords may sit inside a token, short/dictionary ones must be a whole token; dropped `dhi`, `appi`, `prime`; added official domains (googleblog, youtube, paypal-community, amazon ccTLDs via `ccVariants`, …). Brand-rule FPs: K 103→6, P 68→7. P FPR rose because the longer official-domain list fed the (still unfixed) typosquat check — fixed by C3 | 11.8% | 2.2% | 0.206 | 15.7% | 1.4% | 0.268 | `dev-C2-brand-tokens` |
| C3 | Typosquat compares against registrable labels of official domains (no more `accounts` from accounts.google.com); keyboard/1-edit need both labels ≥ 5 chars; 2-edit needs brand label ≥ 8. `URL_TYPOSQUAT_EDIT` precision K 21%→92%, P 44%→89%; `outlook` whole-token only | 11.1% | 0.1% | 0.199 | 14.8% | 0.0% | 0.258 | `dev-C3-typosquat` |
| C4 | Unwrap redirectors (google.com/url?q=, l.facebook.com/l.php?u=, SafeLinks, youtube /redirect, linkedin /redir, bing /ck/a) and analyze the real destination; `google.org` + brand TLDs (.google, .apple …) official | 11.1% | 0.1% | 0.199 | 14.8% | 0.0% | 0.258 | `dev-C4-redirector` |
| C5 | **Allow-list:** Tranco K9YYW top-10k → 9,846 registrable domains, 35 user-content hosts/shorteners excluded (docs.google.com, sharepoint.com, dropbox.com, bit.ly …). Suppresses only `allowlistSuppressible` rules. Allow-listed in sample: K 8,500 legit / 459 phishing; P 616 legit / 476 phishing | 11.1% | 0.0% | 0.199 | 14.2% | 0.0% | 0.249 | `dev-C5-allowlist` |
| C6 | **Weights.** Pre-registered criterion: a rule may flag on its own (20 pts) only if its precision is ≥ 95% on *both* dev sets with the allow-list on. Passed → weight 40 (medium = 20 pts): PATH_LOGIN (99.9/100), PATH_VERIFY (99.5/100), PATH_BRAND (99.5/100), DEEP_SUBDOMAINS (99.4/100), LONG_DOMAIN (97.4/99.5), MANY_HYPHENS (95.0/98.3, severity low→medium), SUSPICIOUS_TLD (98.7/99.1). Failed and lowered: PUNYCODE (84%, 27.5→15 pts). Failed and unchanged: PATH_SCRIPT (73%) | 24.8% | 0.4% | 0.396 | 24.2% | 0.2% | 0.389 | `dev-C6-weights` |
| C7 | Punycode hosts decoded to Unicode before homoglyph checks (the URL parser had been hiding Cyrillic letters, so `pаypal.com` was missed), `xn--` hyphens not counted; 1-edit typosquat needs ≥ 6-char labels (apply≈apple), keyboard-slip stays at 5; email brand-mention rule needs credential request or ≥ 2 urgency patterns | 24.8% | 0.4% | 0.396 | 24.2% | 0.2% | 0.388 | `dev-C7-punycode-typo` |

## Job-scam detector (EMSCAD, dev split, all rows: 415 scam / 8,520 legitimate)

Rules were written from FTC / FBI IC3 guidance *before* looking at EMSCAD. J0 is that pre-registered version.

| # | Change | Recall | FPR | Precision | F1 | Result file tag |
|---|---|---|---|---|---|---|
| J0 | Pre-registered rules. Text mode wrongly also ran email-phishing phrasing (`EMAIL_URGENCY` fired on 519 legit ads) and shop-page rules (`SHOP_NO_CONTACT` 164) on job ads | 5.8% | 2.7% | 9.4% | 0.072 | `emscad-dev-J0-initial` |
| J1 | Pattern bugs found on dev examples: sentence splitter now splits glued sentences ("ok)Unlimited"); fee rule ignores negations up to 25 chars ("no entrance or registration fees") and employer-pays phrasing ("the company will pay the application fee"); sensitive-info must be a request (verb → item); task-scam needs task phrasing *and* money-in phrasing ("top-up their careers", "deposit gathering" no longer match); check-scheme no longer fires on benefits ("reimbursement policy for IT equipment"); "signal" only as an app; "you are selected" (conditional) no longer counts as an offer; postings run job rules only | 4.1% | 0.1% | 73.9% | 0.078 | `emscad-dev-J1-pattern-fixes` |

**Interpretation (dev):** the rules target the *conversation* stage of a job scam (fees, checks, chat apps, ID requests). EMSCAD contains the *advertisement* stage (2012–2014 postings), where almost none of those signals appear — only "unrealistic pay for little work" fires meaningfully (17 scams / 3 legit). We did not add ad-specific features (e.g., missing company profile, which Vidros et al. use as metadata) to avoid fitting this dataset; the low recall is reported as a finding, not tuned away.
