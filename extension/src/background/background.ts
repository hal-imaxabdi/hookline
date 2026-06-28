import { analyzeEmail, RawEmailData } from "../shared/emailAnalyzer";
import { analyzeUrl, enrichWithDomainInfo } from "../shared/urlAnalyzer";
import { fetchDomainInfo } from "../shared/apiClient";
import { EmailAnalysisResult, UrlAnalysisResult } from "../shared/types";

function safeSend(message: object): void {
  chrome.runtime.sendMessage(message, () => {
    void chrome.runtime.lastError;
  });
}

function setBadge(verdict: string): void {
  let text = "";
  let color = "#888888";
  if (verdict === "high_risk") { text = "!"; color = "#E85454"; }
  else if (verdict === "suspicious") { text = "!"; color = "#E8A54A"; }
  chrome.action.setBadgeText({ text });
  if (text) {
    chrome.action.setBadgeBackgroundColor({ color });
    const action = chrome.action as unknown as { setBadgeTextColor?: (d: { color: string }) => void };
    if (action.setBadgeTextColor) action.setBadgeTextColor({ color: "#ffffff" });
  }
}

// ── Persist results in session storage so they survive service worker sleep ──

async function saveEmailResult(result: EmailAnalysisResult): Promise<void> {
  await chrome.storage.session.set({ lastEmailResult: result, lastUrlResult: null });
}

async function saveUrlResult(result: UrlAnalysisResult): Promise<void> {
  await chrome.storage.session.set({ lastUrlResult: result, lastEmailResult: null });
}

async function getLastResults(): Promise<{ emailResult: EmailAnalysisResult | null; urlResult: UrlAnalysisResult | null }> {
  const data = await chrome.storage.session.get(["lastEmailResult", "lastUrlResult"]);
  return {
    emailResult: (data.lastEmailResult as EmailAnalysisResult) ?? null,
    urlResult: (data.lastUrlResult as UrlAnalysisResult) ?? null,
  };
}

// ── Enrich with backend domain data ─────────────────────────────────────────

function enrichUrl(local: UrlAnalysisResult): void {
  fetchDomainInfo(local.domain).then(async (info) => {
    if (!info) return;
    const enriched = enrichWithDomainInfo(local, info);
    await saveUrlResult(enriched);
    setBadge(enriched.verdict);
    safeSend({ type: "URL_ANALYSIS_RESULT", payload: enriched });
  });
}

function enrichEmail(local: EmailAnalysisResult): void {
  if (!local.senderDomain) return;
  fetchDomainInfo(local.senderDomain).then(async (info) => {
    if (!info) return;
    const enriched = enrichWithDomainInfo(local, info, { emailContext: true });
    await saveEmailResult(enriched);
    setBadge(enriched.verdict);
    setTimeout(() => {
      safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: enriched });
    }, 300);
  });
}

// ── Context menu ─────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "hookline-analyze",
      title: "Analyze with Hookline",
      contexts: ["link", "page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  const targetUrl = info.linkUrl ?? tab.url ?? null;
  if (!targetUrl) return;

  await chrome.sidePanel.open({ tabId: tab.id });

  const result = analyzeUrl(targetUrl);
  await saveUrlResult(result);
  setBadge(result.verdict);

  setTimeout(() => safeSend({ type: "URL_ANALYSIS_RESULT", payload: result }), 400);
  enrichUrl(result);
});

// ── Toolbar button — open panel and push cached result ───────────────────────

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab?.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });

  const { emailResult, urlResult } = await getLastResults();
  if (emailResult) {
    setTimeout(() => safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: emailResult }), 500);
  } else if (urlResult) {
    setTimeout(() => safeSend({ type: "URL_ANALYSIS_RESULT", payload: urlResult }), 500);
  }
});

// ── Message handler ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  switch (message.type) {

    case "EMAIL_DATA_EXTRACTED": {
      const raw = message.payload as RawEmailData;
      const result = analyzeEmail(raw);
      setBadge(result.verdict);

      saveEmailResult(result).then(() => {
        setTimeout(() => safeSend({ type: "EMAIL_ANALYSIS_RESULT", payload: result }), 500);
        enrichEmail(result);
      });

      sendResponse({ ok: true });
      break;
    }

    case "GET_LAST_RESULT": {
      getLastResults().then(({ emailResult, urlResult }) => {
        sendResponse({ ok: true, emailResult, urlResult });
      });
      return true; // keep channel open for async
    }

    case "ANALYZE_URL": {
      const url = message.payload?.url as string;
      if (!url) { sendResponse({ ok: false, error: "No URL provided" }); break; }

      const result = analyzeUrl(url);
      setBadge(result.verdict);

      saveUrlResult(result).then(() => {
        safeSend({ type: "URL_ANALYSIS_RESULT", payload: result });
        enrichUrl(result);
      });

      sendResponse({ ok: true, result });
      break;
    }

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    safeSend({ type: "TAB_UPDATED", payload: { tabId, url: tab.url, title: tab.title } });
  }
});