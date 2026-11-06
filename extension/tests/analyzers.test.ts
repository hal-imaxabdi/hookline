/**
 * Core URL / email / risk-engine tests. Node's built-in test runner.
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { analyzeUrl, enrichWithDomainInfo } from "../src/shared/urlAnalyzer";
import { analyzeEmail } from "../src/shared/emailAnalyzer";
import { scoreEvidence, makeEvidence, categorize } from "../src/shared/riskEngine";
import { RULES, ALL_RULE_IDS, rulesetFingerprint } from "../src/shared/ruleRegistry";
import type { DomainInfo, RawEmailData } from "../src/shared/types";

// ─── URL analyzer ──────────────────────────────────────────────────────────

test("known-safe domain is not flagged", () => {
  assert.equal(analyzeUrl("https://google.com").verdict, "safe");
});

test("leetspeak typosquat is flagged (paypa1.com)", () => {
  const r = analyzeUrl("http://paypa1.com");
  assert.notEqual(r.verdict, "safe");
  assert.ok(r.evidence.some((e) => e.ruleId === "URL_TYPOSQUAT_LEET"));
});

test("homoglyph domain is flagged even after the URL parser punycodes it", () => {
  const r = analyzeUrl("https://pаypal.com"); // 2nd char is U+0430
  assert.equal(r.domain.startsWith("xn--"), true);
  assert.equal(r.verdict, "high_risk");
  assert.ok(r.evidence.some((e) => e.ruleId === "URL_HOMOGLYPH_BRAND"));
  assert.ok(r.evidence.some((e) => e.ruleId === "URL_MIXED_SCRIPT"));
});

test("IP-address host is flagged", () => {
  assert.notEqual(analyzeUrl("http://192.168.10.5/login").verdict, "safe");
  assert.notEqual(analyzeUrl("http://[2001:db8::1]/login").verdict, "safe");
});

test("brand name embedded in unrelated domain is flagged", () => {
  const r = analyzeUrl("http://paypal-secure-login.xyz");
  assert.equal(r.verdict, "high_risk");
  assert.equal(r.category.label, "credential_phishing");
});

test("redirect wrappers are unwrapped and the destination analyzed", () => {
  const r = analyzeUrl("https://www.google.com/url?q=https://paypal-verify.top/login");
  assert.ok(r.evidence.some((e) => e.ruleId === "URL_REDIRECTOR"));
  assert.ok(r.evidence.some((e) => e.ruleId === "URL_BRAND_IN_DOMAIN"));
  assert.equal(r.verdict, "high_risk");
});

test("deep subdomain chains are flagged; www doesn't count", () => {
  assert.ok(analyzeUrl("https://paypal.com.secure.login.evil-example.net").evidence.some((e) => e.ruleId === "URL_DEEP_SUBDOMAINS"));
  assert.ok(!analyzeUrl("https://www.a.b.example.net").evidence.some((e) => e.ruleId === "URL_DEEP_SUBDOMAINS"));
});

test("unparseable input returns verdict unknown with an error", () => {
  const r = analyzeUrl("not a url");
  assert.equal(r.verdict, "unknown");
  assert.ok(r.error);
});

// ─── Risk engine ─────────────────────────────────────────────────────────────

test("no evidence scores 0 and is safe", () => {
  const s = scoreEvidence([]);
  assert.equal(s.riskScore, 0);
  assert.equal(s.verdict, "safe");
  assert.equal(s.category.label, "none");
});

test("a single weak signal does not flip to suspicious", () => {
  assert.equal(scoreEvidence([makeEvidence("EMAIL_NO_DMARC", "x", "y")]).verdict, "safe");
});

test("a single strong signal escalates", () => {
  assert.notEqual(scoreEvidence([makeEvidence("URL_HOMOGLYPH_BRAND", "x", "y")]).verdict, "safe");
});

test("points = weight × severity factor; strongest per group; groups add", () => {
  const s = scoreEvidence([
    makeEvidence("URL_PATH_SCRIPT", "a", "b"),  // url_structure 35 × .5 = 17.5
    makeEvidence("URL_LONG_DOMAIN", "a", "b"),  // url_structure 40 × .5 = 20 (max of group)
    makeEvidence("URL_SUSPICIOUS_TLD", "a", "b"), // suspicious_tld 40 × .5 = 20
  ]);
  assert.equal(s.riskScore, 40);
  assert.equal(s.verdict, "suspicious");
});

test("disabled rules are ignored (ablation)", () => {
  const ev = [makeEvidence("URL_BRAND_IN_DOMAIN", "a", "b")];
  assert.equal(scoreEvidence(ev).verdict, "suspicious");
  assert.equal(scoreEvidence(ev, { disabledRules: new Set(["URL_BRAND_IN_DOMAIN"]) }).verdict, "safe");
});

test("allow-list suppresses only suppressible rules", () => {
  const ev = [makeEvidence("URL_PATH_LOGIN", "a", "b"), makeEvidence("URL_HOMOGLYPH_BRAND", "a", "b")];
  const s = scoreEvidence(ev, { allowlisted: true });
  assert.deepEqual(s.suppressed.map((e) => e.ruleId), ["URL_PATH_LOGIN"]);
  assert.deepEqual(s.active.map((e) => e.ruleId), ["URL_HOMOGLYPH_BRAND"]);
});

test("category: general signals alone never name a category", () => {
  const ev = [makeEvidence("URL_SUSPICIOUS_TLD", "a", "b"), makeEvidence("URL_LONG_DOMAIN", "a", "b")];
  const s = scoreEvidence(ev);
  assert.equal(s.verdict, "suspicious");
  assert.equal(s.category.label, "none");
});

test("category: safe verdict is always 'none'", () => {
  assert.equal(categorize([makeEvidence("JOB_URGENCY", "a", "b")], "safe").label, "none");
});

test("rule registry is well-formed and fingerprint is stable", () => {
  for (const id of ALL_RULE_IDS) {
    const r = RULES[id];
    assert.equal(r.id, id);
    assert.ok(r.weight > 0 && r.weight <= 100, id);
    assert.ok(r.description.length > 20, id);
    assert.ok(r.title.length > 3, id);
  }
  assert.equal(rulesetFingerprint(), rulesetFingerprint());
  assert.match(rulesetFingerprint(), /^[0-9a-f]{8}$/);
});

// ─── Enrichment ─────────────────────────────────────────────────────────────

const info = (over: Partial<DomainInfo>): DomainInfo => ({
  domain: "example.com", registrar: "R", createdDate: null, createdDaysAgo: null, isNewDomain: false,
  spfStatus: "pass", dkimStatus: "unknown", sslIssuer: null, sslHasOrgValidation: false, reputationScore: "unknown",
  dmarcStatus: "pass", ...over,
});

test("very new domain from the backend raises a URL to suspicious", () => {
  const base = analyzeUrl("https://shop-example-store.com");
  assert.equal(base.verdict, "safe");
  const e = enrichWithDomainInfo(base, info({ isNewDomain: true, createdDaysAgo: 5 }));
  assert.equal(e.verdict, "suspicious");
  assert.ok(e.evidence.some((x) => x.ruleId === "DOMAIN_VERY_NEW"));
});

test("SPF/DMARC gaps only count in email context", () => {
  const base = analyzeUrl("https://example-co.com");
  const noAuth = info({ spfStatus: "missing", dmarcStatus: "missing" });
  assert.equal(enrichWithDomainInfo(base, noAuth).evidence.length, 0);
  assert.equal(enrichWithDomainInfo(base, noAuth, { emailContext: true }).evidence.length, 2);
});

// ─── Email analyzer ──────────────────────────────────────────────────────────

const phishingEmail: RawEmailData = {
  subject: "Your PayPal account has been suspended",
  sender: "PayPal Security",
  senderEmail: "security@paypal-alert.xyz",
  replyTo: "",
  bodyText: "Unusual activity detected. Verify your account immediately or it will be suspended. Click here to confirm your password.",
  links: [{ href: "http://paypal-alert.xyz/verify", text: "Verify now", domain: "paypal-alert.xyz" }],
  timestamp: new Date().toISOString(),
};

const legitEmail: RawEmailData = {
  subject: "Lunch tomorrow?",
  sender: "Alice",
  senderEmail: "alice@example.com",
  replyTo: "",
  bodyText: "Hey, want to grab lunch tomorrow at noon near the office?",
  links: [],
  timestamp: new Date().toISOString(),
};

test("phishing email is flagged as credential phishing", () => {
  const r = analyzeEmail(phishingEmail);
  assert.equal(r.verdict, "high_risk");
  assert.ok(r.evidence.some((e) => e.ruleId === "EMAIL_BRAND_IMPERSONATION"));
  assert.equal(r.category.label, "credential_phishing");
});

test("ordinary email is safe", () => {
  assert.equal(analyzeEmail(legitEmail).verdict, "safe");
});

test("real brand sender is not flagged as impersonating itself", () => {
  const r = analyzeEmail({ ...legitEmail, sender: "PayPal", senderEmail: "service@paypal.com", subject: "Your receipt", bodyText: "Your PayPal payment was sent." });
  assert.equal(r.verdict, "safe");
});
