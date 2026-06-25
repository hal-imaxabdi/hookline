/**
 * Summary Tab — Phase 3
 *
 * Now renders REAL EmailAnalysisResult data instead of stubs.
 * Falls back to a "waiting" state if analysis hasn't arrived yet.
 */

import React, { useState } from "react";
import { SidebarState, EvidenceItem, RiskLevel, Confidence } from "../../shared/types";

interface SummaryTabProps {
  state: SidebarState;
}

export default function SummaryTab({ state }: SummaryTabProps) {

  if (state.isLoading) return <LoadingState />;

  // ── Real email analysis ──────────────────────────────────────────────────
  if (state.mode === "email" && state.emailAnalysis) {
    const { verdict, confidence, riskScore, evidenceScore, evidenceMax, evidence, senderEmail, subject } = state.emailAnalysis;

    const bannerProps = verdictToBannerProps(verdict, confidence);

    return (
      <div className="animate-fade-in" style={{ padding: "0 0 16px" }}>
        {/* Context strip — shows what was analyzed */}
        <ContextStrip subject={subject} senderEmail={senderEmail} />

        <AssessmentBanner
          verdict={verdict}
          confidence={confidence}
          riskScore={riskScore}
          evidenceScore={evidenceScore}
          evidenceMax={evidenceMax}
          {...bannerProps}
        />

        {evidence.length > 0 ? (
          <EvidenceList evidence={evidence} />
        ) : (
          <NoEvidencePanel />
        )}

        <WhatYouCanDo verdict={verdict} senderEmail={senderEmail} />
      </div>
    );
  }

  // ── URL mode: real analysis ────────────────────────────────────────────────
  if (state.mode === "url") {
    if (state.isLoading) return <LoadingState label="Analyzing URL..." />;

    if (state.urlAnalysis) {
      const { verdict, confidence, riskScore, evidenceScore, evidenceMax, evidence, domain, url } = state.urlAnalysis;
      const bannerProps = verdictToBannerProps(verdict, confidence);
      return (
        <div className="animate-fade-in" style={{ padding: "0 0 16px" }}>
          <UrlContextStrip domain={domain} url={url} />
          <AssessmentBanner
            verdict={verdict}
            confidence={confidence}
            riskScore={riskScore}
            evidenceScore={evidenceScore}
            evidenceMax={evidenceMax}
            {...bannerProps}
          />
          {evidence.length > 0 ? (
            <EvidenceList evidence={evidence} />
          ) : (
            <NoEvidencePanel />
          )}
          <WhatYouCanDo verdict={verdict} senderEmail={domain} />
        </div>
      );
    }

    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Right-click a link and select "Analyze with Hookline" to inspect it.
        </p>
      </div>
    );
  }

  // ── Email mode but analysis not arrived yet ──────────────────────────────
  return <WaitingForEmail />;
}

// ─── Context Strip ───────────────────────────────────────────────────────────

function ContextStrip({ subject, senderEmail }: { subject: string; senderEmail: string }) {
  return (
    <div
      style={{
        margin: "12px 12px 0",
        padding: "10px 12px",
        backgroundColor: "var(--bg-surface)",
        borderRadius: "8px",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
        Analyzing email
      </div>
      {subject && (
        <div
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subject}
        </div>
      )}
      {senderEmail && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
          {senderEmail}
        </div>
      )}
    </div>
  );
}

// ─── URL Context Strip ───────────────────────────────────────────────────────

function UrlContextStrip({ domain, url }: { domain: string; url: string }) {
  return (
    <div
      style={{
        margin: "12px 12px 0",
        padding: "10px 12px",
        backgroundColor: "var(--bg-surface)",
        borderRadius: "8px",
        border: "1px solid var(--border-subtle)",
      }}
    >
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
        Analyzing URL
      </div>
      <div
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--text-primary)",
          marginBottom: "2px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {domain}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {url}
      </div>
    </div>
  );
}

// ─── Assessment Banner ────────────────────────────────────────────────────────

interface BannerProps {
  verdict: RiskLevel;
  confidence: Confidence | "none";
  riskScore?: number;
  evidenceScore: number;
  evidenceMax: number;
  label?: string;
  sublabel?: string;
}

function verdictToBannerProps(verdict: RiskLevel, confidence: Confidence): { label: string; sublabel: string } {
  switch (verdict) {
    case "high_risk":
      return { label: "HIGH RISK", sublabel: "Likely phishing attempt" };
    case "suspicious":
      return {
        label: "SUSPICIOUS",
        sublabel: confidence === "high" ? "Multiple risk indicators found" : "Some risk indicators found",
      };
    case "safe":
      return { label: "LOOKS SAFE", sublabel: "No major risk indicators found" };
    default:
      return { label: "PENDING", sublabel: "Analysis in progress" };
  }
}

function AssessmentBanner({ verdict, confidence, riskScore, evidenceScore, evidenceMax, label, sublabel }: BannerProps & { label?: string; sublabel?: string }) {
  const isHighRisk = verdict === "high_risk";
  const isSuspicious = verdict === "suspicious";
  const isSafe = verdict === "safe";

  const color = isHighRisk
    ? "var(--risk-high)"
    : isSuspicious
    ? "var(--risk-medium)"
    : isSafe
    ? "var(--risk-low)"
    : "var(--text-muted)";

  const bg = isHighRisk
    ? "var(--risk-high-bg)"
    : isSuspicious
    ? "var(--risk-medium-bg)"
    : isSafe
    ? "var(--risk-low-bg)"
    : "var(--bg-surface)";

  const displayLabel = label ?? (isHighRisk ? "HIGH RISK" : isSuspicious ? "SUSPICIOUS" : "LOOKS SAFE");
  const displaySublabel = sublabel ?? "";
  const confidenceLabel = confidence === "none" ? "—" : confidence.charAt(0).toUpperCase() + confidence.slice(1);

  return (
    <div
      style={{
        margin: "12px 12px 0",
        padding: "14px 16px",
        backgroundColor: bg,
        border: `1px solid ${color}40`,
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--text-secondary)",
          fontWeight: 500,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        Assessment
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: `${color}20`,
              border: `1px solid ${color}40`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isHighRisk || isSuspicious ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L1.5 15h15L9 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M9 7v4M9 13v.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.5" />
                <path d="M6 9l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>

          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color }}>{displayLabel}</div>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "1px" }}>{displaySublabel}</div>
          </div>
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          {typeof riskScore === "number" ? (
            <>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Risk score</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color, lineHeight: 1.1 }}>
                {riskScore}
                <span style={{ fontSize: "12px", color: "var(--text-muted)", fontWeight: 500 }}>/100</span>
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                {confidenceLabel} confidence · {evidenceScore} signal{evidenceScore !== 1 ? "s" : ""}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>Confidence</div>
              <div style={{ fontSize: "13px", fontWeight: 600, color }}>{confidenceLabel}</div>
              {evidenceMax > 0 && (
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  {evidenceScore} indicator{evidenceScore !== 1 ? "s" : ""} found
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Evidence List ────────────────────────────────────────────────────────────

function EvidenceList({ evidence }: { evidence: EvidenceItem[] }) {
  // Sort: high severity first
  const sorted = [...evidence].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div style={{ margin: "12px 12px 0" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        Why Hookline flagged this
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {sorted.map((item, i) => (
          <EvidenceRow key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(false);

  const color =
    item.severity === "high"
      ? "var(--risk-high)"
      : item.severity === "medium"
      ? "var(--risk-medium)"
      : "var(--text-muted)";

  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <path d="M8 1.5L1.5 13.5h13L8 1.5z" stroke={color} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M8 6v3.5M8 11.5v.5" stroke={color} strokeWidth="1.3" strokeLinecap="round" />
        </svg>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
            {item.title}
          </div>
          {!expanded && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
              {item.description}
            </div>
          )}
        </div>

        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M3 5l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div
          style={{
            padding: "8px 12px 10px 38px",
            fontSize: "12px",
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <p style={{ margin: 0 }}>{item.description}</p>
          {item.detail && (
            <p
              style={{
                margin: "6px 0 0",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--text-muted)",
                wordBreak: "break-all",
              }}
            >
              {item.detail}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── No Evidence Panel ────────────────────────────────────────────────────────

function NoEvidencePanel() {
  return (
    <div style={{ margin: "12px 12px 0" }}>
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "16px 14px",
          textAlign: "center",
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ margin: "0 auto 8px", display: "block" }}>
          <circle cx="14" cy="14" r="11" stroke="var(--risk-low)" strokeWidth="1.5" />
          <path d="M9 14l3 3 7-7" stroke="var(--risk-low)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          No indicators found
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Hookline didn't detect any phishing indicators in this email. Exercise normal caution.
        </div>
      </div>
    </div>
  );
}

// ─── What You Can Do ──────────────────────────────────────────────────────────

function WhatYouCanDo({ verdict, senderEmail }: { verdict: RiskLevel; senderEmail: string }) {
  const domain = senderEmail.split("@")[1] ?? "";

  const message =
    verdict === "high_risk"
      ? `Do not click any links or enter credentials. If this email claims to be from a company, visit their website directly by typing the address in your browser.`
      : verdict === "suspicious"
      ? `Proceed with caution. Verify this email through a different channel before clicking links or providing information.`
      : `This email appears legitimate. Standard caution still applies.`;

  return (
    <div style={{ margin: "12px 12px 0" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        What you can do
      </div>

      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          gap: "10px",
          alignItems: "flex-start",
          marginBottom: "8px",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: "1px" }}>
          <circle cx="9" cy="9" r="7" stroke="var(--brand-blue)" strokeWidth="1.4" />
          <path d="M9 5v5M9 12v.5" stroke="var(--brand-blue)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
          {message}
        </p>
      </div>
    </div>
  );
}

// ─── URL coming soon ──────────────────────────────────────────────────────────

function UrlAnalysisComingSoon({ url }: { url: string | null }) {
  return (
    <div style={{ margin: "12px 12px 0", padding: "14px", backgroundColor: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        <strong style={{ color: "var(--text-primary)" }}>URL Detection (Phase 4)</strong>
        <br />
        Domain age, typosquatting, WHOIS, SSL, and DNS analysis will be wired in the next phase.
        {url && (
          <div style={{ marginTop: "8px", fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-muted)", wordBreak: "break-all" }}>
            {url}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Waiting for email ────────────────────────────────────────────────────────

function WaitingForEmail() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        gap: "12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "rgba(124,92,252,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 5.5V10c0 4 2.9 7.7 7 9 4.1-1.3 7-5 7-9V5.5L10 2z" stroke="var(--brand-purple)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: "13px", color: "var(--text-primary)", margin: "0 0 4px", fontWeight: 600 }}>
          Open an email to analyze
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
          Hookline will automatically scan it for phishing indicators.
        </p>
      </div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingState({ label = "Analyzing email..." }: { label?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 20px",
        gap: "12px",
      }}
    >
      <div
        className="animate-pulse-subtle"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: "rgba(124,92,252,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2L3 5.5V10c0 4 2.9 7.7 7 9 4.1-1.3 7-5 7-9V5.5L10 2z" stroke="var(--brand-purple)" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{label}</p>
    </div>
  );
}
