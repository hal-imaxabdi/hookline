/**
 * Hookline background service worker.
 *
 * - Per-tab state (chrome.storage.session) so results survive worker sleep and
 *   one tab's result never shows up in another tab.
 * - Every analysis gets a requestId; slow enrichment (backend, threat intel)
 *   is dropped if a newer analysis started meanwhile.
 * - Backend and threat intel are optional, time-limited, and their status is
 *   reported to the sidebar.
 */

import { analyzeEmail } from "../shared/emailAnalyzer";
import { analyzeUrl, enrichWithDomainInfo, rescore } from "../shared/urlAnalyzer";
import { analyzePage } from "../shared/pageAnalyzer";
import { checkBackendHealth, fetchDomainInfo } from "../shared/apiClient";
import { loadSettings, type Settings } from "../shared/settings";
import { checkThreatIntel, intelEvidence } from "../shared/threatIntel";
import { isAllowlisted } from "../shared/allowlist";
import { extractPageSnapshot } from "../content/pageExtractor";
import type {
  BackendStatus, EmailAnalysisResult, ExtractionFailure, PageAnalysisResult, PageSnapshot,
  RawEmailData, TabState, ToBackgroundMessage, UrlAnalysisResult, RiskLevel,
} from "../shared/types";

const GMAIL = /^https:\/\/mail\.google\.com\//;

// ─── Per-tab state ─────────────────────────────────────────────────────────

const key = (tabId: number) => `tab:${tabId}`;

function emptyState(tabId: number): TabState {
  return {
    tabId, mode: "idle", requestId: 0, email: null, url: null, page: null,
    extractionFailure: null, backendStatus: "unknown", isLoading: false, updatedAt: new Date().toISOString(),
  };
}

async function getState(tabId: number): Promise<TabState> {
  const d = await chrome.storage.session.get(key(tabId));
  return (d[key(tabId)] as TabState | undefined) ?? emptyState(tabId);
}

async function putState(state: TabState): Promise<void> {
  state.updatedAt = new Date().toISOString();
  await chrome.storage.session.set({ [key(state.tabId)]: state });
  setBadge(state);
  chrome.runtime.sendMessage({ type: "TAB_STATE", payload: state }).catch(() => { /* sidebar closed */ });
}

/** Apply `mutate` only if no newer request has started for this tab. */
async function update(tabId: number, requestId: number | null, mutate: (s: TabState) => void): Promise<boolean> {
  const s = await getState(tabId);
  if (requestId !== null && s.requestId !== requestId) return false;
  mutate(s);
  await putState(s);
  return true;
}

async function beginRequest(tabId: number, mode: TabState["mode"]): Promise<number> {
  const s = await getState(tabId);
  s.requestId += 1;
  s.mode = mode;
  s.isLoading = true;
  s.extractionFailure = null;
  await putState(s);
  return s.requestId;
}

function verdictOf(s: TabState): RiskLevel | null {
  if (s.mode === "email") return s.email?.verdict ?? null;
  if (s.mode === "page") return s.page?.verdict ?? null;
  if (s.mode === "url") return s.url?.verdict ?? null;
  return null;
}

function setBadge(s: TabState): void {
  const v = verdictOf(s);
  const text = v === "high_risk" || v === "suspicious" ? "!" : "";
  chrome.action.setBadgeText({ tabId: s.tabId, text }).catch(() => undefined);
  if (text) {
    chrome.action.setBadgeBackgroundColor({ tabId: s.tabId, color: v === "high_risk" ? "#E85454" : "#E8A54A" }).catch(() => undefined);
    chrome.action.setBadgeTextColor?.({ tabId: s.tabId, color: "#ffffff" }).catch(() => undefined);
  }
}

// ─── Backend status ────────────────────────────────────────────────────────

let lastHealth: { at: number; ok: boolean } | null = null;

async function backendStatus(settings: Settings, force = false): Promise<BackendStatus> {
  if (!settings.backendEnabled) return "disabled";
  if (!force && lastHealth && Date.now() - lastHealth.at < 30_000) return lastHealth.ok ? "online" : "offline";
  const ok = await checkBackendHealth();
  lastHealth = { at: Date.now(), ok };
  return ok ? "online" : "offline";
}

// ─── Email ─────────────────────────────────────────────────────────────────

async function handleEmail(tabId: number, raw: RawEmailData): Promise<void> {
  const reqId = await beginRequest(tabId, "email");
  const settings = await loadSettings();
  const local = { ...analyzeEmail(raw), mailedBy: raw.mailedBy, signedBy: raw.signedBy };
  const status = await backendStatus(settings);
  await update(tabId, reqId, (s) => { s.email = local; s.isLoading = false; s.backendStatus = status; });

  let current: EmailAnalysisResult = local;
  const allowlisted = local.senderDomain !== "" && isAllowlisted(local.senderDomain);

  if (status === "online" && local.senderDomain) {
    const r = await fetchDomainInfo(local.senderDomain, { ssl: settings.sslProbe });
    if (r.ok) current = enrichWithDomainInfo(current, r.data, { emailContext: true, allowlisted });
    else lastHealth = { at: Date.now(), ok: false };
    await update(tabId, reqId, (s) => { s.email = current; s.backendStatus = r.ok ? "online" : "offline"; });
  }

  const intel = await checkThreatIntel(current.links.map((l) => l.href), settings);
  if (intel.hits.length) {
    const hitUrls = new Set(intel.hits.map((h) => h.url));
    const links = current.links.map((l) => hitUrls.has(l.href)
      ? { ...l, verdict: "high_risk" as const, isSuspicious: true, flags: [`Listed by threat intel: ${intel.hits.filter((h) => h.url === l.href).map((h) => `${h.source} (${h.threat})`).join(", ")}`, ...l.flags] }
      : l);
    current = { ...rescore(current, intelEvidence(intel.hits), { allowlisted }), links };
    await update(tabId, reqId, (s) => { s.email = current; });
  }
  if (intel.errors.length) console.warn("[Hookline] threat intel:", intel.errors.join("; "));
}

// ─── URL (paste-box / right-click a link) ──────────────────────────────────

async function handleUrl(tabId: number, url: string): Promise<void> {
  const reqId = await beginRequest(tabId, "url");
  const settings = await loadSettings();
  let current: UrlAnalysisResult = analyzeUrl(url);
  const status = await backendStatus(settings);
  await update(tabId, reqId, (s) => { s.url = current; s.isLoading = false; s.backendStatus = status; });
  if (current.verdict === "unknown") return;

  if (status === "online") {
    const r = await fetchDomainInfo(current.registrableDomain || current.domain, { ssl: settings.sslProbe });
    if (r.ok) current = enrichWithDomainInfo(current, r.data, { allowlisted: current.allowlisted });
    await update(tabId, reqId, (s) => { s.url = current; s.backendStatus = r.ok ? "online" : "offline"; });
  }
  const intel = await checkThreatIntel([url], settings);
  if (intel.hits.length) {
    current = rescore(current, intelEvidence(intel.hits), { allowlisted: current.allowlisted });
    await update(tabId, reqId, (s) => { s.url = current; });
  }
}

// ─── Page (shopping / job scams) ───────────────────────────────────────────

const PAGE_NOT_READABLE: ExtractionFailure = {
  reason: "page_not_readable",
  message: "Hookline can only read a page after you click its toolbar icon on that page, or right-click → \"Analyze this page with Hookline\". Some pages (chrome://, the Web Store, PDFs) can't be read at all.",
};

async function handlePage(tabId: number): Promise<void> {
  const reqId = await beginRequest(tabId, "page");
  let snapshot: PageSnapshot | null = null;
  try {
    const [res] = await chrome.scripting.executeScript({ target: { tabId }, func: extractPageSnapshot });
    snapshot = (res?.result as PageSnapshot | undefined) ?? null;
  } catch (e) {
    console.debug("[Hookline] page not readable:", e);
  }
  if (!snapshot) {
    await update(tabId, reqId, (s) => { s.isLoading = false; s.extractionFailure = PAGE_NOT_READABLE; s.page = null; });
    return;
  }

  const settings = await loadSettings();
  let current: PageAnalysisResult = analyzePage(snapshot);
  const status = await backendStatus(settings);
  await update(tabId, reqId, (s) => { s.page = current; s.isLoading = false; s.backendStatus = status; });
  if (!current.domain) return;

  if (status === "online") {
    const r = await fetchDomainInfo(current.registrableDomain || current.domain, { ssl: settings.sslProbe });
    if (r.ok) {
      // Re-run with the domain age so SHOP_NEW_DOMAIN_DISCOUNT can fire.
      const withAge = analyzePage(snapshot, { domainAgeDays: r.data.createdDaysAgo });
      current = enrichWithDomainInfo(withAge, r.data, { allowlisted: withAge.allowlisted });
    }
    await update(tabId, reqId, (s) => { s.page = current; s.backendStatus = r.ok ? "online" : "offline"; });
  }
  const intel = await checkThreatIntel([snapshot.url], settings);
  if (intel.hits.length) {
    current = rescore(current, intelEvidence(intel.hits), { allowlisted: current.allowlisted });
    await update(tabId, reqId, (s) => { s.page = current; });
  }
}

// ─── Toolbar button & context menu ─────────────────────────────────────────
// sidePanel.open() must be called synchronously inside the user gesture,
// before any await.

chrome.action.onClicked.addListener((tab) => {
  if (tab.id === undefined) return;
  const tabId = tab.id;
  chrome.sidePanel.open({ tabId }).catch((e) => console.warn("[Hookline] sidePanel.open:", e));
  void (async () => {
    const isGmail = typeof tab.url === "string" && GMAIL.test(tab.url);
    if (isGmail) {
      const s = await getState(tabId);
      if (s.mode !== "email") chrome.tabs.sendMessage(tabId, { type: "REEXTRACT" }).catch(() => undefined);
      return;
    }
    const settings = await loadSettings();
    if (settings.autoAnalyzePage) await handlePage(tabId);
  })();
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: "hookline-link", title: "Analyze link with Hookline", contexts: ["link"] });
    chrome.contextMenus.create({ id: "hookline-page", title: "Analyze this page with Hookline", contexts: ["page"] });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (tab?.id === undefined) return;
  const tabId = tab.id;
  chrome.sidePanel.open({ tabId }).catch(() => undefined);
  if (info.menuItemId === "hookline-link" && info.linkUrl) void handleUrl(tabId, info.linkUrl);
  else if (info.menuItemId === "hookline-page") void handlePage(tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => { void chrome.storage.session.remove(key(tabId)); });

// A navigation invalidates a page/URL result for that tab (Gmail manages its own).
chrome.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status !== "loading") return;
  void (async () => {
    const s = await getState(tabId);
    if (s.mode === "page" || s.mode === "url") {
      s.requestId += 1;
      s.mode = "idle"; s.page = null; s.url = null; s.extractionFailure = null; s.isLoading = false;
      await putState(s);
    }
  })();
});

// ─── Messages ──────────────────────────────────────────────────────────────

function isMessage(m: unknown): m is ToBackgroundMessage {
  return typeof m === "object" && m !== null && typeof (m as { type?: unknown }).type === "string";
}

function isRawEmail(p: unknown): p is RawEmailData {
  if (typeof p !== "object" || p === null) return false;
  const r = p as Record<string, unknown>;
  return typeof r.subject === "string" && typeof r.senderEmail === "string" && typeof r.bodyText === "string" && Array.isArray(r.links);
}

chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
  if (!isMessage(message)) return false;
  // Only accept messages from this extension (content script / sidebar).
  if (sender.id !== chrome.runtime.id) return false;
  const fromTab = sender.tab?.id;

  switch (message.type) {
    case "EMAIL_EXTRACTION_STARTED":
      if (fromTab !== undefined) void update(fromTab, null, (s) => { s.mode = "email"; s.isLoading = true; s.extractionFailure = null; });
      return false;

    case "EMAIL_DATA_EXTRACTED":
      if (fromTab !== undefined && isRawEmail(message.payload)) void handleEmail(fromTab, message.payload);
      return false;

    case "EMAIL_EXTRACTION_FAILED":
      if (fromTab !== undefined) void update(fromTab, null, (s) => { s.mode = "email"; s.isLoading = false; s.email = null; s.extractionFailure = message.payload; });
      return false;

    case "EMAIL_VIEW_CLOSED":
      if (fromTab !== undefined) void update(fromTab, null, (s) => { s.requestId += 1; s.mode = "idle"; s.email = null; s.isLoading = false; s.extractionFailure = null; });
      return false;

    case "GET_TAB_STATE":
      void (async () => {
        const s = await getState(message.tabId);
        s.backendStatus = await backendStatus(await loadSettings());
        sendResponse(s);
      })();
      return true;

    case "ANALYZE_URL":
      void handleUrl(message.tabId, message.url);
      return false;

    case "ANALYZE_PAGE":
      void handlePage(message.tabId);
      return false;

    case "RETRY_EMAIL":
      chrome.tabs.sendMessage(message.tabId, { type: "REEXTRACT" }).catch(() => undefined);
      return false;

    case "CHECK_BACKEND":
      void (async () => {
        const status = await backendStatus(await loadSettings(), true);
        sendResponse(status);
      })();
      return true;
  }
  return false;
});
