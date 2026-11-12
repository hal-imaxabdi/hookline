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
        <ul style={{ margin: 0, paddingLeft: "18px", display: "flex", flexDirection: "column", gap: "6px" }}>
          {tips.map((t) => (
            <li key={t} style={{ fontSize: "12px", lineHeight: 1.5, color: "var(--text-secondary)" }}>{t}</li>
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

const label: React.CSSProperties = { fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" };
