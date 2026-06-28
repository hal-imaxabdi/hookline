import {
  EmailAnalysisResult,
  AnalyzedLink,
  EvidenceItem,
  RiskLevel,
  Confidence,
} from "./types";

import {
  URGENCY_PATTERNS,
  CREDENTIAL_PATTERNS,
  KNOWN_BRANDS,
  SUSPICIOUS_TLDS,
  SUSPICIOUS_PATH_PATTERNS,
} from "./detectionRules";

import { scoreEvidence } from "./riskEngine";
import { getRegistrableDomain } from "./urlAnalyzer";

// ─── Input shape from content script ───────────────────────────────────────

export interface RawEmailData {
  subject: string;
  sender: string;
  senderEmail: string;
  replyTo: string;
  bodyText: string;
  links: Array<{ href: string; text: string; domain: string }>;
  timestamp: string;
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function analyzeEmail(raw: RawEmailData): EmailAnalysisResult {
  const evidence: EvidenceItem[] = [];

  const senderDomain = extractDomain(raw.senderEmail);
  const replyToDomain = raw.replyTo ? extractDomain(raw.replyTo) : "";

  // ── Run all checks ─────────────────────────────────────────────────────

  checkSenderDomainMismatch(raw.senderEmail, raw.replyTo, senderDomain, replyToDomain, evidence);
  checkBrandImpersonation(raw.subject, raw.senderEmail, raw.bodyText, senderDomain, evidence);
  checkUrgencyLanguage(raw.subject, raw.bodyText, evidence);
  checkCredentialHarvesting(raw.subject, raw.bodyText, evidence);
  checkSuspiciousTld(senderDomain, evidence);

  // ── Analyze links ──────────────────────────────────────────────────────

  const analyzedLinks = raw.links.map((link) =>
    analyzeLink(link.href, link.text, link.domain, senderDomain)
  );

  const suspiciousLinkCount = analyzedLinks.filter((l) => l.isSuspicious).length;
  if (suspiciousLinkCount > 0) {
    evidence.push({
      type: "suspicious_link",
      severity: suspiciousLinkCount >= 3 ? "high" : "medium",
      title: `${suspiciousLinkCount} suspicious link${suspiciousLinkCount > 1 ? "s" : ""} found`,
      description: `${suspiciousLinkCount} of ${raw.links.length} links in this email point to domains that do not match the sender's domain or are otherwise suspicious.`,
      detail: analyzedLinks
        .filter((l) => l.isSuspicious)
        .map((l) => l.domain)
        .slice(0, 3)
        .join(", "),
    });
  }

  // ── Compute verdict (Phase 9 risk engine) ───────────────────────────────

  const { verdict, confidence, riskScore } = scoreEvidence(evidence);

  return {
    subject: raw.subject,
    sender: raw.sender,
    senderEmail: raw.senderEmail,
    senderDomain,
    replyTo: raw.replyTo,
    verdict,
    confidence,
    riskScore,
    evidenceScore: evidence.length,
    evidenceMax: 6,
    evidence,
    links: analyzedLinks,
    domainInfo: null, // Phase 7–8 will populate this from backend
    analyzedAt: new Date().toISOString(),
  };
}

// ─── Check: Sender Domain Mismatch ─────────────────────────────────────────
// If Reply-To domain is different from From domain, that is a classic
// spoofing indicator. Legitimate companies don't do this.

function checkSenderDomainMismatch(
  senderEmail: string,
  replyTo: string,
  senderDomain: string,
  replyToDomain: string,
  evidence: EvidenceItem[]
): void {
  if (!replyTo || !replyToDomain) return;
  if (senderDomain === replyToDomain) return;

  // Ignore if Reply-To is clearly a legit email service
  const safeReplyDomains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com"];
  if (safeReplyDomains.includes(replyToDomain)) return;

  evidence.push({
    type: "sender_mismatch",
    severity: "high",
    title: "Reply-To domain differs from sender domain",
    description: `Email is from ${senderDomain} but replies go to ${replyToDomain}. Legitimate companies send and receive from the same domain.`,
    detail: `From: ${senderEmail} | Reply-To: ${replyTo}`,
  });
}

// ─── Check: Brand Impersonation ─────────────────────────────────────────────
// Check if the email claims to be from a known brand but the actual
// sending domain is not that brand's official domain.

function checkBrandImpersonation(
  subject: string,
  senderEmail: string,
  bodyText: string,
  senderDomain: string,
  evidence: EvidenceItem[]
): void {
  const contentToCheck = `${subject} ${senderEmail} ${bodyText}`.toLowerCase();

  for (const brand of KNOWN_BRANDS) {
    // Check if the content mentions this brand
    const mentionsBrand = brand.keywords.some((kw) =>
      contentToCheck.includes(kw.toLowerCase())
    );

    if (!mentionsBrand) continue;

    // Check if the sender is actually from the official domain
    const isOfficialDomain = brand.officialDomains.some(
      (d) => senderDomain === d || senderDomain.endsWith(`.${d}`)
    );

    if (!isOfficialDomain) {
      evidence.push({
        type: "brand_impersonation",
        severity: "high",
        title: `Possible ${brand.brand} impersonation`,
        description: `This email references ${brand.brand} but was not sent from an official ${brand.brand} domain. Official domains: ${brand.officialDomains.join(", ")}.`,
        detail: `Sent from: ${senderDomain}`,
      });
      break; // One brand match is enough
    }
  }
}

// ─── Check: Urgency Language ────────────────────────────────────────────────

function checkUrgencyLanguage(
  subject: string,
  bodyText: string,
  evidence: EvidenceItem[]
): void {
  const text = `${subject} ${bodyText}`;
  const matches: string[] = [];

  for (const { pattern, label } of URGENCY_PATTERNS) {
    if (pattern.test(text)) {
      matches.push(label);
    }
  }

  if (matches.length === 0) return;

  evidence.push({
    type: "credential_harvesting", // Reusing the closest type
    severity: matches.length >= 2 ? "medium" : "low",
    title: "Urgency and pressure language detected",
    description: `The email uses psychological pressure tactics designed to rush you into action without thinking. Patterns found: ${matches.slice(0, 3).join(", ")}.`,
    detail: matches.join(", "),
  });
}

// ─── Check: Credential Harvesting ──────────────────────────────────────────

function checkCredentialHarvesting(
  subject: string,
  bodyText: string,
  evidence: EvidenceItem[]
): void {
  const text = `${subject} ${bodyText}`;
  const matches: string[] = [];

  for (const { pattern, label } of CREDENTIAL_PATTERNS) {
    if (pattern.test(text)) {
      matches.push(label);
    }
  }

  if (matches.length === 0) return;

  evidence.push({
    type: "credential_harvesting",
    severity: "medium",
    title: "Credential harvesting language",
    description: `This email attempts to collect sensitive information or direct you to a login page. Patterns found: ${matches.slice(0, 2).join(", ")}.`,
    detail: matches.join(", "),
  });
}

// ─── Check: Suspicious TLD ─────────────────────────────────────────────────

function checkSuspiciousTld(domain: string, evidence: EvidenceItem[]): void {
  if (!domain) return;

  const tld = getTld(domain);
  if (!tld || !SUSPICIOUS_TLDS.has(tld)) return;

  evidence.push({
    type: "suspicious_tld",
    severity: "medium",
    title: `Sender uses high-risk TLD (${tld})`,
    description: `The ${tld} top-level domain is disproportionately associated with phishing and spam activity. Legitimate companies rarely use it.`,
    detail: `Domain: ${domain}`,
  });
}

// ─── Analyze a single link ──────────────────────────────────────────────────

export function analyzeLink(
  href: string,
  text: string,
  domain: string,
  senderDomain: string
): AnalyzedLink {
  const flags: string[] = [];

  // Domain mismatch: link goes somewhere different from sender
  // Compare REGISTRABLE domains, not raw hostnames — a link to
  // "www.linkedin.com" from a sender at "linkedin.com" is the same
  // organization, not a mismatch. Only flag if the underlying owner differs.
  const senderReg = getRegistrableDomain(senderDomain);
  const linkReg = getRegistrableDomain(domain);
  if (senderReg && linkReg && linkReg !== senderReg) {
    // Only flag if sender was a non-generic domain
    const genericDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"];
    if (!genericDomains.includes(senderReg)) {
      flags.push(`Domain mismatch: link goes to ${domain}, email from ${senderDomain}`);
    }
  }

  // Suspicious TLD on the link domain
  const tld = getTld(domain);
  if (tld && SUSPICIOUS_TLDS.has(tld)) {
    flags.push(`Suspicious TLD: ${tld}`);
  }

  // Suspicious path
  for (const { pattern, label } of SUSPICIOUS_PATH_PATTERNS) {
    if (pattern.test(href)) {
      flags.push(`Suspicious path: ${label}`);
      break;
    }
  }

  // IP address instead of domain name
  if (/^https?:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(href)) {
    flags.push("IP address used instead of domain name");
  }

  // Link text says one domain but href goes to another
  const textDomain = extractDomain(text);
  if (textDomain && domain && textDomain !== domain) {
    flags.push(`Link text shows ${textDomain} but actually goes to ${domain}`);
  }

  // Brand impersonation in link domain
  for (const brand of KNOWN_BRANDS) {
    const isOfficialDomain = brand.officialDomains.some(
      (d) => domain === d || domain.endsWith(`.${d}`)
    );
    if (!isOfficialDomain) {
      const impersonates = brand.keywords.some((kw) =>
        domain.toLowerCase().includes(kw.toLowerCase())
      );
      if (impersonates) {
        flags.push(`Possible ${brand.brand} impersonation in link domain`);
        break;
      }
    }
  }

  const isSuspicious = flags.length > 0;
  const verdict: RiskLevel =
    flags.length >= 2 ? "high_risk" : isSuspicious ? "suspicious" : "safe";

  return {
    href,
    text,
    domain,
    verdict,
    isSuspicious,
    flags,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractDomain(emailOrUrl: string): string {
  if (!emailOrUrl) return "";

  // Email address
  if (emailOrUrl.includes("@")) {
    return emailOrUrl.split("@")[1]?.toLowerCase().trim() ?? "";
  }

  // URL
  try {
    return new URL(emailOrUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function getTld(domain: string): string {
  const parts = domain.split(".");
  if (parts.length < 2) return "";
  return `.${parts[parts.length - 1]}`;
}