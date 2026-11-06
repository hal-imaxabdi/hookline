/**
 * Gmail content script (top frame only).
 *
 * Watches for an opened email (URL hash change + DOM mutations), extracts it
 * with fallback selectors (gmailExtractor.ts) and hands it to the background
 * worker. If Gmail's DOM can't be read, it reports EMAIL_EXTRACTION_FAILED so
 * the sidebar shows "Couldn't read this email" instead of failing silently.
 *
 * Privacy: the extracted email goes only to this extension's own background
 * worker (chrome.runtime.sendMessage). It is never sent over the network.
 */

import { extractOpenEmail, parseGmailHash, readHeaderDetail, findDetailsToggle, findOpenMessage } from "./gmailExtractor";
import type { RawEmailData, ToBackgroundMessage, ToContentMessage } from "../shared/types";
import { loadSettings } from "../shared/settings";

const LOG = "[Hookline]";
const EXTRACT_TIMEOUT_MS = 8000;

let lastSentKey: string | null = null;
let failedThread: string | null = null;
let currentThread: string | null = null;
let hadEmail = false;
let pending: ReturnType<typeof setTimeout> | null = null;
let waiter: { observer: MutationObserver; timer: ReturnType<typeof setTimeout> } | null = null;

function alive(): boolean {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

function send(msg: ToBackgroundMessage): void {
  if (!alive()) return;
  chrome.runtime.sendMessage(msg).catch(() => { /* worker asleep / sidebar closed */ });
}

function stopWaiting(): void {
  if (waiter) { waiter.observer.disconnect(); clearTimeout(waiter.timer); waiter = null; }
}

/** Wait (up to timeoutMs) until fn() returns non-null, re-checking on DOM changes. */
function waitFor<T>(fn: () => T | null, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const first = fn();
    if (first !== null) return resolve(first);
    const obs = new MutationObserver(() => {
      const v = fn();
      if (v !== null) { obs.disconnect(); clearTimeout(t); resolve(v); }
    });
    const t = setTimeout(() => { obs.disconnect(); resolve(fn()); }, timeoutMs);
    obs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded", "class"] });
  });
}

/**
 * Reply-To is only in the DOM after "show details" is opened. If the user
 * allows it, open the panel, read reply-to / mailed-by / signed-by, and close
 * it again so the user's view is unchanged.
 */
async function readDetails(data: RawEmailData): Promise<RawEmailData> {
  const already = { replyTo: readHeaderDetail(document, "reply-to"), mailedBy: readHeaderDetail(document, "mailed-by"), signedBy: readHeaderDetail(document, "signed-by") };
  if (already.mailedBy || already.signedBy || already.replyTo) return { ...data, ...pick(already) };

  const settings = await loadSettings();
  if (!settings.readGmailDetails) return data;
  const msg = findOpenMessage(document);
  const toggle = msg ? findDetailsToggle(msg.container) : null;
  if (!toggle) return data;

  toggle.click();
  const found = await waitFor(() => {
    const m = readHeaderDetail(document, "mailed-by");
    const s = readHeaderDetail(document, "signed-by");
    const r = readHeaderDetail(document, "reply-to");
    return m || s || r ? { replyTo: r, mailedBy: m, signedBy: s } : null;
  }, 1200);
  // Close the panel again by clicking the same toggle.
  toggle.click();
  return found ? { ...data, ...pick(found) } : data;
}

function pick(d: { replyTo: string; mailedBy: string; signedBy: string }): Partial<RawEmailData> {
  const out: Partial<RawEmailData> = {};
  if (d.replyTo) out.replyTo = d.replyTo;
  if (d.mailedBy) out.mailedBy = d.mailedBy;
  if (d.signedBy) out.signedBy = d.signedBy;
  return out;
}

async function handleOpenEmail(threadId: string, force: boolean): Promise<void> {
  const quick = extractOpenEmail(document);
  if (quick.ok && quick.messageKey === lastSentKey && !force) return;

  stopWaiting();
  send({ type: "EMAIL_EXTRACTION_STARTED" });

  const result = quick.ok ? quick : await new Promise<ReturnType<typeof extractOpenEmail>>((resolve) => {
    const observer = new MutationObserver(() => {
      const r = extractOpenEmail(document);
      if (r.ok) { stopWaiting(); resolve(r); }
    });
    const timer = setTimeout(() => { stopWaiting(); resolve(extractOpenEmail(document)); }, EXTRACT_TIMEOUT_MS);
    waiter = { observer, timer };
    observer.observe(document.body, { childList: true, subtree: true });
  });

  if (currentThread !== threadId) return; // user navigated away meanwhile

  if (result.ok) {
    lastSentKey = result.messageKey;
    failedThread = null;
    hadEmail = true;
    const data = await readDetails(result.data);
    console.debug(LOG, "extracted via", data.extractionPath);
    send({ type: "EMAIL_DATA_EXTRACTED", payload: data });
  } else if (failedThread !== threadId || force) {
    failedThread = threadId;
    console.warn(LOG, "extraction failed:", result.detail);
    send({
      type: "EMAIL_EXTRACTION_FAILED",
      payload: {
        reason: result.reason,
        message: "Hookline couldn't read this email. Gmail may have changed its layout, or the message is still loading. Try Retry, or open the email again.",
      },
    });
  }
}

function evaluateView(force = false): void {
  const parsed = parseGmailHash(window.location.hash);
  if (!parsed) {
    currentThread = null;
    stopWaiting();
    if (hadEmail) { hadEmail = false; lastSentKey = null; send({ type: "EMAIL_VIEW_CLOSED" }); }
    return;
  }
  if (parsed.threadId !== currentThread) { currentThread = parsed.threadId; failedThread = null; }
  void handleOpenEmail(parsed.threadId, force);
}

function schedule(force = false, delay = 300): void {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => { pending = null; if (alive()) evaluateView(force); }, delay);
}

function start(): void {
  if (window !== window.top) return;
  window.addEventListener("hashchange", () => schedule(false, 150));
  // Opening another message in the same thread doesn't change the hash —
  // watch the DOM too (debounced; extraction is cheap and keyed by message).
  const observer = new MutationObserver(() => {
    if (!alive()) { observer.disconnect(); return; }
    if (currentThread) schedule(false, 600);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  chrome.runtime.onMessage.addListener((msg: ToContentMessage) => {
    if (msg?.type === "REEXTRACT") { lastSentKey = null; schedule(true, 0); }
  });
  schedule(false, 500);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
else start();
