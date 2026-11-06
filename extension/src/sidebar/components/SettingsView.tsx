import React, { useState } from "react";
import { DEFAULT_REPORT_LINKS, saveSettings, type ReportLink, type Settings } from "../../shared/settings";
import { SAFE_BROWSING_ORIGIN } from "../../shared/apiClient";

/**
 * Settings. Every option that sends data off the machine says exactly what
 * leaves and where it goes.
 */
export default function SettingsView({ settings }: { settings: Settings }) {
  const [keyDraft, setKeyDraft] = useState(settings.safeBrowsingApiKey);
  const [newLink, setNewLink] = useState<ReportLink>({ label: "", url: "" });
  const [msg, setMsg] = useState("");

  const set = (patch: Partial<Settings>) => void saveSettings({ ...settings, ...patch });

  const toggleSafeBrowsing = async (on: boolean) => {
    if (!on) { set({ safeBrowsingEnabled: false }); return; }
    // Optional host permission, requested only now (must be inside the click).
    const granted = await chrome.permissions.request({ origins: [SAFE_BROWSING_ORIGIN] }).catch(() => false);
    if (!granted) { setMsg("Permission to contact safebrowsing.googleapis.com was not granted, so Safe Browsing stays off."); return; }
    set({ safeBrowsingEnabled: true, safeBrowsingApiKey: keyDraft.trim() });
    setMsg(keyDraft.trim() ? "" : "Safe Browsing is on, but it needs an API key to work.");
  };

  const addLink = () => {
    const url = newLink.url.trim();
    if (!newLink.label.trim() || !/^(https:\/\/|mailto:)/i.test(url)) { setMsg("Report links need a label and an https:// or mailto: address."); return; }
    set({ reportLinks: [...settings.reportLinks, { label: newLink.label.trim(), url }] });
    setNewLink({ label: "", url: "" });
    setMsg("");
  };

  return (
    <div style={{ padding: "12px 12px 24px", display: "flex", flexDirection: "column", gap: "10px" }}>
      <Section title="Local backend (optional)">
        <Toggle checked={settings.backendEnabled} onChange={(v) => set({ backendEnabled: v })} label="Use the local backend for domain age and DNS"
          help="Sends only the domain name (e.g. example.com) to http://localhost:8000. The backend looks it up via RDAP (rdap.org) and your DNS resolver. Never sends email content." />
        <Toggle checked={settings.sslProbe} disabled={!settings.backendEnabled} onChange={(v) => set({ sslProbe: v })} label="Also read the site's TLS certificate"
          help="The backend opens a connection to the domain itself. Off by default: connecting to a phishing site reveals your IP address to whoever runs it." />
      </Section>

      <Section title="Threat intelligence (optional, off by default)">
        <Toggle checked={settings.safeBrowsingEnabled} onChange={(v) => void toggleSafeBrowsing(v)} label="Google Safe Browsing"
          help="Sends the full URLs of links you analyze to Google's Safe Browsing v4 Lookup API using your own API key. Results are cached locally for 6 hours." />
        <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
          <input type="password" value={keyDraft} placeholder="Safe Browsing API key" onChange={(e) => setKeyDraft(e.target.value)} style={input} aria-label="Safe Browsing API key" />
          <button style={btn} onClick={() => { set({ safeBrowsingApiKey: keyDraft.trim() }); setMsg("API key saved locally (chrome.storage.local, not synced)."); }}>Save</button>
        </div>
        <Toggle checked={settings.urlhausEnabled} disabled={!settings.backendEnabled} onChange={(v) => set({ urlhausEnabled: v })} label="abuse.ch URLhaus (via backend)"
          help="Sends link URLs to your local backend, which asks URLhaus. Requires URLHAUS_AUTH_KEY to be set where the backend runs." />
      </Section>

      <Section title="Reading pages and Gmail">
        <Toggle checked={settings.autoAnalyzePage} onChange={(v) => set({ autoAnalyzePage: v })} label="Check the page when I click the Hookline icon"
          help="Reads the visible text of the current tab (only when you click) to look for shopping and job scams. The text stays on your computer." />
        <Toggle checked={settings.readGmailDetails} onChange={(v) => set({ readGmailDetails: v })} label="Read Gmail's “show details” (Reply-To, signed-by)"
          help="Briefly opens and closes the details panel under the sender to read the Reply-To address and Gmail's own DKIM/SPF info." />
      </Section>

      <Section title="What to do & reporting">
        <Toggle checked={settings.showWhatToDo} onChange={(v) => set({ showWhatToDo: v })} label="Show the “What to do” section" />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
          {settings.reportLinks.map((l, i) => (
            <div key={`${l.url}-${i}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ flex: 1, fontSize: "12px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={l.url}>{l.label}</span>
              <button style={btnSmall} onClick={() => set({ reportLinks: settings.reportLinks.filter((_, j) => j !== i) })} aria-label={`Remove ${l.label}`}>Remove</button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
          <input value={newLink.label} placeholder="Label (e.g. Action Fraud — UK)" onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} style={input} />
          <div style={{ display: "flex", gap: "6px" }}>
            <input value={newLink.url} placeholder="https://… or mailto:…" onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} style={input} />
            <button style={btn} onClick={addLink}>Add</button>
          </div>
          <button style={{ ...btnSmall, alignSelf: "flex-start" }} onClick={() => set({ reportLinks: DEFAULT_REPORT_LINKS })}>Reset to defaults</button>
        </div>
      </Section>

      {msg && <div role="status" style={{ fontSize: "12px", color: "var(--risk-medium)", lineHeight: 1.5 }}>{msg}</div>}

      <p style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.6, margin: "4px 2px 0" }}>
        Email bodies and page text are analyzed only inside your browser and are never sent anywhere. See the README's Privacy section for the full list of what can leave your machine.
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "8px", padding: "12px" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>{title}</div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, help, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; help?: string; disabled?: boolean }) {
  return (
    <label style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "6px 0", opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer" }}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} style={{ marginTop: "2px", accentColor: "var(--brand-purple)" }} />
      <span>
        <span style={{ display: "block", fontSize: "13px", color: "var(--text-primary)" }}>{label}</span>
        {help && <span style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", lineHeight: 1.5, marginTop: "2px" }}>{help}</span>}
      </span>
    </label>
  );
}

const input: React.CSSProperties = { flex: 1, minWidth: 0, padding: "6px 8px", fontSize: "12px", color: "var(--text-primary)", background: "var(--bg-base)", border: "1px solid var(--border-default)", borderRadius: "6px", outline: "none" };
const btn: React.CSSProperties = { padding: "6px 10px", fontSize: "12px", fontWeight: 600, color: "#fff", background: "var(--brand-purple)", border: "none", borderRadius: "6px", cursor: "pointer" };
const btnSmall: React.CSSProperties = { padding: "3px 8px", fontSize: "11px", color: "var(--text-secondary)", background: "transparent", border: "1px solid var(--border-default)", borderRadius: "6px", cursor: "pointer" };
