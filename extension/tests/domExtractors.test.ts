/**
 * Gmail and page extraction against SYNTHETIC DOM fixtures (JSDOM).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import { parseGmailHash, extractOpenEmail, readHeaderDetail, unwrapGmailHref, findDetailsToggle, findOpenMessage } from "../src/content/gmailExtractor";
import { extractPageSnapshot } from "../src/content/pageExtractor";

const load = (f: string) => new JSDOM(fs.readFileSync(path.join(__dirname, "fixtures", "gmail", f), "utf-8")).window.document;

test("parseGmailHash takes the LAST segment as the thread id, in every view", () => {
  const id = "FMfcgzQXJWDsKmqdFbBvNxLJcnLprMvm";
  for (const h of [`#inbox/${id}`, `#label/Work/${id}`, `#label/Parent%2FChild/${id}`, `#search/invoice/${id}`, `#category/promotions/${id}`, `#imp/${id}`, `#trash/${id}`, `#starred/${id}`]) {
    assert.deepEqual(parseGmailHash(h)?.threadId, id, h);
  }
});

test("parseGmailHash ignores list views and page markers", () => {
  for (const h of ["", "#inbox", "#label/Work", "#search/invoice", "#inbox/p2", "#category/social"]) {
    assert.equal(parseGmailHash(h), null, h);
  }
});

test("extracts the NEWEST expanded message, not the oldest", () => {
  const out = extractOpenEmail(load("thread_two_messages.html"));
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.equal(out.data.senderEmail, "security@paypal-alert.example.xyz");
  assert.equal(out.data.sender, "PayPal Security");
  assert.equal(out.data.subject, "Your account has been suspended");
  assert.equal(out.messageKey, "#msg-f:222");
  assert.match(out.data.bodyText, /Unusual activity detected/);
});

test("links: Gmail google.com/url wrappers unwrapped, mailto dropped", () => {
  const out = extractOpenEmail(load("thread_two_messages.html"));
  assert.ok(out.ok);
  if (!out.ok) return;
  assert.deepEqual(out.data.links.map((l) => l.href), ["http://paypal-alert.example.xyz/verify", "https://login-paypal.example.top/signin"]);
  assert.equal(out.data.links[1].text, "www.paypal.com");
  assert.equal(unwrapGmailHref("https://www.google.com/url?q=https://x.example/a&sa=D"), "https://x.example/a");
});

test("reply-to / mailed-by read from the details table without class names", () => {
  const doc = load("thread_two_messages.html");
  assert.equal(readHeaderDetail(doc, "reply-to"), "collector@gmail.com");
  assert.equal(readHeaderDetail(doc, "mailed-by"), "paypal-alert.example.xyz");
  assert.equal(readHeaderDetail(doc, "signed-by"), "");
});

test("details toggle is found inside the open message", () => {
  const doc = load("thread_two_messages.html");
  const msg = findOpenMessage(doc);
  assert.ok(msg);
  assert.ok(findDetailsToggle(msg!.container));
});

test("fallback chains work when Gmail class names change", () => {
  const out = extractOpenEmail(load("fallback_no_classes.html"));
  assert.ok(out.ok, out.ok ? "" : out.detail);
  if (!out.ok) return;
  assert.equal(out.data.senderEmail, "alice@contoso.example");
  assert.equal(out.data.subject, "Quarterly report");
  assert.match(out.data.extractionPath ?? "", /sender:h3\.iw span\[email\]/);
});

test("clear failure when nothing matches (no silent null)", () => {
  const empty = new JSDOM("<div role='main'><p>Loading…</p></div>").window.document;
  const out = extractOpenEmail(empty);
  assert.equal(out.ok, false);
  if (!out.ok) assert.equal(out.reason, "no_message_found");
  const noSender = new JSDOM("<div data-message-id='x'><div class='a3s aiL'>body</div></div>").window.document;
  const out2 = extractOpenEmail(noSender);
  assert.equal(out2.ok, false);
  if (!out2.ok) assert.equal(out2.reason, "selectors_failed");
});

// ─── Page extractor ────────────────────────────────────────────────────────

function runPageExtractor(html: string, url: string) {
  const dom = new JSDOM(html, { url });
  const g = globalThis as unknown as Record<string, unknown>;
  const saved = { document: g.document, location: g.location, getComputedStyle: g.getComputedStyle };
  g.document = dom.window.document;
  g.location = dom.window.location;
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  try {
    return extractPageSnapshot();
  } finally {
    Object.assign(g, saved);
  }
}

test("page snapshot: struck-through prices are paired with the sale price", () => {
  const snap = runPageExtractor(
    `<html><head><title>SYNTHETIC store</title></head><body>
      <div class="card"><div><del>$200.00</del><span class="price">$29.99</span></div></div>
      <div class="card"><div><span class="compare-at">$150.00</span><span>$19.99</span></div></div>
      <button>Add to cart</button>
    </body></html>`,
    "https://store.example/p"
  );
  assert.equal(snap.title, "SYNTHETIC store");
  assert.equal(snap.hasCheckoutUi, true);
  assert.deepEqual(snap.pricePairs, [{ was: 200, now: 29.99 }, { was: 150, now: 19.99 }]);
  assert.equal(snap.url, "https://store.example/p");
});

test("page snapshot: European price format", () => {
  const snap = runPageExtractor(`<body><p><s>€1.299,00</s> <b>€199,00</b></p></body>`, "https://shop.example/");
  assert.deepEqual(snap.pricePairs, [{ was: 1299, now: 199 }]);
});
