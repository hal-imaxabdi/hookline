# Hookline — Testing & Evaluation (Phase 11)

Two things live here, both run with `tsx` (installed via `npm install`).

## 1. Unit tests

```bash
npm run test
```

Runs `tests/analyzers.test.ts` against the URL analyzer, email analyzer, and
risk engine using Node's built-in test runner. Exit code is non-zero if any
assertion fails.

## 2. Dataset evaluation (the portfolio metric)

Runs a phishing-URL dataset through the **real** `analyzeUrl()` engine and
reports detection rate, false-positive rate, precision, accuracy, and F1.

```bash
npm run eval -- path/to/dataset.csv
npm run eval -- path/to/dataset.csv --limit=20000     # cap rows for a quick run
```

### Getting a dataset

Any CSV with a URL column and a label column works. Common Kaggle sets:

- **phishing_site_urls.csv** — columns `URL`, `Label` (`good` / `bad`)
- **malicious_phish.csv** — columns `url`, `type` (`benign` / `phishing` / ...)

The harness auto-detects the URL and label columns and maps common label
words. Put the CSV anywhere (don't commit large datasets to git).

### How to read the result

- **Detection rate (recall)** — % of phishing URLs the engine flagged. This is
  the headline number.
- **False-positive rate** — % of safe URLs wrongly flagged. Lower is better.

> Note: this harness runs the **lexical** engine only (typosquatting,
> homoglyphs, brand impersonation, suspicious TLD/structure, IP hosts). It does
> not call the backend, so domain-age and DNS signals are excluded — the live
> extension scores higher. The number here is a conservative floor, and it's
> honest to present it that way.

## Backend tests

```bash
cd ../../backend
pip install pytest
pytest
```
