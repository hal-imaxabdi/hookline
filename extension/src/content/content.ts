let currentEmailId: string | null = null;
let observerActive = false;

console.log("[Hookline] content script loaded. frame:", window === window.top ? "TOP" : "IFRAME", "url:", window.location.href);

function isAlive(): boolean {
  try { return !!chrome.runtime?.id; } catch { return false; }
}

function getEmailIdFromUrl(): string | null {
  const match = window.location.hash.match(
    /#(?:inbox|sent|spam|all|starred|snoozed|search|label)[^/]*\/([A-Za-z0-9]+)/
  );
  return match ? match[1] : null;
}

function extractReplyTo(): string {
  const detailRows = document.querySelectorAll<HTMLElement>("td.g2, .ajz");
  for (const row of detailRows) {
    const text = row.textContent ?? "";
    if (/reply.?to/i.test(text)) {
      const emailSpan = row.parentElement?.querySelector<HTMLElement>("span[email]");
      if (emailSpan) return emailSpan.getAttribute("email") ?? "";
      const match = text.match(/reply.?to:\s*([^\s<>]+@[^\s<>]+)/i);
      if (match) return match[1].trim();
    }
  }
  return "";
}

function extractLinks(container: HTMLElement | null): Array<{ href: string; text: string; domain: string }> {
  if (!container) return [];
  const seen = new Set<string>();
  const links: Array<{ href: string; text: string; domain: string }> = [];
  container.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
    let href = anchor.getAttribute("href") ?? "";
    const text = anchor.textContent?.trim() ?? "";
    if (href.startsWith("https://www.google.com/url?")) {
      try { href = new URL(href).searchParams.get("q") ?? href; } catch { /* keep */ }
    }
    if (!href.startsWith("http") || seen.has(href)) return;
    seen.add(href);
    let domain = "";
    try { domain = new URL(href).hostname; } catch { domain = href; }
    links.push({ href, text, domain });
  });
  return links;
}

function findSenderSpan(): HTMLElement | null {
  // Primary: the sender span itself carries class "gD" and the email attribute directly
  const primary = document.querySelector<HTMLElement>("span.gD[email], span.go[email]");
  if (primary) return primary;

  // Fallback: any [email] element that isn't the "me" (recipient) span
  const candidates = [...document.querySelectorAll<HTMLElement>("span[email]")];
  return candidates.find((el) => el.getAttribute("name") !== "me") ?? null;
}

function extractEmailData(): Record<string, unknown> | null {
  const subject =
    document.querySelector<HTMLElement>("h2.hP")?.textContent?.trim() ??
    document.querySelector<HTMLElement>("[data-legacy-thread-id] h2")?.textContent?.trim() ??
    "";

  const senderSpan = findSenderSpan();
  const senderEmail = senderSpan?.getAttribute("email") ?? "";
  const sender = senderSpan?.getAttribute("name") ?? senderSpan?.textContent?.trim() ?? "";

  console.log("[Hookline] extractEmailData -> subject:", JSON.stringify(subject), "senderEmail:", JSON.stringify(senderEmail));

  if (!senderEmail && !subject) {
    console.log("[Hookline] extractEmailData -> NO subject AND no senderEmail found, returning null. Gmail DOM selectors did not match.");
    return null;
  }

  const detailsToggle = document.querySelector<HTMLElement>(".ajx");
  if (detailsToggle && detailsToggle.getAttribute("aria-expanded") !== "true") {
    detailsToggle.click();
  }

  const replyTo = extractReplyTo();
  const bodyEl = document.querySelector<HTMLElement>(".a3s.aiL, .a3s");
  const bodyText = bodyEl?.innerText ?? bodyEl?.textContent ?? "";
  const links = extractLinks(bodyEl);

  return {
    subject,
    sender,
    senderEmail,
    replyTo,
    bodyText: bodyText.substring(0, 3000),
    links,
    timestamp: new Date().toISOString(),
  };
}

function sendToBackground(data: Record<string, unknown>): void {
  if (!isAlive()) return;

  // Wake the service worker with a port ping first
  try { chrome.runtime.connect({ name: "hookline-wakeup" }).disconnect(); } catch { /* ignore */ }

  setTimeout(() => {
    if (!isAlive()) return;
    chrome.runtime
      .sendMessage({ type: "EMAIL_DATA_EXTRACTED", payload: data })
      .then(() => console.log("[Hookline] Email sent to background."))
      .catch((err) => console.warn("[Hookline] Send failed:", err));
  }, 150);
}

function tryExtractAndSend(): void {
  console.log("[Hookline] tryExtractAndSend called for emailId:", currentEmailId);
  const targetEmailId = currentEmailId;
  let attempt = 0;
  const maxAttempts = 10; // 10 x 400ms = 4 seconds of polling

  const poll = () => {
    if (currentEmailId !== targetEmailId) {
      console.log("[Hookline] user navigated away before extraction finished, aborting.");
      return;
    }
    attempt++;
    const data = extractEmailData();
    if (data) {
      console.log(`[Hookline] extraction succeeded on attempt ${attempt}.`);
      sendToBackground(data);
      return;
    }
    if (attempt < maxAttempts) {
      setTimeout(poll, 400);
    } else {
      console.log("[Hookline] extraction failed after", maxAttempts, "attempts. Gmail's DOM did not settle or selectors are wrong for this view.");
    }
  };

  poll();
}

function startObserver(): void {
  if (observerActive) return;
  observerActive = true;
  console.log("[Hookline] observer started. current hash:", window.location.hash);

  const observer = new MutationObserver(() => {
    if (!isAlive()) { observer.disconnect(); observerActive = false; return; }
    const emailId = getEmailIdFromUrl();
    if (emailId && emailId !== currentEmailId) {
      console.log("[Hookline] new email id detected from URL:", emailId, "(previous:", currentEmailId, ")");
      currentEmailId = emailId;
      setTimeout(tryExtractAndSend, 900);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startObserver);
} else {
  startObserver();
}