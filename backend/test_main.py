"""
Hookline backend tests. No network: RDAP / DNS / TLS / URLhaus are patched.

    pytest -q
"""

import asyncio
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main
from main import find_registrar, normalize_domain, parse_rdap, registrable_domain, reputation_from_age, InvalidDomain

EXT_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"


@pytest.fixture(autouse=True)
def offline(monkeypatch):
    """Default fakes: fast, deterministic, no network."""
    main.domain_cache.clear()
    main.intel_cache.clear()

    async def fake_rdap(domain):
        return {"createdDate": "2001-01-01T00:00:00Z", "createdDaysAgo": 9000, "isNewDomain": False, "reputationScore": "high", "registrar": "Example Registrar"}

    async def fake_dns(domain):
        return {"spfStatus": "pass", "spfRecord": "v=spf1 -all", "dmarcStatus": "pass", "dmarcPolicy": "reject", "mx": [], "a": ["93.184.216.34"]}

    async def fake_ssl(domain, a):
        return {"sslIssuer": "Test CA", "sslHasOrgValidation": False}

    monkeypatch.setattr(main, "rdap_intel", fake_rdap)
    monkeypatch.setattr(main, "dns_intel", fake_dns)
    monkeypatch.setattr(main, "ssl_intel", fake_ssl)
    monkeypatch.delenv("URLHAUS_AUTH_KEY", raising=False)
    yield


client = TestClient(main.app)


# ─── Pure helpers ────────────────────────────────────────────────────────────

def test_registrable_domain_uses_public_suffix_list():
    assert registrable_domain("www.google.com") == "google.com"
    assert registrable_domain("a.b.c.example.com") == "example.com"
    assert registrable_domain("secure.amazon.co.uk") == "amazon.co.uk"
    assert registrable_domain("login.example.com.br") == "example.com.br"
    assert registrable_domain("evil.github.io") == "evil.github.io"  # PSL private section


def test_reputation_buckets():
    assert reputation_from_age(5) == "very_low"
    assert reputation_from_age(60) == "low"
    assert reputation_from_age(200) == "medium"
    assert reputation_from_age(5000) == "high"


def test_find_registrar_parses_vcard():
    entities = [{"roles": ["registrar"], "vcardArray": ["vcard", [["version", {}, "text", "4.0"], ["fn", {}, "text", "MarkMonitor Inc."]]]}]
    assert find_registrar(entities) == "MarkMonitor Inc."
    assert find_registrar([{"roles": ["registrant"]}]) is None
    assert find_registrar([]) is None


def test_parse_rdap_computes_age():
    now = datetime(2026, 1, 31, tzinfo=timezone.utc)
    out = parse_rdap({"events": [{"eventAction": "registration", "eventDate": "2026-01-21T00:00:00Z"}]}, now=now)
    assert out["createdDaysAgo"] == 10
    assert out["isNewDomain"] is True
    assert out["reputationScore"] == "very_low"


@pytest.mark.parametrize("raw,expected", [
    ("Example.COM", "example.com"),
    ("https://www.example.com/path?q=1", "www.example.com"),
    ("user@mail.example.org", "mail.example.org"),
    ("example.com:8443", "example.com"),
    ("münchen.de", "xn--mnchen-3ya.de"),
    ("example.com.", "example.com"),
])
def test_normalize_domain_accepts(raw, expected):
    assert normalize_domain(raw) == expected


@pytest.mark.parametrize("raw", [
    "", "a b", "../../etc", "localhost", "127.0.0.1", "169.254.169.254", "[::1]", "::1",
    "printer.local", "db.internal", "x" * 300, "-bad-.com", "nodot", "example.test", "10.0.0.1:80",
])
def test_normalize_domain_rejects(raw):
    with pytest.raises(InvalidDomain):
        normalize_domain(raw)


# ─── /analyze/domain ─────────────────────────────────────────────────────────

def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_analyze_returns_domain_info_shape():
    r = client.get("/analyze/domain", params={"domain": "www.example.com"})
    assert r.status_code == 200
    j = r.json()
    assert j["domain"] == "example.com"
    assert j["registrar"] == "Example Registrar"
    assert j["spfStatus"] == "pass"
    assert j["sslIssuer"] is None  # TLS probe is opt-in
    for k in ("createdDaysAgo", "isNewDomain", "dkimStatus", "dmarcStatus", "mx", "a", "note"):
        assert k in j


def test_ssl_probe_only_when_requested():
    assert client.get("/analyze/domain", params={"domain": "example.com", "ssl": 1}).json()["sslIssuer"] == "Test CA"


@pytest.mark.parametrize("bad", ["localhost", "127.0.0.1", "169.254.169.254", "../../etc", "a b"])
def test_analyze_rejects_invalid_and_internal_targets(bad):
    assert client.get("/analyze/domain", params={"domain": bad}).status_code == 422


def test_private_resolution_skips_tls(monkeypatch):
    async def private_dns(domain):
        return {"spfStatus": "missing", "dmarcStatus": "missing", "mx": [], "a": ["10.0.0.5"]}
    called = []

    async def spy_ssl(domain, a):
        called.append(domain)
        return {}
    monkeypatch.setattr(main, "dns_intel", private_dns)
    monkeypatch.setattr(main, "ssl_intel", spy_ssl)
    j = client.get("/analyze/domain", params={"domain": "rebind.example.com", "ssl": 1}).json()
    assert called == []
    assert "non-public" in j["note"]


def test_results_are_cached(monkeypatch):
    calls = []

    async def counting_rdap(domain):
        calls.append(domain)
        return {"registrar": "R"}
    monkeypatch.setattr(main, "rdap_intel", counting_rdap)
    a = client.get("/analyze/domain", params={"domain": "cache.example.com"}).json()
    b = client.get("/analyze/domain", params={"domain": "www.cache.example.com"}).json()
    assert calls == ["example.com"]
    assert a["cached"] is False and b["cached"] is True


def test_slow_source_returns_partial_result_within_deadline(monkeypatch):
    async def slow_dns(domain):
        await asyncio.sleep(5)
        return {}
    monkeypatch.setattr(main, "dns_intel", slow_dns)
    monkeypatch.setattr(main, "REQUEST_DEADLINE", 0.3)
    j = client.get("/analyze/domain", params={"domain": "slow.example.com"}).json()
    assert "DNS timed out" in j["note"]
    assert j["registrar"] == "Example Registrar"


# ─── Origin restriction ─────────────────────────────────────────────────────

def test_foreign_browser_origin_is_rejected():
    r = client.get("/analyze/domain", params={"domain": "example.com"}, headers={"Origin": "https://evil.example"})
    assert r.status_code == 403


def test_extension_origin_is_allowed_with_cors_header():
    r = client.get("/analyze/domain", params={"domain": "example.com"}, headers={"Origin": EXT_ORIGIN})
    assert r.status_code == 200
    assert r.headers.get("access-control-allow-origin") == EXT_ORIGIN


def test_no_origin_header_allowed_for_manual_testing():
    assert client.get("/health").status_code == 200


# ─── URLhaus relay ───────────────────────────────────────────────────────────

def test_urlhaus_disabled_without_key():
    assert client.post("/intel/urlhaus", json={"url": "https://x.example/a"}).status_code == 503


def test_urlhaus_listed_and_clean(monkeypatch):
    monkeypatch.setenv("URLHAUS_AUTH_KEY", "test-key")

    async def fake_query(url, key):
        assert key == "test-key"
        return {"query_status": "ok", "threat": "malware_download", "url_status": "online"} if "bad" in url else {"query_status": "no_results"}
    monkeypatch.setattr(main, "urlhaus_query", fake_query)
    bad = client.post("/intel/urlhaus", json={"url": "https://bad.example/payload.exe"}).json()
    ok = client.post("/intel/urlhaus", json={"url": "https://good.example/"}).json()
    assert bad["listed"] is True and bad["threat"] == "malware_download"
    assert ok["listed"] is False
    again = client.post("/intel/urlhaus", json={"url": "https://bad.example/payload.exe"}).json()
    assert again["cached"] is True


def test_urlhaus_rejects_non_http(monkeypatch):
    monkeypatch.setenv("URLHAUS_AUTH_KEY", "k")
    assert client.post("/intel/urlhaus", json={"url": "javascript:alert(1)"}).status_code == 422
