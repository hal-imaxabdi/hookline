/**
 * Web-page analyzer: URL checks + shopping-scam and job-scam checks over the
 * page's visible text. The page text is read on demand (user clicks the
 * toolbar icon / "Analyze this page") and never leaves the machine.
 */

import type { PageAnalysisResult, PageSnapshot } from "./types";
import { collectUrlEvidence, type AnalyzeUrlOptions } from "./urlAnalyzer";
import { scoreEvidence } from "./riskEngine";
import { detectShoppingScam, detectJobScam, shoppingSignals } from "./scamDetectors";
import { getRegistrableDomain } from "./domainUtils";
import { isAllowlisted } from "./allowlist";

export interface AnalyzePageOptions extends AnalyzeUrlOptions {
  domainAgeDays?: number | null;
}

export function analyzePage(page: PageSnapshot, opts: AnalyzePageOptions = {}): PageAnalysisResult {
  const collected = collectUrlEvidence(page.url, opts);
  const domain = "error" in collected ? "" : collected.domain;
  const evidence = "error" in collected ? [] : [...collected.evidence];

  evidence.push(...detectShoppingScam(page, { domainAgeDays: opts.domainAgeDays }));
  evidence.push(...detectJobScam({ kind: "page", subject: page.title, body: page.text }));

  const allowlisted = opts.useAllowlist !== false && domain !== "" && isAllowlisted(domain);
  const scored = scoreEvidence(evidence, { disabledRules: opts.disabledRules, allowlisted });
  const signals = shoppingSignals(page);

  return {
    url: page.url,
    domain,
    registrableDomain: domain ? getRegistrableDomain(domain) : "",
    allowlisted,
    pageTitle: page.title,
    pageSignals: signals,
    verdict: scored.verdict,
    confidence: scored.confidence,
    riskScore: scored.riskScore,
    evidence: scored.active,
    suppressedEvidence: scored.suppressed,
    category: scored.category,
    domainInfo: null,
    analyzedAt: new Date().toISOString(),
    ...("error" in collected ? { error: collected.error } : {}),
  };
}
