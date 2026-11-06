/**
 * Job/internship and shopping scam detectors.
 *
 * Pure functions over text — no network. Each emits evidence tagged with a
 * rule ID from ruleRegistry.ts and a plain-language explanation for the
 * Evidence tab.
 */

import type { EvidenceItem, PageSnapshot } from "./types";
import { makeEvidence } from "./riskEngine";
import {
  JOB_CONTEXT_TERMS, FREE_MAIL_DOMAINS, COMPANY_CLAIM, COMPANY_NAME_HINT,
  UPFRONT_FEE, NEGATION_BEFORE, CHECK_SCHEME, REIMBURSE_PURCHASE,
  CHAT_APP, CHAT_ACTION, CHAT_LINK, CHAT_INTERVIEW, NO_INTERVIEW,
  PAY_HOURLY, PAY_DAILY, PAY_WEEKLY, PAY_EARN, LOW_EFFORT, PAY_THRESHOLDS,
  SENSITIVE_REQUEST, TASK_WORD, TASK_MONEY, JOB_URGENCY,
  SHOP_CONTEXT, DISCOUNT_TEXT, UNSAFE_PAYMENT, SAFE_PAYMENT, ONLY_UNSAFE,
  PHONE, ADDRESS, COUNTDOWN, RETAIL_BRANDS, STORE_WORDS,
} from "./scamPatterns";
import { KNOWN_BRANDS } from "./detectionRules";
import { findBrandInHost, officialBrandFor, getRegistrableDomain } from "./domainUtils";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Split into sentences / lines so co-occurrence checks stay local. */
export function sentences(text: string): string[] {
  // Also split where a period/bullet is glued to the next capitalised word
  // ("…new to industry ok)Unlimited…", common in scraped job ads). J1.
  return text
    .split(/(?<=[.!?])\s+|(?<=[.!?)])(?=[A-Z][a-z])|\s*[•·▪●]\s*|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function snippet(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 30);
  const end = Math.min(text.length, index + len + 40);
  return `${start > 0 ? "…" : ""}${text.slice(start, end).replace(/\s+/g, " ").trim()}${end < text.length ? "…" : ""}`;
}

/** First match of a global regex that isn't preceded by a negation ("no fee"). */
function firstUnnegated(text: string, re: RegExp): RegExpExecArray | null {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  let m: RegExpExecArray | null;
  while ((m = g.exec(text)) !== null) {
    const before = text.slice(Math.max(0, m.index - 30), m.index);
    if (!NEGATION_BEFORE.test(before)) return m;
    if (m[0].length === 0) g.lastIndex++;
  }
  return null;
}

function firstMatch(text: string, res: RegExp[]): RegExpExecArray | null {
  for (const re of res) {
    const m = firstUnnegated(text, re);
    if (m) return m;
  }
  return null;
}

function amount(s: string): number {
  return Number(s.replace(/,/g, ""));
}

// ─── Job context ───────────────────────────────────────────────────────────

export function jobContextScore(text: string): number {
  return JOB_CONTEXT_TERMS.reduce((n, re) => n + (re.test(text) ? 1 : 0), 0);
}

export interface JobInput {
  subject?: string;
  body: string;
  senderEmail?: string;
  senderName?: string;
  /** "posting" = a job ad (always job context), "email"/"page" need ≥ 2 job terms. */
  kind: "email" | "posting" | "page";
}

export function isJobContext(input: JobInput): boolean {
  if (input.kind === "posting") return true;
  return jobContextScore(`${input.subject ?? ""}\n${input.body}`) >= 2;
}

// ─── Job / internship scam detector ────────────────────────────────────────

export function detectJobScam(input: JobInput): EvidenceItem[] {
  if (!isJobContext(input)) return [];
  const text = `${input.subject ?? ""}\n${input.body}`;
  const out: EvidenceItem[] = [];
  const sents = sentences(text);

  // 1. Upfront fees
  const fee = firstMatch(text, UPFRONT_FEE);
  if (fee) {
    out.push(makeEvidence("JOB_UPFRONT_FEE", "Asks you to pay to get the job",
      "Real employers never charge you for training, equipment, registration, background checks or visas. A fee up front is the most common sign of a job scam.",
      `"${snippet(text, fee.index, fee[0].length)}"`));
  }

  // 2. Check / reimbursement schemes
  const chk = firstMatch(text, CHECK_SCHEME) ?? (REIMBURSE_PURCHASE.test(text) ? REIMBURSE_PURCHASE.exec(text) : null);
  if (chk) {
    out.push(makeEvidence("JOB_CHECK_SCHEME", "Check-deposit or reimbursement scheme",
      "They plan to send you a check and have you buy equipment or send money on. The check later bounces and you lose whatever you paid out.",
      `"${snippet(text, chk.index, chk[0].length)}"`));
  }

  // 3. Free webmail recruiter claiming a company (email only)
  if (input.kind === "email" && input.senderEmail) {
    const dom = (input.senderEmail.split("@")[1] ?? "").toLowerCase();
    if (FREE_MAIL_DOMAINS.has(dom)) {
      const claim = COMPANY_CLAIM.find((re) => re.test(text));
      const nameHint = input.senderName ? COMPANY_NAME_HINT.test(input.senderName) : false;
      if (claim || nameHint) {
        out.push(makeEvidence("JOB_FREE_EMAIL_RECRUITER", "Company recruiter using a free email account",
          `This message claims to be about a job with a company, but it was sent from a free ${dom} address. Real recruiters write from their company's domain.`,
          `From: ${input.senderName ? `${input.senderName} ` : ""}<${input.senderEmail}>`));
      }
    }
  }

  // 4. Move to WhatsApp / Telegram / Signal
  const chatSent = sents.find((s) => CHAT_APP.test(s) && CHAT_ACTION.test(s)) ?? (CHAT_LINK.test(text) ? CHAT_LINK.exec(text)?.[0] : undefined);
  if (chatSent) {
    out.push(makeEvidence("JOB_MOVE_TO_CHAT", "Wants to move you to WhatsApp, Telegram or Signal",
      "Scammers move job conversations to encrypted chat apps where they're harder to trace and report. Recruiters at real companies use company email and phone.",
      `"${chatSent.slice(0, 160)}"`));
  }

  // 5. Chat-only interview
  const ci = CHAT_INTERVIEW.map((re) => re.exec(text)).find((m): m is RegExpExecArray => m !== null);
  if (ci) {
    out.push(makeEvidence("JOB_CHAT_INTERVIEW", "Interview by text chat only",
      "An 'interview' done entirely by text or instant message is a hallmark of fake jobs — no real employer hires without hearing or seeing you.",
      `"${snippet(text, ci.index, ci[0].length)}"`));
  }

  // 6. Offer without an interview
  const ni = NO_INTERVIEW.map((re) => re.exec(text)).find((m): m is RegExpExecArray => m !== null);
  if (ni) {
    out.push(makeEvidence("JOB_OFFER_NO_INTERVIEW", "Job offer without an interview",
      "You're being 'hired' or 'selected' without any interview. Real offers come after you've talked to someone — especially for jobs you never applied to.",
      `"${snippet(text, ni.index, ni[0].length)}"`));
  }

  // 7. Unrealistic pay for little effort
  const pay = findUnrealisticPay(text);
  if (pay && LOW_EFFORT.test(text)) {
    const effort = LOW_EFFORT.exec(text)?.[0] ?? "";
    out.push(makeEvidence("JOB_UNREALISTIC_PAY", "Unrealistic pay for very little work",
      `Promises like ${pay} combined with "${effort}" are too good to be true. High pay for no experience is bait.`,
      `${pay} · "${effort}"`));
  }

  // 8. SSN / bank / ID requests
  const sens = firstUnnegated(text, SENSITIVE_REQUEST);
  if (sens) {
    out.push(makeEvidence("JOB_SENSITIVE_INFO", "Asks for your SSN, bank details or ID",
      "Never send your Social Security number, bank account or ID by email or chat before you've verified the employer and signed a real offer — this is how identity theft starts.",
      `"${snippet(text, sens.index, sens[0].length)}"`));
  }

  // 9. Task / "liking" jobs with deposits
  // Task wording and the deposit demand are often in adjacent sentences, so
  // look at a window of up to 3 consecutive sentences.
  let task: string | undefined;
  for (let i = 0; i < sents.length && !task; i++) {
    const win = sents.slice(i, i + 3).join(" ");
    if (TASK_WORD.test(sents[i]) && TASK_MONEY.test(win)) task = win;
  }
  if (task) {
    out.push(makeEvidence("JOB_TASK_DEPOSIT", "'Task' job that needs you to deposit money",
      "Jobs that pay you to like, rate or 'optimise' products but require deposits or 'recharges' (often in crypto) to unlock earnings are task scams. You will not get the money back.",
      `"${task.slice(0, 160)}"`));
  }

  // 10. Pressure to accept fast
  const urg = JOB_URGENCY.map((re) => re.exec(text)).find((m): m is RegExpExecArray => m !== null);
  if (urg) {
    out.push(makeEvidence("JOB_URGENCY", "Pressure to accept quickly",
      "Deadlines like 'reply within 24 hours to secure your position' are meant to stop you from checking the company or asking someone.",
      `"${snippet(text, urg.index, urg[0].length)}"`));
  }

  return out;
}

function findUnrealisticPay(text: string): string | null {
  const checks: Array<[RegExp, number, string]> = [
    [PAY_HOURLY, PAY_THRESHOLDS.hourly, "/hour"],
    [PAY_DAILY, PAY_THRESHOLDS.daily, "/day"],
    [PAY_WEEKLY, PAY_THRESHOLDS.weekly, "/week"],
    [PAY_EARN, PAY_THRESHOLDS.earn, ""],
  ];
  for (const [re, min] of checks) {
    const g = new RegExp(re.source, re.flags);
    let m: RegExpExecArray | null;
    while ((m = g.exec(text)) !== null) {
      const raw = m[m.length - 1] ?? m[1];
      if (amount(raw) >= min) return m[0].trim();
    }
  }
  return null;
}

// ─── Shopping scam detector ────────────────────────────────────────────────

export interface ShoppingSignals {
  shopContext: boolean;
  maxDiscount: number; // 0–1
}

export function shoppingSignals(page: PageSnapshot): ShoppingSignals {
  const shopContext = page.hasCheckoutUi || SHOP_CONTEXT.test(page.text);
  let maxDiscount = 0;
  const pairDiscounts = page.pricePairs
    .filter((p) => p.was > 0 && p.now > 0 && p.now < p.was)
    .map((p) => 1 - p.now / p.was);
  // Require ≥ 2 pairs at the level we report, so a single typo'd price doesn't fire.
  const sorted = pairDiscounts.sort((a, b) => b - a);
  if (sorted.length >= 2) maxDiscount = sorted[1];
  const g = new RegExp(DISCOUNT_TEXT.source, DISCOUNT_TEXT.flags);
  let m: RegExpExecArray | null;
  while ((m = g.exec(page.text)) !== null) maxDiscount = Math.max(maxDiscount, Number(m[1]) / 100);
  return { shopContext, maxDiscount };
}

export interface ShoppingOptions {
  domainAgeDays?: number | null;
}

export function detectShoppingScam(page: PageSnapshot, opts: ShoppingOptions = {}): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  const { shopContext, maxDiscount } = shoppingSignals(page);
  if (!shopContext) return out;

  let host = "";
  try { host = new URL(page.url).hostname.toLowerCase(); } catch { /* ignore */ }
  const text = page.text;

  // Discounts (+ very new domain, when the backend supplied its age)
  if (maxDiscount >= 0.7) {
    const pctOff = Math.round(maxDiscount * 100);
    if (opts.domainAgeDays != null && opts.domainAgeDays < 180) {
      out.push(makeEvidence("SHOP_NEW_DOMAIN_DISCOUNT", "Brand-new store with huge discounts",
        `This store's domain is only ${opts.domainAgeDays} days old and advertises around ${pctOff}% off. Fake shops appear, take orders for a few weeks, and vanish.`,
        `Domain age: ${opts.domainAgeDays} days · discount ≈ ${pctOff}%`));
    } else {
      out.push(makeEvidence("SHOP_HUGE_DISCOUNT", "Too-good-to-be-true discounts",
        `Prices here are around ${pctOff}% below the listed original price. Discounts this deep are a common lure on fake stores.`,
        `Largest discount ≈ ${pctOff}%`));
    }
  }

  // Payment methods
  const onlyUnsafe = ONLY_UNSAFE.exec(text);
  const unsafe = UNSAFE_PAYMENT.exec(text);
  if (onlyUnsafe || (unsafe && !SAFE_PAYMENT.test(text))) {
    const m = onlyUnsafe ?? unsafe!;
    out.push(makeEvidence("SHOP_UNSAFE_PAYMENT", "Only hard-to-reverse payment methods",
      "This store asks for payment by crypto, gift card, wire/bank transfer or Zelle and offers no credit card or PayPal checkout. Those payments can't be disputed — if the goods never arrive, the money is gone.",
      `"${snippet(text, m.index, m[0].length)}"`));
  }

  // Contact details
  const hasPhone = PHONE.test(text) || page.links.some((l) => l.href.startsWith("tel:"));
  const hasAddress = ADDRESS.some((re) => re.test(text));
  if (!hasPhone && !hasAddress) {
    out.push(makeEvidence("SHOP_NO_CONTACT", "No phone number or street address",
      "A real store tells you where it is and how to reach a person. This page has no phone number and no physical address.",
      "No phone/tel: link and no recognisable street address found on the page"));
  }

  // Brand in an unofficial store domain
  if (host) {
    const all = [...RETAIL_BRANDS, ...KNOWN_BRANDS];
    const hit = findBrandInHost(host, all);
    if (hit && !officialBrandFor(host, all)) {
      const storeWord = STORE_WORDS.test(host.replace(/[.\-_]/g, " "));
      out.push(makeEvidence("SHOP_BRAND_DOMAIN", `Uses the ${hit.brand} name but isn't ${hit.brand}'s store`,
        `This shop's domain (${getRegistrableDomain(host)}) contains "${hit.keyword}" but is not ${hit.brand}'s official site (${hit.official}). Fake stores borrow brand names to look legitimate.`,
        `Domain: ${host}${storeWord ? " · combined with store words (outlet/sale/shop…)" : ""}`,
        storeWord ? "high" : "medium"));
    }
  }

  // Countdown / scarcity
  const cd = COUNTDOWN.map((re) => re.exec(text)).find((x): x is RegExpExecArray => x !== null);
  if (cd) {
    out.push(makeEvidence("SHOP_COUNTDOWN", "Countdown timer or 'only 2 left' pressure",
      "Timers and scarcity messages push you to buy before you check reviews or the company. On fake stores they often reset every visit.",
      `"${snippet(text, cd.index, cd[0].length)}"`));
  }

  return out;
}
