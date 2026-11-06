import type { UrlAnalysisResult, EvidenceItem, DomainInfo, CategoryResult, RiskLevel, Confidence } from "./types";
import { scoreEvidence, makeEvidence, type ScoreOptions } from "./riskEngine";
import type { RuleId } from "./ruleRegistry";
import {
  KNOWN_BRANDS,
  SUSPICIOUS_TLDS,
  SUSPICIOUS_PATH_PATTERNS,
  CONFUSABLES,
  KEYBOARD_ADJACENCY,
  LEET_MAP,
} from "./detectionRules";
import {
  getRegistrableDomain,
  subdomainDepth,
  getRegistrableLabel,
  BRAND_LABELS,
  toUnicodeHost,
  getTld,
  isIpAddress,
  isOfficialBrandDomain,
  unwrapRedirector,
  DEEP_SUBDOMAIN_MIN,
  findBrandInHost,
  type BrandHit,
} from "./domainUtils";
import { isAllowlisted } from "./allowlist";

export interface AnalyzeUrlOptions extends Pick<ScoreOptions, "disabledRules"> {
  /**
   * False when the input had no scheme (bare "example.com/path", as in many
   * datasets). The http/https check is skipped instead of guessing.
   */
  schemeKnown?: boolean;
  /** Apply the top-sites allow-list (default true). */
  useAllowlist?: boolean;
}

// ─── Entry Point ────────────────────────────────────────────────────────────

/** Parse + collect raw evidence without scoring. Used by the eval harness. */
export function collectUrlEvidence(
  rawUrl: string,
  opts: AnalyzeUrlOptions = {}
): { url: URL; domain: string; evidence: EvidenceItem[] } | { error: string } {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { error: "Invalid URL — could not parse." };
  }

  const evidence: EvidenceItem[] = [];

  // Redirect wrappers (google.com/url?q=…) — analyze the real destination.
  const inner = unwrapRedirector(url);
  if (inner) {
    evidence.push(
      makeEvidence(
        "URL_REDIRECTOR",
        "Link is wrapped in a redirect service",
        `This link goes through ${url.hostname} and then on to ${inner.hostname}. Hookline analyzed the final destination.`,
        `Wrapper: ${url.hostname} → ${inner.hostname}`
      )
    );
    url = inner;
  }

  const domain = url.hostname.toLowerCase();
  const isOfficial = isOfficialBrandDomain(domain);

  checkBrandImpersonation(domain, isOfficial, evidence);
  checkTyposquatting(domain, isOfficial, evidence);
  checkHomoglyphs(domain, isOfficial, evidence);
  checkSuspiciousTld(getTld(domain), evidence);
  checkSuspiciousPath(url.pathname, isOfficial, evidence);
  checkUrlStructure(url, domain, opts.schemeKnown !== false || inner !== null, evidence);
  checkIpAddress(domain, evidence);
  checkExcessiveSubdomains(domain, evidence);

  return { url, domain, evidence };
}

export function analyzeUrl(rawUrl: string, opts: AnalyzeUrlOptions = {}): UrlAnalysisResult {
  const collected = collectUrlEvidence(rawUrl, opts);
  if ("error" in collected) return errorResult(rawUrl, collected.error);

  const { domain, evidence } = collected;
  const allowlisted = opts.useAllowlist !== false && isAllowlisted(domain);
  const scored = scoreEvidence(evidence, { disabledRules: opts.disabledRules, allowlisted });

  return {
    url: rawUrl,
    domain,
    registrableDomain: getRegistrableDomain(domain),
    allowlisted,
    verdict: scored.verdict,
    confidence: scored.confidence,
    riskScore: scored.riskScore,
    evidence: scored.active,
    suppressedEvidence: scored.suppressed,
    category: scored.category,
    domainInfo: null,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Domain-info enrichment ──────────────────────────────────────────────────
// Folds backend WHOIS/DNS data into a finished local analysis and re-scores.
//   - domain age is added in every context.
//   - SPF / DMARC gaps only in EMAIL context, low severity.

interface Enrichable {
  evidence: EvidenceItem[];
  suppressedEvidence: EvidenceItem[];
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore: number;
  category: CategoryResult;
  domainInfo: DomainInfo | null;
}

export function domainInfoEvidence(info: DomainInfo, emailContext: boolean): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  if (info.isNewDomain && info.createdDaysAgo != null) {
    const veryNew = info.createdDaysAgo < 30;
    const days = info.createdDaysAgo;
    out.push(
      makeEvidence(
        veryNew ? "DOMAIN_VERY_NEW" : "DOMAIN_NEW",
        veryNew ? "Very newly registered domain" : "Recently registered domain",
        `This domain was registered ${days} day${days === 1 ? "" : "s"} ago. Scam domains are almost always brand new.`,
        `Created ${info.createdDate ?? "unknown"} · Registrar: ${info.registrar}`
      )
    );
  }
  if (emailContext) {
    if (info.spfStatus === "missing") {
      out.push(
        makeEvidence(
          "EMAIL_NO_SPF",
          "No SPF record",
          "The sender domain publishes no SPF record, so anyone can forge mail from it. Established senders almost always have one.",
          `Domain: ${info.domain}`
        )
      );
    }
    if (info.dmarcStatus === "missing") {
      out.push(
        makeEvidence(
          "EMAIL_NO_DMARC",
          "No DMARC record",
          "The sender domain has no DMARC policy, so spoofed mail is not actively rejected.",
          `Domain: ${info.domain}`
        )
      );
    }
  }
  return out;
}

export function rescore<T extends Enrichable>(
  result: T,
  extra: EvidenceItem[],
  opts: { allowlisted: boolean; disabledRules?: ReadonlySet<RuleId> }
): T {
  const all = [...result.evidence, ...result.suppressedEvidence, ...extra];
  const scored = scoreEvidence(all, opts);
  return {
    ...result,
    evidence: scored.active,
    suppressedEvidence: scored.suppressed,
    verdict: scored.verdict,
    confidence: scored.confidence,
    riskScore: scored.riskScore,
    category: scored.category,
  };
}

export function enrichWithDomainInfo<T extends Enrichable>(
  result: T,
  info: DomainInfo,
  opts: { emailContext?: boolean; allowlisted?: boolean; disabledRules?: ReadonlySet<RuleId> } = {}
): T {
  const extra = domainInfoEvidence(info, opts.emailContext === true);
  const rescored = rescore(result, extra, {
    allowlisted: opts.allowlisted === true,
    disabledRules: opts.disabledRules,
  });
  return { ...rescored, domainInfo: info };
}

// ─── Check: Brand Impersonation ─────────────────────────────────────────────

function checkBrandImpersonation(domain: string, isOfficial: boolean, evidence: EvidenceItem[]): void {
  if (isOfficial) return;
  const hit = findBrandInDomain(domain);
  if (!hit) return;
  evidence.push(
    makeEvidence(
      "URL_BRAND_IN_DOMAIN",
      `Possible ${hit.brand} impersonation`,
      `This domain contains "${hit.keyword}" but is not an official ${hit.brand} domain. Phishing sites often put brand names in the domain to look legitimate.`,
      `Domain: ${domain} | Official: ${hit.official}`
    )
  );
}

/** Find a brand keyword in a hostname. Exported for the email link check. */
export function findBrandInDomain(domain: string): BrandHit | null {
  return findBrandInHost(domain);
}

// ─── Check: Typosquatting ───────────────────────────────────────────────────
// C3/C7: compare the registrable label against the registrable labels of
// official brand domains, with length guards so short dictionary words (live,
// meta, citi, bing, apply≈apple) don't match half the web:
//   leetspeak fold   — brand label ≥ 4
//   keyboard slip    — both labels ≥ 5 (and the differing keys are adjacent)
//   1 edit           — both labels ≥ 6
//   2 edits          — brand label ≥ 8

export const TYPO_MIN_LEN_KEYBOARD = 5;
export const TYPO_MIN_LEN_EDIT1 = 6;
export const TYPO_MIN_LEN_EDIT2 = 8;

function checkTyposquatting(domain: string, isOfficial: boolean, evidence: EvidenceItem[]): void {
  if (isOfficial) return;

  const label = getRegistrableLabel(domain);
  if (label.length < 4) return;

  for (const { brand, label: officialLabel, official: officialDomain } of BRAND_LABELS) {
    if (officialLabel.length < 4) continue;
    if (label === officialLabel) continue;

    const deleeted = deLeet(label);
    if (deleeted === officialLabel) {
      evidence.push(
        makeEvidence(
          "URL_TYPOSQUAT_LEET",
          `Character-substitution typosquat of ${officialDomain}`,
          `This domain swaps look-alike characters to imitate ${brand}. Normalized, "${label}" reads as "${officialLabel}".`,
          `${label} → ${deleeted} = ${officialLabel}`
        )
      );
      return;
    }

    if (label.length < TYPO_MIN_LEN_KEYBOARD || officialLabel.length < TYPO_MIN_LEN_KEYBOARD) continue;

    const kb = keyboardAdjacentSub(label, officialLabel);
    if (kb) {
      evidence.push(
        makeEvidence(
          "URL_TYPOSQUAT_KEYBOARD",
          `Keyboard-typo squat of ${officialDomain}`,
          `"${label}" differs from ${brand}'s "${officialLabel}" by a single neighbouring key — a classic fat-finger typosquat.`,
          `'${kb.from}' → '${kb.to}' (adjacent keys) vs ${officialLabel}`
        )
      );
      return;
    }

    if (label.length < TYPO_MIN_LEN_EDIT1 || officialLabel.length < TYPO_MIN_LEN_EDIT1) continue;
    const maxDist = officialLabel.length >= TYPO_MIN_LEN_EDIT2 ? 2 : 1;
    const distance = boundedLevenshtein(label, officialLabel, maxDist);
    if (distance >= 1 && distance <= maxDist) {
      evidence.push(
        makeEvidence(
          "URL_TYPOSQUAT_EDIT",
          `Typosquatting — ${distance} character${distance > 1 ? "s" : ""} from ${officialDomain}`,
          `This domain is within ${distance} edit${distance > 1 ? "s" : ""} of the official ${brand} domain — close enough to fool a quick glance.`,
          `${label} vs ${officialLabel} (edit distance: ${distance})`,
          distance === 1 ? "high" : "medium"
        )
      );
      return;
    }
  }
}

// ─── Check: Homoglyphs ──────────────────────────────────────────────────────

function checkHomoglyphs(domain: string, isOfficial: boolean, evidence: EvidenceItem[]): void {
  if (isOfficial) return;

  if (domain.includes("xn--")) {
    evidence.push(
      makeEvidence(
        "URL_PUNYCODE",
        "Punycode (IDN) domain",
        "This domain is internationalized (xn--). Punycode can encode non-Latin characters that render as a look-alike of a familiar brand.",
        `Domain: ${domain}`
      )
    );
  }

  // URL parsing turns "pаypal.com" into "xn--pypal-4ve.com"; decode first (C7).
  const { folded, swaps, scripts } = foldConfusables(toUnicodeHost(domain));

  const nonLatin = [...scripts].filter((s) => s !== "latin");
  if (scripts.has("latin") && nonLatin.length > 0) {
    evidence.push(
      makeEvidence(
        "URL_MIXED_SCRIPT",
        "Mixed-script domain (homoglyph attack)",
        `This domain mixes Latin letters with ${nonLatin.join(", ")} characters that look identical in most fonts.`,
        swaps.length ? swaps.slice(0, 4).join(", ") : `Scripts: ${[...scripts].join(", ")}`
      )
    );
  }

  if (swaps.length === 0) return;

  const foldedReg = getRegistrableDomain(folded);
  const rawReg = getRegistrableDomain(domain);
  for (const brand of KNOWN_BRANDS) {
    for (const officialDomain of brand.officialDomains) {
      if (foldedReg === officialDomain && rawReg !== officialDomain) {
        evidence.push(
          makeEvidence(
            "URL_HOMOGLYPH_BRAND",
            `Homoglyph impersonation of ${officialDomain}`,
            `Using look-alike characters, this domain is crafted to appear as "${officialDomain}" (${brand.brand}).`,
            `Substitutions: ${swaps.slice(0, 4).join(", ")}`
          )
        );
        return;
      }
    }
  }
}

// ─── Check: Suspicious TLD ──────────────────────────────────────────────────

function checkSuspiciousTld(tld: string, evidence: EvidenceItem[]): void {
  if (!tld || !SUSPICIOUS_TLDS.has(tld)) return;
  evidence.push(
    makeEvidence(
      "URL_SUSPICIOUS_TLD",
      `High-risk TLD: ${tld}`,
      `The ${tld} top-level domain is heavily abused for phishing and spam. Not a verdict on its own.`,
      `TLD: ${tld}`
    )
  );
}

// ─── Check: Suspicious Path ─────────────────────────────────────────────────

function checkSuspiciousPath(path: string, _isOfficial: boolean, evidence: EvidenceItem[]): void {
  for (const { pattern, label, ruleId } of SUSPICIOUS_PATH_PATTERNS) {
    if (pattern.test(path)) {
      evidence.push(
        makeEvidence(
          ruleId,
          `Suspicious URL path: ${label}`,
          "The URL path contains patterns commonly found on phishing landing pages.",
          `Path: ${path.slice(0, 120)}`
        )
      );
      return; // One path flag is enough
    }
  }
}

// ─── Check: URL Structure ───────────────────────────────────────────────────

function checkUrlStructure(url: URL, domain: string, schemeKnown: boolean, evidence: EvidenceItem[]): void {
  if (domain.length > 40) {
    evidence.push(
      makeEvidence(
        "URL_LONG_DOMAIN",
        "Unusually long domain name",
        `This hostname is ${domain.length} characters long. Very long hostnames are a common phishing tactic.`,
        `Domain length: ${domain.length} characters`
      )
    );
  }

  const hyphenCount = (toUnicodeHost(domain).match(/-/g) ?? []).length;
  if (hyphenCount >= 3) {
    evidence.push(
      makeEvidence(
        "URL_MANY_HYPHENS",
        `${hyphenCount} hyphens in domain`,
        `Domains with many hyphens are often generated by phishing kits (e.g., "secure-login-account-verify.com").`,
        `Domain: ${domain}`
      )
    );
  }

  if (schemeKnown && url.protocol === "http:") {
    evidence.push(
      makeEvidence(
        "URL_NO_HTTPS",
        "No HTTPS — unencrypted connection",
        "This URL uses plain HTTP. All legitimate login and payment pages use HTTPS.",
        `Protocol: ${url.protocol}`
      )
    );
  }

  if (/%[0-9a-f]{2}/i.test(domain)) {
    evidence.push(
      makeEvidence(
        "URL_ENCODED_HOST",
        "URL-encoded characters in domain",
        "The domain contains percent-encoded characters, which can disguise the true destination.",
        `Domain: ${domain}`
      )
    );
  }
}

function checkIpAddress(domain: string, evidence: EvidenceItem[]): void {
  if (isIpAddress(domain)) {
    evidence.push(
      makeEvidence(
        "URL_IP_HOST",
        "IP address used instead of domain name",
        "This URL uses a raw IP address instead of a domain name — a strong phishing indicator.",
        `IP: ${domain}`
      )
    );
  }
}

function checkExcessiveSubdomains(domain: string, evidence: EvidenceItem[]): void {
  if (isIpAddress(domain)) return;
  const depth = subdomainDepth(domain);
  if (depth >= DEEP_SUBDOMAIN_MIN) {
    evidence.push(
      makeEvidence(
        "URL_DEEP_SUBDOMAINS",
        `${depth} subdomain levels in URL`,
        "Deep subdomain chains are used to place a legitimate-looking brand on the left (e.g., paypal.com.evil.xyz).",
        `Domain: ${domain}`
      )
    );
  }
}

// ─── Helpers: typosquatting ─────────────────────────────────────────────────

function deLeet(label: string): string {
  let out = label.replace(/rn/g, "m").replace(/vv/g, "w");
  for (const [from, to] of Object.entries(LEET_MAP)) out = out.split(from).join(to);
  return out;
}

function keyboardAdjacentSub(a: string, b: string): { from: string; to: string } | null {
  if (a.length !== b.length) return null;
  let diffIndex = -1;
  let diffs = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      diffs++;
      diffIndex = i;
      if (diffs > 1) return null;
    }
  }
  if (diffs !== 1) return null;
  const from = a[diffIndex];
  const to = b[diffIndex];
  if (KEYBOARD_ADJACENCY[from]?.includes(to)) return { from, to };
  return null;
}

/** Levenshtein distance, returning max+1 as soon as it must exceed `max`. */
export function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const n = b.length;
  let prev = new Array<number>(n + 1);
  let cur = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    let rowMin = cur[0];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1]
        ? prev[j - 1]
        : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return max + 1;
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

// ─── Helpers: homoglyphs ────────────────────────────────────────────────────

type ScriptName = "latin" | "cyrillic" | "greek" | "armenian" | "other";

function scriptOf(ch: string): ScriptName {
  const c = ch.codePointAt(0) ?? 0;
  if (c >= 0x0400 && c <= 0x04ff) return "cyrillic";
  if (c >= 0x0370 && c <= 0x03ff) return "greek";
  if (c >= 0x0530 && c <= 0x058f) return "armenian";
  if ((c >= 0x61 && c <= 0x7a) || (c >= 0x41 && c <= 0x5a)) return "latin";
  if (c >= 0xff21 && c <= 0xff5a) return "latin";
  return "other";
}

function foldConfusables(domain: string): { folded: string; swaps: string[]; scripts: Set<ScriptName> } {
  let folded = "";
  const swaps: string[] = [];
  const scripts = new Set<ScriptName>();
  for (const ch of domain) {
    const sc = scriptOf(ch);
    if (sc !== "other") scripts.add(sc);
    const mapped = CONFUSABLES[ch];
    if (mapped) {
      folded += mapped;
      swaps.push(`'${ch}' → '${mapped}'`);
    } else if (ch >= "Ａ" && ch <= "ｚ") {
      const ascii = String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
      folded += ascii;
      swaps.push(`'${ch}' → '${ascii}'`);
    } else {
      folded += ch;
    }
  }
  return { folded, swaps, scripts };
}

// ─── Error result ────────────────────────────────────────────────────────────

function errorResult(url: string, message: string): UrlAnalysisResult {
  return {
    url,
    domain: url,
    registrableDomain: "",
    allowlisted: false,
    verdict: "unknown",
    confidence: "none",
    riskScore: 0,
    evidence: [],
    suppressedEvidence: [],
    category: { label: "none", points: { credential_phishing: 0, job_scam: 0, shopping_scam: 0 }, reasons: [] },
    domainInfo: null,
    analyzedAt: new Date().toISOString(),
    error: message,
  };
}
