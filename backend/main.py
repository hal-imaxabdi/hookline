"""
Hookline Backend — optional local domain-intelligence service.

Endpoints
  GET  /health
  GET  /analyze/domain?domain=example.com&ssl=0|1   RDAP age/registrar + SPF/DKIM/DMARC/MX/A (+ TLS cert if ssl=1)
  POST /intel/urlhaus   {"url": "..."}               abuse.ch URLhaus lookup (needs URLHAUS_AUTH_KEY)

Design
  * Receives DOMAINS / URLs only — never email content.
  * Hard timeouts everywhere and an overall deadline per request; a slow
    source returns partial data with a note instead of hanging the extension.
  * Input validation: hostnames only; IP literals, localhost, reserved TLDs and
    names resolving to private/loopback/link-local addresses are rejected, so
    the service can't be used to probe your network (SSRF).
  * Browser requests are only accepted from the Hookline extension origin
    (CORS + an Origin check, because CORS alone doesn't stop a request from
    executing). Requests without an Origin header (curl, address bar) are allowed
    for manual testing. Pin your extension ID with HOOKLINE_EXTENSION_ID.
  * In-memory TTL cache for lookups.

Run (binds to localhost only):
    uvicorn main:app --host 127.0.0.1 --port 8000

Environment
  HOOKLINE_EXTENSION_ID   pin CORS to chrome-extension://<id> (recommended)
  URLHAUS_AUTH_KEY        enables /intel/urlhaus (free key: https://auth.abuse.ch/)
  HOOKLINE_CACHE_TTL      seconds for successful lookups (default 21600 = 6 h)
"""

from __future__ import annotations

import asyncio
import ipaddress
import os
import re
import socket
import ssl
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import Any

import dns.resolver
import httpx
import tldextract
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

VERSION = "2.0.0"

app = FastAPI(title="Hookline Backend", version=VERSION)

# ─────────────────────────────────────────────────────────────────────────────
# Origin restriction
# ─────────────────────────────────────────────────────────────────────────────

EXTENSION_ID = os.environ.get("HOOKLINE_EXTENSION_ID", "").strip()
ORIGIN_RE = re.compile(
    rf"^chrome-extension://{re.escape(EXTENSION_ID)}$" if EXTENSION_ID else r"^chrome-extension://[a-p]{32}$"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=ORIGIN_RE.pattern,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Accept"],
)


@app.middleware("http")
async def reject_foreign_origins(request: Request, call_next):
    origin = request.headers.get("origin")
    if origin and not ORIGIN_RE.match(origin):
        return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
    return await call_next(request)


# ─────────────────────────────────────────────────────────────────────────────
# Validation
# ─────────────────────────────────────────────────────────────────────────────

# Public Suffix List snapshot bundled with tldextract (no network fetch).
_extract = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=None, include_psl_private_domains=True)

LABEL_RE = re.compile(r"^(?!-)[a-z0-9-]{1,63}(?<!-)$")
RESERVED_TLDS = {"localhost", "local", "internal", "lan", "home", "corp", "test", "invalid", "example", "arpa", "onion", "intranet"}


class InvalidDomain(ValueError):
    pass


def normalize_domain(raw: str) -> str:
    """Return a lowercase ASCII hostname or raise InvalidDomain."""
    d = (raw or "").strip().lower()
    d = re.sub(r"^[a-z][a-z0-9+.-]*://", "", d)  # tolerate a pasted URL
    d = d.split("/")[0].split("?")[0].split("#")[0]
    d = d.rsplit("@", 1)[-1]  # strip user-info
    if ":" in d:  # port, or an IPv6 literal
        if d.startswith("[") or d.count(":") > 1:
            raise InvalidDomain("IP addresses are not accepted")
        d = d.split(":")[0]
    d = d.rstrip(".")
    try:
        d = d.encode("idna").decode("ascii")
    except UnicodeError as exc:
        raise InvalidDomain("not a valid internationalized domain") from exc
    if not d or len(d) > 253:
        raise InvalidDomain("empty or too long")
    try:
        ipaddress.ip_address(d)
        raise InvalidDomain("IP addresses are not accepted")
    except ValueError:
        pass
    labels = d.split(".")
    if len(labels) < 2 or not all(LABEL_RE.match(l) for l in labels):
        raise InvalidDomain("not a valid hostname")
    if labels[-1] in RESERVED_TLDS or labels[-1].isdigit():
        raise InvalidDomain("reserved or local name")
    return d


def registrable_domain(host: str) -> str:
    """www.google.com -> google.com ; a.b.amazon.co.uk -> amazon.co.uk ; x.github.io stays."""
    ext = _extract(host)
    # tldextract ≥ 5.3 renamed registered_domain → top_domain_under_public_suffix.
    reg = getattr(ext, "top_domain_under_public_suffix", None)
    if reg is None:
        reg = ext.registered_domain
    return reg or host


def is_public_ip(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return False
    return addr.is_global and not addr.is_multicast


# ─────────────────────────────────────────────────────────────────────────────
# TTL cache
# ─────────────────────────────────────────────────────────────────────────────

CACHE_TTL = int(os.environ.get("HOOKLINE_CACHE_TTL", "21600"))
NEGATIVE_TTL = 600
CACHE_MAX = 5000


class TTLCache:
    def __init__(self, maxsize: int):
        self.maxsize = maxsize
        self._d: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> Any | None:
        hit = self._d.get(key)
        if hit is None:
            return None
        expires, value = hit
        if expires < time.monotonic():
            self._d.pop(key, None)
            return None
        self._d.move_to_end(key)
        return value

    def set(self, key: str, value: Any, ttl: float) -> None:
        self._d[key] = (time.monotonic() + ttl, value)
        self._d.move_to_end(key)
        while len(self._d) > self.maxsize:
            self._d.popitem(last=False)

    def clear(self) -> None:
        self._d.clear()


domain_cache = TTLCache(CACHE_MAX)
intel_cache = TTLCache(CACHE_MAX)

# ─────────────────────────────────────────────────────────────────────────────
# Response shape (matches the extension's DomainInfo type)
# ─────────────────────────────────────────────────────────────────────────────


def empty_info(domain: str, note: str | None = None) -> dict:
    return {
        "domain": domain,
        "registrar": "Unknown",
        "createdDate": None,
        "createdDaysAgo": None,
        "isNewDomain": False,
        "reputationScore": "unknown",
        "spfStatus": "unknown",
        "spfRecord": None,
        "dkimStatus": "unknown",
        "dkimSelector": None,
        "dmarcStatus": "unknown",
        "dmarcPolicy": None,
        "mx": [],
        "a": [],
        "sslIssuer": None,
        "sslHasOrgValidation": False,
        "sslValidFrom": None,
        "sslValidUntil": None,
        "note": note,
        "cached": False,
    }


def add_note(info: dict, text: str) -> None:
    info["note"] = f"{info['note']} {text}".strip() if info.get("note") else text


# ─────────────────────────────────────────────────────────────────────────────
# RDAP
# ─────────────────────────────────────────────────────────────────────────────

RDAP_BOOTSTRAP = "https://rdap.org/domain/"
RDAP_TIMEOUT = 5.0


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


def parse_rdap(data: dict, now: datetime | None = None) -> dict:
    out: dict = {}
    now = now or datetime.now(timezone.utc)
    created_raw = next(
        (ev.get("eventDate") for ev in data.get("events", []) or [] if ev.get("eventAction") == "registration"), None
    )
    if created_raw:
        out["createdDate"] = created_raw
        try:
            dt = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            days = max(0, (now - dt).days)
            out["createdDaysAgo"] = days
            out["isNewDomain"] = days < 90
            out["reputationScore"] = reputation_from_age(days)
        except ValueError:
            pass
    registrar = find_registrar(data.get("entities", []))
    if registrar:
        out["registrar"] = registrar
    return out


async def rdap_intel(domain: str) -> dict:
    try:
        async with httpx.AsyncClient(timeout=RDAP_TIMEOUT, follow_redirects=True) as client:
            resp = await client.get(RDAP_BOOTSTRAP + domain, headers={"Accept": "application/rdap+json"})
        if resp.status_code == 404:
            return {"note": "No RDAP record (some ccTLD registries don't publish RDAP)."}
        resp.raise_for_status()
        return parse_rdap(resp.json())
    except Exception as exc:  # network errors, bad JSON — never fail the request
        return {"note": f"RDAP unavailable ({type(exc).__name__})."}


# ─────────────────────────────────────────────────────────────────────────────
# DNS (concurrent, short lifetimes)
# ─────────────────────────────────────────────────────────────────────────────

DNS_LIFETIME = 2.0
DKIM_SELECTORS = ["google", "default", "selector1", "selector2", "s1", "s2", "k1", "dkim", "mail"]


def _resolve(name: str, rtype: str) -> list:
    try:
        return list(dns.resolver.resolve(name, rtype, lifetime=DNS_LIFETIME))
    except Exception:
        return []


def _txt_strings(answers: list) -> list[str]:
    return [b"".join(r.strings).decode("utf-8", "ignore") for r in answers]


async def dns_intel(domain: str) -> dict:
    names = [(domain, "TXT"), (f"_dmarc.{domain}", "TXT"), (domain, "MX"), (domain, "A")]
    names += [(f"{sel}._domainkey.{domain}", "TXT") for sel in DKIM_SELECTORS]
    results = await asyncio.gather(*(asyncio.to_thread(_resolve, n, t) for n, t in names))
    txt, dmarc_txt, mx, a = results[0], results[1], results[2], results[3]
    dkim_results = results[4:]

    out: dict = {}
    spf = next((t for t in _txt_strings(txt) if t.lower().startswith("v=spf1")), None)
    out["spfStatus"] = "pass" if spf else "missing"
    out["spfRecord"] = spf
    dmarc = next((t for t in _txt_strings(dmarc_txt) if t.lower().startswith("v=dmarc1")), None)
    out["dmarcStatus"] = "pass" if dmarc else "missing"
    if dmarc:
        for part in dmarc.split(";"):
            part = part.strip()
            if part.lower().startswith("p="):
                out["dmarcPolicy"] = part[2:].strip()
    for sel, ans in zip(DKIM_SELECTORS, dkim_results):
        if any(("dkim1" in r.lower()) or ("p=" in r.lower()) for r in _txt_strings(ans)):
            out["dkimStatus"] = "pass"
            out["dkimSelector"] = sel
            break
    out["mx"] = sorted(f"{r.preference} {str(r.exchange).rstrip('.')}" for r in mx)
    out["a"] = [r.address for r in a]
    return out


# ─────────────────────────────────────────────────────────────────────────────
# TLS certificate (only when the user enabled it; only to public IPs)
# ─────────────────────────────────────────────────────────────────────────────

SSL_TIMEOUT = 4.0


def _ssl_blocking(domain: str, ip: str) -> dict:
    out: dict = {}
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((ip, 443), timeout=SSL_TIMEOUT) as sock:
            with ctx.wrap_socket(sock, server_hostname=domain) as ss:
                cert = ss.getpeercert() or {}
        issuer = dict(x[0] for x in cert.get("issuer", []))
        subject = dict(x[0] for x in cert.get("subject", []))
        out["sslIssuer"] = issuer.get("organizationName") or issuer.get("commonName")
        out["sslHasOrgValidation"] = "organizationName" in subject
        out["sslValidFrom"] = cert.get("notBefore")
        out["sslValidUntil"] = cert.get("notAfter")
    except Exception:
        pass  # invalid / self-signed / unreachable — leave defaults
    return out


async def ssl_intel(domain: str, a_records: list[str]) -> dict:
    public = [ip for ip in a_records if is_public_ip(ip)]
    if not public:
        return {}
    return await asyncio.to_thread(_ssl_blocking, domain, public[0])


# ─────────────────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────────────────

REQUEST_DEADLINE = 6.0


@app.get("/health")
def health():
    return {"status": "ok", "service": "hookline-backend", "version": VERSION, "urlhaus": bool(os.environ.get("URLHAUS_AUTH_KEY"))}


@app.get("/analyze/domain")
async def analyze_domain(
    domain: str = Query(..., max_length=300, description="Domain to look up"),
    ssl_probe: int = Query(0, alias="ssl", ge=0, le=1, description="1 = also read the TLS certificate"),
):
    try:
        host = normalize_domain(domain)
    except InvalidDomain as exc:
        raise HTTPException(status_code=422, detail=f"Invalid domain: {exc}") from exc

    reg = registrable_domain(host)
    key = f"{reg}|ssl={ssl_probe}"
    cached = domain_cache.get(key)
    if cached is not None:
        return {**cached, "cached": True}

    info = empty_info(reg)
    rdap_task = asyncio.create_task(rdap_intel(reg))
    dns_task = asyncio.create_task(dns_intel(reg))
    done, pending = await asyncio.wait({rdap_task, dns_task}, timeout=REQUEST_DEADLINE)
    for t in pending:
        t.cancel()

    if rdap_task in done:
        info.update(rdap_task.result())
    else:
        add_note(info, "RDAP timed out.")
    if dns_task in done:
        info.update(dns_task.result())
    else:
        add_note(info, "DNS timed out.")

    # Don't let a name that resolves to a private address be probed.
    if info["a"] and not any(is_public_ip(ip) for ip in info["a"]):
        add_note(info, "Domain resolves only to non-public addresses; TLS check skipped.")
    elif ssl_probe:
        try:
            info.update(await asyncio.wait_for(ssl_intel(reg, info["a"]), timeout=SSL_TIMEOUT + 1))
        except asyncio.TimeoutError:
            add_note(info, "TLS check timed out.")

    complete = rdap_task in done and dns_task in done and "unavailable" not in (info.get("note") or "")
    domain_cache.set(key, info, CACHE_TTL if complete else NEGATIVE_TTL)
    return info


class UrlhausQuery(BaseModel):
    url: str = Field(..., min_length=8, max_length=2048)


URLHAUS_API = "https://urlhaus-api.abuse.ch/v1/url/"


async def urlhaus_query(url: str, auth_key: str) -> dict:
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(URLHAUS_API, data={"url": url}, headers={"Auth-Key": auth_key})
    resp.raise_for_status()
    return resp.json()


@app.post("/intel/urlhaus")
async def intel_urlhaus(q: UrlhausQuery):
    auth_key = os.environ.get("URLHAUS_AUTH_KEY", "").strip()
    if not auth_key:
        raise HTTPException(status_code=503, detail="URLhaus disabled: set URLHAUS_AUTH_KEY (free key at https://auth.abuse.ch/).")
    if not re.match(r"^https?://", q.url, re.I):
        raise HTTPException(status_code=422, detail="Only http(s) URLs are accepted.")

    cached = intel_cache.get(q.url)
    if cached is not None:
        return {**cached, "cached": True}
    try:
        data = await urlhaus_query(q.url, auth_key)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"URLhaus unavailable ({type(exc).__name__})") from exc

    status = data.get("query_status")
    if status == "ok":
        tags = data.get("tags") or []
        result = {"listed": True, "threat": data.get("threat") or (tags[0] if tags else "malware_download"), "urlStatus": data.get("url_status")}
    elif status == "no_results":
        result = {"listed": False}
    else:
        raise HTTPException(status_code=502, detail=f"URLhaus query_status={status}")
    intel_cache.set(q.url, result, 3600)
    return {**result, "cached": False}
