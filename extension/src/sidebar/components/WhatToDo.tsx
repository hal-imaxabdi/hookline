import React from "react";
import type { CategoryLabel, RiskLevel } from "../../shared/types";
import type { ReportLink } from "../../shared/settings";

import { ADVICE } from "../../shared/advice";
export { ADVICE };

export default function WhatToDo({ category, verdict, links }: { category: CategoryLabel; verdict: RiskLevel; links: ReportLink[] }) {
  if (verdict !== "suspicious" && verdict !== "high_risk") return null;
  const tips = ADVICE[category];
  return (
    <div style={{ margin: "12px 12px 0" }}>
      <div style={label}>What to do</div>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "8px" }}>
          {tips.map((t) => (
            <li key={t} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "12.5px", lineHeight: 1.5, color: "var(--text-primary)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px" }}>
                <rect width="16" height="16" rx="5" fill="var(--brand-purple-light)" />
                <path d="m4.5 8.2 2.3 2.3 4.7-5" stroke="var(--brand-blue)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t}</span>
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <>
            <div style={{ ...label, padding: "12px 0 6px" }}>Report it</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {links.map((l) => (
                <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: "var(--brand-blue)", textDecoration: "none" }}>
                  {l.label} ↗
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const label: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "8px" };
