/**
 * Headers Tab — Phase 3
 *
 * Shows real extracted email header data from EmailAnalysisResult.
 * SPF/DKIM data is still stubbed until Phase 8 (DNS backend).
 */

import React from "react";
import { SidebarState } from "../../shared/types";

interface HeadersTabProps {
  state: SidebarState;
}

export default function HeadersTab({ state }: HeadersTabProps) {
  if (state.mode === "url") {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Email header analysis is only available when viewing a Gmail email.
        </p>
      </div>
    );
  }

  if (state.isLoading) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Extracting headers...</p>
      </div>
    );
  }

  const analysis = state.emailAnalysis;

  if (!analysis) {
    return (
      <div style={{ padding: "32px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Open an email to see header analysis.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "12px 12px 16px" }}>

      {/* Core Headers */}
      <SectionCard title="Core Headers">
        <HeaderRow label="From" value={analysis.senderEmail} mono flag={null} />
        <HeaderRow
          label="Reply-To"
          value={analysis.replyTo || "—"}
          mono
          flag={
            analysis.replyTo &&
            analysis.replyTo !== analysis.senderEmail &&
            extractDomain(analysis.replyTo) !== analysis.senderDomain
              ? "Reply-To domain differs from sender domain — common spoofing indicator"
              : null
          }
        />
        <HeaderRow label="Subject" value={analysis.subject} mono={false} flag={null} />
        <HeaderRow label="Sender Domain" value={analysis.senderDomain} mono flag={null} />
      </SectionCard>

      {/* Authentication (stub — Phase 8 wires real DNS) */}
      <SectionCard title="Email Authentication">
        <div
          style={{
            padding: "8px 10px",
            backgroundColor: "rgba(124,92,252,0.06)",
            borderRadius: "6px",
            marginBottom: "8px",
            fontSize: "11px",
            color: "var(--text-muted)",
          }}
        >
          SPF / DKIM / DMARC lookups require the DNS backend (Phase 8). Values shown are placeholders.
        </div>
        <AuthRow label="SPF" status="unknown" />
        <AuthRow label="DKIM" status="unknown" />
        <AuthRow label="DMARC" status="unknown" />
      </SectionCard>

      {/* Evidence from analyzer relevant to headers */}
      {analysis.evidence.filter(e => ["sender_mismatch", "brand_impersonation"].includes(e.type)).length > 0 && (
        <SectionCard title="Header Findings">
          {analysis.evidence
            .filter(e => ["sender_mismatch", "brand_impersonation"].includes(e.type))
            .map((item, i) => (
              <div key={i} style={{ marginBottom: i < analysis.evidence.length - 1 ? "8px" : 0 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--risk-high)", marginBottom: "2px" }}>
                  {item.title}
                </div>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  {item.description}
                </div>
                {item.detail && (
                  <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", marginTop: "4px" }}>
                    {item.detail}
                  </div>
                )}
              </div>
            ))}
        </SectionCard>
      )}

      {/* Analysis timestamp */}
      <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "8px" }}>
        Analyzed at {new Date(analysis.analyzedAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--text-secondary)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: "6px",
        }}
      >
        {title}
      </div>
      <div
        style={{
          backgroundColor: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Header Row ───────────────────────────────────────────────────────────────

function HeaderRow({
  label,
  value,
  mono,
  flag,
}: {
  label: string;
  value: string;
  mono: boolean;
  flag: string | null;
}) {
  return (
    <div
      style={{
        padding: "9px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
      }}
    >
      <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: flag ? "var(--risk-high)" : "var(--text-primary)",
          fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)",
          wordBreak: "break-all",
        }}
      >
        {value}
      </div>
      {flag && (
        <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
          ↳ {flag}
        </div>
      )}
    </div>
  );
}

// ─── Auth Row ─────────────────────────────────────────────────────────────────

function AuthRow({ label, status }: { label: string; status: "pass" | "fail" | "missing" | "unknown" }) {
  const color =
    status === "pass"
      ? "var(--risk-low)"
      : status === "fail"
      ? "var(--risk-high)"
      : status === "missing"
      ? "var(--risk-medium)"
      : "var(--text-muted)";

  const displayStatus =
    status === "pass" ? "Pass"
    : status === "fail" ? "Fail"
    : status === "missing" ? "Missing"
    : "Pending (Phase 8)";

  return (
    <div
      style={{
        padding: "9px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color,
          backgroundColor: `${color}15`,
          border: `1px solid ${color}30`,
          borderRadius: "4px",
          padding: "2px 7px",
        }}
      >
        {displayStatus}
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractDomain(email: string): string {
  if (!email) return "";
  if (email.includes("@")) return email.split("@")[1] ?? "";
  try { return new URL(email).hostname; } catch { return ""; }
}
