import React from "react";
import type { TabState } from "../../shared/types";
import type { Settings } from "../../shared/settings";

interface Props {
  state: TabState | null;
  settings: Settings;
  onRetryEmail: () => void;
  onRecheckBackend: () => void;
}

/** Visible status instead of silent failure: extraction problems and backend offline. */
export default function StatusBanner({ state, settings, onRetryEmail, onRecheckBackend }: Props) {
  const items: React.ReactNode[] = [];

  if (state?.extractionFailure) {
    const f = state.extractionFailure;
    items.push(
      <Banner key="fail" tone="warn" title={f.reason === "page_not_readable" ? "Couldn't read this page" : "Couldn't read this email"}>
        <p style={p}>{f.message}</p>
        {f.reason !== "page_not_readable" && <button onClick={onRetryEmail} style={btn}>Retry</button>}
      </Banner>
    );
  }

  if (settings.backendEnabled && state?.backendStatus === "offline" && state.mode !== "idle") {
    items.push(
      <Banner key="backend" tone="info" title="Backend offline — lexical checks only">
        <p style={p}>
          Domain age, DNS (SPF/DMARC) and URLhaus need the local backend at localhost:8000. Everything else still works.
          Start it with <code style={code}>uvicorn main:app --port 8000</code> in <code style={code}>backend/</code>, or turn it off in Settings.
        </p>
        <button onClick={onRecheckBackend} style={btn}>Check again</button>
      </Banner>
    );
  }

  if (!items.length) return null;
  return <div style={{ padding: "10px 12px 0", display: "flex", flexDirection: "column", gap: "8px" }}>{items}</div>;
}

function Banner({ tone, title, children }: { tone: "warn" | "info"; title: string; children: React.ReactNode }) {
  const color = tone === "warn" ? "var(--risk-medium)" : "var(--brand-blue)";
  return (
    <div role="status" style={{ border: `1px solid ${color}55`, background: `${tone === "warn" ? "rgba(232,165,74,0.10)" : "rgba(75,139,245,0.10)"}`, borderRadius: "8px", padding: "10px 12px" }}>
      <div style={{ fontSize: "12px", fontWeight: 600, color, marginBottom: "4px" }}>{title}</div>
      {children}
    </div>
  );
}

const p: React.CSSProperties = { margin: "0 0 6px", fontSize: "12px", lineHeight: 1.5, color: "var(--text-secondary)" };
const code: React.CSSProperties = { fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--text-primary)" };
const btn: React.CSSProperties = { fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", cursor: "pointer" };
