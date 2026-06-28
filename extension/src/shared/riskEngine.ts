/**
 * Hookline Risk Engine — Phase 9
 *
 * Turns a list of evidence items into a single 0–100 risk score and a verdict.
 *
 * Replaces the old "count the red flags" logic. Each evidence TYPE has a base
 * weight (its worth at "high" severity); severity scales that down. We take the
 * strongest item of each type (so three url_structure flags don't triple-count)
 * and sum across types.
 *
 * Design goals:
 *   - One strong signal (typosquat, homoglyph) is enough to flag.
 *   - Weak signals (a single odd TLD, a missing DMARC record) do NOT flip a
 *     safe site to "suspicious" on their own — they only matter in combination.
 *   - Adding evidence can only raise the score, never lower it.
 */

import { EvidenceItem, EvidenceType, EvidenceSeverity, RiskLevel, Confidence } from "./types";

// Base points for each evidence type, assuming "high" severity.
const TYPE_WEIGHTS: Record<EvidenceType, number> = {
  homoglyph: 55,
  typosquatting: 50,
  brand_impersonation: 45,
  sender_mismatch: 45,
  domain_age: 42,
  url_structure: 35,
  spf_fail: 30,
  credential_harvesting: 28,
  no_dmarc: 26,
  dkim_missing: 24,
  ssl_missing: 24,
  suspicious_tld: 22,
  low_reputation: 18,
  suspicious_link: 30,
};

const SEVERITY_FACTOR: Record<EvidenceSeverity, number> = {
  high: 1,
  medium: 0.5,
  low: 0.25,
};

// Thresholds on the 0–100 score.
const HIGH_RISK_AT = 50;
const SUSPICIOUS_AT = 20;

export function scoreEvidence(evidence: EvidenceItem[]): {
  riskScore: number;
  verdict: RiskLevel;
  confidence: Confidence;
} {
  // Strongest contribution per type.
  const perType: Partial<Record<EvidenceType, number>> = {};
  for (const e of evidence) {
    const base = TYPE_WEIGHTS[e.type] ?? 10;
    const points = base * (SEVERITY_FACTOR[e.severity] ?? 0.25);
    perType[e.type] = Math.max(perType[e.type] ?? 0, points);
  }

  let raw = 0;
  for (const key of Object.keys(perType)) {
    raw += perType[key as EvidenceType] ?? 0;
  }
  const riskScore = Math.min(100, Math.round(raw));
  const distinctTypes = Object.keys(perType).length;

  let verdict: RiskLevel;
  if (riskScore >= HIGH_RISK_AT) verdict = "high_risk";
  else if (riskScore >= SUSPICIOUS_AT) verdict = "suspicious";
  else verdict = "safe";

  let confidence: Confidence;
  if (verdict === "safe") {
    confidence = "high";
  } else if (riskScore >= 70 || distinctTypes >= 3) {
    confidence = "high";
  } else if (riskScore >= 35 || distinctTypes >= 2) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return { riskScore, verdict, confidence };
}
