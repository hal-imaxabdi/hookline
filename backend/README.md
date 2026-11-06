# Hookline backend (optional)

A local FastAPI service that adds domain registration age (RDAP), email-auth DNS records (SPF, DMARC, best-effort DKIM, MX, A), an optional TLS-certificate check and an optional URLhaus relay. The extension works without it and shows "Backend offline — lexical checks only".

It receives **domains and URLs only**, never email content.

## Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux
pip install -r requirements-dev.txt
pytest                          # 42 tests, no network
uvicorn main:app --host 127.0.0.1 --port 8000
```

| Env var | Effect |
|---|---|
| `HOOKLINE_EXTENSION_ID` | Only accept `chrome-extension://<this id>` (recommended; copy the ID from `chrome://extensions`) |
| `URLHAUS_AUTH_KEY` | Enables `POST /intel/urlhaus` (free key: <https://auth.abuse.ch/>) |
| `HOOKLINE_CACHE_TTL` | Cache lifetime in seconds for complete lookups (default 21600) |

## Endpoints

- `GET /health`: `{"status":"ok", "version":"2.0.0", "urlhaus": false}`
- `GET /analyze/domain?domain=example.com&ssl=0|1`: returns the `DomainInfo` JSON. `422` for invalid, IP, local or reserved names.
- `POST /intel/urlhaus` with body `{"url": "https://…"}`: returns `{"listed": bool, "threat"?: str}`. `503` if no key is set.

Try it in a browser (no `Origin` header, so it's allowed): <http://localhost:8000/analyze/domain?domain=github.com>

## Safety properties

- **Validation:** hostnames only. IP literals, `localhost`, `.local`/`.internal`/reserved TLDs and malformed names are rejected. A domain that resolves only to private addresses is never TLS-probed.
- **Origin check:** browser requests from any origin other than the extension get `403`. CORS alone wouldn't stop a web page from *triggering* lookups.
- **Timeouts:** RDAP 5 s, DNS 2 s per query (run concurrently), TLS 4 s, overall deadline 6 s. A slow source returns partial data with a `note`.
- **Cache:** in-memory TTL/LRU (5,000 entries). Incomplete results are cached for only 10 minutes.
- Some ccTLD registries don't publish RDAP; those return `note` with "Unknown" fields instead of an error.
