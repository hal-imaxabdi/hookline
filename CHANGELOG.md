# Changelog

## Unreleased — 2026-11-12

- **Web demo** (`docs/demo/index.html`, built with `npm run build:demo`): the rule engine in a single page with synthetic examples. No network requests.
- The clean verdict now reads **"No warning signs found"** instead of "Looks safe", and no longer shows a confidence level. Hookline misses most phishing URLs, so it should not call anything safe.
- The local backend is **off by default**; turn it on in Settings. This removes the "Backend offline" banner for people who never run one.
- Gmail reading checked on live Gmail with three synthetic emails.
- Advice text moved to `src/shared/advice.ts` so the demo and the extension share it.

## 2.0.0 — 2026-11-06

### Detection
- **Rule registry** (`ruleRegistry.ts`): every rule now has an ID, category, group, weight, severity, scope, allow-list flag, description and source. `docs/RULES.md` is generated from it (`npm run rules:doc`).
- **Scam-category classifier**: Credential phishing / Job-internship scam / Shopping scam / None detected, each with plain-language reasons.
- **New job/internship scam detector** (10 rules) and **shopping scam detector** (6 rules), based on FTC / FBI IC3 guidance.
- **False-positive fixes** (each measured in `eval/TUNING_LOG.md`):
  - Brand keywords matched per hostname token, not as raw substrings. This fixes groups.io→UPS, purchase.edu→Chase and pineapple.com→Apple.
  - Typosquat checks use registrable labels with length guards. This fixes hive.com→live.com, city.com→citi.com and apply.com→apple.com.
  - Public Suffix List (tldts) instead of a hand-made suffix list, and more official brand domains (ccTLD variants, brand TLDs).
  - Email brand impersonation now needs the sender to *claim* the brand, or a brand mention plus credential/urgency language. Merely mentioning a brand no longer counts.
  - Links to other legitimate domains (tracking, social) are no longer "suspicious" by default. Each link runs through the full URL engine.
  - Urgency language has its own scoring group, so it no longer cancels credential-request signals.
  - **Tranco top-10k allow-list** (list K9YYW, user-content hosts excluded) suppresses weak lexical heuristics only.
- **Recall improvements:** pre-registered weight tuning on the dev split (C6), redirect-wrapper unwrapping, and fixed homoglyph detection. The URL parser had been converting Cyrillic domains to punycode before the check ran.
- Free-webmail Reply-To on a company sender is now flagged. The link-text vs href mismatch rule compares registrable domains.

### Gmail
- Correct thread-ID parsing for all views (label, search, category, Important, Trash). v1 captured the label or search term, so a second email in the same view was never analyzed.
- Fallback selector chains. Reads the newest *expanded* message; v1 took the oldest message's sender.
- Watches hash changes and DOM mutations, with an 8 s wait for slow loads.
- A visible **"Couldn't read this email"** state with Retry, instead of failing silently.
- Reads Reply-To, `mailed-by` and `signed-by` from Gmail's details panel, then closes it again (can be turned off).
- Top frame only; the body limit was raised from 3,000 to 20,000 characters (still local only).

### Extension
- Per-tab state and badge; request IDs drop stale backend results.
- Right-click "Analyze link" now works while an email is open.
- On-demand page analysis (toolbar click or context menu) via `activeTab` + `scripting`.
- Settings view: backend, TLS probe, Safe Browsing (with your own key), URLhaus, page reading, Gmail details, and editable reporting links.
- "What to do" section with category-specific advice.
- Status banner: "Backend offline — lexical checks only".
- Evidence tab shows rule IDs, weights and sources, plus the signals suppressed by the allow-list.
- Strict TypeScript with no `any`; a typed message protocol.
- **Permissions reduced:** removed `tabs`, access to all `http(s)` hosts, and `web_accessible_resources`. Safe Browsing is an *optional* permission. Google Fonts were removed (a third-party request every time the sidebar opened).

### Backend
- Input validation: hostnames only. IPs, localhost, reserved TLDs and private-resolving names are rejected, which closes the SSRF hole.
- CORS restricted to `chrome-extension://` origins (pin with `HOOKLINE_EXTENSION_ID`), plus a 403 for foreign `Origin` headers.
- Concurrent DNS lookups with a 2 s lifetime, a 6 s request deadline and partial results with notes. Blocking I/O moved off the event loop.
- TTL cache for lookups (6 h; 10 min for incomplete results).
- The TLS probe is opt-in (`ssl=1`).
- New `POST /intel/urlhaus` relay (needs `URLHAUS_AUTH_KEY`).
- PSL via `tldextract` (bundled snapshot, no network). Dependencies upgraded and pinned; tested on Python 3.14.
- Tests went from 5 to 42, all offline.

### Evaluation
- New harness: fixed dev/test hash split, seeded stratified sampling, dedupe, a scheme policy, sha256 checks, Wilson CIs, a threshold sweep, per-rule stats, ablation, and JSON + Markdown output in `eval/results/`.
- Datasets registered with sources and checksums in `eval/datasets.json`: Kaggle phishing-site-urls, PhiUSIIL, EMSCAD, Tranco.
- Text-dataset mode (`text,label,category`) for the scam detectors.
- Found and documented that v1.0.0's 40.5% / 12.7% came mostly from an `http://`-prefix artifact.
- `eval/RESULTS.md` and `eval/TUNING_LOG.md`.

### Tests
- Extension tests went from 10 to 96: every new rule has a positive test and hard negatives (SYNTHETIC fixtures), plus FP regressions, Gmail and page extraction with JSDOM, and the eval library.

### Removed
- Dead code: `src/shared/tokens.ts`, `src/content/content.css` (placeholder) and `PHASE_LABEL` in `version.ts`. Final evaluations were re-run afterwards; the metrics are identical and only the engine fingerprint changed (now `4552b5b8eb06301d`).

### Docs
- README screenshots replaced with v2 captures: real engine output on synthetic inputs, rendered at side-panel width.

## 1.0.0

Initial release: URL and Gmail analysis, typosquatting, homoglyphs, RDAP/DNS/SSL backend, React side panel.
