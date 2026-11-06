import React, { useCallback, useEffect, useState } from "react";
import type { FromBackgroundMessage, SidebarView, TabState, ToBackgroundMessage } from "../shared/types";
import { loadSettings, onSettingsChanged, DEFAULT_SETTINGS, type Settings } from "../shared/settings";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import IdleScreen from "./components/IdleScreen";
import UrlTestBar from "./components/UrlTestBar";
import SummaryTab from "./components/SummaryTab";
import EvidenceTab from "./components/EvidenceTab";
import LinksTab from "./components/LinksTab";
import SettingsView from "./components/SettingsView";
import StatusBanner from "./components/StatusBanner";

function send<T>(msg: ToBackgroundMessage): Promise<T | undefined> {
  return chrome.runtime.sendMessage(msg).catch(() => undefined) as Promise<T | undefined>;
}

export default function App() {
  const [tabId, setTabId] = useState<number | null>(null);
  const [isGmail, setIsGmail] = useState(false);
  const [state, setState] = useState<TabState | null>(null);
  const [view, setView] = useState<SidebarView>("summary");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  // ── Which tab is this panel showing? ────────────────────────────────────
  const refreshActiveTab = useCallback(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const t = tabs[0];
      if (t?.id === undefined) return;
      setTabId(t.id);
      // tab.url is only visible for hosts we have permission for (mail.google.com).
      setIsGmail(typeof t.url === "string" && t.url.startsWith("https://mail.google.com/"));
    });
  }, []);

  useEffect(() => {
    refreshActiveTab();
    const onActivated = () => refreshActiveTab();
    chrome.tabs.onActivated.addListener(onActivated);
    return () => chrome.tabs.onActivated.removeListener(onActivated);
  }, [refreshActiveTab]);

  // ── Load state for the tab + live updates ──────────────────────────────
  useEffect(() => {
    if (tabId === null) return;
    let cancelled = false;
    void send<TabState>({ type: "GET_TAB_STATE", tabId }).then((s) => { if (!cancelled && s) setState(s); });
    const onMsg = (m: FromBackgroundMessage) => {
      if (m?.type === "TAB_STATE" && m.payload.tabId === tabId) setState(m.payload);
    };
    chrome.runtime.onMessage.addListener(onMsg);
    return () => { cancelled = true; chrome.runtime.onMessage.removeListener(onMsg); };
  }, [tabId]);

  // ── Settings ───────────────────────────────────────────────────────────
  useEffect(() => {
    void loadSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  const analyzeUrl = (raw: string) => {
    if (tabId === null) return;
    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    setView("summary");
    void send({ type: "ANALYZE_URL", tabId, url });
  };
  const analyzePage = () => { if (tabId !== null) { setView("summary"); void send({ type: "ANALYZE_PAGE", tabId }); } };
  const retryEmail = () => { if (tabId !== null) void send({ type: "RETRY_EMAIL", tabId }); };
  const recheckBackend = () => {
    void send<TabState["backendStatus"]>({ type: "CHECK_BACKEND" }).then((status) => {
      if (status && state) setState({ ...state, backendStatus: status });
    });
  };

  const mode = state?.mode ?? "idle";
  const showSettings = view === "settings";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "var(--bg-base)", color: "var(--text-primary)", fontFamily: "var(--font-ui)", overflow: "hidden" }}>
      <Header onSettings={() => setView(showSettings ? "summary" : "settings")} settingsOpen={showSettings} />
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {showSettings ? (
          <SettingsView settings={settings} />
        ) : (
          <>
            <StatusBanner state={state} settings={settings} onRetryEmail={retryEmail} onRecheckBackend={recheckBackend} />
            {mode !== "email" && <UrlTestBar onAnalyze={analyzeUrl} onAnalyzePage={isGmail ? undefined : analyzePage} />}
            {mode === "idle" && !state?.isLoading ? (
              <IdleScreen isGmail={isGmail} />
            ) : view === "evidence" ? (
              <EvidenceTab state={state} />
            ) : view === "links" ? (
              <LinksTab state={state} />
            ) : (
              <SummaryTab state={state} settings={settings} />
            )}
          </>
        )}
      </div>
      {!showSettings && mode !== "idle" && (
        <TabBar activeView={view} onViewChange={setView} mode={mode} linkCount={state?.email?.links.length} />
      )}
    </div>
  );
}
