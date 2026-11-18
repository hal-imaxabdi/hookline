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
  const headline = verdict === "high_risk" ? "High risk" : verdict === "suspicious" ? "Suspicious" : "No warning signs found";

  // Safe: only claim what was actually checked and true.
  const safeNotes: string[] = [];
  if (isSafe) {
    safeNotes.push(evidence.length === 0 ? "No phishing or scam patterns matched" : `Only minor signals (score ${riskScore}/100), not enough to flag`);
    if (noLinksFlagged) safeNotes.push("No suspicious links found");
    if (allowlisted) safeNotes.push("Domain is among the 10,000 most-visited sites (Tranco)");
  }
  const signs = [...evidence].sort((x, y) => sevRank(x) - sevRank(y)).slice(0, 6);

  return (
    <div style={{ margin: "12px 12px 0", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
      <div style={{ padding: "14px 14px 12px", backgroundColor: bg }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "19px", fontWeight: 650, letterSpacing: "-0.03em", color }}>
            <span style={{ width: "9px", height: "9px", borderRadius: "50%", backgroundColor: color, flexShrink: 0 }} />
            {headline}
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "17px", fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap" }} aria-label={`Risk score ${riskScore} out of 100`}>
            {riskScore}<span style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)" }}> / 100</span>
          </div>
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "3px 0 10px 17px" }}>
          {isSafe ? "Hookline can miss scams, so no warning doesn’t mean safe." : `${category.label !== "none" ? CATEGORY_DISPLAY[category.label] : "Suspicious patterns"} · ${confidence} confidence`}
        </div>
        <div style={{ height: "5px", borderRadius: "99px", backgroundColor: "rgba(10, 15, 36, 0.08)", overflow: "hidden" }}>
          <div style={{ width: `${Math.max(2, Math.min(100, riskScore))}%`, height: "100%", borderRadius: "99px", backgroundColor: color }} />
        </div>
      </div>

      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" }}>
          {isSafe ? "What Hookline checked" : `Warning signs (${evidence.length})`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {isSafe
            ? safeNotes.map((note) => (
                <div key={note} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "1px" }}>
                    <rect width="16" height="16" rx="5" fill="var(--risk-low-bg)" />
                    <path d="m4.5 8.2 2.3 2.3 4.7-5" stroke="var(--risk-low)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.4 }}>{note}</span>
                </div>
              ))
            : signs.map((e, i) => {
                const c = e.severity === "high" ? "var(--risk-high)" : e.severity === "medium" ? "var(--risk-medium)" : "var(--brand-blue)";
                return (
                  <div key={e.ruleId + i} style={{ display: "flex", alignItems: "flex-start", gap: "9px" }}>
                    <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "99px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: "#fff", backgroundColor: c }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.45, paddingTop: "1px" }}>{e.title}</span>
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}

const sevRank = (e: EvidenceItem) => (e.severity === "high" ? 0 : e.severity === "medium" ? 1 : 2);

function Recommendation({ verdict }: { verdict: RiskLevel }) {
  if (verdict !== "safe") return null;
  return (
    <div style={{ margin: "12px 12px 0", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
      <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
        No red flags matched, but Hookline only checks known patterns. Brand-new scams and hacked legitimate sites can look clean. If something feels too good to be true or too urgent, verify it another way.
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
