import React from "react";
import { CATEGORY_DISPLAY, type CategoryResult, type Confidence, type EvidenceItem, type RiskLevel, type TabState } from "../../shared/types";
import type { Settings } from "../../shared/settings";
import { currentAnalysis } from "../model";
import WhatToDo from "./WhatToDo";

export default function SummaryTab({ state, settings }: { state: TabState | null; settings: Settings }) {
  if (state?.isLoading) return <LoadingState />;
  const a = currentAnalysis(state);
  if (!a) {
    if (state?.mode === "email") return state.extractionFailure ? null : <WaitingState />;
    return <EmptyState message="Paste a URL above, click “Analyze this page”, or right-click a link → Analyze link with Hookline." />;
  }

  const r = a.result;
  const ctx =
    a.kind === "email"
      ? { label: "Analyzing email", title: a.result.subject, sub: a.result.senderEmail, mono: false }
      : a.kind === "page"
      ? { label: "Analyzing page", title: a.result.pageTitle || a.result.domain, sub: a.result.url, mono: false }
      : { label: "Analyzing URL", title: a.result.domain, sub: a.result.url, mono: true };

  const noLinksFlagged = a.kind !== "email" || a.result.links.every((l) => !l.isSuspicious);

  return (
    <div style={{ padding: "0 0 16px" }}>
      <ContextStrip {...ctx} />
      {"error" in r && r.error ? (
        <EmptyState message={r.error} />
      ) : (
        <>
          <VerdictCard verdict={r.verdict} confidence={r.confidence} riskScore={r.riskScore} evidence={r.evidence} category={r.category} noLinksFlagged={noLinksFlagged} allowlisted={a.kind !== "email" && a.result.allowlisted} />
          {settings.showWhatToDo && <WhatToDo category={r.category.label} verdict={r.verdict} links={settings.reportLinks} />}
          <Recommendation verdict={r.verdict} />
        </>
      )}
    </div>
  );
}

function ContextStrip({ label, title, sub, mono }: { label: string; title: string; sub: string; mono: boolean }) {
  return (
    <div style={{ margin: "12px 12px 0", padding: "10px 12px", backgroundColor: "var(--bg-surface)", borderRadius: "8px", border: "1px solid var(--border-subtle)" }}>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>{label}</div>
      {title && <div style={{ ...ellipsis, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "2px", fontFamily: mono ? "var(--font-mono)" : "inherit" }}>{title}</div>}
      {sub && <div style={{ ...ellipsis, fontSize: "11px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{sub}</div>}
    </div>
  );
}

interface VerdictCardProps {
  verdict: RiskLevel;
  confidence: Confidence;
  riskScore: number;
  evidence: EvidenceItem[];
  category: CategoryResult;
  noLinksFlagged: boolean;
  allowlisted: boolean;
}

function VerdictCard({ verdict, confidence, riskScore, evidence, category, noLinksFlagged, allowlisted }: VerdictCardProps) {
  const isSafe = verdict === "safe";
  const color = verdict === "high_risk" ? "var(--risk-high)" : verdict === "suspicious" ? "var(--risk-medium)" : "var(--risk-low)";
  const bg = verdict === "high_risk" ? "var(--risk-high-bg)" : verdict === "suspicious" ? "var(--risk-medium-bg)" : "var(--risk-low-bg)";
  const headline = verdict === "high_risk" ? "HIGH RISK" : verdict === "suspicious" ? "SUSPICIOUS" : "LOOKS SAFE";

  let signals: string[];
  if (isSafe) {
    // Only claim what was actually checked and true (v1.0.0 always said "No suspicious links").
    signals = [];
    if (evidence.length === 0) signals.push("No phishing or scam patterns matched");
    else signals.push(`Only minor signals (score ${riskScore}/100) — not enough to flag`);
    if (noLinksFlagged) signals.push("No suspicious links found");
    if (allowlisted) signals.push("Domain is among the 10,000 most-visited sites (Tranco)");
  } else {
    const reasons = category.label !== "none" ? category.reasons : [];
    const rest = evidence.filter((e) => !reasons.includes(e.title)).sort((a, b) => sevRank(a) - sevRank(b)).map((e) => e.title);
    signals = [...reasons, ...rest].slice(0, 5);
  }

  return (
    <div style={{ margin: "12px 12px 0", padding: "16px", backgroundColor: bg, border: `1px solid ${color}40`, borderRadius: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <VerdictIcon risky={!isSafe} color={color} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "17px", fontWeight: 700, color }}>{headline}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "1px" }}>Risk score {riskScore}/100 · {confidence} confidence</div>
        </div>
      </div>

      {!isSafe && (
        <div style={{ marginBottom: "12px", fontSize: "12px", color: "var(--text-secondary)" }}>
          Scam type:{" "}
          <span style={{ fontWeight: 600, color: category.label === "none" ? "var(--text-secondary)" : color }}>{CATEGORY_DISPLAY[category.label]}</span>
        </div>
      )}

      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
        {isSafe ? "Why Hookline didn't flag this" : "Why Hookline flagged this"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {signals.map((sig) => (
          <div key={sig} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
            <span style={{ color, flexShrink: 0, fontSize: "14px", lineHeight: 1.3 }}>{isSafe ? "✓" : "✗"}</span>
            <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.4 }}>{sig}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const sevRank = (e: EvidenceItem) => (e.severity === "high" ? 0 : e.severity === "medium" ? 1 : 2);

function VerdictIcon({ risky, color }: { risky: boolean; color: string }) {
  return (
    <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: `${color}20`, border: `1px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {risky ? (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M9 2L1.5 15h15L9 2z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 7v4M9 13v.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="7" stroke={color} strokeWidth="1.5" />
          <path d="M6 9l2 2 4-4" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function Recommendation({ verdict }: { verdict: RiskLevel }) {
  if (verdict !== "safe") return null;
  return (
    <div style={{ margin: "12px 12px 0", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
      <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
        No red flags matched — but Hookline only checks known patterns. Brand-new scams and hacked legitimate sites can look clean. If something feels too good to be true or too urgent, verify it another way.
      </p>
    </div>
  );
}

function WaitingState() {
  return <EmptyState message="Open an email in Gmail — Hookline will scan it automatically." />;
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
    <div style={{ padding: "48px 20px", textAlign: "center" }}>
      <p className="animate-pulse-subtle" style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Analyzing…</p>
    </div>
  );
}

const ellipsis: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
