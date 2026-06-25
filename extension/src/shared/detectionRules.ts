/**
 * Hookline Detection Rules
 *
 * Pure data — no logic here, just the word lists and domain lists
 * used by emailAnalyzer.ts and urlAnalyzer.ts.
 *
 * All rules are explainable: every match produces a human-readable
 * evidence item with a title and description.
 */

// ─── Urgency & Pressure Language ───────────────────────────────────────────
// Words that create false urgency to bypass critical thinking.

export const URGENCY_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\baccount.{0,10}(suspend|terminat|disabled|locked|block)/i, label: "account suspension threat" },
  { pattern: /\b(immediate|urgent|asap|right away|act now|limited time)\b/i, label: "urgency language" },
  { pattern: /\b(expire[sd]?|expir(ing|ation)).{0,15}(soon|today|hour|24|48)\b/i, label: "expiration pressure" },
  { pattern: /\b(verify|confirm|update|validate).{0,20}(account|identity|information|details|password)\b/i, label: "verification request" },
  { pattern: /\bunusual.{0,15}(activity|sign.?in|login|access)\b/i, label: "unusual activity claim" },
  { pattern: /\b(unauthorized|suspicious).{0,15}(access|login|sign.?in|activity)\b/i, label: "unauthorized access claim" },
  { pattern: /\byour.{0,10}(account|card|access).{0,10}(has been|will be|is being)\b/i, label: "account action warning" },
];

// ─── Credential Harvesting Language ────────────────────────────────────────
// Phrases that directly ask for sensitive information.

export const CREDENTIAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(enter|provide|submit|input|type).{0,20}(password|credential|login|username|pin|ssn|social security)\b/i, label: "credential input request" },
  { pattern: /\b(bank|card|account|routing).{0,10}(number|detail|information)\b/i, label: "financial data request" },
  { pattern: /\bclick.{0,20}(here|link|below|button).{0,30}(verify|confirm|update|reset|activate)\b/i, label: "click-to-verify pattern" },
  { pattern: /\b(reset|recover|restore).{0,15}(password|access|account)\b/i, label: "password reset prompt" },
  { pattern: /\bsign.?in.{0,20}(to verify|to confirm|to update|to continue|to access)\b/i, label: "sign-in to proceed" },
];

// ─── Known Brand Domains ────────────────────────────────────────────────────
// Official domains for brands frequently impersonated in phishing.
// We check if the sender/link domain is NOT one of these but looks like it should be.

export const KNOWN_BRANDS: Array<{ brand: string; officialDomains: string[]; keywords: string[] }> = [
  {
    brand: "PayPal",
    officialDomains: ["paypal.com", "paypal.me"],
    keywords: ["paypal", "paypai", "pay-pal", "paypa1"],
  },
  {
    brand: "Google",
    officialDomains: ["google.com", "gmail.com", "accounts.google.com"],
    keywords: ["google", "goog1e", "g00gle", "googIe"],
  },
  {
    brand: "Microsoft",
    officialDomains: ["microsoft.com", "office.com", "live.com", "outlook.com", "microsoftonline.com"],
    keywords: ["microsoft", "microsooft", "micros0ft", "office365"],
  },
  {
    brand: "Apple",
    officialDomains: ["apple.com", "icloud.com"],
    keywords: ["apple", "app1e", "appi", "icloud", "appleid"],
  },
  {
    brand: "Amazon",
    officialDomains: ["amazon.com", "amazon.co.uk", "amazon.de", "amazon.co.jp", "amazon.in", "amazonaws.com"],
    keywords: ["amazon", "amaz0n", "amazonn", "prime"],
  },
  {
    brand: "Netflix",
    officialDomains: ["netflix.com"],
    keywords: ["netflix", "netfl1x", "netfiix"],
  },
  {
    brand: "Facebook",
    officialDomains: ["facebook.com", "fb.com", "meta.com"],
    keywords: ["facebook", "faceb00k", "facebok"],
  },
  {
    brand: "Bank of America",
    officialDomains: ["bankofamerica.com"],
    keywords: ["bankofamerica", "bofa", "bankamerica"],
  },
  {
    brand: "Chase",
    officialDomains: ["chase.com", "jpmorgan.com"],
    keywords: ["chase", "chasebank"],
  },
  {
    brand: "DHL",
    officialDomains: ["dhl.com", "dhl.de"],
    keywords: ["dhl", "dhi"],
  },
  {
    brand: "FedEx",
    officialDomains: ["fedex.com"],
    keywords: ["fedex", "fed-ex"],
  },
  {
    brand: "UPS",
    officialDomains: ["ups.com"],
    keywords: ["ups", "united-parcel"],
  },
  {
    brand: "Instagram",
    officialDomains: ["instagram.com"],
    keywords: ["instagram", "lnstagram", "instagrarn"],
  },
  {
    brand: "WhatsApp",
    officialDomains: ["whatsapp.com"],
    keywords: ["whatsapp", "whatsapp-web", "whatsap"],
  },
  {
    brand: "LinkedIn",
    officialDomains: ["linkedin.com"],
    keywords: ["linkedin", "linkedln", "linkdin"],
  },
  {
    brand: "X (Twitter)",
    officialDomains: ["x.com", "twitter.com", "t.co"],
    keywords: ["twitter", "twiter", "twltter"],
  },
  {
    brand: "Steam",
    officialDomains: ["steampowered.com", "steamcommunity.com"],
    keywords: ["steam", "steamcommunlty", "steampowereed"],
  },
  {
    brand: "Coinbase",
    officialDomains: ["coinbase.com"],
    keywords: ["coinbase", "c0inbase", "coinbasse"],
  },
  {
    brand: "Binance",
    officialDomains: ["binance.com"],
    keywords: ["binance", "blnance", "binancce"],
  },
  {
    brand: "Wells Fargo",
    officialDomains: ["wellsfargo.com"],
    keywords: ["wellsfargo", "wells-fargo", "wellsfarg0"],
  },
  {
    brand: "Citi",
    officialDomains: ["citi.com", "citibank.com"],
    keywords: ["citibank", "citi-bank"],
  },
  {
    brand: "HSBC",
    officialDomains: ["hsbc.com", "hsbc.co.uk"],
    keywords: ["hsbc"],
  },
  {
    brand: "Dropbox",
    officialDomains: ["dropbox.com"],
    keywords: ["dropbox", "dropb0x", "dropbax"],
  },
  {
    brand: "Adobe",
    officialDomains: ["adobe.com"],
    keywords: ["adobe", "ad0be"],
  },
];

// ─── Suspicious TLDs ────────────────────────────────────────────────────────
// TLDs that are disproportionately abused for phishing.
// Not a verdict on their own — just one signal.

export const SUSPICIOUS_TLDS = new Set([
  ".xyz", ".top", ".click", ".link", ".win", ".bid",
  ".loan", ".download", ".stream", ".gq", ".cf", ".tk",
  ".ml", ".ga", ".pw", ".cc", ".su", ".work", ".party",
  ".review", ".science", ".accountant", ".trade", ".date",
  ".faith", ".racing", ".win", ".men", ".webcam",
]);

// ─── Suspicious URL Path Keywords ──────────────────────────────────────────
// Path fragments commonly used in phishing landing pages.

export const SUSPICIOUS_PATH_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\/(verify|verification|validate|confirm|secure|security|update|recover|restore|reactivate|unlock)\b/i, label: "account verification path" },
  { pattern: /\/(login|signin|sign-in|log-in|auth|authenticate)\b/i, label: "login page path" },
  { pattern: /\/(paypal|google|microsoft|apple|amazon|netflix|facebook|chase|bankofamerica)\b/i, label: "brand name in path" },
  { pattern: /\/[^/]*\.(php|asp|aspx)\b/i, label: "server-side script endpoint" },
];

// ─── Email-specific Selectors for Gmail DOM ─────────────────────────────────
// These are the CSS selectors used to extract data from Gmail's rendered HTML.
// Gmail obfuscates class names; these are the stable ones as of 2025.

export const GMAIL_SELECTORS = {
  // Email subject line
  subject: "h2.hP",

  // Sender name and email — the span with email attribute
  senderSpan: ".go span[email], .gD span[email], span[email]",

  // Reply-To header (only visible if user expands "show details")
  replyToSection: ".ajz",

  // Email body container
  emailBody: ".a3s.aiL, .a3s",

  // The "show details" chevron/button
  detailsToggle: ".ajx",

  // Header detail rows (when details are expanded)
  headerRows: "td.g2",
} as const;

// ─── Phase 6: Confusable (Homoglyph) Characters ────────────────────────────
// Non-ASCII characters that render almost identically to a Latin letter.
// Used to detect domains like "pаypal.com" where 'а' is Cyrillic, not Latin.
// Digit/leet substitutions live in LEET_MAP below — they are NOT homoglyphs.

export const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
  "і": "i", "ј": "j", "ѕ": "s", "ԁ": "d", "ɡ": "g", "к": "k", "м": "m",
  "т": "t", "в": "b", "н": "h",
  // Greek
  "ο": "o", "ρ": "p", "ν": "v", "α": "a", "ε": "e", "ι": "i", "κ": "k",
  "τ": "t", "χ": "x", "υ": "u", "η": "n",
  // Armenian
  "օ": "o", "ո": "n", "ս": "u", "ա": "a",
  // Latin extended / other lookalikes
  "ı": "i", "ĺ": "l", "ḷ": "l", "ⅼ": "l", "ɩ": "i", "ɪ": "i", "ᴄ": "c",
};

// ─── Phase 5: QWERTY Keyboard Adjacency ────────────────────────────────────
// Maps each letter to its physical neighbours. Used to detect "fat-finger"
// typosquats — a single key slip (e.g. gmaul.com instead of gmail.com).

export const KEYBOARD_ADJACENCY: Record<string, string[]> = {
  q: ["w", "a"],            w: ["q", "e", "a", "s"],   e: ["w", "r", "s", "d"],
  r: ["e", "t", "d", "f"],  t: ["r", "y", "f", "g"],   y: ["t", "u", "g", "h"],
  u: ["y", "i", "h", "j"],  i: ["u", "o", "j", "k"],   o: ["i", "p", "k", "l"],
  p: ["o", "l"],            a: ["q", "w", "s", "z"],    s: ["a", "w", "e", "d", "z", "x"],
  d: ["s", "e", "r", "f", "x", "c"], f: ["d", "r", "t", "g", "c", "v"],
  g: ["f", "t", "y", "h", "v", "b"], h: ["g", "y", "u", "j", "b", "n"],
  j: ["h", "u", "i", "k", "n", "m"], k: ["j", "i", "o", "l", "m"],
  l: ["k", "o", "p"],       z: ["a", "s", "x"],        x: ["z", "s", "d", "c"],
  c: ["x", "d", "f", "v"],  v: ["c", "f", "g", "b"],   b: ["v", "g", "h", "n"],
  n: ["b", "h", "j", "m"],  m: ["n", "j", "k"],
};

// ─── Phase 5: Leet / Visual ASCII Substitutions ────────────────────────────
// Single-character swaps attackers use to mimic a brand with plain ASCII.
// Applied (along with rn→m, vv→w) before edit-distance comparison.

export const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "l", "3": "e", "4": "a", "5": "s",
  "6": "g", "7": "t", "8": "b", "9": "g", "$": "s", "@": "a",
};

// ─── Two-level Public Suffixes ─────────────────────────────────────────────
// So the registrable domain of "secure.amazon.co.uk" is "amazon.co.uk",
// not "co.uk". Not exhaustive — covers the common ones for this project.

export const MULTI_PART_TLDS = new Set([
  "co.uk", "org.uk", "gov.uk", "ac.uk", "me.uk",
  "com.br", "com.au", "net.au", "org.au", "com.cn", "com.mx",
  "co.jp", "co.in", "co.id", "co.za", "co.kr", "co.nz",
  "com.sg", "com.my", "com.tr", "com.tw", "com.hk", "com.ph",
]);
