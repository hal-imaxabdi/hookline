import React from "react";
import { HOOKLINE_VERSION } from "../../shared/version";

/**
 * Header Component
 *
 * The top bar of the Hookline sidebar.
 * Shows: logo + "HOOKLINE" wordmark + version badge + settings + close.
 * Version bumps with each phase so you can always tell which build is loaded.
 */
export default function Header({ onSettings, settingsOpen }: { onSettings: () => void; settingsOpen: boolean }) {
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
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
        <Wordmark />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", color: "var(--text-muted)" }}>v{HOOKLINE_VERSION}</span>
      </div>

      {/* ── Action Icons ─────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        <IconButton onClick={onSettings} title={settingsOpen ? "Back" : "Settings"}>
          {settingsOpen ? <BackIcon /> : <GearIcon />}
        </IconButton>
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

/** Same wordmark as the web demo: the second "o" is a magnifying glass. */
function Wordmark() {
  return (
    <span
      aria-label="Hookline"
      style={{ display: "inline-flex", alignItems: "baseline", fontWeight: 650, fontSize: "19px", letterSpacing: "-0.04em", color: "var(--ink)", lineHeight: 1 }}
    >
      <span aria-hidden="true">ho</span>
      <svg viewBox="0 0 16 16" aria-hidden="true" style={{ width: "0.6em", height: "0.6em", margin: "0 0.04em 0 0.03em", overflow: "visible" }}>
        <circle cx="7.2" cy="7.2" r="5.6" fill="none" stroke="#2F5BFF" strokeWidth="2.6" />
        <path d="M11.4 11.4l3.4 3.4" stroke="#2F5BFF" strokeWidth="2.8" strokeLinecap="round" />
      </svg>
      <span aria-hidden="true">kline</span>
    </span>
  );
}


function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
