/**
 * UrlTestBar — paste any URL to analyze it, or analyze the current page
 * (shopping/job-scam checks). Bare domains are prefixed with https://.
 */

import React, { useState } from "react";

interface UrlTestBarProps {
  onAnalyze: (url: string) => void;
  /** Omitted on Gmail, where the open email is analyzed instead. */
  onAnalyzePage?: () => void;
}

export default function UrlTestBar({ onAnalyze, onAnalyzePage }: UrlTestBarProps) {
  const [value, setValue] = useState("");
  const submit = () => {
    const trimmed = value.trim();
    if (trimmed) onAnalyze(trimmed);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "10px 12px", borderBottom: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-surface)" }}>
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Paste a URL to analyze…"
          aria-label="URL to analyze"
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, padding: "7px 10px", fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--text-primary)", backgroundColor: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: "6px", outline: "none" }}
        />
        <button onClick={submit} style={primary}>Analyze</button>
      </div>
      {onAnalyzePage && (
        <button onClick={onAnalyzePage} style={secondary}>Analyze this page for shopping / job scams</button>
      )}
    </div>
  );
}

const primary: React.CSSProperties = { flexShrink: 0, padding: "7px 14px", fontSize: "12px", fontWeight: 600, color: "#fff", backgroundColor: "var(--brand-purple)", border: "none", borderRadius: "6px", cursor: "pointer" };
const secondary: React.CSSProperties = { padding: "6px 10px", fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", backgroundColor: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: "6px", cursor: "pointer", textAlign: "left" };
