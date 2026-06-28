# Hookline

Hookline is a Chrome extension that checks Gmail emails and URLs for common phishing indicators — typosquatting, brand impersonation, suspicious domains, mismatched links — and shows *why* it flagged something instead of just giving a red/green verdict.

It's a personal/portfolio project, not a production security tool. It catches a meaningful share of clearly lexical phishing patterns and explains its reasoning, but it has real limitations described honestly below.

---

## What it actually does

**On a webpage / pasted URL**, Hookline checks the domain for:
- Typosquatting (`paypa1.com`, `gmaul.com` — leetspeak, fat-finger, and edit-distance matches against ~24 commonly-impersonated brands)
- Homoglyph attacks (e.g. a Cyrillic "а" standing in for a Latin "a")
- Brand names embedded in a domain that isn't the real one (`amazon-security-update.net`)
- Suspicious TLDs, IP-address hosts, excessive subdomains, unusually long/hyphenated domains
- Domain age, registrar, and SSL certificate type — **only when the local backend is running** (see below)

**On a Gmail email**, Hookline additionally checks:
- Sender vs. Reply-To mismatch
- Urgency/pressure language ("verify your account within 24 hours")
- Credential-harvesting phrasing ("enter your password to continue")
- Every link in the email body, individually, for the same domain-level checks above plus a same-organization comparison against the sender's domain

Every flag comes with a plain-language reason, shown in the **Evidence** tab — not just a score.

---

## What it does NOT do

Being upfront about this matters more than the feature list:

- **It does not browse or fetch the destination page.** All detection is lexical (domain/URL pattern matching) plus optional WHOIS/DNS/SSL lookups. It never visits the link to see what's actually there.
- **It does not check a deny-list or any threat-intel feed.** There's no Safe Browsing / VirusTotal integration. A brand-new malicious domain with no typosquatting pattern can slip through.
- **DKIM checking is best-effort and often inconclusive.** Hookline probes a handful of common DKIM selector names via DNS, since the real selector used by a sender can't be discovered without a signed message. If none of the common ones match, it reports "unknown," not "missing" — it genuinely doesn't know either way.
- **It only works on Gmail's web interface.** No Outlook, no other mail client, no mobile.
- **It depends on Gmail's current DOM structure.** Gmail doesn't have a public API for this, so Hookline reads the rendered page directly. If Google changes their markup, extraction can silently break until selectors are updated — this happened during development and is documented in [Future Improvements](#future-improvements).
- **The backend is local and optional.** Without it running, you still get all lexical checks (typosquatting, homoglyphs, brand impersonation, suspicious patterns), but no domain age, registrar, or SSL data.

---

## Measured performance

I ran the detection engine against a public Kaggle phishing-URL dataset (~550k labeled URLs) using the eval harness included in `extension/eval/`, on a balanced random sample of 50,000 URLs (25k phishing / 25k legitimate):

| Metric | Result |
|---|---|
| Detection rate (recall) | 40.5% — caught 10,074 of 24,888 phishing URLs |
| False-positive rate | 12.7% — wrongly flagged 3,166 of 24,991 safe URLs |
| Precision | 76.1% |
| Accuracy | 64.0% |
| F1 score | 0.528 |

A few things worth being clear about with these numbers:

- This measures the **lexical engine only** — no backend WHOIS/DNS/SSL enrichment, since running that against 50,000 domains isn't realistic with public rate limits. The live extension, with the backend running, performs better than this on individual emails because it has more signals available.
- A 40.5% detection rate sounds modest, and it is — this is a domain/URL-pattern matcher, not a full threat-intelligence system. A large share of the dataset's "bad" URLs are phishing pages hosted on otherwise-unremarkable domains (compromised legitimate sites, generic hosting), which pure lexical analysis isn't designed to catch.
- A 12.7% false-positive rate is high enough to matter and is the main thing I'd want to improve next — see below.

You can reproduce this yourself:
```bash
cd extension
npm run eval -- path/to/dataset.csv
```

---

## Screenshots

**A real, legitimate email (GitHub 2FA code) — correctly cleared:**

![Summary tab showing a safe verdict](docs/screenshots/summary-safe-email.png)

The Evidence tab shows the actual data behind that verdict — an 18-year-old domain, SPF/DKIM/DMARC all present, a properly issued certificate:

![Evidence tab showing domain and authentication details](docs/screenshots/evidence-safe-email.png)

**A test phishing link (`paypal-online.de`) sent to my own inbox — correctly flagged:**

![Summary tab showing a high-risk verdict](docs/screenshots/summary-phishing-link.png)

![Links tab showing the flagged link](docs/screenshots/links-phishing-link.png)

---

## Tech stack

- **Extension UI:** React, TypeScript, Tailwind CSS, Chrome Manifest V3 (side panel)
- **Content script:** reads Gmail's rendered DOM to extract subject, sender, reply-to, body text, and links
- **Background service worker:** runs the analysis, persists results in `chrome.storage.session` so they survive the service worker going idle
- **Backend (optional, local only):** Python + FastAPI, does RDAP (domain registration), DNS (SPF/DKIM/DMARC, MX, A records), and SSL certificate inspection

---

## Project structure

```text
hookline/
├── extension/
│   ├── src/
│   │   ├── background/      # service worker — analysis + caching
│   │   ├── content/         # Gmail DOM extraction
│   │   ├── shared/          # urlAnalyzer, emailAnalyzer, riskEngine, detection rules — pure, unit-tested logic
│   │   └── sidebar/         # React UI (Summary / Evidence / Links tabs)
│   ├── eval/                # dataset evaluation harness
│   └── tests/                # unit tests for the analyzers
├── backend/                 # FastAPI domain-intelligence service
└── docs/
```

---

## Getting started

### Backend (optional — gives domain age, registrar, SSL data)

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Check it's up: open `http://localhost:8000/health` — should return `{"status":"ok"}`.

### Extension

```bash
cd extension
npm install
npm run build
```

Then in Chrome: `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select `extension/dist`.

Open Gmail, open an email, click the Hookline icon in the toolbar.

---

## Future improvements

Roughly in order of what would actually move the needle:

- **Reduce the false-positive rate.** 12.7% is the most actionable number above — worth digging into which specific check is overfiring most often on the dataset.
- **Re-verify Gmail selectors periodically.** Since extraction depends on Gmail's current DOM and Gmail has been incrementally rolling out a rebuilt frontend, the CSS selectors used in `content.ts` may need updates again as more accounts get migrated.
- **DKIM selector detection is genuinely limited** by DNS alone; a more reliable signal would require parsing a real `DKIM-Signature` header from the message source, which Gmail doesn't expose without additional permissions.
- **No persistence across sessions for past scans** — there's no history/log of previously analyzed emails, just the current one.
- **Single-language detection rules** — the urgency/credential-harvesting language patterns are English-only.

---

## Disclaimer

Hookline is an educational/portfolio project. Its output is a set of indicators based on lexical pattern-matching and optional DNS/WHOIS lookups — not a verified security judgment. It will miss real phishing attempts and will occasionally flag legitimate sites. Don't rely on it as your only line of defense.

---

## License

MIT
