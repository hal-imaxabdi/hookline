/**
 * Email analyzer.
 *
 * Runs entirely locally — the email body is never sent anywhere. Only the
 * sender's domain (and link domains, if the user enables threat intel) can
 * leave the machine, and only through the background worker.
 */

import type { EmailAnalysisResult, AnalyzedLink, EvidenceItem, RawEmailData } from "./types";
import { URGENCY_PATTERNS, CREDENTIAL_PATTERNS, KNOWN_BRANDS, SUSPICIOUS_TLDS } from "./detectionRules";
import { scoreEvidence, makeEvidence } from "./riskEngine";
import type { RuleId } from "./ruleRegistry";
import { getRegistrableDomain, getTld, officialBrandFor } from "./domainUtils";
import { analyzeUrl } from "./urlAnalyzer";
import { detectJobScam } from "./scamDetectors";
import { FREE_MAIL_DOMAINS } from "./scamPatterns";
import { isAllowlisted } from "./allowlist";

export type { RawEmailData } from "./types";

export interface AnalyzeEmailOptions {
  disabledRules?: ReadonlySet<RuleId>;
  useAllowlist?: boolean;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function collectEmailEvidence(raw: RawEmailData, opts: AnalyzeEmailOptions = {}): {
  evidence: EvidenceItem[];
  links: AnalyzedLink[];
  senderDomain: string;
} {
  const evidence: EvidenceItem[] = [];
  const senderDomain = extractDomain(raw.senderEmail);
  const text = `${raw.subject}\n${raw.bodyText}`;

  checkReplyTo(raw, senderDomain, evidence);
  const urgencyCount = checkUrgencyLanguage(text, evidence);
  const credential = checkCredentialHarvesting(text, evidence);
  // "Pressure" = a credential request, or ≥ 2 distinct urgency patterns.
  // A single weak phrase ("update your account preferences") isn't enough.
  checkBrandImpersonation(raw, senderDomain, urgencyCount >= 2 || credential, evidence);
  checkSenderTld(senderDomain, evidence);

  evidence.push(
    ...detectJobScam({
      kind: "email",
      subject: raw.subject,
      body: raw.bodyText,
      senderEmail: raw.senderEmail,
      senderName: raw.sender,
    })
  );

  const links = dedupeLinks(raw.links).map((l) => analyzeEmailLink(l.href, l.text, opts));
  const flagged = links.filter((l) => l.isSuspicious);
  if (flagged.length > 0) {
    const anyHigh = flagged.some((l) => l.verdict === "high_risk");
    evidence.push(
      makeEvidence(
        "EMAIL_SUSPICIOUS_LINKS",
        `${flagged.length} suspicious link${flagged.length > 1 ? "s" : ""} in this email`,
        `${flagged.length} of ${links.length} links point to risky destinations (look-alike domains, brand names on unofficial sites, login pages on unknown domains, or link text that hides the real address). See the Links tab.`,
        flagged.map((l) => l.domain).slice(0, 3).join(", "),
        anyHigh || flagged.length >= 3 ? "high" : "medium"
      )
    );
  }
  return { evidence, links, senderDomain };
}

export function analyzeEmail(raw: RawEmailData, opts: AnalyzeEmailOptions = {}): EmailAnalysisResult {
  const { evidence, links, senderDomain } = collectEmailEvidence(raw, opts);
  const allowlisted = opts.useAllowlist !== false && senderDomain !== "" && isAllowlisted(senderDomain);
  const scored = scoreEvidence(evidence, { disabledRules: opts.disabledRules, allowlisted });
  return {
    subject: raw.subject,
    sender: raw.sender,
    senderEmail: raw.senderEmail,
    senderDomain,
    replyTo: raw.replyTo,
    verdict: scored.verdict,
    confidence: scored.confidence,
    riskScore: scored.riskScore,
    evidence: scored.active,
    suppressedEvidence: scored.suppressed,
    category: scored.category,
    links,
    domainInfo: null,
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Reply-To ──────────────────────────────────────────────────────────────

function checkReplyTo(raw: RawEmailData, senderDomain: string, evidence: EvidenceItem[]): void {
  const replyDomain = extractDomain(raw.replyTo);
  if (!raw.replyTo || !replyDomain || !senderDomain) return;
  const sReg = getRegistrableDomain(senderDomain);
  const rReg = getRegistrableDomain(replyDomain);
  if (sReg === rReg) return;
  const senderFree = FREE_MAIL_DOMAINS.has(sReg);
  const replyFree = FREE_MAIL_DOMAINS.has(rReg);
  evidence.push(
    makeEvidence(
      "EMAIL_REPLYTO_MISMATCH",
      replyFree && !senderFree ? "Replies go to a free webmail address" : "Replies go to a different domain",
      replyFree && !senderFree
        ? `The email is sent from ${senderDomain}, but hitting Reply sends your answer to a free ${rReg} address. Companies don't route replies to personal webmail — scammers do, so they can keep talking to you after the fake sender is blocked.`
        : `The email is from ${senderDomain} but replies go to ${replyDomain}. Legitimate organisations normally send and receive on the same domain.`,
      `From: ${raw.senderEmail} | Reply-To: ${raw.replyTo}`,
      senderFree && replyFree ? "medium" : "high"
    )
  );
}

// ─── Brand impersonation ───────────────────────────────────────────────────

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const BRAND_MATCHERS = KNOWN_BRANDS.map((b) => ({
  brand: b,
  re: new RegExp(`\\b(${[b.brand, ...b.keywords].map(escapeRe).join("|")})\\b`, "i"),
}));

function checkBrandImpersonation(raw: RawEmailData, senderDomain: string, pressure: boolean, evidence: EvidenceItem[]): void {
  if (!senderDomain) return;
  const officialOfSender = officialBrandFor(senderDomain);
  const identity = `${raw.sender} ${raw.senderEmail.split("@")[0] ?? ""}`;

  for (const { brand, re } of BRAND_MATCHERS) {
    if (officialOfSender === brand.brand) continue;

    // Strong: the sender presents itself as the brand.
    if (re.test(identity)) {
      evidence.push(
        makeEvidence(
          "EMAIL_BRAND_IMPERSONATION",
          `Claims to be ${brand.brand}, but isn't sent from ${brand.brand}`,
          `The sender name or address says "${brand.brand}", but the email came from ${senderDomain}, which is not a ${brand.brand} domain (${brand.officialDomains.slice(0, 3).join(", ")}).`,
          `From: ${raw.sender} <${raw.senderEmail}>`,
          "high"
        )
      );
      return;
    }

    // Weaker: the brand is named in the subject/body AND the email pressures you
    // or asks for credentials. A newsletter that merely mentions Apple doesn't fire.
    if (pressure && re.test(`${raw.subject}\n${raw.bodyText}`)) {
      evidence.push(
        makeEvidence(
          "EMAIL_BRAND_IMPERSONATION",
          `Uses ${brand.brand}'s name to pressure you`,
          `This email talks about your ${brand.brand} account with urgent or credential-requesting language, but it was sent from ${senderDomain}, not from ${brand.brand}.`,
          `Sent from: ${senderDomain}`,
          "medium"
        )
      );
      return;
    }
  }
}

// ─── Language checks ───────────────────────────────────────────────────────

function checkUrgencyLanguage(text: string, evidence: EvidenceItem[]): number {
  const matches = URGENCY_PATTERNS.filter(({ pattern }) => pattern.test(text)).map((p) => p.label);
  if (matches.length === 0) return 0;
  evidence.push(
    makeEvidence(
      "EMAIL_URGENCY",
      "Urgency and pressure language",
      `The email uses pressure tactics designed to rush you into acting without thinking: ${matches.slice(0, 3).join(", ")}.`,
      matches.join(", "),
      matches.length >= 2 ? "medium" : "low"
    )
  );
  return matches.length;
}

function checkCredentialHarvesting(text: string, evidence: EvidenceItem[]): boolean {
  const matches = CREDENTIAL_PATTERNS.filter(({ pattern }) => pattern.test(text)).map((p) => p.label);
  if (matches.length === 0) return false;
  evidence.push(
    makeEvidence(
      "EMAIL_CREDENTIAL_REQUEST",
      "Asks for passwords or account details",
      `This email tries to collect sensitive information or send you to a login page: ${matches.slice(0, 2).join(", ")}.`,
      matches.join(", ")
    )
  );
  return true;
}

function checkSenderTld(domain: string, evidence: EvidenceItem[]): void {
  const tld = getTld(domain);
  if (!tld || !SUSPICIOUS_TLDS.has(tld)) return;
  evidence.push(
    makeEvidence(
      "EMAIL_SENDER_TLD",
      `Sender uses a frequently abused domain ending (${tld})`,
      `The ${tld} top-level domain is disproportionately used for spam and phishing.`,
      `Domain: ${domain}`
    )
  );
}

// ─── Links ─────────────────────────────────────────────────────────────────

function dedupeLinks(links: RawEmailData["links"]): RawEmailData["links"] {
  const seen = new Set<string>();
  return links.filter((l) => (seen.has(l.href) ? false : (seen.add(l.href), true)));
}

/** A domain-looking string in link text ("www.paypal.com", "https://x.y/z"). */
function domainInText(text: string): string {
  const t = text.trim().toLowerCase();
  const m = t.match(/^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#]\S*)?$/);
  return m ? m[1] : "";
}

export function analyzeEmailLink(href: string, text: string, opts: AnalyzeEmailOptions = {}): AnalyzedLink {
  const r = analyzeUrl(href, { disabledRules: opts.disabledRules, useAllowlist: opts.useAllowlist });
  const flags = r.evidence.map((e) => e.title);
  let verdict = r.verdict;

  const shown = domainInText(text);
  if (shown && r.domain && getRegistrableDomain(shown) !== getRegistrableDomain(r.domain)) {
    flags.unshift(`Link text shows ${shown} but it actually goes to ${r.domain}`);
    verdict = "high_risk";
  }
  if (r.error) flags.push(r.error);

  return {
    href,
    text,
    domain: r.domain,
    verdict: verdict === "unknown" ? "safe" : verdict,
    isSuspicious: verdict === "suspicious" || verdict === "high_risk",
    flags,
  };
}

/** Back-compat helper: per-link analysis given a pre-parsed domain. */
export function analyzeLink(href: string, text: string, _domain: string, _senderDomain: string): AnalyzedLink {
  return analyzeEmailLink(href, text);
}

export function extractDomain(emailOrUrl: string): string {
  if (!emailOrUrl) return "";
  if (emailOrUrl.includes("@") && !emailOrUrl.includes("://")) {
    return emailOrUrl.split("@").pop()?.toLowerCase().trim().replace(/[>\s]+$/, "") ?? "";
  }
  try {
    return new URL(emailOrUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}
