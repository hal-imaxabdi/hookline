/**
 * Details Tab — Phase 4
 *
 * Shows real URL structure data from UrlAnalysisResult.
 * WHOIS / DNS / SSL sections still show "pending" until Phase 7–8.
 */

import React from "react";
import { SidebarState, DomainInfo } from "../../shared/types";

interface DetailsTabProps {
  state: SidebarState;
}

function StatusBadge({ status }: { status: "pass" | "fail" | "missing" | "warning" | "unknown" | "pending" }) {
  const config = {
    pass:    { label: "Pass",    color: "var(--risk-low)",    bg: "var(--risk-low-bg)" },
    fail:    { label: "Failed",  color: "var(--risk-high)",   bg: "var(--risk-high-bg)" },
    missing: { label: "Missing", color: "var(--risk-medium)", bg: "var(--risk-medium-bg)" },
    warning: { label: "Warning", color: "var(--risk-medium)", bg: "var(--risk-medium-bg)" },
    unknown: { label: "Unknown", color: "var(--text-muted)",  bg: "rgba(107,114,128,0.10)" },
    pending: { label: "Phase 8", color: "var(--text-muted)",  bg: "rgba(107,114,128,0.10)" },
  };
  const c = config[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 7px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, color: c.color, backgroundColor: c.bg }}>
      {status === "pass" && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {(status === "fail" || status === "missing") && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>}
      {c.label}
    </span>
  );
}

function DetailRow({ label, value, mono = false, valueColor, badge, alert }: {
  label: string; value: string; mono?: boolean; valueColor?: string;
  badge?: "pass" | "fail" | "missing" | "warning" | "unknown" | "pending"; alert?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", padding: "9px 14px", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0, paddingTop: "1px" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {badge ? <StatusBadge status={badge} /> : (
          <span style={{ fontSize: "12px", fontFamily: mono ? "var(--font-mono)" : "var(--font-ui)", color: valueColor ?? "var(--text-primary)", textAlign: "right", wordBreak: "break-all" }}>
            {value}
          </span>
        )}
        {alert && (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1.5L1 11.5h11L6.5 1.5z" stroke="var(--risk-medium)" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M6.5 5v3M6.5 9.5v.3" stroke="var(--risk-medium)" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        )}
      </div>
    </div>
  );
}

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

function PendingNote({ text }: { text: string }) {
  return (
    <div style={{ padding: "10px 14px", fontSize: "11px", color: "var(--text-muted)", fontStyle: "italic" }}>
      {text}
    </div>
  );
}

function DomainIntelRows({ di }: { di: DomainInfo }) {
  const isNew = di.isNewDomain;
  const age =
    di.createdDaysAgo == null
      ? "Unknown"
      : `${di.createdDaysAgo} day${di.createdDaysAgo === 1 ? "" : "s"}`;
  return (
    <>
      <DetailRow label="Registrar" value={di.registrar} />
      <DetailRow
        label="Registered"
        value={di.createdDate ? di.createdDate.slice(0, 10) : "Unknown"}
        valueColor={isNew ? "var(--risk-high)" : undefined}
        alert={isNew}
      />
      <DetailRow
        label="Domain age"
        value={age}
        valueColor={isNew ? "var(--risk-high)" : "var(--text-primary)"}
        alert={isNew}
      />
    </>
  );
}

function authBadge(status?: string): "pass" | "missing" | "unknown" {
  if (status === "pass") return "pass";
  if (status === "missing") return "missing";
  return "unknown";
}

function EmailAuthRows({ di }: { di: DomainInfo }) {
  return (
    <>
      <DetailRow label="SPF" value="" badge={authBadge(di.spfStatus)} />
      <DetailRow label="DKIM" value="" badge={authBadge(di.dkimStatus)} />
      <DetailRow label="DMARC" value="" badge={authBadge(di.dmarcStatus)} />
    </>
  );
}

function SslRows({ di }: { di: DomainInfo }) {
  if (!di.sslIssuer) {
    return <PendingNote text="No SSL certificate retrieved (site unreachable, HTTP-only, or self-signed)." />;
  }
  return (
    <>
      <DetailRow label="Issuer" value={di.sslIssuer} />
      <DetailRow
        label="Validation"
        value={di.sslHasOrgValidation ? "OV / EV" : "DV (domain only)"}
        valueColor={di.sslHasOrgValidation ? "var(--risk-low)" : "var(--risk-medium)"}
        alert={!di.sslHasOrgValidation}
      />
      {di.sslValidUntil && <DetailRow label="Valid until" value={di.sslValidUntil} mono />}
    </>
  );
}

export default function DetailsTab({ state }: DetailsTabProps) {
  const isEmail = state.mode === "email";
  const urlData = state.urlAnalysis as (typeof state.urlAnalysis & Record<string, unknown>) | null;

  // ── URL Mode — show real extracted URL structure ──────────────────────────
  if (state.mode === "url" && urlData) {
    const tld = (urlData.tld as string) ?? "";
    const path = (urlData.path as string) ?? "/";
    const protocol = (urlData.protocol as string) ?? "https:";
    const subdomain = (urlData.subdomain as string) ?? "";
    const paramCount = (urlData.paramCount as number) ?? 0;

    // Find relevant evidence by type
    const typosquat = state.urlAnalysis?.evidence.find(e => e.type === "typosquatting");
    const homoglyph = state.urlAnalysis?.evidence.find(e => e.type === "homoglyph");
    const brandImpersonation = state.urlAnalysis?.evidence.find(e => e.type === "brand_impersonation");

    return (
      <div className="animate-fade-in" style={{ paddingBottom: "16px" }}>

        <SectionLabel>URL Structure</SectionLabel>
        <Card>
          <DetailRow label="Domain" value={urlData.domain as string} mono />
          <DetailRow label="Protocol" value={protocol.replace(":", "")} valueColor={protocol === "http:" ? "var(--risk-medium)" : undefined} alert={protocol === "http:"} />
          <DetailRow label="TLD" value={tld} valueColor={tld && [".xyz",".top",".click",".tk",".gq",".cf"].includes(tld) ? "var(--risk-medium)" : undefined} />
          <DetailRow label="Path" value={path || "/"} mono valueColor={path.length > 1 ? "var(--text-primary)" : "var(--text-muted)"} />
          <DetailRow label="Subdomains" value={subdomain || "None"} mono />
          <DetailRow label="Parameters" value={paramCount > 0 ? `${paramCount} found` : "None"} />
        </Card>

        <SectionLabel>Threat Intelligence</SectionLabel>
        <Card>
          <DetailRow
            label="Typosquatting"
            value={typosquat ? typosquat.detail ?? "Detected" : "Not detected"}
            valueColor={typosquat ? "var(--risk-high)" : "var(--text-muted)"}
            alert={!!typosquat}
          />
          <DetailRow
            label="Homoglyph"
            value={homoglyph ? homoglyph.detail ?? "Detected" : "Not detected"}
            valueColor={homoglyph ? "var(--risk-high)" : "var(--text-muted)"}
            alert={!!homoglyph}
          />
          <DetailRow
            label="Brand Impersonation"
            value={brandImpersonation ? brandImpersonation.detail ?? "Detected" : "Not detected"}
            valueColor={brandImpersonation ? "var(--risk-high)" : "var(--text-muted)"}
            alert={!!brandImpersonation}
          />
        </Card>

        <SectionLabel>Domain Intelligence</SectionLabel>
        <Card>
          {state.urlAnalysis?.domainInfo ? (
            <DomainIntelRows di={state.urlAnalysis.domainInfo} />
          ) : (
            <PendingNote text="WHOIS data (registrar, registration date, domain age) loads from the Phase 7 backend — start it and re-analyze." />
          )}
        </Card>

        <SectionLabel>Email Authentication</SectionLabel>
        <Card>
          {state.urlAnalysis?.domainInfo ? (
            <EmailAuthRows di={state.urlAnalysis.domainInfo} />
          ) : (
            <>
              <DetailRow label="SPF" value="" badge="pending" />
              <DetailRow label="DKIM" value="" badge="pending" />
              <DetailRow label="DMARC" value="" badge="pending" />
            </>
          )}
        </Card>

        <SectionLabel>SSL Certificate</SectionLabel>
        <Card>
          {state.urlAnalysis?.domainInfo ? (
            <SslRows di={state.urlAnalysis.domainInfo} />
          ) : (
            <PendingNote text="SSL issuer and validation level load from the Phase 8 backend." />
          )}
        </Card>

        <div style={{ fontSize: "11px", color: "var(--text-muted)", textAlign: "center", marginTop: "8px" }}>
          Analyzed at {new Date(state.urlAnalysis?.analyzedAt ?? "").toLocaleTimeString()}
        </div>
      </div>
    );
  }

  // ── Email Mode — show email-specific details ──────────────────────────────
  if (state.mode === "email" && state.emailAnalysis) {
    const { senderDomain, senderEmail, evidence } = state.emailAnalysis;
    const typosquat = evidence.find(e => e.type === "typosquatting");
    const brandImpersonation = evidence.find(e => e.type === "brand_impersonation");

    return (
      <div className="animate-fade-in" style={{ paddingBottom: "16px" }}>

        <SectionLabel>Sender Domain</SectionLabel>
        <Card>
          <DetailRow label="Domain" value={senderDomain} mono />
          <DetailRow label="Email" value={senderEmail} mono />
          <DetailRow
            label="Typosquatting"
            value={typosquat ? typosquat.detail ?? "Detected" : "Not detected"}
            valueColor={typosquat ? "var(--risk-high)" : "var(--text-muted)"}
            alert={!!typosquat}
          />
          <DetailRow
            label="Brand Impersonation"
            value={brandImpersonation ? brandImpersonation.detail ?? "Detected" : "Not detected"}
            valueColor={brandImpersonation ? "var(--risk-high)" : "var(--text-muted)"}
            alert={!!brandImpersonation}
          />
        </Card>

        <SectionLabel>Email Authentication</SectionLabel>
        <Card>
          {state.emailAnalysis?.domainInfo ? (
            <EmailAuthRows di={state.emailAnalysis.domainInfo} />
          ) : (
            <>
              <DetailRow label="SPF" value="" badge="pending" />
              <DetailRow label="DKIM" value="" badge="pending" />
              <DetailRow label="DMARC" value="" badge="pending" />
            </>
          )}
        </Card>

        <SectionLabel>Domain Intelligence</SectionLabel>
        <Card>
          {state.emailAnalysis?.domainInfo ? (
            <DomainIntelRows di={state.emailAnalysis.domainInfo} />
          ) : (
            <PendingNote text="WHOIS data loads from the Phase 7 backend — start it and re-analyze." />
          )}
        </Card>

        <SectionLabel>SSL Certificate</SectionLabel>
        <Card>
          {state.emailAnalysis?.domainInfo ? (
            <SslRows di={state.emailAnalysis.domainInfo} />
          ) : (
            <PendingNote text="SSL data loads from the Phase 8 backend." />
          )}
        </Card>
      </div>
    );
  }

  // ── Idle / loading ────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "32px 20px", textAlign: "center" }}>
      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
        {state.isLoading ? "Analyzing..." : "Open an email or right-click a link to see details."}
      </p>
    </div>
  );
}
