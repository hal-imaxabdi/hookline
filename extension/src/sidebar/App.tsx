/**
 * Hookline Sidebar — Phase 4
 *
 * Phase 4 additions:
 * - Handles URL_ANALYSIS_RESULT message
 * - GET_LAST_RESULT now returns both emailResult and urlResult
 * - Mode switches automatically based on which result arrives
 */

import React, { useState, useEffect } from "react";
import { SidebarState, SidebarView, EmailAnalysisResult, UrlAnalysisResult } from "../shared/types";
import Header from "./components/Header";
import TabBar from "./components/TabBar";
import IdleScreen from "./components/IdleScreen";
import UrlTestBar from "./components/UrlTestBar";
import SummaryTab from "./components/SummaryTab";
import DetailsTab from "./components/DetailsTab";
import HeadersTab from "./components/HeadersTab";
import LinksTab from "./components/LinksTab";
import WhoisTab from "./components/WhoisTab";

const initialState: SidebarState = {
  mode: "idle",
  activeView: "summary",
  isLoading: false,
  currentUrl: null,
  urlAnalysis: null,
  emailAnalysis: null,
  error: null,
};

export default function App() {
  const [state, setState] = useState<SidebarState>(initialState);

  // ── Message listener ──────────────────────────────────────────────────

  useEffect(() => {
    const handleMessage = (message: { type: string; payload?: unknown }) => {
      console.log("[Hookline Sidebar] Message:", message.type);

      switch (message.type) {

        case "EMAIL_DATA_EXTRACTED": {
          setState((prev) => ({ ...prev, mode: "email", isLoading: true, emailAnalysis: null }));
          break;
        }

        case "EMAIL_ANALYSIS_RESULT": {
          const result = message.payload as EmailAnalysisResult;
          setState((prev) => ({
            ...prev,
            mode: "email",
            isLoading: false,
            emailAnalysis: result,
            urlAnalysis: null,
          }));
          break;
        }

        case "URL_ANALYSIS_RESULT": {
          const result = message.payload as UrlAnalysisResult;
          setState((prev) => ({
            ...prev,
            mode: "url",
            isLoading: false,
            urlAnalysis: result,
            emailAnalysis: null,
            currentUrl: result.url,
          }));
          break;
        }

        case "ANALYZE_URL": {
          const payload = message.payload as { url: string };
          setState((prev) => ({
            ...prev,
            mode: "url",
            currentUrl: payload.url,
            isLoading: true,
            urlAnalysis: null,
          }));
          break;
        }

        case "TAB_UPDATED": {
          const payload = message.payload as { url: string };
          setState((prev) => ({
            ...prev,
            currentUrl: payload.url,
          }));
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, []);

  // ── Detect current tab on mount ───────────────────────────────────────

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.url) {
        setState((prev) => ({
          ...prev,
          currentUrl: tab.url ?? null,
          mode: tab.url?.includes("mail.google.com") ? "email" : prev.mode,
        }));
      }
    });
  }, []);

  // ── On mount: poll for cached result ─────────────────────────────────

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 8;

    const poll = () => {
      chrome.runtime.sendMessage({ type: "GET_LAST_RESULT" }, (response) => {
        void chrome.runtime.lastError;

        if (response?.emailResult) {
          setState((prev) => ({
            ...prev,
            mode: "email",
            isLoading: false,
            emailAnalysis: response.emailResult,
          }));
        } else if (response?.urlResult) {
          setState((prev) => ({
            ...prev,
            mode: "url",
            isLoading: false,
            urlAnalysis: response.urlResult,
            currentUrl: response.urlResult.url,
          }));
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(poll, 500);
        } else {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      });
    };

    setTimeout(poll, 300);
  }, []);

  // ── Tab navigation ────────────────────────────────────────────────────

  const setActiveView = (view: SidebarView) => {
    setState((prev) => ({ ...prev, activeView: view }));
  };

  // ── Manual URL test (paste-box) ───────────────────────────────────────

  const analyzeManualUrl = (raw: string) => {
    const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    setState((prev) => ({
      ...prev,
      mode: "url",
      isLoading: true,
      urlAnalysis: null,
      emailAnalysis: null,
      currentUrl: url,
    }));
    chrome.runtime.sendMessage({ type: "ANALYZE_URL", payload: { url } }, (response) => {
      void chrome.runtime.lastError;
      if (response?.result) {
        setState((prev) => ({
          ...prev,
          mode: "url",
          isLoading: false,
          urlAnalysis: response.result,
          currentUrl: response.result.url,
        }));
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    });
  };

  // ── Render tab content ────────────────────────────────────────────────

  function renderTabContent() {
    switch (state.activeView) {
      case "summary":  return <SummaryTab state={state} />;
      case "details":  return <DetailsTab state={state} />;
      case "headers":  return <HeadersTab state={state} />;
      case "links":    return <LinksTab state={state} />;
      case "whois":    return <WhoisTab state={state} />;
      default:         return <SummaryTab state={state} />;
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "var(--bg-base)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-ui)",
        overflow: "hidden",
      }}
    >
      <Header />
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {state.mode !== "email" && <UrlTestBar onAnalyze={analyzeManualUrl} />}
        {state.mode === "idle" ? (
          <IdleScreen currentUrl={state.currentUrl} />
        ) : (
          renderTabContent()
        )}
      </div>
      {state.mode !== "idle" && (
        <TabBar
          activeView={state.activeView}
          onViewChange={setActiveView}
          mode={state.mode}
          linkCount={state.emailAnalysis?.links?.length}
        />
      )}
    </div>
  );
}
