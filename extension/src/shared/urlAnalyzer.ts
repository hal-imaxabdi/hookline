import { UrlAnalysisResult, EvidenceItem, RiskLevel, Confidence, DomainInfo } from "./types";
import { scoreEvidence } from "./riskEngine";
import {
  KNOWN_BRANDS,
  SUSPICIOUS_TLDS,
  SUSPICIOUS_PATH_PATTERNS,
  CONFUSABLES,
  KEYBOARD_ADJACENCY,
  LEET_MAP,
  MULTI_PART_TLDS,
} from "./detectionRules";

// ─── Entry Point ────────────────────────────────────────────────────────────

export function analyzeUrl(rawUrl: string): UrlAnalysisResult {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return errorResult(rawUrl, "Invalid URL — could not parse.");
  }

  const domain = url.hostname.toLowerCase();
  const tld = getTld(domain);
  const path = url.pathname;
  const evidence: EvidenceItem[] = [];

  // ── Run checks ─────────────────────────────────────────────────────────

  const isOfficial = isOfficialDomain(domain);

  checkBrandImpersonation(domain, isOfficial, evidence);
  checkTyposquatting(domain, isOfficial, evidence);
  checkHomoglyphs(domain, isOfficial, evidence);
  checkSuspiciousTld(tld, evidence);
  checkSuspiciousPath(path, evidence);
  checkUrlStructure(url, domain, evidence);
  checkIpAddress(domain, evidence);
  checkExcessiveSubdomains(domain, evidence);

  // ── Compute verdict ─────────────────────────────────────────────────────

  const { verdict, confidence, riskScore } = scoreEvidence(evidence);

  return {
    url: rawUrl,
    domain,
    verdict,
    confidence,
    riskScore,
    evidenceScore: evidence.length,
    evidenceMax: 8,
    evidence,
    domainInfo: null, // Phase 7 populates this
    analyzedAt: new Date().toISOString(),
    // Phase 4 extras (rendered by DetailsTab)
    tld,
    path,
    protocol: url.protocol,
    hasSubdomain: getSubdomain(domain) !== "",
    subdomain: getSubdomain(domain),
    paramCount: url.searchParams ? [...url.searchParams.keys()].length : 0,
  } as UrlAnalysisResult & Record<string, unknown>;
}

// ─── Domain-info enrichment (Phase 7 + 9) ───────────────────────────────────
// Folds backend WHOIS/DNS data into a finished local analysis, then re-scores
// with the Phase 9 risk engine. Works for BOTH url and email results.
//
//   - domain age (new domain) is added in every context.
//   - SPF / DMARC gaps are added only in EMAIL context (they're email-auth
//     signals, irrelevant to judging a plain website) and kept low-severity so
//     they nudge the score without flipping a safe domain on their own.

export function enrichWithDomainInfo<
  T extends {
    evidence: EvidenceItem[];
    verdict: RiskLevel;
    confidence: Confidence;
    riskScore?: number;
    domainInfo: DomainInfo | null;
  }
>(result: T, info: DomainInfo, opts?: { emailContext?: boolean }): T {
  const evidence = [...result.evidence];

  if (info.isNewDomain && info.createdDaysAgo != null) {
    const veryNew = info.createdDaysAgo < 30;
    evidence.push({
      type: "domain_age",
      severity: veryNew ? "high" : "medium",
      title: veryNew ? "Very newly registered domain" : "Recently registered domain",
      description: `This domain was registered ${info.createdDaysAgo} day${
        info.createdDaysAgo === 1 ? "" : "s"
      } ago. Phishing domains are almost always brand new, so a registration this recent is a strong risk signal.`,
      detail: `Created ${info.createdDate ?? "unknown"} · Registrar: ${info.registrar}`,
    });
  }

  if (opts?.emailContext) {
    if (info.spfStatus === "missing") {
      evidence.push({
        type: "spf_fail",
        severity: "low",
        title: "No SPF record",
        description: "The sender domain publishes no SPF record, so anyone can forge mail from it without failing this check. Established senders almost always have one.",
        detail: `Domain: ${info.domain}`,
      });
    }
    if (info.dmarcStatus === "missing") {
      evidence.push({
        type: "no_dmarc",
        severity: "low",
        title: "No DMARC record",
        description: "The sender domain has no DMARC policy, meaning spoofed mail is not actively rejected. Brands that send real email almost always publish one.",
        detail: `Domain: ${info.domain}`,
      });
    }
  }

  const { verdict, confidence, riskScore } = scoreEvidence(evidence);

  return {
    ...result,
    evidence,
    domainInfo: info,
    verdict,
    confidence,
    riskScore,
  };
}

// ─── Check: Brand Impersonation ─────────────────────────────────────────────
// Domain contains a brand keyword but is not the official domain.

function checkBrandImpersonation(
  domain: string,
  isOfficial: boolean,
  evidence: EvidenceItem[]
): void {
  if (isOfficial) return;

  for (const brand of KNOWN_BRANDS) {
    const impersonates = brand.keywords.some((kw) =>
      domain.includes(kw.toLowerCase())
    );

    if (impersonates) {
      evidence.push({
        type: "brand_impersonation",
        severity: "high",
        title: `Possible ${brand.brand} impersonation`,
        description: `This domain embeds "${brand.brand}" branding but is not an official ${brand.brand} domain. Phishing sites often place brand names in the domain to look legitimate.`,
        detail: `Domain: ${domain} | Official: ${brand.officialDomains[0]}`,
      });
      return; // One brand match is enough
    }
  }
}

// ─── Check: Typosquatting (Phase 5) ─────────────────────────────────────────
// Compares the registrable-domain *label* against each brand's label using
// three escalating techniques: leetspeak folding, keyboard adjacency, and
// Levenshtein edit distance.

function checkTyposquatting(
  domain: string,
  isOfficial: boolean,
  evidence: EvidenceItem[]
): void {
  if (isOfficial) return;

  const label = getRegistrableLabel(domain);
  if (label.length < 4) return; // too short to judge reliably

  for (const brand of KNOWN_BRANDS) {
    for (const officialDomain of brand.officialDomains) {
      const officialLabel = officialDomain.split(".")[0];
      if (officialLabel.length < 4) continue;
      if (label === officialLabel) continue; // identical label, different TLD → brand check covers it

      // 1) Leetspeak / visual ASCII substitution (paypa1 → paypal, rnicrosoft → micro…)
      const deleeted = deLeet(label);
      if (deleeted === officialLabel) {
        evidence.push({
          type: "typosquatting",
          severity: "high",
          title: `Character-substitution typosquat of ${officialDomain}`,
          description: `This domain swaps look-alike ASCII characters (digits or merged letters) to imitate ${brand.brand}. Normalized, "${label}" reads as "${officialLabel}".`,
          detail: `${label} → ${deleeted} = ${officialLabel}`,
        });
        return;
      }

      // 2) Keyboard-adjacent single-key slip (gmaul → gmail)
      const kb = keyboardAdjacentSub(label, officialLabel);
      if (kb) {
        evidence.push({
          type: "typosquatting",
          severity: "high",
          title: `Keyboard-typo squat of ${officialDomain}`,
          description: `"${label}" differs from ${brand.brand}'s "${officialLabel}" by a single neighbouring key — a classic fat-finger typosquat registered to catch mistyped traffic.`,
          detail: `'${kb.from}' → '${kb.to}' (adjacent keys) vs ${officialLabel}`,
        });
        return;
      }

      // 3) Raw edit distance
      const distance = levenshtein(label, officialLabel);
      if (distance >= 1 && distance <= 2) {
        evidence.push({
          type: "typosquatting",
          severity: distance === 1 ? "high" : "medium",
          title: `Typosquatting — ${distance} character${distance > 1 ? "s" : ""} from ${officialDomain}`,
          description: `This domain is within ${distance} edit${distance > 1 ? "s" : ""} of the official ${brand.brand} domain — close enough to fool a quick glance.`,
          detail: `${label} vs ${officialLabel} (edit distance: ${distance})`,
        });
        return;
      }
    }
  }
}

// ─── Check: Homoglyphs (Phase 6) ────────────────────────────────────────────
// Detects (a) punycode/IDN domains, (b) domains mixing writing systems, and
// (c) confusable characters that fold to a known brand.

function checkHomoglyphs(
  domain: string,
  isOfficial: boolean,
  evidence: EvidenceItem[]
): void {
  if (isOfficial) return;

  // (a) Punycode / IDN — encoded non-Latin characters
  if (domain.includes("xn--")) {
    evidence.push({
      type: "homoglyph",
      severity: "medium",
      title: "Punycode (IDN) domain",
      description: "This domain is internationalized (xn--). Punycode can encode non-Latin characters that render as a look-alike of a familiar brand. Verify the decoded form before trusting it.",
      detail: `Domain: ${domain}`,
    });
  }

  const { folded, swaps, scripts } = foldConfusables(domain);

  // (b) Mixed-script label — Latin combined with another writing system
  const nonLatin = [...scripts].filter((s) => s !== "latin");
  if (scripts.has("latin") && nonLatin.length > 0) {
    evidence.push({
      type: "homoglyph",
      severity: "high",
      title: "Mixed-script domain (homoglyph attack)",
      description: `This domain mixes Latin letters with ${nonLatin.join(", ")} characters that look identical in most fonts. Legitimate domains do not mix writing systems like this.`,
      detail: swaps.length ? swaps.slice(0, 4).join(", ") : `Scripts: ${[...scripts].join(", ")}`,
    });
  }

  if (swaps.length === 0) return;

  // (c) After folding confusables, does it match a known brand?
  const foldedReg = getRegistrableDomain(folded);
  const rawReg = getRegistrableDomain(domain);

  for (const brand of KNOWN_BRANDS) {
    for (const officialDomain of brand.officialDomains) {
      if (foldedReg === officialDomain && rawReg !== officialDomain) {
        evidence.push({
          type: "homoglyph",
          severity: "high",
          title: `Homoglyph impersonation of ${officialDomain}`,
          description: `Using look-alike characters, this domain is crafted to appear as "${officialDomain}" (${brand.brand}) while actually resolving somewhere else.`,
          detail: `Substitutions: ${swaps.slice(0, 4).join(", ")}`,
        });
        return;
      }
    }
  }
}

// ─── Check: Suspicious TLD ──────────────────────────────────────────────────

function checkSuspiciousTld(tld: string, evidence: EvidenceItem[]): void {
  if (!tld || !SUSPICIOUS_TLDS.has(tld)) return;

  evidence.push({
    type: "suspicious_tld",
    severity: "medium",
    title: `High-risk TLD: ${tld}`,
    description: `The ${tld} top-level domain is heavily abused for phishing and spam. Legitimate businesses rarely use it.`,
    detail: `TLD: ${tld}`,
  });
}

// ─── Check: Suspicious Path ─────────────────────────────────────────────────

function checkSuspiciousPath(path: string, evidence: EvidenceItem[]): void {
  for (const { pattern, label } of SUSPICIOUS_PATH_PATTERNS) {
    if (pattern.test(path)) {
      evidence.push({
        type: "url_structure",
        severity: "medium",
        title: `Suspicious URL path: ${label}`,
        description: `The URL path contains patterns commonly found on phishing landing pages designed to harvest credentials or impersonate legitimate services.`,
        detail: `Path: ${path}`,
      });
      return; // One path flag is enough
    }
  }
}

// ─── Check: URL Structure Anomalies ─────────────────────────────────────────

function checkUrlStructure(url: URL, domain: string, evidence: EvidenceItem[]): void {
  if (domain.length > 40) {
    evidence.push({
      type: "url_structure",
      severity: "medium",
      title: "Unusually long domain name",
      description: `This domain is ${domain.length} characters long. Legitimate services use short, memorable names. Very long domains are a common phishing tactic.`,
      detail: `Domain length: ${domain.length} characters`,
    });
  }

  const hyphenCount = (domain.match(/-/g) ?? []).length;
  if (hyphenCount >= 3) {
    evidence.push({
      type: "url_structure",
      severity: "low",
      title: `${hyphenCount} hyphens in domain`,
      description: `Domains with many hyphens are often generated by phishing kits trying to look like official subdomains (e.g., "secure-login-account-verify.com").`,
      detail: `Domain: ${domain}`,
    });
  }

  if (url.protocol === "http:") {
    evidence.push({
      type: "ssl_missing",
      severity: "medium",
      title: "No HTTPS — unencrypted connection",
      description: "This URL uses plain HTTP, meaning data is transmitted without encryption. All legitimate login and payment pages use HTTPS.",
      detail: `Protocol: ${url.protocol}`,
    });
  }

  if (/%[0-9a-f]{2}/i.test(domain)) {
    evidence.push({
      type: "url_structure",
      severity: "medium",
      title: "URL-encoded characters in domain",
      description: "The domain contains percent-encoded characters, which can disguise the true destination of a link.",
      detail: `Domain: ${domain}`,
    });
  }
}

// ─── Check: IP Address Domain ───────────────────────────────────────────────

function checkIpAddress(domain: string, evidence: EvidenceItem[]): void {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    evidence.push({
      type: "url_structure",
      severity: "high",
      title: "IP address used instead of domain name",
      description: "This URL uses a raw IP address instead of a domain name. Legitimate websites use domain names. IP-based URLs are a strong phishing indicator.",
      detail: `IP: ${domain}`,
    });
  }
}

// ─── Check: Excessive Subdomains ────────────────────────────────────────────

function checkExcessiveSubdomains(domain: string, evidence: EvidenceItem[]): void {
  const parts = domain.split(".");
  if (parts.length > 4) {
    evidence.push({
      type: "url_structure",
      severity: "medium",
      title: `${parts.length - 2} subdomains in URL`,
      description: `This URL has an unusually deep subdomain structure. Phishing sites use this to place a legitimate-looking brand name as a subdomain (e.g., paypal.com.evil.xyz).`,
      detail: `Domain: ${domain}`,
    });
  }
}

// ─── Helpers: Domain Parsing ─────────────────────────────────────────────────

function getTld(domain: string): string {
  const parts = domain.split(".");
  return parts.length >= 2 ? `.${parts[parts.length - 1]}` : "";
}

// Registrable domain: SLD + public suffix, e.g. "amazon.co.uk", "paypal.com".
export function getRegistrableDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  const lastTwo = parts.slice(-2).join(".");
  if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }
  return lastTwo;
}

// The brand label = first label of the registrable domain ("paypal" of paypal.co.uk).
function getRegistrableLabel(domain: string): string {
  return getRegistrableDomain(domain).split(".")[0] ?? "";
}

function getSubdomain(domain: string): string {
  const reg = getRegistrableDomain(domain);
  if (domain === reg) return "";
  return domain.slice(0, domain.length - reg.length - 1);
}

function isOfficialDomain(domain: string): boolean {
  for (const brand of KNOWN_BRANDS) {
    for (const d of brand.officialDomains) {
      if (domain === d || domain.endsWith(`.${d}`)) return true;
    }
  }
  return false;
}

// ─── Helpers: Phase 5 (typosquatting) ───────────────────────────────────────

// Fold leetspeak / merged-letter tricks back to plain letters.
function deLeet(label: string): string {
  let out = label.replace(/rn/g, "m").replace(/vv/g, "w");
  for (const [from, to] of Object.entries(LEET_MAP)) {
    out = out.split(from).join(to);
  }
  return out;
}

// Returns the swapped chars if a and b are equal length and differ at exactly
// one position where the two characters are physically adjacent keys.
function keyboardAdjacentSub(
  a: string,
  b: string
): { from: string; to: string } | null {
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

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// ─── Helpers: Phase 6 (homoglyphs) ──────────────────────────────────────────

type ScriptName = "latin" | "cyrillic" | "greek" | "armenian" | "other";

function scriptOf(ch: string): ScriptName {
  const c = ch.codePointAt(0) ?? 0;
  if (c >= 0x0400 && c <= 0x04ff) return "cyrillic";
  if (c >= 0x0370 && c <= 0x03ff) return "greek";
  if (c >= 0x0530 && c <= 0x058f) return "armenian";
  if ((c >= 0x61 && c <= 0x7a) || (c >= 0x41 && c <= 0x5a)) return "latin";
  if (c >= 0xff21 && c <= 0xff5a) return "latin"; // full-width letters
  return "other";
}

// Replace confusable + full-width characters with ASCII, and report which
// writing systems appear among the domain's *letters*.
function foldConfusables(domain: string): {
  folded: string;
  swaps: string[];
  scripts: Set<ScriptName>;
} {
  let folded = "";
  const swaps: string[] = [];
  const scripts = new Set<ScriptName>();

  for (const ch of domain) {
    const sc = scriptOf(ch);
    if (sc !== "other") scripts.add(sc);

    if (CONFUSABLES[ch]) {
      folded += CONFUSABLES[ch];
      swaps.push(`'${ch}' → '${CONFUSABLES[ch]}'`);
    } else if (ch >= "\uFF21" && ch <= "\uFF5A") {
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

function errorResult(url: string, _message: string): UrlAnalysisResult {
  return {
    url,
    domain: url,
    verdict: "unknown",
    confidence: "none",
    evidenceScore: 0,
    evidenceMax: 0,
    evidence: [],
    domainInfo: null,
    analyzedAt: new Date().toISOString(),
  };
}