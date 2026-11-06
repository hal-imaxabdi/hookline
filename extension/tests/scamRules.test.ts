/**
 * One positive + hard negatives for every job/internship and shopping rule,
 * using the SYNTHETIC fixtures in tests/fixtures/synthetic/.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as path from "path";
import { detectJobScam, detectShoppingScam, isJobContext, sentences } from "../src/shared/scamDetectors";
import { analyzeEmail } from "../src/shared/emailAnalyzer";
import { analyzePage } from "../src/shared/pageAnalyzer";
import { RULES, type RuleId } from "../src/shared/ruleRegistry";
import type { PageSnapshot } from "../src/shared/types";

interface JobCase { id: string; synthetic: boolean; rule?: RuleId; senderName: string; senderEmail: string; subject: string; body: string }
interface ShopCase { id: string; synthetic: boolean; rule?: RuleId; page: PageSnapshot }

const fx = (f: string) => JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "synthetic", f), "utf-8"));
const jobs = fx("job_messages.json") as { cases: JobCase[]; negatives: JobCase[] };
const shops = fx("shop_pages.json") as { cases: ShopCase[]; negatives: ShopCase[] };

test("all fixtures are explicitly marked synthetic", () => {
  for (const c of [...jobs.cases, ...jobs.negatives, ...shops.cases, ...shops.negatives]) assert.equal(c.synthetic, true, c.id);
});

// ─── Job rules ────────────────────────────────────────────────────────────

for (const c of jobs.cases) {
  test(`job rule ${c.rule} fires on ${c.id}`, () => {
    const ev = detectJobScam({ kind: "email", subject: c.subject, body: c.body, senderEmail: c.senderEmail, senderName: c.senderName });
    assert.ok(ev.some((e) => e.ruleId === c.rule), `${c.rule} not in [${ev.map((e) => e.ruleId).join(", ")}]`);
    const e = ev.find((x) => x.ruleId === c.rule)!;
    assert.ok(e.description.length > 40, "evidence needs a plain-language reason");
    assert.equal(RULES[e.ruleId].category, "job_scam");
  });
}

test("every job rule in the registry has a positive fixture", () => {
  const covered = new Set(jobs.cases.map((c) => c.rule));
  for (const id of Object.keys(RULES) as RuleId[]) {
    if (RULES[id].category === "job_scam") assert.ok(covered.has(id), `no fixture for ${id}`);
  }
});

for (const c of jobs.negatives) {
  test(`legitimate/non-job message stays clean: ${c.id}`, () => {
    const ev = detectJobScam({ kind: "email", subject: c.subject, body: c.body, senderEmail: c.senderEmail, senderName: c.senderName });
    assert.deepEqual(ev.map((e) => e.ruleId), []);
    const r = analyzeEmail({ subject: c.subject, sender: c.senderName, senderEmail: c.senderEmail, replyTo: "", bodyText: c.body, links: [], timestamp: "" });
    assert.equal(r.verdict, "safe", `${c.id}: ${r.evidence.map((e) => e.ruleId).join(", ")}`);
  });
}

test("multi-signal job scam email is high risk and categorised as a job scam", () => {
  const r = analyzeEmail({
    subject: "Remote Data Entry Position - Offer",
    sender: "Sarah HR Recruiter",
    senderEmail: "sarah.hiring.dept@gmail.com",
    replyTo: "",
    bodyText:
      "Congratulations, you have been selected for the position of Remote Data Entry Clerk. No interview required. " +
      "The pay is $45/hr, no experience needed. We will send you a check to purchase equipment from our approved vendor. " +
      "Please add our hiring manager on Telegram to continue. Reply within 24 hours to secure your position.",
    links: [],
    timestamp: "",
  });
  assert.equal(r.verdict, "high_risk");
  assert.equal(r.category.label, "job_scam");
  assert.ok(r.category.reasons.length >= 3);
});

test("job context gate: postings always qualify, ordinary emails need ≥2 job terms", () => {
  assert.equal(isJobContext({ kind: "posting", body: "anything" }), true);
  assert.equal(isJobContext({ kind: "email", body: "Lunch tomorrow?" }), false);
  assert.equal(isJobContext({ kind: "email", body: "We are hiring for a remote position." }), true);
});

test("negations and employer-pays phrasing don't count as upfront fees", () => {
  const body = "Job details for the position: there is no registration fee. The company will pay the application fee for you.";
  assert.deepEqual(detectJobScam({ kind: "posting", body }).map((e) => e.ruleId), []);
});

test("sentence splitter separates glued sentences from scraped ads", () => {
  assert.deepEqual(sentences("Training provided (new to industry ok)Unlimited marketing materials."), ["Training provided (new to industry ok)", "Unlimited marketing materials."]);
});

// ─── Shopping rules ───────────────────────────────────────────────────────

for (const c of shops.cases) {
  test(`shopping rule ${c.rule} fires on ${c.id}`, () => {
    const ev = detectShoppingScam(c.page);
    assert.ok(ev.some((e) => e.ruleId === c.rule), `${c.rule} not in [${ev.map((e) => e.ruleId).join(", ")}]`);
    assert.equal(RULES[c.rule!].category, "shopping_scam");
  });
}

test("SHOP_NEW_DOMAIN_DISCOUNT needs domain age (backend) and replaces the plain discount rule", () => {
  const page = shops.cases.find((c) => c.rule === "SHOP_HUGE_DISCOUNT")!.page;
  const young = detectShoppingScam(page, { domainAgeDays: 20 }).map((e) => e.ruleId);
  assert.ok(young.includes("SHOP_NEW_DOMAIN_DISCOUNT"));
  assert.ok(!young.includes("SHOP_HUGE_DISCOUNT"));
  const old = detectShoppingScam(page, { domainAgeDays: 4000 }).map((e) => e.ruleId);
  assert.ok(old.includes("SHOP_HUGE_DISCOUNT") && !old.includes("SHOP_NEW_DOMAIN_DISCOUNT"));
});

test("every shopping rule in the registry is covered by a fixture or the domain-age test", () => {
  const covered = new Set<string>([...shops.cases.map((c) => c.rule!), "SHOP_NEW_DOMAIN_DISCOUNT"]);
  for (const id of Object.keys(RULES) as RuleId[]) if (RULES[id].category === "shopping_scam") assert.ok(covered.has(id), id);
});

for (const c of shops.negatives) {
  test(`legitimate/non-shop page stays clean: ${c.id}`, () => {
    assert.deepEqual(detectShoppingScam(c.page).map((e) => e.ruleId), []);
  });
}

test("fake store page combining signals is categorised as a shopping scam", () => {
  const r = analyzePage({
    url: "https://nike-outlet-sale.shop/air",
    title: "Nike Air 85% off",
    text: "Nike Air Max — 85% off today only! Sale ends in 00:14:59. Add to cart. Payment by Zelle or Bitcoin only.",
    links: [],
    pricePairs: [{ was: 180, now: 27 }, { was: 160, now: 24 }],
    hasCheckoutUi: true,
  });
  assert.equal(r.verdict, "high_risk");
  assert.equal(r.category.label, "shopping_scam");
});
