/**
 * Hookline Shared Types
 *
 * Shared between the background service worker, the content scripts, the
 * sidebar React app, the eval harness, and (shape-wise) the FastAPI backend.
 */

import type { RuleId } from "./ruleRegistry";

// ─── Risk Levels ───────────────────────────────────────────────────────────

export type RiskLevel = "safe" | "suspicious" | "high_risk" | "pending" | "unknown";

export type Confidence = "high" | "medium" | "low" | "none";

// ─── Scam categories (Phase 3) ─────────────────────────────────────────────

export type ScamCategory = "credential_phishing" | "job_scam" | "shopping_scam";

/** Category label shown to the user. "none" = "None detected". */
export type CategoryLabel = ScamCategory | "none";

export const CATEGORY_DISPLAY: Record<CategoryLabel, string> = {
  credential_phishing: "Credential phishing",
  job_scam: "Job/internship scam",
  shopping_scam: "Shopping scam",
  none: "None detected",
};

export interface CategoryResult {
  label: CategoryLabel;
  /** Points contributed per category (after allow-list / disabled rules). */
  points: Record<ScamCategory, number>;
  /** Plain-language reasons (titles of the rules that drove the label). */
  reasons: string[];
}

// ─── Evidence Items ────────────────────────────────────────────────────────

/**
 * Evidence "group". The risk engine takes the strongest item per group, so
 * several overlapping signals of the same kind don't stack.
 */
export type EvidenceType =
  | "sender_mismatch"
  | "domain_age"
  | "typosquatting"
  | "homoglyph"
  | "spf_fail"
  | "no_dmarc"
  | "suspicious_link"
  | "credential_harvesting"
  | "urgency_language"
  | "brand_impersonation"
  | "suspicious_tld"
  | "url_structure"
  | "ssl_missing"
  | "redirector"
  | "threat_intel"
  // Job/internship scam signals — each its own group so they stack.
  | "job_upfront_fee"
  | "job_check_scheme"
  | "job_free_email_recruiter"
  | "job_move_to_chat"
  | "job_chat_interview"
  | "job_offer_no_interview"
  | "job_unrealistic_pay"
  | "job_sensitive_info"
  | "job_task_deposit"
  | "job_urgency"
  // Shopping scam signals.
  | "shop_new_domain_discount"
  | "shop_huge_discount"
  | "shop_unsafe_payment"
  | "shop_no_contact"
  | "shop_brand_domain"
  | "shop_countdown";

export type EvidenceSeverity = "high" | "medium" | "low";

export interface EvidenceItem {
  ruleId: RuleId;
  type: EvidenceType;
  severity: EvidenceSeverity;
  title: string;
  description: string;
  detail?: string; // Technical detail (e.g., "1 character difference from paypal.com")
}

// ─── Domain Intelligence ───────────────────────────────────────────────────

export interface DomainInfo {
  domain: string;
  registrar: string;
  createdDate: string | null;
  createdDaysAgo: number | null;
  isNewDomain: boolean;
  spfStatus: "pass" | "fail" | "missing" | "unknown";
  dkimStatus: "pass" | "missing" | "unknown";
  sslIssuer: string | null;
  sslHasOrgValidation: boolean;
  reputationScore: "very_low" | "low" | "medium" | "high" | "unknown";
  dmarcStatus?: "pass" | "missing" | "unknown";
  spfRecord?: string | null;
  dmarcPolicy?: string | null;
  dkimSelector?: string | null;
  mx?: string[];
  a?: string[];
  sslValidFrom?: string | null;
  sslValidUntil?: string | null;
  note?: string | null;
  cached?: boolean;
}

/** Status of the optional local backend, shown in the sidebar. */
export type BackendStatus = "disabled" | "online" | "offline" | "unknown";

// ─── Threat intel (optional, off by default) ───────────────────────────────

export interface ThreatIntelHit {
  source: "google_safe_browsing" | "urlhaus";
  url: string;
  threat: string;
}

// ─── Analysis Results ──────────────────────────────────────────────────────

interface ScoredResult {
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore: number;           // 0–100 weighted score
  evidence: EvidenceItem[];    // active evidence (counted in the score)
  /** Evidence ignored because the domain is on the allow-list. Shown, not scored. */
  suppressedEvidence: EvidenceItem[];
  category: CategoryResult;
  domainInfo: DomainInfo | null;
  analyzedAt: string;          // ISO timestamp
}

export interface UrlAnalysisResult extends ScoredResult {
  url: string;
  domain: string;
  registrableDomain: string;
  allowlisted: boolean;
  /** Set when the URL could not be parsed. */
  error?: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  text: string;
  /** Up to N link hrefs + texts on the page. */
  links: Array<{ href: string; text: string }>;
  /** Prices like "$19.99" with optional struck-through original price. */
  pricePairs: Array<{ was: number; now: number }>;
  hasCheckoutUi: boolean;
}

export interface PageAnalysisResult extends UrlAnalysisResult {
  pageTitle: string;
  pageSignals: { shopContext: boolean; maxDiscount: number };
}

export interface EmailAnalysisResult extends ScoredResult {
  subject: string;
  sender: string;
  senderEmail: string;
  senderDomain: string;
  replyTo: string;
  mailedBy?: string;
  signedBy?: string;
  links: AnalyzedLink[];
}

export interface AnalyzedLink {
  href: string;
  text: string;
  domain: string;
  verdict: RiskLevel;
  isSuspicious: boolean;
  flags: string[]; // Human-readable list of why this link is suspicious
}

// ─── Per-tab state (background → sidebar) ─────────────────────────────────

export type ExtractionFailure = {
  reason: "no_message_found" | "selectors_failed" | "page_not_readable";
  message: string;
};

export interface TabState {
  tabId: number;
  mode: AnalysisMode;
  requestId: number;
  email: EmailAnalysisResult | null;
  url: UrlAnalysisResult | null;
  page: PageAnalysisResult | null;
  extractionFailure: ExtractionFailure | null;
  backendStatus: BackendStatus;
  isLoading: boolean;
  updatedAt: string;
}

// ─── Messages ─────────────────────────────────────────────────────────────

export interface RawEmailData {
  subject: string;
  sender: string;
  senderEmail: string;
  replyTo: string;
  bodyText: string;
  links: Array<{ href: string; text: string; domain: string }>;
  timestamp: string;
  /** Which selector chain matched — used for diagnostics only. */
  extractionPath?: string;
  /** Gmail's own "mailed-by" / "signed-by" (DKIM) header details, when visible. */
  mailedBy?: string;
  signedBy?: string;
}

/** Messages sent TO the background worker. */
export type ToBackgroundMessage =
  | { type: "EMAIL_DATA_EXTRACTED"; payload: RawEmailData }
  | { type: "EMAIL_EXTRACTION_STARTED" }
  | { type: "EMAIL_EXTRACTION_FAILED"; payload: ExtractionFailure }
  | { type: "EMAIL_VIEW_CLOSED" }
  | { type: "GET_TAB_STATE"; tabId: number }
  | { type: "ANALYZE_URL"; tabId: number; url: string }
  | { type: "ANALYZE_PAGE"; tabId: number }
  | { type: "RETRY_EMAIL"; tabId: number }
  | { type: "CHECK_BACKEND" };

/** Messages broadcast FROM the background worker to the sidebar. */
export type FromBackgroundMessage = { type: "TAB_STATE"; payload: TabState };

/** Messages sent from the background worker TO the Gmail content script. */
export type ToContentMessage = { type: "REEXTRACT" };

// ─── App State (Sidebar) ───────────────────────────────────────────────────

export type SidebarView = "summary" | "evidence" | "links" | "settings";

export type AnalysisMode = "url" | "email" | "page" | "idle";
