# Hookline

![Hookline: know why a message looks risky before you click](docs/screenshots/hookline-banner.png)

A Chrome extension that spots phishing, fake job offers and fake online stores, and shows you **why**. It runs in your browser using 47 explainable rules.

**[Try the live demo →](https://hal-imaxabdi.github.io/hookline/demo/)**

<p align="center">
  <img src="docs/screenshots/demo-scam-xray.png" width="49%" alt="Web demo: the Scam X-ray highlights the words behind each warning sign">
  <img src="docs/screenshots/gmail-phishing.png" width="49%" alt="A phishing email in Gmail, flagged high risk by the Hookline side panel">
</p>
<p align="center">
  <img src="docs/screenshots/gmail-three-verdicts.png" width="75%" alt="Three emails in Hookline: phishing flagged, fake internship flagged, ordinary email passed">
</p>

## Install

1. Download `hookline-extension.zip` from [Releases](https://github.com/hal-imaxabdi/hookline/releases/latest) and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the folder.

**For developers**

```bash
cd extension
npm install
npm run build   # then load extension/dist
npm test
```

## Results

| Test set | Detected | False alarms | Precision |
|---|---|---|---|
| Phishing URLs | 24–26% | 0.2–0.5% | 98–99% |
| Fake job ads | 6.2% | 0.1% | 82% |

It misses most phishing links, so *No warning signs found* never means safe. [Full results](extension/eval/RESULTS.md) · [All rules](docs/RULES.md)

