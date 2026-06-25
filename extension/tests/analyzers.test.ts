/**
 * Hookline Analyzer Tests — Phase 11
 *
 * Uses Node's built-in test runner (no jest/vitest needed).
 * Run with:  npm run test
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { analyzeUrl } from "../src/shared/urlAnalyzer";
import { analyzeEmail, RawEmailData } from "../src/shared/emailAnalyzer";
import { scoreEvidence } from "../src/shared/riskEngine";

// ─── URL analyzer ──────────────────────────────────────────────────────────

test("known-safe domain is not flagged", () => {
  assert.equal(analyzeUrl("https://google.com").verdict, "safe");
});

test("leetspeak typosquat is flagged (paypa1.com)", () => {
  const r = analyzeUrl("http://paypa1.com");
  assert.notEqual(r.verdict, "safe");
  assert.ok(r.evidence.some((e) => e.type === "typosquatting"));
});

test("homoglyph domain is flagged (Cyrillic a in paypal)", () => {
  const r = analyzeUrl("https://pаypal.com"); // 2nd char is U+0430
  assert.notEqual(r.verdict, "safe");
  assert.ok(r.evidence.some((e) => e.type === "homoglyph"));
});

test("IP-address host is flagged", () => {
  const r = analyzeUrl("http://192.168.10.5/login");
  assert.notEqual(r.verdict, "safe");
});

test("brand name embedded in unrelated domain is flagged", () => {
  const r = analyzeUrl("http://paypal-secure-login.xyz");
  assert.notEqual(r.verdict, "safe");
});

// ─── Risk engine ─────────────────────────────────────────────────────────────

test("no evidence scores 0 and is safe", () => {
  const s = scoreEvidence([]);
  assert.equal(s.riskScore, 0);
  assert.equal(s.verdict, "safe");
});

test("a single weak signal does not flip to suspicious", () => {
  const s = scoreEvidence([
    { type: "no_dmarc", severity: "low", title: "x", description: "y" },
  ]);
  assert.equal(s.verdict, "safe");
});

test("a single strong signal escalates", () => {
  const s = scoreEvidence([
    { type: "homoglyph", severity: "high", title: "x", description: "y" },
  ]);
  assert.notEqual(s.verdict, "safe");
});

// ─── Email analyzer ──────────────────────────────────────────────────────────

const phishingEmail: RawEmailData = {
  subject: "Your PayPal account has been suspended",
  sender: "PayPal Security",
  senderEmail: "security@paypal-alert.xyz",
  replyTo: "",
  bodyText:
    "Unusual activity detected. Verify your account immediately or it will be suspended. Click here to confirm your password.",
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

test("phishing email is flagged", () => {
  const r = analyzeEmail(phishingEmail);
  assert.notEqual(r.verdict, "safe");
  assert.ok(r.evidence.some((e) => e.type === "brand_impersonation"));
});

test("ordinary email is safe", () => {
  assert.equal(analyzeEmail(legitEmail).verdict, "safe");
});
