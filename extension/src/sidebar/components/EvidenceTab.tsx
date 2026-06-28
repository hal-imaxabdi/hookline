import React, { useState } from "react";
import { SidebarState, EvidenceItem, DomainInfo } from "../../shared/types";

interface EvidenceTabProps {
  state: SidebarState;
}

export default function EvidenceTab({ state }: EvidenceTabProps) {
  if (state.isLoading) return <Loading />;

  const isEmail = state.mode === "email" && state.emailAnalysis;
  const isUrl = state.mode === "url" && state.urlAnalysis;

  if (!isEmail && !isUrl) {
    return <EmptyState message="Open an email or analyze a URL to see evidence." />;
  }

  const analysis = isEmail ? state.emailAnalysis! : state.urlAnalysis!;
  const domainInfo = analysis.domainInfo ?? null;
  const evidence = analysis.evidence ?? [];

  return (
    <div style={{ padding: "0 0 16px" }}>
      <DomainSection domainInfo={domainInfo} analysis={analysis} isEmail={!!isEmail} />
      {domainInfo && <AuthSection domainInfo={domainInfo} />}
      {evidence.length > 0 && <SignalsSection evidence={evidence} />}
    </div>
  );
}

// ─── Domain Analysis ──────────────────────────────────────────────────────────

function DomainSection({ domainInfo, analysis, isEmail }: {
  domainInfo: DomainInfo | null;
  analysis: any;
  isEmail: boolean;
}) {
  const domain = isEmail
    ? (analysis.senderDomain ?? analysis.senderEmail?.split("@")[1] ?? "—")
    : (analysis.domain ?? "—");

  const registered = domainInfo?.createdDate ?? "Unknown";
  const daysAgo = domainInfo?.createdDaysAgo;
  const registrar = domainInfo?.registrar ?? "Unknown";
  const isNew = domainInfo?.isNewDomain ?? false;

  let ageDisplay = "Unknown";
  if (daysAgo !== null && daysAgo !== undefined) {
    if (daysAgo < 90) ageDisplay = `${daysAgo} days old`;
    else if (daysAgo < 730) ageDisplay = `${Math.floor(daysAgo / 30)} months old`;
    else ageDisplay = `${Math.floor(daysAgo / 365)} years old`;
  } else if (registered !== "Unknown") {
    ageDisplay = registered;
  }

  const sslIssuer = domainInfo?.sslIssuer ?? null;
  const sslOrgValidated = domainInfo?.sslHasOrgValidation ?? false;

  return (
    <div>
      <SectionLabel>Domain Analysis</SectionLabel>
      <Card>
        <DataRow label="Domain" value={domain} mono />
        <DataRow
          label="Domain Age"
          value={ageDisplay}
          valueColor={isNew ? "var(--risk-medium)" : undefined}
          flag={isNew}
        />
        <DataRow label="Registrar" value={registrar} />
        {sslIssuer && (
          <DataRow
            label="Certificate"
            value={`${sslIssuer} · ${sslOrgValidated ? "OV/EV" : "Domain only (DV)"}`}
          />
        )}
      </Card>
    </div>
  );
}

// ─── Auth Section ─────────────────────────────────────────────────────────────

function AuthSection({ domainInfo }: { domainInfo: DomainInfo }) {
  const spf = domainInfo.spfStatus ?? "unknown";
  const dkim = domainInfo.dkimStatus ?? "unknown";
  const dmarc = domainInfo.dmarcStatus ?? "unknown";

  return (
    <div>
      <SectionLabel>Email Authentication</SectionLabel>
      <Card>
        <AuthRow label="SPF" status={spf} />
        <AuthRow label="DKIM" status={dkim} />
        <AuthRow label="DMARC" status={dmarc} />
      </Card>
    </div>
  );
}

function AuthRow({ label, status }: { label: string; status: string }) {
  const isPass = status === "pass";
  const isMissing = status === "missing" || status === "fail";
  const color = isPass
    ? "var(--risk-low)"
    : isMissing
    ? "var(--risk-medium)"
    : "var(--text-muted)";
  const text = isPass ? "Present" : isMissing ? "Missing" : "Unknown";

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 14px",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: 600, color }}>{text}</span>
    </div>
  );
}

// ─── Signals Section ──────────────────────────────────────────────────────────

function SignalsSection({ evidence }: { evidence: EvidenceItem[] }) {
  const sorted = [...evidence].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div>
      <SectionLabel>Detection Signals ({evidence.length})</SectionLabel>
      <div style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {sorted.map((item, i) => (
          <SignalRow key={i} item={item} />
        ))}
      </div>
    </div>
  );
}

function SignalRow({ item }: { item: EvidenceItem }) {
  const [expanded, setExpanded] = useState(false);

  const color =
    item.severity === "high"
      ? "var(--risk-high)"
      : item.severity === "medium"
      ? "var(--risk-medium)"
      : "var(--text-muted)";

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "8px",
      overflow: "hidden",
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "flex-start",
          gap: "10px",
          padding: "10px 12px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ color, flexShrink: 0, fontSize: "14px", lineHeight: 1.4 }}>✗</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>
            {item.title}
          </div>
          {!expanded && (
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.4 }}>
              {item.description}
            </div>
          )}
        </div>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          style={{ flexShrink: 0, transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <path d="M3 5l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {expanded && (
        <div style={{
          padding: "8px 12px 10px 34px",
          fontSize: "12px",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
          borderTop: "1px solid var(--border-subtle)",
        }}>
          <p style={{ margin: 0 }}>{item.description}</p>
          {item.detail && (
            <p style={{
              margin: "6px 0 0",
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--text-muted)",
              wordBreak: "break-all",
            }}>
              {item.detail}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: "10px",
      fontWeight: 600,
      color: "var(--text-muted)",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      padding: "14px 14px 6px",
    }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "8px",
      overflow: "hidden",
      margin: "0 12px 10px",
    }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, mono = false, valueColor, flag }: {
  label: string;
  value: string;
  mono?: boolean;
  valueColor?: string;
  flag?: boolean;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "8px 14px",
      borderBottom: "1px solid var(--border-subtle)",
      gap: "12px",
    }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {flag && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1L1 10h9L5.5 1z" stroke="var(--risk-medium)" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        )}
        <span style={{
          fontSize: "12px",
          fontFamily: mono ? "var(--font-mono)" : "inherit",
          color: valueColor ?? "var(--text-primary)",
          textAlign: "right",
          wordBreak: "break-all",
        }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{message}</p>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ padding: "40px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Loading evidence...</p>
    </div>
  );
}
