# Hookline — Phase 1 Audit

**Date:** 2026-11-06
**Scope:** `extension/src`, `extension/tests`, `extension/eval`, `extension/public/manifest.json`, `backend/`, `README.md`
**Method:** Read every source file, installed dependencies, ran the build, type check, unit tests, backend tests, and the eval harness, then probed suspected bugs with small scripts. Every behaviour reported as "verified" below was observed by running code. Items marked **(needs live check)** come from reading the code and can only be confirmed in a real Gmail session.

---

## 1. What I ran and what happened

| Step | Command | Result |
|---|---|---|
| Install (extension) | `npm ci` (Node 26.13.0, npm 11.16.0) | OK. `npm audit`: **0 vulnerabilities in runtime deps**; 10 (3 moderate, 7 high) in dev/build tooling only (postcss, nanoid, serialize-javascript, browserslist, js-yaml, fast-uri, …). |
| Build | `npm run build` | **Pass** (webpack 5.107.2, compiled successfully). |
| Type check (src) | `npx tsc --noEmit` | **Pass**, 0 errors. |
| Type check (tests + eval) | `tsc --strict` on `tests/` and `eval/` | **Pass**. These are outside `tsconfig.json` `include`, so nothing checks them by default. |
| Unit tests | `npm test` | **10/10 pass.** |
| Install (backend) | `py -m venv .venv` + `pip install -r requirements.txt pytest` (Python 3.14.2; `python` is not on PATH, only the `py` launcher) | OK. |
| Backend tests | `pytest` | **5/5 pass**, 8 DeprecationWarnings (`asyncio.iscoroutinefunction`) from the pinned starlette 0.38 / fastapi 0.115 on Python 3.14. |
| Backend smoke test | FastAPI `TestClient` against `/health` and `/analyze/domain` | Works. Real lookups took 1.6–2.6 s (github.com, www.google.com, a non-existent domain). Found validation, SSRF and CORS problems (§3). |
| Eval | `npm run eval -- <csv>` | **Could not reproduce the README numbers. No dataset CSV exists in the repo or in Downloads/Desktop/Documents.** I ran the harness on a 4-row throwaway CSV only to check that it works end to end. It does, but the run exposed a normalisation artifact (§2.1). Those 4-row numbers are meaningless and are not reported anywhere. |

---

## 2. Bugs: detection logic (these affect the paper's numbers)

### 2.1 Eval harness is not reproducible as written — **critical for the paper**
`extension/eval/evaluate.ts`
- **README says "balanced 50k sample (25k / 25k)", but the script has no sampling or balancing code.** `--limit=N` just takes the first N rows. The published 40.5% / 12.7% cannot be regenerated from the repo, and the dataset name, URL, and download date are not recorded anywhere.
- **Scheme-less URLs get `http://` prepended** (`normaliseUrl`, line 77). That fires `ssl_missing` (12 points) on *every* scheme-less row, because the dataset never contained a scheme, not because the site lacks HTTPS. Verified: `example.com/index.php` scores 30 → **suspicious** through the harness, while `https://example.com/index.php` scores 18 → safe. Common Kaggle sets (e.g. `phishing_site_urls.csv`) are mostly scheme-less, so **the reported 12.7% FPR is probably inflated by the harness itself.** I can't measure by how much without the dataset.
- **Label mapping merges classes:** `malware`, `defacement`, and `spam` all count as "phishing" (line 62). On `malicious_phish.csv` this mixes malware URLs into phishing recall.
- No deduplication, fixed seed, results file, per-rule breakdown, or threshold sweep.

### 2.2 Brand impersonation uses raw substring matching — the largest false-positive source (verified)
`urlAnalyzer.ts:142` and `emailAnalyzer.ts:133` use `domain.includes(keyword)` / `text.includes(keyword)`.

URLs verified as wrongly flagged **suspicious (45)**:

| URL | Flagged as |
|---|---|
| `groups.io`, `startups.com` | UPS (`ups`) |
| `purchase.edu` | Chase (`chase`) |
| `pineapple.com`, `happiness.org` | Apple (`apple`, `appi`) |
| `primevideo.com` | Amazon (`prime`) |
| `steamboat.com` | Steam |
| `dhimanbrothers.in` | DHL (`dhi`) |
| `googleblog.com` | Google (a real Google domain, missing from the official list) |
| **`www.amazon.com.au`** | Amazon (**the real Amazon Australia**; missing from `officialDomains`) |

**Emails are worse**, because the whole body text is substring-matched. Each of these legitimate senders, with no links, came out **suspicious (45)**:

| Sender | Body text | Flagged as |
|---|---|---|
| `orders@etsy.com` | "Thanks for your **purchase**" | Chase |
| `info@meetup.com` | "Join other **groups**… Sign-**ups**" | UPS |
| `hello@nytcooking.com` | "pineapple salsa" | Apple |
| `team@strava.com` | "We are m**appi**ng new routes" | Apple |

Mentioning a brand is not impersonation. A newsletter that says "Apple announced…" and links to apple.com was scored **high_risk (67)**.

### 2.3 Typosquatting compares against bad "official labels" (verified)
`urlAnalyzer.ts:177` takes `officialDomain.split(".")[0]`, so `accounts.google.com` becomes the label `"accounts"`. Short labels (`live`, `citi`, `meta`, `apple`, `adobe`) match ordinary English words within edit distance 1–2:

| Domain | Score / verdict | Matched against |
|---|---|---|
| `hive.com` | 50 high_risk | live.com |
| `city.com` | 50 high_risk | citi.com |
| `apply.com` | 50 high_risk | apple.com |
| `account.com` | 50 high_risk | "accounts.google.com" |
| `abode.com` | 25 suspicious | adobe.com |
| `data.com` | 25 suspicious | meta.com |

### 2.4 Other scoring issues (from code)
- **Urgency language is filed under evidence type `credential_harvesting`** (`emailAnalyzer.ts:176`). The engine keeps only the strongest item per type, so urgency and credential-request signals cancel instead of adding up. It also makes per-rule ablation impossible.
- **Links-to-another-domain count as "suspicious links."** Any link whose registrable domain differs from the sender's gets flagged. Marketing email routinely uses click-tracking domains (Mailchimp, SendGrid, etc.), so ≥3 such links gives `suspicious_link` high = 30 points, enough for **suspicious** on its own. I worked this out from the code; there is no dataset to measure it.
- Link-text check compares raw hostnames: text `https://www.x.com` with href `https://x.com` counts as a mismatch.
- `.php/.asp` path and `/login`, `/update`, `/secure` paths are flagged on any site. That's weak on its own, but it pushes scores over 20 when combined with the §2.1 artifact.
- `SUSPICIOUS_TLDS` lists `.win` twice (harmless).
- `evidenceMax` is hardcoded (8 / 6) and means nothing. `low_reputation` and `dkim_missing` evidence types are never emitted.
- An unregistered or NXDOMAIN sender domain is not treated as a signal.

---

## 3. Bugs: reliability

### 3.1 Gmail extraction (`content/content.ts`) — fragile
- **The email-ID regex is wrong (verified)** (line 11):
  - `#label/Work/FMfc…` → captures `"Work"`, and `#search/invoice/FMfc…` → captures `"invoice"`. **In any label or search view, opening a second email never re-triggers analysis**, because the "ID" didn't change. Just opening a label (no email) triggers an extraction attempt.
  - `#category/promotions/…`, `#imp/…`, `#trash/…` are **not matched at all**, so emails opened from category tabs, Important, or Trash are never analyzed.
  - `#inbox/p2` (page 2 of the inbox) is treated as an email ID.
- **Fails silently:** after 10 × 400 ms attempts it only logs to the console. The sidebar stays on "Open an email to analyze" forever.
- **Thread mismatch (needs live check):** `querySelector` returns the *first* match. Collapsed messages in a thread still render `span.gD[email]`, so the sender likely comes from the oldest message while the body comes from the first expanded one.
- **Reply-To extraction is racy (needs live check):** it clicks `.ajx` ("show details") and reads `td.g2` in the same tick, before Gmail renders the panel, so Reply-To is probably usually empty. Clicking also changes the user's visible UI.
- Selectors are hardcoded in `content.ts` and duplicated, unused, in `detectionRules.ts` (`GMAIL_SELECTORS`). There are no fallback selectors (`[data-message-id]`, `[role="listitem"]`, `h2[data-thread-perm-id]`, etc.).
- `all_frames: true` runs a full-document MutationObserver in every Gmail iframe; useless work.
- Body is truncated to 3,000 characters. Signals later in long emails are missed.
- No tests for any of this.

### 3.2 Background / sidebar
- **Right-click "Analyze with Hookline" does nothing visible while an email is displayed (from code).** `App.tsx` drops `URL_ANALYSIS_RESULT` if `mode === "email"`, so analyzing a link inside a Gmail email, the main use case, is ignored. The paste-box is also hidden in email mode.
- **Enrichment race (from code):** if you open email A then quickly open email B, A's slow backend enrichment arrives last and overwrites B's result in storage and in the UI.
- Results and the badge are global, not per-tab. The `!` badge from a Gmail email shows on every tab.
- **The Summary tab says "No suspicious links found" whenever the verdict is safe** (`SummaryTab.tsx:131`), even when links *were* flagged but the score stayed under 20. The UI contradicts the Links tab.
- `fetchDomainInfo` has **no timeout**, and it returns `null` for "offline", "HTTP error", and "invalid response" alike. The UI can't tell the user the backend is offline.
- `HooklineMessageType` doesn't list the message types actually used (`EMAIL_ANALYSIS_RESULT`, `URL_ANALYSIS_RESULT`, `GET_LAST_RESULT`), and messages are untyped `any` from Chrome.

### 3.3 Backend (`backend/main.py`)
- **Blocking I/O inside an `async` handler:** `dns_intel` and `ssl_intel` are synchronous, so they block the event loop, and concurrent requests queue behind each other.
- **Worst-case latency is about 77 s:** RDAP 8 s + 13 DNS queries × 5 s lifetime (SPF, DMARC, 9 DKIM selectors, MX, A) + SSL 4 s. There is no overall deadline.
- **No input validation (verified):** `../../etc` is forwarded to rdap.org. Length, characters, and labels are not checked, and IDN/punycode isn't normalised.
- **SSRF-style probing (verified):** `localhost`, `127.0.0.1`, and `169.254.169.254` are accepted, and the backend opens TCP connections to port 443 on them.
- **CORS is `*` (verified):** any website you visit can call your local backend and read the results. Combined with the previous point, any page can use it to probe your internal network on port 443.
- No caching: the same domain is looked up again every time.
- No tests for the endpoint (only 4 pure helpers are tested).
- The pinned fastapi 0.115 / starlette 0.38 emit Python 3.14 deprecation warnings. The backend version (0.9.1) doesn't match the extension (1.0.0).
- `registrable_domain` / `MULTI_PART_TLDS` are duplicated between Python and TypeScript, and both are an incomplete hand-made list. A proper Public Suffix List would fix both.

---

## 4. Security and privacy

| # | Issue | Severity | Notes |
|---|---|---|---|
| S1 | Backend CORS `*` + no host validation → any webpage can make your backend connect to internal hosts | **High** (local only, but real) | Fix: restrict CORS to `chrome-extension://<id>`, reject IPs, localhost, private ranges, and invalid hostnames. |
| S2 | **SSL check opens a direct TCP connection to the sender's or link's domain.** For a phishing domain, this tells the attacker's server your IP and that you looked. | Medium (privacy) | The paper's privacy section should say this. Option: make the SSL probe separately toggleable, or use CT logs (crt.sh) instead. |
| S3 | Domains are sent to **rdap.org** (third party) and to your DNS resolver | Info | Acceptable under your rules (domains only), but it's not documented, and there's no off switch other than not running the backend. |
| S4 | Sidebar loads **Google Fonts** from fonts.googleapis.com every time it opens | Low (privacy) | It's a third-party request on every open. Fix: bundle the fonts locally. |
| S5 | Overly broad permissions: `host_permissions` `https://*/*` + `http://*/*`; `scripting` and `tabs` declared but `scripting` is **never used**; `web_accessible_resources` exposes `*.css` to `<all_urls>` (fingerprintable, not needed) | Medium | Fix: `http://localhost:8000/*` (or `127.0.0.1`) is all the backend fetch needs. Detailed plan in §7. |
| S6 | Email body text never leaves the machine ✅ | — | Verified by code: only `senderDomain` / `domain` is sent to the backend. Good, and worth stating in the paper. |
| S7 | Auto-clicking Gmail's "show details" changes the user's UI | Low | Use a read-only approach instead. |

---

## 5. Dead code and cruft (I won't delete anything without your OK)

| Item | Status |
|---|---|
| `src/shared/tokens.ts` (152 lines) | Imported nowhere. Colours are duplicated as CSS variables in `sidebar.css`. |
| `GMAIL_SELECTORS` in `detectionRules.ts` | Unused (`content.ts` hardcodes its own). I'd make `content.ts` use it, not delete it. |
| `PHASE_LABEL` in `version.ts` | Unused. |
| `.hookline-tooltip` in `content.css` | Placeholder (`display:none`), never used. |
| `UrlAnalysisResult & Record<string, unknown>` extras (`tld`, `path`, `subdomain`, `paramCount`…) | Were for the removed DetailsTab; nothing reads them. |
| `errorResult(_message)` | The message argument is discarded; the UI never shows why parsing failed. |
| `isRisky` in `VerdictCard` | Unused variable. |
| Message types `PAGE_NAVIGATED`, `CLEAR_ANALYSIS` | Never sent. |
| Tailwind | Set up (`@tailwind` directives, config), but components use inline styles. Only the base reset is effectively used. |
| `TYPE_WEIGHTS[e.type] ?? 10` | Unreachable fallback. |

---

## 6. Missing tests

- **Content script: zero tests.** Needs JSDOM fixtures of Gmail markup (each selector variant, thread view, missing elements), the hash-ID parser, and the failure path.
- **False-positive regression tests:** none. Every case in §2.2/§2.3 should become a test.
- `analyzeLink`, `enrichWithDomainInfo`, typosquat negatives, `getRegistrableDomain` edge cases.
- Background message handling and the enrichment race.
- Backend endpoint tests with mocked RDAP/DNS/SSL: validation, timeouts, caching, CORS.
- No `typecheck` npm script covering `tests/` and `eval/`, and no CI.

---

## 7. Prioritised fix plan

Rule changes move the metrics, so **step 0 is to freeze a baseline**: run the *unchanged* engine on the real dataset, then fix the harness, then fix rules one at a time, logging before/after numbers for each change in `eval/results/`.

### P0: make the numbers trustworthy (before any rule changes)
1. **Get the dataset** (see Questions) and record its name, source URL, download date, row count, and SHA-256.
2. **Fix the eval harness:** seeded stratified sampling (`--seed`, `--per-class`), dedupe, a configurable scheme policy (`--scheme=none|http|https`, default: don't add a scheme and skip the protocol check when it's absent), strict label mapping (phishing only, with others reported as excluded), and JSON + markdown output. Report baseline numbers **both before and after** the harness fix, so the paper can say how much of the 12.7% came from the artifact.

### P1: correctness and reliability (Phase 2)
3. **Brand matching:** match tokens of the registrable label (split on `-`/`.`/digits) plus a "brand appears as a whole label" rule, instead of substrings. Drop risky keywords (`ups`, `dhi`, `appi`, `prime`, `chase` as a substring). Add missing official domains (amazon.com.au/.ca/.fr…, googleblog, youtube…). For email, flag brand impersonation only when the brand appears in the **display name, sender address, or subject** and the sending domain isn't official, not merely when the body mentions it.
4. **Typosquatting:** use only the registrable label of each official domain, require label length ≥ 5 for distance 1 and ≥ 8 for distance 2, and skip candidates that are themselves on the allow-list.
5. **Split evidence types:** `urgency_language` separate from `credential_request`, and track link mismatch separately from known tracking/ESP domains.
6. **Allow-list:** a Tranco top-N subset, stored as a static file with the list ID, date, and N documented. Lower or skip lexical-only flags for allow-listed registrable domains, but still flag homoglyphs and lookalikes of *other* brands.
7. **Gmail:** a correct hash parser (last path segment, ID-shaped, all views), selector fallback chains in one module, a MutationObserver keyed on `[data-message-id]` / the open message, extraction of the *focused/last expanded* message, reading Reply-To without clicking, a `EMAIL_EXTRACTION_FAILED` message → "Couldn't read this email" card with a retry button, and JSDOM fixture tests.
8. **Background/sidebar:** per-tab state and badge, request IDs to drop stale enrichment, show URL results while in email mode, fix the "No suspicious links" text, a typed message union, remove `any`.
9. **Backend:** `asyncio.to_thread` for DNS/SSL with a total deadline (~6 s), parallel lookups, hostname validation, rejection of IPs/private/localhost, CORS limited to the extension origin (configurable via env var), a TTL cache (in-memory + optional on-disk), endpoint tests with mocks, and pinned upgraded deps. Extension side: `AbortController` timeout, a `/health` probe, and a "Backend offline, lexical checks only" banner.
10. **Permissions:** shrink to the minimum (§4 S5). Bundle fonts locally.

### P2: recall (Phase 2, off by default)
11. Google Safe Browsing (user's API key in `chrome.storage.local`, called directly from the extension) and URLhaus via the backend. Both behind a settings toggle, cached, and sending URL/domain only.

### P3: Phase 3–5 as specified
12. A rule registry (`id`, `category`, `weight`, `description`, `citation`) that every check reads from, so ablation is trivial; scam-category classifier; job/internship and shopping detectors; "What to do" panel; synthetic fixtures; then the research-grade eval, RESULTS.md, README, and CHANGELOG.

---

## 8. Questions I need answered before Phase 2

1. **Dataset:** which exact CSV produced the 40.5% / 12.7%? Please put it somewhere I can read it (e.g. `extension/eval/data/`, gitignored) and give me the Kaggle URL. If the 25k/25k sample was made by hand or with another script, I need that too, or we accept that the old numbers can't be reproduced and say so in the paper.
2. **Scam-message dataset (text, label, category):** do you have a real labelled dataset of job/shopping scam messages? Synthetic fixtures are fine for unit tests, but **metrics computed on text I wrote myself would be circular** and shouldn't appear in the paper as detection performance. If you don't have one, I'll build the CSV loader and report results only when you supply real data.
3. **Shopping-scam detection on web pages** needs to read page text on arbitrary sites. My recommendation is **on demand only**: when you click the toolbar icon or "Analyze this page", inject a script via the existing `activeTab` + `scripting` permissions. That adds no new host permission and doesn't run on every site. The alternative, an always-on content script on `<all_urls>`, is much more invasive. OK to go with on-demand?
4. **Tranco list:** OK for me to download a Tranco list (tranco-list.eu) and commit, say, the top 10k registrable domains (~150 KB) with its list ID and date?
5. **Threat-intel availability (to verify before building):** PhishTank has not accepted new API registrations for a long time, and abuse.ch (URLhaus) now requires a free Auth-Key. Google has also introduced Safe Browsing v5. Should I target URLhaus (you'd register a free key) plus Safe Browsing v4 Lookup as you specified, and confirm the current API status before coding?
6. **Dead code (§5):** may I delete `tokens.ts`, `PHASE_LABEL`, the `.hookline-tooltip` placeholder, and the unused DetailsTab fields?
7. **Python:** the backend currently runs on Python 3.14 with old pinned versions. OK to bump fastapi/starlette/uvicorn/httpx to current releases and pin them?

---

## 9. Resolution status (Phases 2–5, completed 2026-11-06)

The owner asked me to proceed without further questions, so I made the open decisions (§8) myself. They are recorded here:

| §8 question | Decision |
|---|---|
| 1 Dataset | Located and downloaded the Kaggle *phishing-site-urls* set (v1.0.0 numbers reproduced: 41.4% / 11.3% on the full file) plus PhiUSIIL (UCI #967) as a second, citable dataset. Sources and sha256 in `extension/eval/datasets.json`. |
| 2 Scam-message dataset | EMSCAD (job ads) used for the job detector. No public labelled corpus of recruiter-scam *messages* or fake-store *pages* was found, so those are covered by SYNTHETIC unit tests only and **no metrics are claimed**. |
| 3 Shopping pages | On demand only (`activeTab` + `scripting`); no content script on arbitrary sites. |
| 4 Tranco | Top-10k of list K9YYW, user-content hosts excluded, committed as `src/shared/data/allowlist.generated.ts` (128 KB). |
| 5 Threat intel | Safe Browsing v4 Lookup (user key, optional permission) + URLhaus via the backend (Auth-Key). PhishTank skipped: it doesn't accept new API registrations. Both off by default. |
| 6 Dead code | Deleted after owner approval (`tokens.ts`, `content.css`, `PHASE_LABEL`). Evaluations were re-run and the metrics are unchanged. |
| 7 Python deps | Upgraded and pinned; tested on Python 3.14.2. |

Every item in §2–§6 is addressed. See `CHANGELOG.md` for the list and `extension/eval/TUNING_LOG.md` for measured before/after numbers. Still open: live-Gmail verification of the selectors (only synthetic DOM fixtures could be tested here). This needs the owner's logged-in Gmail.
