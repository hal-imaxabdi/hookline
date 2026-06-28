/**
 * WHOIS Tab — Phase 7
 *
 * Renders REAL domain registration data from the backend (RDAP), stored on
 * state.urlAnalysis.domainInfo / state.emailAnalysis.domainInfo.
 *
 * DNS + SSL sections remain placeholders until Phase 8.
 */

import React from "react";
import { SidebarState, DomainInfo } from "../../shared/types";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 14px 6px" }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden", margin: "0 12px 10px" }}>
      {children}
    </div>
  );
}

function DataRow({ label, value, mono = false, valueColor, flag }: {
  label: string; value: string; mono?: boolean; valueColor?: string; flag?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", gap: "12px" }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
        {flag && (
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <path d="M5.5 1L1 10h9L5.5 1z" stroke="var(--risk-medium)" strokeWidth="1.1" strokeLinejoin="round" />
          </svg>
        )}
        <span style={{ fontSize: "12px", fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", color: valueColor ?? "var(--text-primary)", textAlign: "right", wordBreak: "break-all" }}>
          {value}
        </span>
      </div>
    </div>
  );
}

function ReputationBar({ score }: { score: number }) {
  const color = score < 30 ? "var(--risk-high)" : score < 60 ? "var(--risk-medium)" : "var(--risk-low)";
  return (
    <div style={{ padding: "10px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Reputation (from domain age)</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{score}/100</span>
      </div>
      <div style={{ height: "4px", backgroundColor: "var(--bg-elevated)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, backgroundColor: color, borderRadius: "2px", transition: "width 0.6s ease" }} />
      </div>
    </div>
  );
}

const REP_TO_SCORE: Record<string, number> = {
  very_low: 10, low: 35, medium: 65, high: 88, unknown: 50,
};

function authText(status: string): string {
  if (status === "pass") return "Present";
  if (status === "missing") return "Missing";
  return "Unknown";
}

function authColor(status: string): string {
  if (status === "pass") return "var(--risk-low)";
  if (status === "missing") return "var(--risk-medium)";
  return "var(--text-muted)";
}

function PlaceholderNote({ text }: { text: string }) {
  return <div style={{ padding: "10px 14px", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>{text}</div>;
}

export default function WhoisTab({ state }: WhoisTabProps) {
  const di: DomainInfo | null =
    state.urlAnalysis?.domainInfo ?? state.emailAnalysis?.domainInfo ?? null;
  const domain =
    di?.domain ?? state.urlAnalysis?.domain ?? state.emailAnalysis?.senderDomain ?? "—";
  const note = (di as (DomainInfo & { note?: string }) | null)?.note;

  // ── No backend data at all ───────────────────────────────────────────────
  const hasData =
    di &&
    (di.createdDate ||
      di.registrar !== "Unknown" ||
      (di.mx && di.mx.length > 0) ||
      di.sslIssuer ||
      di.spfStatus !== "unknown");

  if (!di || !hasData) {
    return (
      <div className="animate-fade-in" style={{ padding: "28px 18px", textAlign: "center" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
          No WHOIS data yet
        </p>
        <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "260px", margin: "0 auto" }}>
          Domain registration data comes from the local Phase 7 backend. Start it
          with <code>uvicorn main:app --port 8000</code> in the <code>backend/</code>
          folder, then analyze again.
        </p>
        {note && (
          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "12px", fontStyle: "italic" }}>
            Backend said: {note}
          </p>
        )}
      </div>
    );
  }

  const isNew = di.isNewDomain;
  const ageText =
    di.createdDaysAgo == null
      ? "Unknown"
      : `${di.createdDaysAgo} day${di.createdDaysAgo === 1 ? "" : "s"} ago`;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: "16px" }}>
      <SectionLabel>WHOIS Registration (RDAP)</SectionLabel>
      <Card>
        <DataRow label="Domain" value={domain} mono />
        <DataRow
          label="Registered"
          value={di.createdDate ? di.createdDate.slice(0, 10) : "Unknown"}
          valueColor={isNew ? "var(--risk-high)" : undefined}
          flag={isNew}
        />
        <DataRow
          label="Domain age"
          value={ageText}
          valueColor={isNew ? "var(--risk-high)" : "var(--risk-low)"}
          flag={isNew}
        />
        <DataRow label="Registrar" value={di.registrar} />
      </Card>

      <SectionLabel>Reputation</SectionLabel>
      <Card>
        <ReputationBar score={REP_TO_SCORE[di.reputationScore] ?? 50} />
      </Card>

      <SectionLabel>Email Authentication (DNS)</SectionLabel>
      <Card>
        <DataRow
          label="SPF"
          value={authText(di.spfStatus)}
          valueColor={authColor(di.spfStatus)}
          flag={di.spfStatus === "missing"}
        />
        <DataRow
          label="DMARC"
          value={
            di.dmarcStatus === "pass"
              ? `Present${di.dmarcPolicy ? ` · p=${di.dmarcPolicy}` : ""}`
              : authText(di.dmarcStatus ?? "unknown")
          }
          valueColor={authColor(di.dmarcStatus ?? "unknown")}
          flag={di.dmarcStatus === "missing"}
        />
        <DataRow
          label="DKIM"
          value={di.dkimStatus === "pass" ? `Found · ${di.dkimSelector}` : "Not detected"}
          valueColor={di.dkimStatus === "pass" ? "var(--risk-low)" : "var(--text-muted)"}
        />
      </Card>

      <SectionLabel>DNS Records</SectionLabel>
      <Card>
        {(di.mx ?? []).length > 0 ? (
          (di.mx ?? []).slice(0, 3).map((m, i) => <DataRow key={`mx${i}`} label={i === 0 ? "MX" : ""} value={m} mono />)
        ) : (
          <DataRow label="MX" value="None" valueColor="var(--text-muted)" />
        )}
        {(di.a ?? []).length > 0 ? (
          (di.a ?? []).slice(0, 3).map((ip, i) => <DataRow key={`a${i}`} label={i === 0 ? "A" : ""} value={ip} mono />)
        ) : (
          <DataRow label="A" value="None" valueColor="var(--text-muted)" />
        )}
      </Card>

      <SectionLabel>SSL Certificate</SectionLabel>
      <Card>
        {di.sslIssuer ? (
          <>
            <DataRow label="Issuer" value={di.sslIssuer} />
            <DataRow
              label="Validation"
              value={di.sslHasOrgValidation ? "Organization (OV/EV)" : "Domain only (DV)"}
              valueColor={di.sslHasOrgValidation ? "var(--risk-low)" : "var(--risk-medium)"}
              flag={!di.sslHasOrgValidation}
            />
            {di.sslValidUntil && <DataRow label="Valid until" value={di.sslValidUntil} mono />}
          </>
        ) : (
          <PlaceholderNote text="No SSL certificate retrieved (site may be unreachable, HTTP-only, or using a self-signed cert)." />
        )}
      </Card>
    </div>
  );
}

interface WhoisTabProps {
  state: SidebarState;
}
