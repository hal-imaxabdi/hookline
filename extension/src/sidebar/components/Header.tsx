import React from "react";
import { HOOKLINE_VERSION } from "../../shared/version";

/**
 * Header Component
 *
 * The top bar of the Hookline sidebar.
 * Shows: logo + "HOOKLINE" wordmark + version badge + settings + close.
 * Version bumps with each phase so you can always tell which build is loaded.
 */
export default function Header() {
  const handleClose = () => {
    window.close();
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 14px",
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
        flexShrink: 0,
      }}
    >
      {/* ── Logo + Wordmark + Version ────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <HooklineIcon />
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          <span
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: 700,
              fontSize: "14px",
              letterSpacing: "0.08em",
              color: "var(--text-primary)",
              lineHeight: 1,
            }}
          >
            HOOKLINE
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--brand-purple)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            v{HOOKLINE_VERSION}
          </span>
        </div>
      </div>

      {/* ── Action Icons ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <IconButton onClick={handleClose} title="Close">
          <CloseIcon />
        </IconButton>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? "var(--bg-elevated)" : "transparent",
        border: "none",
        borderRadius: "6px",
        padding: "6px",
        cursor: "pointer",
        color: hovered ? "var(--text-primary)" : "var(--text-secondary)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.15s, color 0.15s",
      }}
    >
      {children}
    </button>
  );
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function HooklineIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path
        d="M14 2L4 6.5V13C4 18.5 8.4 23.6 14 25C19.6 23.6 24 18.5 24 13V6.5L14 2Z"
        fill="var(--brand-purple)"
        fillOpacity="0.2"
        stroke="var(--brand-purple)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 9V15M11 12H17"
        stroke="var(--brand-purple)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}


function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 4L12 12M12 4L4 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
