import React, { useState } from "react";
import type { DomainInfo, EvidenceItem, TabState } from "../../shared/types";
import { CATEGORY_DISPLAY } from "../../shared/types";
import { RULES } from "../../shared/ruleRegistry";
import { currentAnalysis } from "../model";

export default function EvidenceTab({ state }: { state: TabState | null }) {
  if (state?.isLoading) return <Note text="Loading evidence…" />;
  const a = currentAnalysis(state);
  if (!a) return <Note text="Open an email or analyze a URL/page to see evidence." />;

  const r = a.result;
  const domain = a.kind === "email" ? a.result.senderDomain || "—" : a.result.domain || "—";

  return (
    <div style={{ padding: "0 0 16px" }}>
      <DomainSection domain={domain} info={r.domainInfo} backendStatus={state?.backendStatus ?? "unknown"} />
      {a.kind === "email" && (r.domainInfo || a.result.mailedBy || a.result.signedBy) && (
        <AuthSection info={r.domainInfo} mailedBy={a.result.mailedBy} signedBy={a.result.signedBy} />
      )}
      {r.category.label !== "none" && (
        <div>
          <SectionLabel>Scam category</SectionLabel>
          <Card>
            <Row label="Classified as" value={CATEGORY_DISPLAY[r.category.label]} />
            <Row label="Points" value={`phishing ${Math.round(r.category.points.credential_phishing)} · job ${Math.round(r.category.points.job_scam)} · shopping ${Math.round(r.category.points.shopping_scam)}`} />
          </Card>
        </div>
      )}
      {r.evidence.length > 0 ? (
        <SignalsSection title={`Detection signals (${r.evidence.length})`} evidence={r.evidence} />
      ) : (
        <Note text="No detection rules matched." />
      )}
      {r.suppressedEvidence.length > 0 && (
        <SignalsSection
          title={`Ignored for a top-10k domain (${r.suppressedEvidence.length})`}
          hint="These weak URL heuristics matched, but the domain is among Tranco's 10,000 most-visited sites, so they don't count toward the score."
          evidence={r.suppressedEvidence}
          muted
        />
      )}
    </div>
  );
}

function DomainSection({ domain, info, backendStatus }: { domain: string; info: DomainInfo | null; backendStatus: TabState["backendStatus"] }) {
  const days = info?.createdDaysAgo;
  let age = "Unknown";
  if (days != null) age = days < 90 ? `${days} days old` : days < 730 ? `${Math.floor(days / 30)} months old` : `${Math.floor(days / 365)} years old`;
  else if (info?.createdDate) age = info.createdDate;
  const unavailable = backendStatus === "offline" ? "Backend offline" : backendStatus === "disabled" ? "Backend disabled" : "Unknown";

  return (
    <div>
      <SectionLabel>Domain</SectionLabel>
      <Card>
        <Row label="Domain" value={domain} mono />
        <Row label="Domain age" value={info ? age : unavailable} warn={info?.isNewDomain ?? false} />
        <Row label="Registrar" value={info?.registrar ?? unavailable} />
        {info?.sslIssuer && <Row label="Certificate" value={`${info.sslIssuer} · ${info.sslHasOrgValidation ? "OV/EV" : "Domain-validated (DV)"}`} />}
        {info?.note && <Row label="Note" value={info.note} />}
      </Card>
    </div>
  );
}

function AuthSection({ info, mailedBy, signedBy }: { info: DomainInfo | null; mailedBy?: string; signedBy?: string }) {
  return (
    <div>
      <SectionLabel>Email authentication</SectionLabel>
      <Card>
        {signedBy && <Row label="Gmail: signed-by (DKIM)" value={signedBy} mono />}
        {mailedBy && <Row label="Gmail: mailed-by" value={mailedBy} mono />}
        {info && <AuthRow label="SPF record" status={info.spfStatus} />}
        {info && <AuthRow label="DKIM (DNS probe, best-effort)" status={info.dkimStatus} />}
        {info && <AuthRow label="DMARC record" status={info.dmarcStatus ?? "unknown"} />}
      </Card>
    </div>
  );
}

function AuthRow({ label, status }: { label: string; status: string }) {
  const pass = status === "pass";
  const missing = status === "missing" || status === "fail";
  return <Row label={label} value={pass ? "Present" : missing ? "Missing" : "Unknown"} warn={missing} good={pass} />;
}

function SignalsSection({ title, hint, evidence, muted = false }: { title: string; hint?: string; evidence: EvidenceItem[]; muted?: boolean }) {
  const order = { high: 0, medium: 1, low: 2 } as const;
  const sorted = [...evidence].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      {hint && <p style={{ margin: "0 14px 8px", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5 }}>{hint}</p>}
      <div style={{ margin: "0 12px", display: "flex", flexDirection: "column", gap: "6px", opacity: muted ? 0.7 : 1 }}>
        {sorted.map((item, i) => <SignalRow key={`${item.ruleId}-${i}`} item={item} />)}
      </div>
    </div>
  );
}

function SignalRow({ item }: { item: EvidenceItem }) {
  const [open, setOpen] = useState(false);
  const color = item.severity === "high" ? "var(--risk-high)" : item.severity === "medium" ? "var(--risk-medium)" : "var(--text-muted)";
  const rule = RULES[item.ruleId];
  return (
    <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "flex-start", gap: "10px", padding: "10px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ color, flexShrink: 0, fontSize: "14px", lineHeight: 1.4 }}>✗</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-primary)" }}>{item.title}</div>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px", lineHeight: 1.45 }}>{item.description}</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          <path d="M3 5l4 4 4-4" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: "8px 12px 10px 34px", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5, borderTop: "1px solid var(--border-subtle)", fontFamily: "var(--font-mono)", wordBreak: "break-word" }}>
          {item.detail && <div style={{ marginBottom: "6px" }}>{item.detail}</div>}
          <div>Rule {item.ruleId} · weight {rule.weight} · {item.severity}{rule.source ? ` · source: ${rule.source.split(" — ")[0]}` : ""}</div>
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px 14px 6px" }}>{children}</div>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", overflow: "hidden", margin: "0 12px 10px" }}>{children}</div>;
}

function Row({ label, value, mono = false, warn = false, good = false }: { label: string; value: string; mono?: boolean; warn?: boolean; good?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 14px", borderBottom: "1px solid var(--border-subtle)", gap: "12px" }}>
      <span style={{ fontSize: "12px", color: "var(--text-secondary)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: "12px", fontWeight: warn || good ? 600 : 400, fontFamily: mono ? "var(--font-mono)" : "inherit", color: warn ? "var(--risk-medium)" : good ? "var(--risk-low)" : "var(--text-primary)", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return <div style={{ padding: "24px 20px", textAlign: "center", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5 }}>{text}</div>;
}
