/**
 * Hookline Risk Engine
 *
 * Turns evidence items into a 0–100 risk score, a verdict, and a scam-category
 * label. Weights live in ruleRegistry.ts.
 *
 *   points(item) = RULES[item.ruleId].weight × SEVERITY_FACTOR[item.severity]
 *   score        = min(100, round(Σ_group max(points in group)))
 *
 * Taking the max per group means overlapping signals of the same kind (three
 * url_structure flags) don't triple-count, while independent signals add up.
 */

import type {
  EvidenceItem,
  EvidenceType,
  EvidenceSeverity,
  RiskLevel,
  Confidence,
  CategoryResult,
  ScamCategory,
} from "./types";
import { RULES, type RuleId } from "./ruleRegistry";

export const SEVERITY_FACTOR: Record<EvidenceSeverity, number> = {
  high: 1,
  medium: 0.5,
  low: 0.25,
};

export const HIGH_RISK_AT = 50;
export const SUSPICIOUS_AT = 20;
/** A category needs at least this many points to be named. */
export const CATEGORY_MIN_POINTS = 20;

export interface ScoreOptions {
  /** Rule IDs to ignore (ablation, user settings). */
  disabledRules?: ReadonlySet<RuleId>;
  /** If true, allow-list-suppressible rules are ignored. */
  allowlisted?: boolean;
}

export interface ScoreResult {
  riskScore: number;
  verdict: RiskLevel;
  confidence: Confidence;
  active: EvidenceItem[];
  suppressed: EvidenceItem[];
  category: CategoryResult;
}

export function pointsFor(item: EvidenceItem): number {
  const rule = RULES[item.ruleId];
  return rule.weight * SEVERITY_FACTOR[item.severity];
}

/** Split evidence into what counts and what is ignored, given the options. */
export function partitionEvidence(
  evidence: readonly EvidenceItem[],
  opts: ScoreOptions = {}
): { active: EvidenceItem[]; suppressed: EvidenceItem[] } {
  const active: EvidenceItem[] = [];
  const suppressed: EvidenceItem[] = [];
  for (const e of evidence) {
    if (opts.disabledRules?.has(e.ruleId)) continue;
    if (opts.allowlisted && RULES[e.ruleId].allowlistSuppressible) {
      suppressed.push(e);
      continue;
    }
    active.push(e);
  }
  return { active, suppressed };
}

export function scoreEvidence(
  evidence: readonly EvidenceItem[],
  opts: ScoreOptions = {}
): ScoreResult {
  const { active, suppressed } = partitionEvidence(evidence, opts);

  const perGroup = new Map<EvidenceType, number>();
  for (const e of active) {
    const p = pointsFor(e);
    perGroup.set(e.type, Math.max(perGroup.get(e.type) ?? 0, p));
  }

  let raw = 0;
  for (const v of perGroup.values()) raw += v;
  const riskScore = Math.min(100, Math.round(raw));
  const distinctGroups = perGroup.size;

  let verdict: RiskLevel;
  if (riskScore >= HIGH_RISK_AT) verdict = "high_risk";
  else if (riskScore >= SUSPICIOUS_AT) verdict = "suspicious";
  else verdict = "safe";

  let confidence: Confidence;
  if (verdict === "safe") confidence = "high";
  else if (riskScore >= 70 || distinctGroups >= 3) confidence = "high";
  else if (riskScore >= 35 || distinctGroups >= 2) confidence = "medium";
  else confidence = "low";

  return { riskScore, verdict, confidence, active, suppressed, category: categorize(active, verdict) };
}

/**
 * Scam-category classifier.
 *
 * Sums points per category (max per group, like the score) over the active
 * evidence. The highest category wins if it reaches CATEGORY_MIN_POINTS and
 * the overall verdict isn't "safe". "general" rules (TLD, http, structure)
 * raise the risk score but never name a category on their own.
 */
export function categorize(active: readonly EvidenceItem[], verdict: RiskLevel): CategoryResult {
  const groupMax = new Map<string, { cat: ScamCategory; points: number; title: string }>();
  for (const e of active) {
    const rule = RULES[e.ruleId];
    if (rule.category === "general") continue;
    const p = pointsFor(e);
    const key = `${rule.category}:${e.type}`;
    const prev = groupMax.get(key);
    if (!prev || p > prev.points) groupMax.set(key, { cat: rule.category, points: p, title: e.title });
  }

  const points: Record<ScamCategory, number> = { credential_phishing: 0, job_scam: 0, shopping_scam: 0 };
  const reasons: Record<ScamCategory, Array<{ title: string; points: number }>> = {
    credential_phishing: [], job_scam: [], shopping_scam: [],
  };
  for (const { cat, points: p, title } of groupMax.values()) {
    points[cat] += p;
    reasons[cat].push({ title, points: p });
  }

  let best: ScamCategory | null = null;
  for (const cat of Object.keys(points) as ScamCategory[]) {
    if (best === null || points[cat] > points[best]) best = cat;
  }

  if (verdict === "safe" || best === null || points[best] < CATEGORY_MIN_POINTS) {
    return { label: "none", points, reasons: [] };
  }
  return {
    label: best,
    points,
    reasons: reasons[best].sort((a, b) => b.points - a.points).map((x) => x.title),
  };
}

/** Helper for analyzers: build an evidence item with the rule's defaults. */
export function makeEvidence(
  ruleId: RuleId,
  title: string,
  description: string,
  detail?: string,
  severity?: EvidenceSeverity
): EvidenceItem {
  const rule = RULES[ruleId];
  return {
    ruleId,
    type: rule.group,
    severity: severity ?? rule.defaultSeverity,
    title,
    description,
    ...(detail !== undefined ? { detail } : {}),
  };
}
