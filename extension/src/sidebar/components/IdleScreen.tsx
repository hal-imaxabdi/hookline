import React from "react";

export default function IdleScreen({ isGmail }: { isGmail: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", textAlign: "center", gap: "16px" }}>
      <div style={{ width: "64px", height: "64px", borderRadius: "16px", backgroundColor: "rgba(124, 92, 252, 0.12)", border: "1px solid rgba(124, 92, 252, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 3L5 8V15C5 21.5 9.8 27.5 16 29C22.2 27.5 27 21.5 27 15V8L16 3Z" fill="rgba(124,92,252,0.15)" stroke="var(--brand-purple)" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="M16 11V17M13 14H19" stroke="var(--brand-purple)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px" }}>Hookline is ready</p>
        <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: "240px" }}>
          {isGmail
            ? "Open an email and Hookline will check it for phishing and job scams."
            : "Check this page for shopping or job scams, paste a URL, or right-click a link."}
        </p>
      </div>
      <div style={{ width: "100%", marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {CAPABILITIES.map((c) => (
          <div key={c.label} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", textAlign: "left" }}>
            <span style={{ fontSize: "15px" }} aria-hidden="true">{c.icon}</span>
            <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAPABILITIES = [
  { icon: "✉️", label: "Gmail: phishing, spoofing and job-scam messages" },
  { icon: "🛒", label: "Web pages: fake-store signals (on demand)" },
  { icon: "🔗", label: "Look-alike, typosquat and homoglyph domains" },
  { icon: "📋", label: "Domain age & DNS via optional local backend" },
  { icon: "🛡️", label: "Optional Safe Browsing / URLhaus (off by default)" },
];
