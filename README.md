# Hookline

![Hookline: know why a message looks risky before you click](docs/screenshots/hookline-banner.png)

Hookline is a Chrome extension that detects phishing emails, fake job offers and fake online stores, and explains each warning in plain language. It runs entirely in the browser using 47 documented rules rather than a machine-learning model, so every verdict can be traced back to the rule that produced it.

**[Live demo](https://hal-imaxabdi.github.io/hookline/demo/)** · [Rule reference](docs/RULES.md) · [Evaluation results](extension/eval/RESULTS.md) · [Changelog](CHANGELOG.md)

## Features

- **Explainable verdicts.** Each result has a verdict (*High risk*, *Suspicious* or *No warning signs found*), a scam category, numbered warning signs and category-specific advice.
- **Gmail integration.** Emails are analyzed when opened, including the sender, reply-to address and the real destination of every link.
- **Page and link checks.** Any page can be checked for fake-store and job-scam signals on demand, and any link can be checked from the side panel or the context menu.
- **Scam X-ray (web demo).** Highlights the exact words in a message that triggered each rule, and compares a suspicious domain character by character with the domain it imitates.
- **Local by default.** No message content leaves the browser. External lookups are opt-in.

## Screenshots

**Scam X-ray in the web demo:** each warning sign is highlighted where it occurs in the message.

![Web demo: the Scam X-ray highlights the words behind each warning sign](docs/screenshots/demo-scam-xray.png)

**The extension in Gmail.**

![A phishing email in Gmail, flagged high risk by the Hookline side panel](docs/screenshots/gmail-phishing.png)

**Three synthetic test emails on live Gmail:** two scams flagged, one ordinary email passed.

![Three emails in Hookline: phishing flagged, fake internship flagged, ordinary email passed](docs/screenshots/gmail-three-verdicts.png)

## How it works

```
Gmail / web page ──► content script ──► background service worker ──► side panel
                     (extracts text,      (rule engine in              (verdict, warning
                      links, headers)      src/shared, scoring)          signs, advice)
```

| Component | Location | Role |
|---|---|---|
| Rule engine | `extension/src/shared` | 47 rules with ID, weight, category, plain-language reason and source; weighted scoring; scam-category classifier. Shared by the extension, the demo and the evaluation harness. |
| Extension | `extension/src` | Manifest V3 side-panel extension: Gmail extraction, page snapshots, link analysis. TypeScript and React, bundled with webpack. |
| Web demo | `extension/demo` → `docs/demo` | Single self-contained page running the same engine, with the Scam X-ray view. |
| Backend (optional) | `backend` | FastAPI service for domain age and DNS checks. Accepts hostnames only; disabled by default. |
| Evaluation | `extension/eval` | Reproducible harness with fixed dataset splits, checksums and a tuning log. |

The rules cover look-alike and homoglyph domains, brand misuse and credential requests (phishing); upfront fees, off-platform contact and unrealistic pay (job scams, following FTC and FBI IC3 guidance); and extreme discounts, irreversible payment methods and missing contact details (shopping scams). See [`docs/RULES.md`](docs/RULES.md) for the full list.

## Evaluation

Datasets were split into development and test halves with a fixed hash. All tuning used the development half; the test half was evaluated once, after tuning was frozen. The figures below use the lexical and content rules only, with no backend or threat-intelligence lookups.

| Test set | Recall (95% CI) | False-positive rate | Precision |
|---|---|---|---|
| Phishing URLs, Kaggle (25,000 per class) | 25.5% (25.0–26.1%) | 0.5% | 98.2% |
| Phishing URLs, PhiUSIIL (25,000 per class) | 23.9% (23.4–24.4%) | 0.2% | 99.1% |
| Fraudulent job ads, EMSCAD (451 / 8,494) | 6.2% (4.3–8.8%) | 0.1% | 82.4% |

Hookline is tuned for precision: when it warns, it is almost always right, but it misses most phishing URLs. Job-scam rules mainly target conversational red flags (fees, chat apps, check schemes) that rarely appear in job advertisements, which explains the low recall on EMSCAD. Shopping-scam rules have no public labelled dataset and are covered by unit tests only.

An earlier version reported 40.5% recall. That figure came from a harness bug that prepended `http://` to every URL, so the "no HTTPS" rule fired on every sample. The corrected baseline was 11.7%. Full methodology, confidence intervals and per-step tuning history are in [`extension/eval/RESULTS.md`](extension/eval/RESULTS.md) and [`TUNING_LOG.md`](extension/eval/TUNING_LOG.md).

## Limitations

- Misses roughly 75% of phishing URLs. *No warning signs found* does not mean safe.
- Precision was measured on balanced samples and will be lower in everyday use, where phishing is rare.
- Rules see only URLs and text, so newly registered domains with ordinary names are not detected without the optional backend.
- Gmail extraction was verified on live Gmail with synthetic emails; Gmail's markup can change without notice.
- English only. Datasets date from 2012–2024.
- The web demo covers email and link rules only; Gmail extraction and page checks require the extension.

## Privacy and security

- Email and page content is analyzed locally and never transmitted.
- The optional backend runs on `localhost`, receives domain names only and rejects internal and private addresses.
- Google Safe Browsing and URLhaus lookups are off by default and require explicit opt-in.
- Minimal permissions: `activeTab` instead of broad host access; host access is limited to Gmail and the local backend.
- The web demo makes no network requests and renders all results with `textContent`.

## Getting started

**Requirements:** Node.js and npm, Chrome 116 or later. Python 3 for the optional backend.

```bash
cd extension
npm install
npm run build        # outputs extension/dist
```

Load the extension: open `chrome://extensions`, enable **Developer mode**, select **Load unpacked** and choose `extension/dist`.

| Task | Command (in `extension/`) |
|---|---|
| Type check | `npm run typecheck` |
| Unit tests (96) | `npm test` |
| Build the web demo | `npm run build:demo` → `docs/demo/index.html` |
| Re-run the evaluation | `npm run eval:all` (datasets per [`eval/README.md`](extension/eval/README.md)) |

**Optional backend:**

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000
pytest                # backend tests
```

Enable it under **Settings** in the side panel. The extension works fully without it.

## Project structure

```
hookline/
├── extension/
│   ├── src/
│   │   ├── shared/       # rule engine, scoring, advice (shared by all targets)
│   │   ├── content/      # Gmail and page extraction
│   │   ├── background/   # service worker
│   │   └── sidebar/      # React side panel
│   ├── demo/             # web demo source (Scam X-ray)
│   ├── eval/             # evaluation harness and results
│   └── tests/            # unit tests with synthetic fixtures
├── backend/              # optional FastAPI service
└── docs/                 # rule reference, built demo, screenshots
```

## Acknowledgements

- Datasets: Kaggle *Phishing Site URLs*; PhiUSIIL (Prasad & Chandra, 2024, UCI); EMSCAD (Vidros et al., 2017).
- Allow-list: Tranco top-sites list (Le Pochat et al., NDSS 2019).
- Guidance: FTC and FBI IC3 consumer advisories.
- Fonts: Geist and Geist Mono, SIL Open Font License.

## License

[MIT](LICENSE) © Halima A. Mohamed
