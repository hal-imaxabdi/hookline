/**
 * UrlTestBar — Phase 5/6
 *
 * A manual analyze box so you can paste ANY URL (e.g. rows from a phishing
 * dataset like br-icloud.com.br) and get a verdict without needing a real
 * clickable <a> link on a page. Bare domains are auto-prefixed with https://.
 */

import React, { useState } from "react";

interface UrlTestBarProps {
  onAnalyze: (url: string) => void;
}

export default function UrlTestBar({ onAnalyze }: UrlTestBarProps) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onAnalyze(trimmed);
  };

  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        padding: "10px 12px",
        borderBottom: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-surface)",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder="Paste a URL to analyze…"
        spellCheck={false}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "7px 10px",
          fontSize: "12px",
          fontFamily: "var(--font-mono)",
          color: "var(--text-primary)",
          backgroundColor: "var(--bg-base)",
          border: "1px solid var(--border-default)",
          borderRadius: "6px",
          outline: "none",
        }}
      />
      <button
        onClick={submit}
        style={{
          flexShrink: 0,
          padding: "7px 14px",
          fontSize: "12px",
          fontWeight: 600,
          color: "#fff",
          backgroundColor: "var(--brand-purple)",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        Analyze
      </button>
    </div>
  );
}
