/**
 * Hookline Content Script — Phase 3
 *
 * Phase 3 upgrades:
 * - Better Gmail DOM selectors with multiple fallbacks
 * - Extracts actual email body text for keyword analysis
 * - Better Reply-To detection by expanding Gmail's detail section
 * - Deduplicates and unwraps Google redirect links
 * - Sends richer RawEmailData payload to background
 */

console.log("[Hookline Content] Phase 3 content script loaded on:", window.location.href);

// ─── State ──────────────────────────────────────────────────────────────────

let currentEmailId: string | null = null;
let observerActive = false;

// ─── Gmail Email Observer ───────────────────────────────────────────────────

function startEmailObserver(): void {
  if (observerActive) return;
  observerActive = true;

  const observer = new MutationObserver(() => {
    const emailId = getEmailIdFromUrl();
    if (emailId && emailId !== currentEmailId) {
      currentEmailId = emailId;
      // Gmail takes ~500–1000ms to fully render the email DOM
      setTimeout(() => tryExtractAndSend(), 900);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  console.log("[Hookline Content] Observer started.");
}

// ─── URL-based Email ID Detection ──────────────────────────────────────────

function getEmailIdFromUrl(): string | null {
  const hash = window.location.hash;
  const match = hash.match(/#(?:inbox|sent|spam|all|starred|snoozed|search|label)[^/]*\/([A-Za-z0-9]+)/);
  return match ? match[1] : null;
}

// ─── Extract & Send ─────────────────────────────────────────────────────────

function tryExtractAndSend(): void {
  const data = extractEmailData();
  if (!data) {
    // Retry once more — Gmail sometimes needs extra time
    setTimeout(() => {
      const retry = extractEmailData();
      if (retry) sendToBackground(retry);
    }, 600);
    return;
  }
  sendToBackground(data);
}

// ─── Core Extraction ────────────────────────────────────────────────────────

function extractEmailData(): Record<string, unknown> | null {
  // ── Subject ─────────────────────────────────────────────────────────────
  const subject =
    document.querySelector<HTMLElement>("h2.hP")?.textContent?.trim() ??
    document.querySelector<HTMLElement>("[data-legacy-thread-id] h2")?.textContent?.trim() ??
    "";

  // ── Sender ──────────────────────────────────────────────────────────────
  // Gmail renders sender info as <span email="..." name="...">
  // Multiple possible parent classes depending on Gmail version
  const senderSpan = document.querySelector<HTMLElement>(
    ".go span[email], .gD span[email], span[email][data-hovercard-id]"
  );
  const senderEmail = senderSpan?.getAttribute("email") ?? "";
  const sender = senderSpan?.getAttribute("name") ?? senderSpan?.textContent?.trim() ?? "";

  // Bail early if we clearly haven't rendered yet
  if (!senderEmail && !subject) {
    console.log("[Hookline Content] Email DOM not ready.");
    return null;
  }

  // ── Reply-To ─────────────────────────────────────────────────────────────
  // Gmail shows Reply-To only in the expanded details section.
  // Try to auto-expand it first if it isn't already open.
  let replyTo = "";
  const detailsToggle = document.querySelector<HTMLElement>(".ajx");
  if (detailsToggle && detailsToggle.getAttribute("aria-expanded") !== "true") {
    detailsToggle.click();
    // Give it a moment to expand, then read
    setTimeout(() => {
      replyTo = extractReplyTo();
    }, 200);
  } else {
    replyTo = extractReplyTo();
  }

  // ── Body Text ────────────────────────────────────────────────────────────
  const bodyEl = document.querySelector<HTMLElement>(".a3s.aiL, .a3s");
  const bodyText = bodyEl?.innerText ?? bodyEl?.textContent ?? "";

  // ── Links ────────────────────────────────────────────────────────────────
  const links = extractLinks(bodyEl);

  const payload = {
    subject,
    sender,
    senderEmail,
    replyTo,
    bodyText: bodyText.substring(0, 3000), // cap at 3000 chars to stay lean
    links,
    timestamp: new Date().toISOString(),
  };

  console.log("[Hookline Content] Extracted email data:", {
    subject,
    senderEmail,
    replyTo,
    linkCount: links.length,
    bodyLength: bodyText.length,
  });

  return payload;
}

// ─── Reply-To Extraction ────────────────────────────────────────────────────

function extractReplyTo(): string {
  // Gmail's detail rows — each is a <td> with label + value
  const detailRows = document.querySelectorAll<HTMLElement>("td.g2, .ajz");
  for (const row of detailRows) {
    const text = row.textContent ?? "";
    if (/reply.?to/i.test(text)) {
      // Try to find the sibling email span
      const emailSpan = row.parentElement?.querySelector<HTMLElement>("span[email]");
      if (emailSpan) return emailSpan.getAttribute("email") ?? "";

      // Fallback: regex parse the text
      const match = text.match(/reply.?to:\s*([^\s<>]+@[^\s<>]+)/i);
      if (match) return match[1].trim();
    }
  }
  return "";
}

// ─── Link Extraction ────────────────────────────────────────────────────────

function extractLinks(container: HTMLElement | null): Array<{ href: string; text: string; domain: string }> {
  if (!container) return [];

  const seen = new Set<string>();
  const links: Array<{ href: string; text: string; domain: string }> = [];

  container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    let href = anchor.getAttribute("href") ?? "";
    const text = anchor.textContent?.trim() ?? "";

    // Unwrap Google's tracking redirects
    if (href.startsWith("https://www.google.com/url?")) {
      try {
        const u = new URL(href);
        href = u.searchParams.get("q") ?? href;
      } catch { /* keep original */ }
    }

    // Only external HTTP links
    if (!href.startsWith("http")) return;

    // Deduplicate by href
    if (seen.has(href)) return;
    seen.add(href);

    let domain = "";
    try { domain = new URL(href).hostname; } catch { domain = href; }

    links.push({ href, text, domain });
  });

  return links;
}

// ─── Send to Background ─────────────────────────────────────────────────────

function sendToBackground(data: Record<string, unknown>): void {
  chrome.runtime
    .sendMessage({ type: "EMAIL_DATA_EXTRACTED", payload: data })
    .then(() => console.log("[Hookline Content] Email data sent to background."))
    .catch((err) => console.warn("[Hookline Content] Send failed:", err));
}

// ─── Navigation listeners ────────────────────────────────────────────────────

function setupNavigationListeners(): void {
  const notify = () => {
    chrome.runtime
      .sendMessage({
        type: "PAGE_NAVIGATED",
        payload: { url: window.location.href, hostname: window.location.hostname },
      })
      .catch(() => {});
  };
  window.addEventListener("hashchange", notify);
  window.addEventListener("popstate", notify);
}

// ─── Init ────────────────────────────────────────────────────────────────────

function init(): void {
  startEmailObserver();
  setupNavigationListeners();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
