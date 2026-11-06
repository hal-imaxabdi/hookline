/**
 * Pattern data for the job/internship and shopping scam detectors.
 *
 * Written from FTC / FBI IC3 consumer guidance (sources in ruleRegistry.ts)
 * BEFORE looking at any evaluation data. Any later adjustment is logged in
 * eval/TUNING_LOG.md and was made on the dev split only.
 */

import type { BrandDef } from "./detectionRules";

// ─── Job context gate ──────────────────────────────────────────────────────
// Job rules only run when the text is about a job; otherwise "pay a fee" in an
// ordinary email would trigger them.
export const JOB_CONTEXT_TERMS: RegExp[] = [
  /\bjobs?\b/i, /\bpositions?\b/i, /\bvacanc(y|ies)\b/i, /\bhiring\b/i, /\bhired\b/i,
  /\brecruit(er|ers|ing|ment)?\b/i, /\binterview(s|ed|ing)?\b/i, /\binterns?(hip|hips)?\b/i,
  /\boffer letter\b/i, /\bemployment\b/i, /\bemployer\b/i, /\bsalary\b/i, /\bapplicants?\b/i,
  /\b(resume|résumé|cv)\b/i, /\bonboarding\b/i, /\bwork from home\b/i, /\bremote (work|job|position)\b/i,
  /\bpart[- ]time\b/i, /\bfull[- ]time\b/i, /\bwages?\b/i, /\bpay ?roll\b/i,
];

// ─── Free webmail domains ──────────────────────────────────────────────────
export const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "ymail.com", "rocketmail.com", "aol.com", "icloud.com", "me.com", "mac.com",
  "proton.me", "protonmail.com", "gmx.com", "gmx.net", "gmx.de", "mail.com", "zoho.com",
  "yandex.com", "yandex.ru", "mail.ru", "qq.com", "163.com", "126.com",
]);

export const COMPANY_CLAIM: RegExp[] = [
  /\b(hr|human resources)\b/i,
  /\brecruit(er|ing|ment) (team|manager|officer|department|specialist|coordinator)\b/i,
  /\btalent acquisition\b/i,
  /\bhiring (manager|team|department)\b/i,
  /\bon behalf of\b/i,
  /\b(our|the) (company|firm|corporation|organi[sz]ation|client)\b/i,
  /\bwe are (a|an) [^.\n]{0,50}\b(company|firm|corporation|agency|inc|llc|ltd|group)\b/i,
];
export const COMPANY_NAME_HINT = /\b(hr|recruit\w*|careers?|hiring|talent|jobs?|inc|llc|ltd|corp\w*|group|staffing)\b/i;

// ─── Upfront fees ──────────────────────────────────────────────────────────
export const UPFRONT_FEE: RegExp[] = [
  /\b(training|registration|application|processing|visa|work permit|onboarding|background[- ]check|certification|placement|enrol(l)?ment|equipment|starter[- ]kit|uniform|id card|clearance)\s+(fees?|charges?|deposit)\b/gi,
  /\byou (will |would |'ll )?(need|have|are required|must) to (pay|purchase|buy|deposit)\b/gi,
  /\byou (will |would |'ll )?(need|have|are required|must) to send (us |me )?(money|payment|funds|a payment|\$)/gi,
  /\b(refundable|small|one[- ]time|nominal|token) (fee|deposit|payment)\b/gi,
  /\byou (pay|will pay|must pay) (a |the |an )?(fee|deposit)\b/gi,
];
/**
 * Words right before a match that negate it ("no training fee", "no entrance
 * or registration fees") or make the employer the payer ("the company will
 * pay the application fee"). J1 in eval/TUNING_LOG.md.
 */
export const NEGATION_BEFORE = /(\b(no|zero|free|never|without|not|don't|do not|won't|will not|nor)\b[^.\n]{0,25}|\b(we|company|employer|client|they)\s+(will\s+)?(pay|pays|cover|covers|reimburse|reimburses)\s+(for\s+)?(the|your|all|any)?\s*[^.\n]{0,15})$/i;

// ─── Check / reimbursement scheme ──────────────────────────────────────────
export const CHECK_SCHEME: RegExp[] = [
  /\b(we|i|the company|our company|the employer|our client)( will|'ll| shall)\s+(send|mail|issue|courier|overnight)\s+(you\s+)?(a\s+)?(check|cheque|cashier'?s check|money order)\b/gi,
  /\b(deposit|cash|mobile[- ]deposit)\s+(the|this|your)\s+(check|cheque)\b/gi,
  /\b(purchase|buy)\b[^.\n]{0,60}\b(from|through)\s+(our|the|an?)\s+(approved|designated|certified|preferred)\s+vendor\b/gi,
  /\b(send|transfer|wire)\s+(back\s+)?the\s+(remaining|rest|balance|excess|difference)\b/gi,
];
/**
 * Reimbursement is only scam-like when YOU buy first with money THEY send
 * ("we'll reimburse you for the equipment you purchase with the check").
 * Ordinary benefits text ("reimbursement policy for IT equipment") must not fire. J1.
 */
export const REIMBURSE_PURCHASE = /\b(purchase|buy)\b[^.\n]{0,60}\b(with|using)\s+the\s+(funds|check|cheque|money)\b/i;

// ─── Move to chat apps / chat-only interview ───────────────────────────────
// "signal" alone matches "signal processing" — only explicit app phrasings. J1.
export const CHAT_APP = /\b(whats\s?app|telegram|signal app|signal messenger|(on|via) signal|wickr|viber|wechat|google hangouts|hangouts|kik messenger|line app|wire app)\b/i;
export const CHAT_ACTION = /\b(contact|text|message|add (me|us)|chat|reach (me|us|out)|download|install|continue|move|send (me|us)|connect)\b/i;
export const CHAT_LINK = /\b(wa\.me|t\.me|chat\.whatsapp\.com|signal\.me)\//i;
export const CHAT_INTERVIEW: RegExp[] = [
  /\binterview\w*\b[^.\n]{0,50}\b(via|through|on|over|by|using)\s+(text|chat|instant messag\w*|im|whats\s?app|telegram|signal|hangouts|google chat|wire|wickr|skype chat|teams chat)\b/i,
  /\b(text|chat|im)[- ](based )?interview\b/i,
  /\binterview\w*\b[^.\n]{0,30}\b(will be|is) (conducted )?(via |through |by )?(text|chat|instant messaging)\b/i,
];

// ─── Offer without interview ──────────────────────────────────────────────
export const NO_INTERVIEW: RegExp[] = [
  // J1: \s+ (not \s*) so "Overtime Eligible - NoInterview Travel" doesn't match.
  /\b(no|without( an?)?|not require (an? )?|doesn't require (an? )?|does not require (an? )?)\s+interviews?\s+(needed|required|necessary)\b/i,
  /\bwithout (an? |any )?interviews?\b/i,
  // J1: perfect/past only — "in case you are selected for" is conditional.
  /\byou('ve| have) been (selected|hired|chosen|approved|accepted) (for|as)\b(?![^.\n]{0,30}\binterview)/i,
  /\byou were (selected|hired|chosen|approved) (for|as)\b(?![^.\n]{0,30}\binterview)/i,
];

// ─── Unrealistic pay ───────────────────────────────────────────────────────
export const PAY_HOURLY = /(?:\$|usd\s?|£|€)\s?(\d{2,3})(?:\.\d{2})?\s*(?:\/|per|an|a)\s*(?:hr|hour)\b/gi;
export const PAY_DAILY = /(?:\$|usd\s?|£|€)\s?([\d,]{3,6})(?:\.\d{2})?\s*(?:\/|per|a|each)\s*day\b/gi;
export const PAY_WEEKLY = /(?:\$|usd\s?|£|€)\s?([\d,]{4,7})(?:\.\d{2})?\s*(?:\/|per|a|each)\s*week\b/gi;
export const PAY_EARN = /\b(earn|make|making|earning)\s+(up to\s+|over\s+|at least\s+)?(?:\$|£|€)\s?([\d,]{3,7})\b/gi;
export const LOW_EFFORT = /\b(no experience|no skills?|no degree|no qualifications?|minimal (effort|work|experience)|few hours|[1-3]\s?(-|to)\s?[2-4] hours (a|per) (day|week)|(1|one|2|two) hours? (a|per) day|from (your )?(home|phone)|flexible hours|simple tasks?|easy (job|work|money|tasks?)|anyone can|work at your own pace|from your (mobile|smartphone))\b/i;
export const PAY_THRESHOLDS = { hourly: 35, daily: 300, weekly: 1500, earn: 1000 };

// ─── Sensitive info requests ───────────────────────────────────────────────
/**
 * J1: a REQUEST, i.e. verb directly followed (≤ 40 chars) by the item:
 * "send us your SSN", "provide a copy of your passport". Mentions such as
 * "social security (benefit)" or "anyone with a UK bank account" don't fire.
 */
export const SENSITIVE_REQUEST = /\b(send|provide|submit|forward|upload|email|share|fill (out|in)|reply with|text (me|us)|give (us|me))\b[^.\n]{0,40}?\b(social security( number)?|ssn|bank (account|details|information|info|login)|routing number|account number|online banking (login|password|details)|passport( number| copy)?|national id|photo id|copy of (your )?(id|identification|driver'?s licen[cs]e)|credit card (number|details)|debit card (number|details)|mother'?s maiden name)\b/i;

// ─── Task / "liking" job scams ─────────────────────────────────────────────
// J1: generic "deposit"/"top-up" matched bank-teller ads and "top-up their
// careers"; require task-scam phrasing on both sides.
export const TASK_WORD = /\b(complete|completing|submit|rate|rating|like|liking|review|reviewing|optimi[sz]e|optimi[sz]ing|boost|boosting)\s+(\d+\s+)?(tasks?|orders?|products?|apps?|videos?|posts?|hotels?|items?|merchants?|data)\b|\b(combination|lucky|premium) (order|task)s?\b|\btask (commission|reward|earnings)s?\b/i;
export const TASK_MONEY = /\b(recharge|re-charge|top[- ]?up (your |the )?(account|balance|wallet)|usdt|trc20|erc20|negative balance|unlock (your )?(earnings|account|commissions?|withdrawals?)|prepay|deposit (\$|usd|money|funds|crypto|usdt|first|to (unlock|continue|withdraw))|make a deposit)\b/i;

// ─── Urgency ───────────────────────────────────────────────────────────────
export const JOB_URGENCY: RegExp[] = [
  /\b(reply|respond|confirm|accept|get back|revert)\b[^.\n]{0,40}\b(within|in the next)\s+\d+\s*(hours?|hrs?|minutes?|mins?)\b/i,
  /\b(secure|reserve|hold|claim|lock in|confirm)\s+your\s+(position|spot|slot|place|seat|offer|role)\b/i,
  /\blimited (positions|slots|spots|openings|vacancies) (available|left|remaining)\b/i,
  /\b(positions?|spots?|slots?) (are )?filling (up )?(fast|quickly)\b/i,
  /\b(offer|position) (will be )?(expires?|withdrawn|forfeited|given to (someone|another))\b/i,
];

// ─── Shopping ──────────────────────────────────────────────────────────────
export const SHOP_CONTEXT = /\b(add to (cart|bag|basket)|checkout|check out|buy now|shop now|order now|free shipping|in stock|out of stock|shopping (cart|bag)|your cart|proceed to payment)\b/i;
export const DISCOUNT_TEXT = /\b(?:up to\s+|save\s+|flat\s+)?([7-9]\d)\s?%\s?(?:off|discount)\b/gi;
export const UNSAFE_PAYMENT = /\b(bitcoin|btc|ethereum|usdt|crypto(currency)?|gift ?cards?|itunes cards?|steam cards?|google play cards?|wire transfer|bank transfer|direct transfer|western union|moneygram|zelle|cash ?app|venmo|paypal friends (and|&) family)\b/i;
export const SAFE_PAYMENT = /\b(visa|mastercard|master card|american express|amex|discover|credit cards?|debit cards?|paypal(?! friends)|apple pay|google pay|shop pay|klarna|afterpay|affirm|stripe|cash on delivery)\b/i;
export const ONLY_UNSAFE = /\b(only|exclusively|solely)\s+(accept|take|accepting)\b[^.\n]{0,40}\b(bitcoin|crypto\w*|gift ?cards?|wire|bank transfer|zelle|cash ?app|western union|moneygram|usdt)\b|\b(pay|payment)\s+(only\s+)?(via|by|with|through)\s+(gift ?cards?|zelle|wire transfer|bank transfer|bitcoin|crypto\w*|western union|usdt)\s+only\b/i;
export const PHONE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}\b/;
export const ADDRESS: RegExp[] = [
  /\b\d{1,5}\s+(?:[A-Za-z0-9.'-]+\s+){1,5}(street|st|avenue|ave|road|rd|boulevard|blvd|lane|ln|drive|dr|way|court|ct|suite|ste|plaza|square|parkway|pkwy|highway|hwy)\b\.?/i,
  /\b[A-Z]{2}\s\d{5}(?:-\d{4})?\b/,                 // US state + ZIP
  /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/,           // UK postcode
  /\b\d{4,5}\s+[A-Z][a-zäöüß]+\b[^.\n]{0,40}\b(germany|deutschland|france|italia|españa|netherlands)\b/i,
  /\b(strasse|straße|rue|via|calle|straat)\s+\S+\s+\d{1,4}\b/i,
];
export const COUNTDOWN: RegExp[] = [
  /\b(ends?|ending|expires?|left|hurry|only|remaining)\b[^.\n]{0,30}\b\d{1,2}\s?:\s?\d{2}\s?:\s?\d{2}\b/i,
  /\b\d{1,2}\s?:\s?\d{2}\s?:\s?\d{2}\b[^.\n]{0,20}\b(left|remaining)\b/i,
  /\bonly\s+\d{1,2}\s+(left|items? left|left in stock|remaining|in stock)\b/i,
  /\b\d{1,3}\s+(people|others|customers|shoppers)\s+(are\s+)?(viewing|looking at|watching)\b/i,
  /\b(sale|offer|deal|discount)\s+ends\s+(in|today|tonight|soon)\b/i,
];

/** Retail brands frequently counterfeited by fake stores (shopping-scam brand rule). */
export const RETAIL_BRANDS: BrandDef[] = [
  { brand: "Nike", officialDomains: ["nike.com"], keywords: ["nike"], ccVariants: true },
  { brand: "Adidas", officialDomains: ["adidas.com"], keywords: ["adidas"], ccVariants: true },
  { brand: "UGG", officialDomains: ["ugg.com"], keywords: ["ugg", "uggs"], ccVariants: true },
  { brand: "Ray-Ban", officialDomains: ["ray-ban.com"], keywords: ["rayban", "ray-ban"] },
  { brand: "Pandora", officialDomains: ["pandora.net"], keywords: ["pandora"], wholeTokenOnly: ["pandora"] },
  { brand: "LEGO", officialDomains: ["lego.com"], keywords: ["lego"] },
  { brand: "YETI", officialDomains: ["yeti.com"], keywords: ["yeti"] },
  { brand: "Stanley", officialDomains: ["stanley1913.com"], keywords: ["stanley1913", "stanleycup", "stanley-cup"] },
  { brand: "Lululemon", officialDomains: ["lululemon.com"], keywords: ["lululemon"], ccVariants: true },
  { brand: "The North Face", officialDomains: ["thenorthface.com"], keywords: ["northface", "north-face"], ccVariants: true },
  { brand: "Dyson", officialDomains: ["dyson.com"], keywords: ["dyson"], ccVariants: true },
  { brand: "Samsung", officialDomains: ["samsung.com"], keywords: ["samsung"] },
  { brand: "Sony", officialDomains: ["sony.com"], keywords: ["sony"], ccVariants: true },
  { brand: "IKEA", officialDomains: ["ikea.com"], keywords: ["ikea"] },
  { brand: "Zara", officialDomains: ["zara.com"], keywords: ["zara"] },
  { brand: "Uniqlo", officialDomains: ["uniqlo.com"], keywords: ["uniqlo"] },
  { brand: "Gucci", officialDomains: ["gucci.com"], keywords: ["gucci"] },
  { brand: "Louis Vuitton", officialDomains: ["louisvuitton.com"], keywords: ["louisvuitton", "louis-vuitton"] },
  { brand: "Chanel", officialDomains: ["chanel.com"], keywords: ["chanel"] },
  { brand: "Rolex", officialDomains: ["rolex.com"], keywords: ["rolex"] },
  { brand: "Michael Kors", officialDomains: ["michaelkors.com"], keywords: ["michaelkors", "michael-kors"] },
  { brand: "Crocs", officialDomains: ["crocs.com"], keywords: ["crocs"] },
  { brand: "New Balance", officialDomains: ["newbalance.com"], keywords: ["newbalance", "new-balance"] },
  { brand: "Skechers", officialDomains: ["skechers.com"], keywords: ["skechers"] },
  { brand: "Birkenstock", officialDomains: ["birkenstock.com"], keywords: ["birkenstock"] },
  { brand: "Patagonia", officialDomains: ["patagonia.com"], keywords: ["patagonia"], wholeTokenOnly: ["patagonia"] },
  { brand: "Oakley", officialDomains: ["oakley.com"], keywords: ["oakley"] },
  { brand: "Prada", officialDomains: ["prada.com"], keywords: ["prada"] },
  { brand: "Balenciaga", officialDomains: ["balenciaga.com"], keywords: ["balenciaga"] },
  { brand: "Burberry", officialDomains: ["burberry.com"], keywords: ["burberry"] },
  { brand: "Converse", officialDomains: ["converse.com"], keywords: ["converse"], wholeTokenOnly: ["converse"] },
  { brand: "Apple", officialDomains: ["apple.com"], keywords: ["apple", "iphone", "airpods", "macbook"] },
];

/** Words that, next to a brand in a domain, suggest a knock-off store. */
export const STORE_WORDS = /\b(outlet|sale|sales|store|shop|official|clearance|discount|factory|deals?|mall|cheap|wholesale|online)\b/i;
