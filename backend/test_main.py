"""
Hookline Backend Tests — Phase 11

Unit tests for the pure, offline helper functions (no network calls, so they
run fast and never flake). The actual RDAP/DNS/SSL lookups are integration
concerns and are intentionally not unit-tested here.

Run with:
    pip install pytest
    pytest
"""

from main import registrable_domain, reputation_from_age, find_registrar


def test_registrable_domain_strips_subdomain():
    assert registrable_domain("www.google.com") == "google.com"
    assert registrable_domain("google.com") == "google.com"
    assert registrable_domain("a.b.c.example.com") == "example.com"


def test_registrable_domain_handles_two_level_tlds():
    assert registrable_domain("secure.amazon.co.uk") == "amazon.co.uk"
    assert registrable_domain("login.example.com.br") == "example.com.br"
    assert registrable_domain("mail.gov.uk") == "mail.gov.uk"  # already 2 labels


def test_reputation_buckets():
    assert reputation_from_age(5) == "very_low"
    assert reputation_from_age(60) == "low"
    assert reputation_from_age(200) == "medium"
    assert reputation_from_age(5000) == "high"


def test_find_registrar_parses_vcard():
    entities = [
        {
            "roles": ["registrar"],
            "vcardArray": ["vcard", [["version", {}, "text", "4.0"],
                                      ["fn", {}, "text", "MarkMonitor Inc."]]],
        }
    ]
    assert find_registrar(entities) == "MarkMonitor Inc."


def test_find_registrar_missing_returns_none():
    assert find_registrar([{"roles": ["registrant"]}]) is None
    assert find_registrar([]) is None
