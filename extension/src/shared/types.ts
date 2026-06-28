/**
 * Hookline Shared Types
 *
 * These types are shared between:
 * - Background service worker
 * - Content scripts
 * - Sidebar React app
 * - (Later) FastAPI backend responses
 */

// ─── Risk Levels ───────────────────────────────────────────────────────────

export type RiskLevel = "safe" | "suspicious" | "high_risk" | "pending" | "unknown";

export type Confidence = "high" | "medium" | "low" | "none";

// ─── Evidence Items ────────────────────────────────────────────────────────

export type EvidenceType =
  | "sender_mismatch"
  | "domain_age"
  | "typosquatting"
  | "homoglyph"
  | "spf_fail"
  | "dkim_missing"
  | "no_dmarc"
  | "suspicious_link"
  | "credential_harvesting"
  | "brand_impersonation"
  | "suspicious_tld"
  | "url_structure"
  | "ssl_missing"
  | "low_reputation";

export type EvidenceSeverity = "high" | "medium" | "low";

export interface EvidenceItem {
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
  // Phase 8 — DNS + SSL detail (all optional; backend fills when available)
  dmarcStatus?: "pass" | "missing" | "unknown";
  spfRecord?: string | null;
  dmarcPolicy?: string | null;
  dkimSelector?: string | null;
  mx?: string[];
  a?: string[];
  sslValidFrom?: string | null;
  sslValidUntil?: string | null;
  note?: string;
}

// ─── Analysis Results ──────────────────────────────────────────────────────

export interface UrlAnalysisResult {
  url: string;
  domain: string;
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore?: number;       // Phase 9: 0–100 weighted score
  evidenceScore: number;    // e.g., 4 (out of 5 indicators)
  evidenceMax: number;      // e.g., 5
  evidence: EvidenceItem[];
  domainInfo: DomainInfo | null;
  analyzedAt: string;       // ISO timestamp
}

export interface EmailAnalysisResult {
  subject: string;
  sender: string;
  senderEmail: string;
  senderDomain: string;
  replyTo: string;
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore?: number;       // Phase 9: 0–100 weighted score
  evidenceScore: number;
  evidenceMax: number;
  evidence: EvidenceItem[];
  links: AnalyzedLink[];
  domainInfo: DomainInfo | null;
  analyzedAt: string;
}

export interface AnalyzedLink {
  href: string;
  text: string;
  domain: string;
  verdict: RiskLevel;
  isSuspicious: boolean;
  flags?: string[]; // Human-readable list of why this link is suspicious
}

// ─── Message Types (Background ↔ Content ↔ Sidebar) ───────────────────────

export type HooklineMessageType =
  | "ANALYZE_URL"
  | "ANALYZE_EMAIL"
  | "EMAIL_DATA_EXTRACTED"
  | "PAGE_NAVIGATED"
  | "TAB_UPDATED"
  | "ANALYSIS_RESULT"
  | "CLEAR_ANALYSIS";

export interface HooklineMessage {
  type: HooklineMessageType;
  payload?: unknown;
}

// ─── App State (Sidebar) ───────────────────────────────────────────────────

export type SidebarView = "summary" | "evidence" | "links";

export type AnalysisMode = "url" | "email" | "idle";

export interface SidebarState {
  mode: AnalysisMode;
  activeView: SidebarView;
  isLoading: boolean;
  currentUrl: string | null;
  urlAnalysis: UrlAnalysisResult | null;
  emailAnalysis: EmailAnalysisResult | null;
  error: string | null;
}
