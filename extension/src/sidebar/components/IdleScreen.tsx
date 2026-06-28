import React from "react";

interface IdleScreenProps {
  currentUrl: string | null;
}

export default function IdleScreen({ currentUrl }: IdleScreenProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "32px 20px",
        textAlign: "center",
        gap: "16px",
      }}
    >
      {/* ── Shield Icon ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          backgroundColor: "rgba(124, 92, 252, 0.12)",
          border: "1px solid rgba(124, 92, 252, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 3L5 8V15C5 21.5 9.8 27.5 16 29C22.2 27.5 27 21.5 27 15V8L16 3Z"
            fill="rgba(124,92,252,0.15)"
            stroke="var(--brand-purple)"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M16 11V17M13 14H19"
            stroke="var(--brand-purple)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* ── Title ───────────────────────────────────────────────────────── */}
      <div>
        <p
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "var(--text-primary)",
            marginBottom: "6px",
          }}
        >
          Hookline is ready
        </p>
        <p
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            lineHeight: 1.5,
            maxWidth: "220px",
          }}
        >
          Open an email in Gmail or right-click a link to analyze it.
        </p>
      </div>

      {/* ── Capability List ──────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          marginTop: "8px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {capabilities.map((cap) => (
          <CapabilityRow key={cap.label} icon={cap.icon} label={cap.label} />
        ))}
      </div>
    </div>
  );
}

function CapabilityRow({ icon, label }: { icon: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 14px",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "8px",
        textAlign: "left",
      }}
    >
      <span style={{ fontSize: "15px" }}>{icon}</span>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

const capabilities = [
  { icon: "✉️", label: "Gmail email analysis" },
  { icon: "🔗", label: "URL & domain analysis" },
  { icon: "🛡️", label: "Typosquatting detection" },
  { icon: "📋", label: "WHOIS & DNS intelligence" },
  { icon: "🔍", label: "SPF / DKIM verification" },
];
