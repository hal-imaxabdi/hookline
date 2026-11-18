import React from "react";

/** First screen: what Hookline will do here. Same look as the web demo's empty state. */
export default function IdleScreen({ isGmail }: { isGmail: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", padding: "28px 16px", gap: "18px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "44px", height: "44px", margin: "0 auto 12px", borderRadius: "12px", backgroundColor: "var(--brand-purple-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand-blue)" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="m20 20-4.5-4.5" />
          </svg>
        </div>
        <p style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>Nothing checked yet</p>
        <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: 1.5, maxWidth: "260px", margin: "0 auto" }}>
          {isGmail
            ? "Open an email and Hookline checks it automatically."
            : "Paste a link above, or check this page for shopping and job scams."}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {CAPABILITIES.map((c, i) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "10px" }}>
            <span style={{ flexShrink: 0, width: "22px", height: "22px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, color: "var(--brand-blue)", backgroundColor: "var(--brand-purple-light)" }}>
              {i + 1}
            </span>
            <span style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>{c}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CAPABILITIES = [
  "Gmail: phishing, spoofed senders and job-scam messages",
  "Web pages: fake-store signals, on demand",
  "Look-alike domains, like paypa1.com",
  "Optional: domain age via a local backend, Safe Browsing and URLhaus (off by default)",
];
