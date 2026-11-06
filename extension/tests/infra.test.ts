/**
 * Infrastructure: domain utils, allow-list, settings, eval library.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { getRegistrableDomain, toUnicodeHost, unwrapRedirector, findBrandInHost, officialBrandFor, subdomainDepth } from "../src/shared/domainUtils";
import { isAllowlisted, ALLOWLIST_META } from "../src/shared/allowlist";
import { normalizeSettings, DEFAULT_SETTINGS } from "../src/shared/settings";
import { parseCsv } from "../eval/lib/csv";
import { mulberry32, shuffle, splitOf } from "../eval/lib/random";
import { computeMetrics, wilson95 } from "../eval/lib/metrics";

test("PSL registrable domains incl. private suffixes", () => {
  assert.equal(getRegistrableDomain("secure.amazon.co.uk"), "amazon.co.uk");
  assert.equal(getRegistrableDomain("a.b.example.com.br"), "example.com.br");
  assert.equal(getRegistrableDomain("evil.github.io"), "evil.github.io");
  assert.equal(getRegistrableDomain("x.y.blogspot.com"), "y.blogspot.com");
  assert.equal(subdomainDepth("www.example.com"), 0);
  assert.equal(subdomainDepth("a.b.c.example.co.uk"), 3);
});

test("punycode decoding", () => {
  assert.equal(toUnicodeHost("xn--pypal-4ve.com"), "pаypal.com");
  assert.equal(toUnicodeHost("xn--mnchen-3ya.de"), "münchen.de");
  assert.equal(toUnicodeHost("example.com"), "example.com");
  assert.equal(toUnicodeHost("xn--invalid!!.com"), "xn--invalid!!.com");
});

test("redirector unwrapping", () => {
  const u = (s: string) => unwrapRedirector(new URL(s))?.href ?? null;
  assert.equal(u("https://www.google.com/url?q=https://evil.example/x"), "https://evil.example/x");
  assert.equal(u("https://l.facebook.com/l.php?u=https%3A%2F%2Fevil.example%2F"), "https://evil.example/");
  assert.equal(u("https://eur01.safelinks.protection.outlook.com/?url=https%3A%2F%2Fevil.example%2Fa&data=1"), "https://evil.example/a");
  assert.equal(u("https://www.google.com/search?q=https://evil.example"), null);
  assert.equal(u("https://www.google.com/url?q=javascript:alert(1)"), null);
});

test("brand token matching", () => {
  assert.equal(findBrandInHost("paypal-login.example")?.brand, "PayPal");
  assert.equal(findBrandInHost("securepaypalhelp.example")?.brand, "PayPal");
  assert.equal(findBrandInHost("apple-id-verify.example")?.brand, "Apple");
  assert.equal(findBrandInHost("pineapple.example"), null);
  assert.equal(findBrandInHost("groups.io"), null);
  assert.equal(officialBrandFor("www.amazon.co.jp"), "Amazon");
  assert.equal(officialBrandFor("blog.google"), "Google");
  assert.equal(officialBrandFor("google.tk"), null); // abused ccTLD not trusted as a brand variant
});

test("allow-list metadata is documented and lookups work", () => {
  assert.equal(ALLOWLIST_META.source, "Tranco");
  assert.match(ALLOWLIST_META.listId, /^[A-Z0-9]{4,6}$/);
  assert.ok(ALLOWLIST_META.size > 5000);
  assert.equal(isAllowlisted("www.wikipedia.org"), true);
  assert.equal(isAllowlisted("docs.google.com"), false);
  assert.equal(isAllowlisted("paypal-login-help.example"), false);
});

test("settings: privacy defaults and validation", () => {
  assert.equal(DEFAULT_SETTINGS.safeBrowsingEnabled, false);
  assert.equal(DEFAULT_SETTINGS.urlhausEnabled, false);
  assert.equal(DEFAULT_SETTINGS.sslProbe, false);
  const s = normalizeSettings({ safeBrowsingEnabled: "yes", backendEnabled: false, reportLinks: [{ label: "x", url: "javascript:alert(1)" }, { label: "ok", url: "https://a.example" }] });
  assert.equal(s.safeBrowsingEnabled, false);
  assert.equal(s.backendEnabled, false);
  assert.deepEqual(s.reportLinks, [{ label: "ok", url: "https://a.example" }]);
  assert.deepEqual(normalizeSettings(null), DEFAULT_SETTINGS);
});

test("CSV parser: quotes, escaped quotes, CRLF, newlines in fields, BOM", () => {
  const rows: string[][] = [];
  parseCsv("﻿a,b\r\n\"x, y\",\"he said \"\"hi\"\"\"\r\n\"multi\nline\",2\n", (f) => rows.push(f));
  assert.deepEqual(rows, [["a", "b"], ["x, y", 'he said "hi"'], ["multi\nline", "2"]]);
});

test("seeded sampling is deterministic; split is seed-independent", () => {
  const a = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
  const b = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(42));
  const c = shuffle([1, 2, 3, 4, 5, 6, 7, 8], mulberry32(43));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(splitOf("example.com/x"), splitOf("example.com/x"));
  const n = 10000;
  let dev = 0;
  for (let i = 0; i < n; i++) if (splitOf(`u${i}`) === "dev") dev++;
  assert.ok(Math.abs(dev / n - 0.5) < 0.02, `dev share ${dev / n}`);
});

test("metrics and Wilson interval", () => {
  const m = computeMetrics({ tp: 8, fp: 2, tn: 88, fn: 2 });
  assert.equal(m.precision, 0.8);
  assert.equal(m.recall, 0.8);
  assert.equal(m.falsePositiveRate, 2 / 90);
  assert.ok(Math.abs(m.f1 - 0.8) < 1e-12);
  const [lo, hi] = wilson95(50, 100);
  assert.ok(lo > 0.40 && lo < 0.41 && hi > 0.59 && hi < 0.60);
});
