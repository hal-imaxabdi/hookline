"""
Hookline Backend — Phase 8: WHOIS + DNS + SSL Intelligence

Phase 7 gave us domain registration data (RDAP). Phase 8 adds the *live* signals:

  - SPF / DKIM / DMARC  (email-authentication posture, via DNS TXT records)
  - MX / A records      (where mail and the site actually point)
  - SSL certificate      (issuer + whether it's DV or OV/EV)

All read-only public data. RDAP needs no key; DNS uses dnspython; SSL uses the
Python standard library (no extra dependency).

Run it:
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8000

Test:
    http://localhost:8000/health
    http://localhost:8000/analyze/domain?domain=google.com
"""

import socket
import ssl
from datetime import datetime, timezone

import dns.resolver
import httpx
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Hookline Backend", version="0.9.1")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

RDAP_BOOTSTRAP = "https://rdap.org/domain/"
DKIM_SELECTORS = ["google", "default", "selector1", "selector2", "s1", "s2", "k1", "dkim", "mail"]

# Two-level public suffixes, so secure.amazon.co.uk -> amazon.co.uk (not co.uk).
MULTI_PART_TLDS = {
    "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk",
    "com.br", "com.au", "net.au", "org.au", "com.cn", "com.mx",
    "co.jp", "co.in", "co.id", "co.za", "co.kr", "co.nz",
    "com.sg", "com.my", "com.tr", "com.tw", "com.hk", "com.ph",
}


def registrable_domain(host: str) -> str:
    """www.google.com -> google.com ; a.b.amazon.co.uk -> amazon.co.uk"""
    parts = host.split(".")
    if len(parts) <= 2:
        return host
    last_two = ".".join(parts[-2:])
    if last_two in MULTI_PART_TLDS and len(parts) >= 3:
        return ".".join(parts[-3:])
    return last_two


# ─────────────────────────────────────────────────────────────────────────────
# Default shape (matches the extension's DomainInfo type)
# ─────────────────────────────────────────────────────────────────────────────

def empty_info(domain: str, note: str | None = None) -> dict:
    return {
        "domain": domain,
        # registration (Phase 7)
        "registrar": "Unknown",
        "createdDate": None,
        "createdDaysAgo": None,
        "isNewDomain": False,
        "reputationScore": "unknown",
        # DNS / email auth (Phase 8)
        "spfStatus": "unknown",
        "spfRecord": None,
        "dkimStatus": "unknown",
        "dkimSelector": None,
        "dmarcStatus": "unknown",
        "dmarcPolicy": None,
        "mx": [],
        "a": [],
        # SSL (Phase 8)
        "sslIssuer": None,
        "sslHasOrgValidation": False,
        "sslValidFrom": None,
        "sslValidUntil": None,
        "note": note,
    }


# ─────────────────────────────────────────────────────────────────────────────
# RDAP (Phase 7)
# ─────────────────────────────────────────────────────────────────────────────

def reputation_from_age(days: int) -> str:
    if days < 30:
        return "very_low"
    if days < 90:
        return "low"
    if days < 365:
        return "medium"
    return "high"


def find_registrar(entities: list) -> str | None:
    for ent in entities or []:
        if "registrar" in (ent.get("roles") or []):
            vcard = ent.get("vcardArray")
            if isinstance(vcard, list) and len(vcard) > 1 and isinstance(vcard[1], list):
                for item in vcard[1]:
                    if isinstance(item, list) and len(item) >= 4 and item[0] == "fn":
                        return item[3]
    return None


async def rdap_intel(domain: str) -> dict:
    """Returns the registration-related fields, or a note on failure."""
    out: dict = {}
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            resp = await client.get(RDAP_BOOTSTRAP + domain, headers={"Accept": "application/rdap+json"})
        if resp.status_code == 404:
            return {"note": "No RDAP record (registry may not publish RDAP — common for some ccTLDs)."}
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        return {"note": f"RDAP lookup unavailable: {type(exc).__name__}"}

    created_raw = None
    for ev in data.get("events", []) or []:
        if ev.get("eventAction") == "registration":
            created_raw = ev.get("eventDate")
            break

    if created_raw:
        out["createdDate"] = created_raw
        try:
            dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - dt).days
            out["createdDaysAgo"] = days
            out["isNewDomain"] = days < 90
            out["reputationScore"] = reputation_from_age(days)
        except ValueError:
            pass

    registrar = find_registrar(data.get("entities", []))
    if registrar:
        out["registrar"] = registrar
    return out


# ─────────────────────────────────────────────────────────────────────────────
# DNS (Phase 8)
# ─────────────────────────────────────────────────────────────────────────────

def _txt(name: str) -> list[str]:
    try:
        ans = dns.resolver.resolve(name, "TXT", lifetime=5)
        return [b"".join(r.strings).decode("utf-8", "ignore") for r in ans]
    except Exception:
        return []


def dns_intel(domain: str) -> dict:
    out: dict = {}

    # SPF — a TXT record on the domain starting with v=spf1
    txts = _txt(domain)
    spf = next((t for t in txts if t.lower().startswith("v=spf1")), None)
    out["spfStatus"] = "pass" if spf else "missing"
    out["spfRecord"] = spf

    # DMARC — TXT at _dmarc.<domain>
    dmarc = next((t for t in _txt("_dmarc." + domain) if t.lower().startswith("v=dmarc1")), None)
    out["dmarcStatus"] = "pass" if dmarc else "missing"
    if dmarc:
        for part in dmarc.split(";"):
            part = part.strip()
            if part.lower().startswith("p="):
                out["dmarcPolicy"] = part[2:].strip()

    # DKIM — best-effort probe of common selectors (real selector is unknowable)
    for sel in DKIM_SELECTORS:
        rec = _txt(f"{sel}._domainkey.{domain}")
        if any(("dkim1" in r.lower()) or ("p=" in r.lower()) for r in rec):
            out["dkimStatus"] = "pass"
            out["dkimSelector"] = sel
            break

    # MX / A — where mail and the site point
    try:
        mx = dns.resolver.resolve(domain, "MX", lifetime=5)
        out["mx"] = sorted(f"{r.preference} {str(r.exchange).rstrip('.')}" for r in mx)
    except Exception:
        out["mx"] = []
    try:
        a = dns.resolver.resolve(domain, "A", lifetime=5)
        out["a"] = [r.address for r in a]
    except Exception:
        out["a"] = []

    return out


# ─────────────────────────────────────────────────────────────────────────────
# SSL (Phase 8) — standard library, no extra dependency
# ─────────────────────────────────────────────────────────────────────────────

def ssl_intel(domain: str) -> dict:
    out: dict = {}
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=4) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ss:
                cert = ss.getpeercert()
        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))
        out["sslIssuer"] = issuer.get("organizationName") or issuer.get("commonName")
        out["sslHasOrgValidation"] = "organizationName" in subject
        out["sslValidFrom"] = cert.get("notBefore")
        out["sslValidUntil"] = cert.get("notAfter")
    except Exception:
        pass  # invalid/self-signed/unreachable — leave as defaults
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "service": "hookline-backend", "version": "0.9.1"}


@app.get("/analyze/domain")
async def analyze_domain(domain: str = Query(..., description="Domain to look up")):
    domain = domain.strip().lower()
    domain = domain.replace("https://", "").replace("http://", "").split("/")[0]
    if not domain or " " in domain:
        return empty_info(domain, note="Invalid domain.")

    # Reduce to the registrable domain: www.google.com -> google.com.
    # RDAP only knows registered domains, and SPF/DMARC/MX live on the apex,
    # so looking up the bare subdomain returns nothing useful.
    reg = registrable_domain(domain)

    info = empty_info(reg)

    # Each source is independent — a failure in one never blanks the others.
    info.update(await rdap_intel(reg))
    try:
        info.update(dns_intel(reg))
    except Exception as exc:
        info["note"] = (info.get("note") or "") + f" DNS error: {type(exc).__name__}."
    try:
        info.update(ssl_intel(reg))
    except Exception:
        pass

    return info
