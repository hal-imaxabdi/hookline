# Hookline Backend — Phase 7 (WHOIS / RDAP)

Looks up domain registration data (creation date, age, registrar) using RDAP,
the modern structured replacement for classic WHOIS. No API key required.

## Run

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Test (before touching the extension)

Open these in your browser:

- http://localhost:8000/health  → should show `{"status":"ok",...}`
- http://localhost:8000/analyze/domain?domain=google.com  → old domain, high reputation
- http://localhost:8000/analyze/domain?domain=github.com

If those return JSON, the backend works. Then load the extension and analyze a
URL — the WHOIS tab and the Summary "domain age" signal will fill in.

## Notes

- The extension calls `http://localhost:8000` (set in `src/shared/apiClient.ts`).
- If the backend is off, the extension still works — WHOIS data just won't appear.
- Some country-code TLDs (.id, some .br) don't publish RDAP; those return
  "Unknown" gracefully rather than erroring.
