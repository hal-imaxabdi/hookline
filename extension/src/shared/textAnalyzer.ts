/**
 * Plain-text analyzer used by the scam-message evaluation (CSV text,label,category).
 * Runs the same detectors the extension runs on emails/pages, minus anything
 * that needs a sender address, links or a live page.
 */

import type { EvidenceItem } from "./types";
import { URGENCY_PATTERNS, CREDENTIAL_PATTERNS } from "./detectionRules";
import { makeEvidence, scoreEvidence, type ScoreOptions, type ScoreResult } from "./riskEngine";
import { detectJobScam, detectShoppingScam } from "./scamDetectors";

export interface AnalyzeTextOptions extends Pick<ScoreOptions, "disabledRules"> {
  kind: "posting" | "email" | "page";
}

export function collectTextEvidence(text: string, kind: AnalyzeTextOptions["kind"]): EvidenceItem[] {
  const ev: EvidenceItem[] = [];
  ev.push(...detectJobScam({ kind, body: text }));
  // Job ADVERTISEMENTS: only job rules apply. Email-phishing phrasing and
  // shop-page checks ("no contact details") are meaningless on a job ad. J1.
  if (kind === "posting") return ev;
  ev.push(...detectShoppingScam({ url: "", title: "", text, links: [], pricePairs: [], hasCheckoutUi: false }));
  const urg = URGENCY_PATTERNS.filter((p) => p.pattern.test(text)).map((p) => p.label);
  if (urg.length) {
    ev.push(makeEvidence("EMAIL_URGENCY", "Urgency and pressure language", urg.join(", "), undefined, urg.length >= 2 ? "medium" : "low"));
  }
  const cred = CREDENTIAL_PATTERNS.filter((p) => p.pattern.test(text)).map((p) => p.label);
  if (cred.length) ev.push(makeEvidence("EMAIL_CREDENTIAL_REQUEST", "Asks for passwords or account details", cred.join(", ")));
  return ev;
}

export function analyzeText(text: string, opts: AnalyzeTextOptions): ScoreResult {
  return scoreEvidence(collectTextEvidence(text, opts.kind), { disabledRules: opts.disabledRules });
}
