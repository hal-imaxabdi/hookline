/**
 * Links Tab — Phase 3
 *
 * Now shows real extracted + analyzed links from EmailAnalysisResult.
 */

import React, { useState } from "react";
import { SidebarState, AnalyzedLink, RiskLevel } from "../../shared/types";

interface LinksTabProps {
  state: SidebarState;
}

export default function LinksTab({ state }: LinksTabProps) {
  if (state.isLoading) return <Loading />;

  const links = state.emailAnalysis?.links ?? [];

  if (links.length === 0) {
    return <EmptyState hasAnalysis={!!state.emailAnalysis} />;
  }

  const highRisk = links.filter((l) => l.verdict === "high_risk").length;
  const suspicious = links.filter((l) => l.verdict === "suspicious").length;
  const safe = links.filter((l) => l.verdict === "safe").length;

  return (
    <div style={{ padding: "12px 12px 16px" }}>
      {/* Stats bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: "6px",
          marginBottom: "12px",
        }}
      >
        <StatCell label="Total" value={links.length} color="var(--text-primary)" />
        <StatCell label="High Risk" value={highRisk} color="var(--risk-high)" />
        <StatCell label="Suspicious" value={suspicious} color="var(--risk-medium)" />
        <StatCell label="Safe" value={safe} color="var(--risk-low)" />
      </div>

      {/* Link cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {links.map((link, i) => (
          <LinkCard key={i} link={link} />
        ))}
      </div>
    </div>
  );
}

// ─── Stat Cell ────────────────────────────────────────────────────────────────

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        padding: "8px 6px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

// ─── Link Card ────────────────────────────────────────────────────────────────

function LinkCard({ link }: { link: AnalyzedLink }) {
  const [expanded, setExpanded] = useState(false);

  const verdictColor =
    link.verdict === "high_risk"
      ? "var(--risk-high)"
      : link.verdict === "suspicious"
      ? "var(--risk-medium)"
      : "var(--risk-low)";

  const verdictLabel =
    link.verdict === "high_risk" ? "HIGH RISK" : link.verdict === "suspicious" ? "SUSPICIOUS" : "SAFE";

  const flags = link.flags ?? [];

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
        {/* Verdict dot */}
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            backgroundColor: verdictColor,
            flexShrink: 0,
            marginTop: "4px",
          }}
        />

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Domain */}
          <div
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-primary)",
              fontFamily: "var(--font-mono)",
              marginBottom: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {link.domain}
          </div>
          {/* Link text */}
          {link.text && (
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {link.text}
            </div>
          )}
        </div>

        {/* Verdict badge */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 600,
            color: verdictColor,
            backgroundColor: `${verdictColor}15`,
            border: `1px solid ${verdictColor}30`,
            borderRadius: "4px",
            padding: "2px 6px",
            flexShrink: 0,
            letterSpacing: "0.04em",
          }}
        >
          {verdictLabel}
        </div>

        {/* Chevron */}
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M3 5l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "10px 12px" }}>
          {/* Full URL */}
          <div
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-muted)",
              wordBreak: "break-all",
              marginBottom: flags.length > 0 ? "8px" : 0,
            }}
          >
            {link.href}
          </div>

          {/* Risk flags */}
          {flags.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {flags.map((flag, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: verdictColor, flexShrink: 0 }}>→</span>
                  <span>{flag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ hasAnalysis }: { hasAnalysis: boolean }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {hasAnalysis
          ? "No external links found in this email."
          : "Open an email and Hookline will extract and analyze all links."}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Extracting links...</div>
    </div>
  );
}
