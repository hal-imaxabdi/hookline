import React from "react";
import { SidebarState, RiskLevel, Confidence, EvidenceItem } from "../../shared/types";

interface SummaryTabProps {
  state: SidebarState;
}

export default function SummaryTab({ state }: SummaryTabProps) {
  if (state.isLoading) return <LoadingState />;

  // Email mode
  if (state.mode === "email" && state.emailAnalysis) {
    const { verdict, confidence, riskScore, evidence, senderEmail, subject } = state.emailAnalysis;
    return (
      <div style={{ padding: "0 0 16px" }}>
        <ContextStrip subject={subject} sender={senderEmail} label="Analyzing email" />
        <VerdictCard verdict={verdict} confidence={confidence} riskScore={riskScore} evidence={evidence} />
        <Recommendation verdict={verdict} />
      </div>
    );
  }

  // URL mode
  if (state.mode === "url" && state.urlAnalysis) {
    const { verdict, confidence, riskScore, evidence, domain, url } = state.urlAnalysis;
    return (
      <div style={{ padding: "0 0 16px" }}>
        <ContextStrip subject={domain} sender={url} label="Analyzing URL" />
        <VerdictCard verdict={verdict} confidence={confidence} riskScore={riskScore} evidence={evidence} />
        <Recommendation verdict={verdict} />
      </div>
    );
  }

  if (state.mode === "url") {
    return (
      <EmptyState message="Paste a URL in the box above or right-click a link and select Analyze with Hookline." />
    );
  }

  return <WaitingState />;
}

// ─── Context Strip ────────────────────────────────────────────────────────────

function ContextStrip({ subject, sender, label }: { subject: string; sender: string; label: string }) {
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
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{label}</div>
      {subject && (
        <div
          style={{
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "2px",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: label === "Analyzing URL" ? "var(--font-mono)" : "inherit",
          }}
        >
          {subject}
        </div>
      )}
      {sender && (
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-secondary)",
            fontFamily: "var(--font-mono)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sender}
        </div>
      )}
    </div>
  );
}

// ─── Verdict Card ─────────────────────────────────────────────────────────────

interface VerdictCardProps {
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore?: number;
  evidence: EvidenceItem[];
}

function VerdictCard({ verdict, confidence, riskScore, evidence }: VerdictCardProps) {
  const isRisky = verdict === "high_risk" || verdict === "suspicious";
  const isSafe = verdict === "safe";

  const color = verdict === "high_risk"
    ? "var(--risk-high)"
    : verdict === "suspicious"
    ? "var(--risk-medium)"
    : "var(--risk-low)";

  const bg = verdict === "high_risk"
    ? "var(--risk-high-bg)"
    : verdict === "suspicious"
    ? "var(--risk-medium-bg)"
    : "var(--risk-low-bg)";

  const headline = verdict === "high_risk"
    ? "HIGH RISK"
    : verdict === "suspicious"
    ? "SUSPICIOUS"
    : "LOOKS SAFE";

  // Build reason lines — show what contributed to the verdict
  const flaggedEvidence = evidence.filter((e) => e.severity === "high" || e.severity === "medium");
  const cleanSignals: string[] = [];
  const riskSignals: string[] = flaggedEvidence.slice(0, 4).map((e) => e.title);

  if (isSafe) {
    if (riskScore !== undefined && riskScore < 20) cleanSignals.push("No suspicious patterns detected");
    if (evidence.length === 0) cleanSignals.push("No impersonation detected");
    cleanSignals.push("No suspicious links found");
    if (typeof riskScore === "number" && riskScore < 10) cleanSignals.push("No unusual domain activity");
  }

  const signals = isSafe ? cleanSignals : riskSignals;

  return (
    <div
      style={{
        margin: "12px 12px 0",
        padding: "16px",
        backgroundColor: bg,
        border: `1px solid ${color}40`,
        borderRadius: "10px",
      }}
    >
      {/* Verdict headline */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <VerdictIcon verdict={verdict} color={color} />
          <div>
            <div style={{ fontSize: "17px", fontWeight: 700, color }}>{headline}</div>
            {typeof riskScore === "number" && (
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>
                Risk score {riskScore}/100 · {confidence} confidence
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Why line */}
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
        {isSafe ? "Why Hookline trusts this" : "Why Hookline flagged this"}
      </div>

      {/* Signal list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {signals.length > 0 ? (
          signals.map((sig, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <span style={{ color, flexShrink: 0, fontSize: "14px", lineHeight: 1.3 }}>
                {isSafe ? "✓" : "✗"}
              </span>
              <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.4 }}>
                {sig}
              </span>
            </div>
          ))
        ) : (
          <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {isSafe ? "No risk indicators detected" : "Analysis complete"}
          </div>
        )}
      </div>
    </div>
  );
}

function VerdictIcon({ verdict, color }: { verdict: RiskLevel; color: string }) {
  const isRisky = verdict === "high_risk" || verdict === "suspicious";
  return (
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
      {isRisky ? (
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
  );
}

// ─── Recommendation ───────────────────────────────────────────────────────────

function Recommendation({ verdict }: { verdict: RiskLevel }) {
  const message =
    verdict === "high_risk"
      ? "Do not click any links or enter credentials. If this claims to be from a company, go to their website directly by typing the address in your browser."
      : verdict === "suspicious"
      ? "Proceed with caution. Verify through a different channel before clicking links or providing any information."
      : "This appears legitimate. Standard caution still applies — even trusted senders can be impersonated.";

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
        Recommendation
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

// ─── States ───────────────────────────────────────────────────────────────────

function WaitingState() {
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

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

function LoadingState() {
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
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Analyzing...</p>
    </div>
  );
}
