import React from "react";
import type { CategoryLabel, RiskLevel } from "../../shared/types";
import type { ReportLink } from "../../shared/settings";

/** Practical, category-specific advice (based on FTC / FBI IC3 consumer guidance). */
export const ADVICE: Record<CategoryLabel, string[]> = {
  credential_phishing: [
    "Don't click the links or open attachments. Go to the company's site by typing its address yourself.",
    "Never enter a password or code that a message asked for. Real companies don't ask by email or text.",
    "Already entered a password? Change it now on the real site and turn on two-factor authentication.",
    "In Gmail, use ⋮ → \"Report phishing\" so Google can block it for others.",
  ],
  job_scam: [
    "Don't pay anything — no training, equipment, visa or \"registration\" fees. Real employers pay you.",
    "Don't deposit a check from them or buy equipment with it; fake checks bounce days later and you owe the bank.",
    "Don't send your SSN, bank details or ID until you've verified the employer and signed a real offer.",
    "Verify the company yourself: find its official website and call the number listed there, not the one in the message.",
    "If they insist on WhatsApp/Telegram/Signal or a text-only interview, stop replying.",
    "Already sent money or bank details? Call your bank right away, then report it.",
  ],
  shopping_scam: [
    "Don't pay by crypto, gift card, wire, Zelle or bank transfer — you can't get that money back.",
    "If you buy, use a credit card or PayPal Goods & Services so you can dispute the charge.",
    "Search the store's name plus \"scam\" or \"reviews\" on another site, and check how old the domain is.",
    "Already paid? Contact your card issuer or bank to dispute the charge and keep screenshots of the order.",
  ],
  none: [
    "Hookline didn't match a specific scam pattern, but some signals were risky. Verify through another channel before you click, pay or reply.",
  ],
};

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
