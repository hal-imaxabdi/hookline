/**
 * Links Tab — every link in the open email, each run through the full URL engine.
 */

import React, { useState } from "react";
import type { AnalyzedLink, TabState } from "../../shared/types";

export default function LinksTab({ state }: { state: TabState | null }) {
  if (state?.isLoading) return <Note text="Extracting links…" />;
  if (state?.mode !== "email") return <Note text="The Links tab lists the links inside an open Gmail email." />;
  const links = state.email?.links ?? [];
  if (links.length === 0) {
    return <Note text={state.email ? "No external links found in this email." : "Open an email and Hookline will extract and analyze all links."} />;
  }

  const count = (v: AnalyzedLink["verdict"]) => links.filter((l) => l.verdict === v).length;

  return (
    <div style={{ padding: "12px 12px 16px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "6px", marginBottom: "12px" }}>
        <StatCell label="Total" value={links.length} color="var(--text-primary)" />
        <StatCell label="High risk" value={count("high_risk")} color="var(--risk-high)" />
        <StatCell label="Suspicious" value={count("suspicious")} color="var(--risk-medium)" />
        <StatCell label="No signs" value={count("safe")} color="var(--risk-low)" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {links.map((link, i) => <LinkCard key={`${link.href}-${i}`} link={link} />)}
      </div>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "8px 6px", textAlign: "center" }}>
      <div style={{ fontSize: "16px", fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "2px" }}>{label}</div>
    </div>
  );
}

function LinkCard({ link }: { link: AnalyzedLink }) {
  const [open, setOpen] = useState(false);
  const color = link.verdict === "high_risk" ? "var(--risk-high)" : link.verdict === "suspicious" ? "var(--risk-medium)" : "var(--risk-low)";
  const label = link.verdict === "high_risk" ? "HIGH RISK" : link.verdict === "suspicious" ? "SUSPICIOUS" : "NO SIGNS";

  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, flexShrink: 0, marginTop: "4px" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ ...ellipsis, fontSize: "12px", fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginBottom: "2px" }}>{link.domain}</div>
          {link.text && <div style={{ ...ellipsis, fontSize: "11px", color: "var(--text-secondary)" }}>{link.text}</div>}
        </div>
        <div style={{ fontSize: "10px", fontWeight: 600, color, border: `1px solid ${color}`, borderRadius: "4px", padding: "2px 6px", flexShrink: 0, letterSpacing: "0.04em" }}>{label}</div>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "10px 12px" }}>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--text-muted)", wordBreak: "break-all", marginBottom: link.flags.length ? "8px" : 0 }}>{link.href}</div>
          {link.flags.map((f) => (
            <div key={f} style={{ display: "flex", gap: "6px", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px" }}>
              <span style={{ color, flexShrink: 0 }}>→</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <div style={{ padding: "40px 20px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{text}</div>;
}

const ellipsis: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
