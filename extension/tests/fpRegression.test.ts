/**
 * Regression tests for the false positives found in the Phase 1 audit
 * (AUDIT.md §2) and the fixes in eval/TUNING_LOG.md (C1–C7).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeUrl } from "../src/shared/urlAnalyzer";
import { analyzeEmail } from "../src/shared/emailAnalyzer";
import type { RawEmailData } from "../src/shared/types";

const SAFE_URLS = [
  "https://groups.io",            // was UPS
  "https://www.purchase.edu",     // was Chase
  "https://startups.com",         // was UPS
  "https://pineapple.com",        // was Apple
  "https://happiness.org",        // was Apple (appi)
  "https://steamboat.com",        // was Steam
  "https://www.dhimanbrothers.in",// was DHL (dhi)
  "https://googleblog.com",       // real Google domain
  "https://www.amazon.com.au",    // real Amazon AU
  "https://www.google.de",        // ccTLD variant
  "https://hive.com",             // was typosquat of live.com
  "https://city.com",             // was typosquat of citi.com
  "https://apply.com",            // was typosquat of apple.com
  "https://account.com",          // was typosquat of "accounts".google.com
  "https://data.com",             // was typosquat of meta.com
  "https://tools.ietf.org/html/rfc2616",
  "https://www.northcountyoutlook.com",
];

for (const u of SAFE_URLS) {
  test(`no false positive: ${u}`, () => {
    const r = analyzeUrl(u);
    assert.equal(r.verdict, "safe", `${u} → ${r.evidence.map((e) => e.ruleId).join(", ")}`);
  });
}

test("allow-listed popular site: lexical login-path heuristic is suppressed, not deleted", () => {
  const r = analyzeUrl("https://github.com/login");
  assert.equal(r.allowlisted, true);
  assert.equal(r.verdict, "safe");
  assert.ok(r.suppressedEvidence.some((e) => e.ruleId === "URL_PATH_LOGIN"));
});

test("user-content hosts are never allow-listed", () => {
  for (const u of ["https://docs.google.com/forms/d/x/viewform", "https://evil.github.io/login", "https://contoso.sharepoint.com/x", "https://bit.ly/abc"]) {
    assert.equal(analyzeUrl(u).allowlisted, false, u);
  }
});

test("scheme-less input does not trigger the no-HTTPS rule", () => {
  const r = analyzeUrl("http://example.com/index.php", { schemeKnown: false });
  assert.ok(!r.evidence.some((e) => e.ruleId === "URL_NO_HTTPS"));
});

const email = (over: Partial<RawEmailData>): RawEmailData => ({
  subject: "", sender: "", senderEmail: "", replyTo: "", bodyText: "", links: [], timestamp: "", ...over,
});

test("receipt mentioning 'purchase' is not Chase impersonation", () => {
  const r = analyzeEmail(email({ subject: "Your order receipt", sender: "Etsy", senderEmail: "orders@etsy.com", bodyText: "Thanks for your purchase! Your order ships soon." }));
  assert.equal(r.verdict, "safe");
});

test("newsletter that mentions a brand and links to it is not flagged", () => {
  const r = analyzeEmail(email({
    subject: "This week in tech", sender: "Tech Weekly", senderEmail: "news@techweekly.substack.com",
    bodyText: "Apple announced new products. Update your account preferences here.",
    links: [{ href: "https://www.apple.com/newsroom", text: "www.apple.com/newsroom", domain: "www.apple.com" }],
  }));
  assert.equal(r.verdict, "safe", r.evidence.map((e) => e.ruleId).join(", "));
});

test("links to other legitimate domains (tracking/ESP) are not suspicious on their own", () => {
  const r = analyzeEmail(email({
    subject: "Weekly digest", sender: "Shop", senderEmail: "news@shop.example.com",
    bodyText: "Our new collection is here.",
    links: [
      { href: "https://click.mailchimp.com/abc", text: "Shop now", domain: "click.mailchimp.com" },
      { href: "https://www.instagram.com/shop", text: "Instagram", domain: "www.instagram.com" },
      { href: "https://www.youtube.com/watch?v=1", text: "Video", domain: "www.youtube.com" },
    ],
  }));
  assert.equal(r.verdict, "safe");
  assert.ok(r.links.every((l) => !l.isSuspicious));
});

test("link text showing one domain while pointing to another is high risk", () => {
  const r = analyzeEmail(email({
    subject: "Invoice", sender: "Billing", senderEmail: "billing@vendor.example.com",
    links: [{ href: "https://login-portal.example.top/x", text: "https://www.paypal.com", domain: "login-portal.example.top" }],
  }));
  const link = r.links[0];
  assert.equal(link.verdict, "high_risk");
  assert.match(link.flags[0], /shows www\.paypal\.com/);
});

test("free-webmail Reply-To on a company sender is flagged", () => {
  const r = analyzeEmail(email({ subject: "Payment", sender: "Accounts", senderEmail: "accounts@contoso.com", replyTo: "contoso.accounts@gmail.com" }));
  assert.ok(r.evidence.some((e) => e.ruleId === "EMAIL_REPLYTO_MISMATCH"));
});
