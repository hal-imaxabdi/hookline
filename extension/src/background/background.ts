/**
 * Hookline Background Service Worker — Phase 4
 *
 * Phase 4 additions:
 * - ANALYZE_URL now runs the real urlAnalyzer instead of returning a stub
 * - Caches lastUrlResult alongside lastEmailResult
 * - Context menu and toolbar button both forward real URL analysis
 */

import { analyzeEmail, RawEmailData } from "../shared/emailAnalyzer";
import { analyzeUrl, enrichWithDomainInfo } from "../shared/urlAnalyzer";
import { fetchDomainInfo } from "../shared/apiClient";
import { EmailAnalysisResult, UrlAnalysisResult } from "../shared/types";

// ─── Cached results ──────────────────────────────────────────────────────────

let lastEmailResult: EmailAnalysisResult | null = null;
let lastUrlResult: UrlAnalysisResult | null = null;

// ─── Safe send ───────────────────────────────────────────────────────────────

function safeSend(message: object): void {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}

// ─── Phase 9: toolbar badge ──────────────────────────────────────────────────
// Red "!" for high risk, amber "!" for suspicious, cleared for safe.

function setBadge(verdict: string): void {
  let text = "";
  let color = "#888888";
  if (verdict === "high_risk") {
    text = "!";
    color = "#E85454";
  } else if (verdict === "suspicious") {
    text = "!";
    color = "#E8A54A";
  }
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({ color });
    const action = chrome.action as unknown as {
      setBadgeTextColor?: (d: { color: string }) => void;
    };
    if (action.setBadgeTextColor) {
      action.setBadgeTextColor({ color: "#ffffff" });
    }
  }
}

// ─── Phase 7: WHOIS enrichment ───────────────────────────────────────────────
// Fire-and-forget. Local analysis is already shown; when the backend answers we
// fold in domain-age data and re-broadcast. Stays quiet if the backend is off.

function enrichUrl(local: UrlAnalysisResult): void {
  fetchDomainInfo(local.domain).then((info) => {
    if (!info) return;
    const enriched = enrichWithDomainInfo(local, info);
    if (lastUrlResult && lastUrlResult.url === local.url) lastUrlResult = enriched;
    setBadge(enriched.verdict);
    safeSend({ type: "URL_ANALYSIS_RESULT", payload: enriched });
  });
}

function enrichEmail(local: EmailAnalysisResult): void {
  if (!local.senderDomain) return;
  fetchDomainInfo(local.senderDomain).then((info) => {
    if (!info) return;
    const enriched = enrichWithDomainInfo(local, info, { emailContext: true });
    if (lastEmailResult && lastEmailResult.senderEmail === local.senderEmail) {
      lastEmailResult = enriched;
    }
    setBadge(enriched.verdict);
    safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: enriched });
  });
}

// ─── Context Menu Setup ──────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "hookline-analyze",
      title: "Analyze with Hookline",
      contexts: ["link", "page"],
    });
  });
  console.log("[Hookline Background] installed.");
});

// ─── Context Menu Clicks ─────────────────────────────────────────────────────

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const targetUrl = info.linkUrl ?? tab.url ?? null;

  if (!targetUrl) return;

  await chrome.sidePanel.open({ tabId: tab.id });

  // Run analysis immediately
  const result = analyzeUrl(targetUrl);
  lastUrlResult = result;
  lastEmailResult = null; // switch mode
  setBadge(result.verdict);

  // Give sidebar time to mount, then send result
  setTimeout(() => {
    safeSend({ type: "URL_ANALYSIS_RESULT", payload: result });
  }, 400);

  enrichUrl(result);
});

// ─── Toolbar Button ──────────────────────────────────────────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });

  // Send whatever was cached last
  if (lastEmailResult) {
    setTimeout(() => {
      safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: lastEmailResult });
    }, 400);
  } else if (lastUrlResult) {
    setTimeout(() => {
      safeSend({ type: "URL_ANALYSIS_RESULT", payload: lastUrlResult });
    }, 400);
  }
});

// ─── Message Router ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[Hookline Background] Message:", message.type);

  switch (message.type) {

    // ── Email extracted by content script ───────────────────────────────
    case "EMAIL_DATA_EXTRACTED": {
      const raw = message.payload as RawEmailData;
      const result = analyzeEmail(raw);
      lastEmailResult = result;
      lastUrlResult = null;
      setBadge(result.verdict);

      console.log("[Hookline Background] Email analyzed:", result.verdict, result.confidence);
      safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: result });
      enrichEmail(result);
      sendResponse({ ok: true });
      break;
    }

    // ── Sidebar requesting cached result on mount ────────────────────────
    case "GET_LAST_RESULT": {
      sendResponse({
        ok: true,
        emailResult: lastEmailResult,
        urlResult: lastUrlResult,
      });
      break;
    }

    // ── URL analysis from sidebar or context menu ────────────────────────
    case "ANALYZE_URL": {
      const url = message.payload?.url as string;
      if (!url) {
        sendResponse({ ok: false, error: "No URL provided" });
        break;
      }

      const result = analyzeUrl(url);
      lastUrlResult = result;
      lastEmailResult = null;
      setBadge(result.verdict);

      console.log("[Hookline Background] URL analyzed:", result.verdict, result.confidence);
      safeSend({ type: "URL_ANALYSIS_RESULT", payload: result });
      enrichUrl(result);
      sendResponse({ ok: true, result });
      break;
    }

    // ── Page navigation ──────────────────────────────────────────────────
    case "PAGE_NAVIGATED": {
      safeSend({ type: "PAGE_NAVIGATED", payload: message.payload });
      sendResponse({ ok: true });
      break;
    }

    default:
      sendResponse({ ok: false, error: "Unknown message type" });
  }

  return true;
});

// ─── Tab Update Listener ─────────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    safeSend({ type: "TAB_UPDATED", payload: { tabId, url: tab.url, title: tab.title } });
  }
});
