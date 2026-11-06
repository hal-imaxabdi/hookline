/**
 * Gmail DOM extraction — pure functions over a Document so they can be
 * unit-tested with JSDOM fixtures (tests/fixtures/gmail/*.html).
 *
 * Gmail has no public DOM contract and obfuscates class names, so every
 * field has an ordered FALLBACK CHAIN: stable-ish semantic attributes first
 * (data-message-id, span[email], role), Gmail class names second. The chain
 * that matched is reported so breakage can be diagnosed from the console.
 *
 * Verified against Gmail's DOM structure as documented by open-source Gmail
 * extensions (2024–2025). Gmail can change at any time — see README "Limitations".
 */

import type { RawEmailData } from "../shared/types";

export const GMAIL_SELECTORS = {
  /** Message containers in a conversation (expanded and collapsed). */
  message: ["div.adn.ads[data-message-id]", "div[data-message-id]", "div[data-legacy-message-id]", "div.adn.ads"],
  /** Message body inside a container. Only EXPANDED messages have one. */
  body: ["div.a3s.aiL", "div.a3s", "div[data-message-id] div.ii.gt div", "div.ii.gt"],
  /** Sender inside a message header. */
  sender: ["span.gD[email]", "h3.iw span[email]", "span[email][name]", "span[email]"],
  /** Thread subject. */
  subject: ["h2.hP", "h2[data-thread-perm-id]", "[data-thread-perm-id] h2", "div[role='main'] h2"],
  /** "Show details" toggle under the sender line. */
  detailsToggle: ["img.ajz", "[aria-label='Show details']", "div.ajy[role='button']", "span.ajz"],
} as const;

// ─── URL hash → open message ───────────────────────────────────────────────

/**
 * Gmail URLs look like  #inbox/FMfcgzQXJ…, #label/Work/FMfcgz…,
 * #search/invoice/FMfcgz…, #category/promotions/FMfcgz…, #imp/…, #trash/….
 * The thread ID is ALWAYS the last path segment and is a long opaque token.
 * (The v1.0.0 regex captured the label / search term instead.)
 */
export function parseGmailHash(hash: string): { view: string; threadId: string } | null {
  const h = hash.replace(/^#/, "").split("?")[0];
  if (!h) return null;
  const parts = h.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  // Thread IDs: FMfcgz… (≥ 20 chars, base-64ish) or legacy 16-hex. Reject page markers like "p2".
  if (!/^[A-Za-z0-9_-]{16,}$/.test(last)) return null;
  if (/^p\d+$/.test(last)) return null;
  return { view: parts[0], threadId: last };
}

// ─── Selector helpers ──────────────────────────────────────────────────────

function firstMatch<E extends Element>(root: ParentNode, chain: readonly string[]): { el: E; selector: string } | null {
  for (const sel of chain) {
    const el = root.querySelector<E>(sel);
    if (el) return { el, selector: sel };
  }
  return null;
}

function allMatches(root: ParentNode, chain: readonly string[]): { els: Element[]; selector: string } | null {
  for (const sel of chain) {
    const els = [...root.querySelectorAll(sel)];
    if (els.length) return { els, selector: sel };
  }
  return null;
}

/**
 * The message the user is reading: the LAST expanded message in the thread
 * (Gmail expands the newest message; older ones are collapsed and have no body).
 * v1.0.0 used document.querySelector(), which took the OLDEST message's sender.
 */
export function findOpenMessage(doc: Document): { container: Element; body: Element; path: string[] } | null {
  const containers = allMatches(doc, GMAIL_SELECTORS.message);
  if (containers) {
    for (let i = containers.els.length - 1; i >= 0; i--) {
      const body = firstMatch(containers.els[i], GMAIL_SELECTORS.body);
      if (body) return { container: containers.els[i], body: body.el, path: [`message:${containers.selector}`, `body:${body.selector}`] };
    }
  }
  // Fallback: no recognisable container — take the last body and climb to a
  // parent that also holds a sender span.
  for (const sel of GMAIL_SELECTORS.body) {
    const bodies = doc.querySelectorAll(sel);
    if (!bodies.length) continue;
    const body = bodies[bodies.length - 1];
    let node: Element | null = body.parentElement;
    for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
      if (firstMatch(node, GMAIL_SELECTORS.sender)) return { container: node, body, path: ["message:ancestor-fallback", `body:${sel}`] };
    }
  }
  return null;
}

// ─── Field extraction ─────────────────────────────────────────────────────

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function cleanText(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export function extractSender(container: Element): { name: string; email: string; selector: string } | null {
  for (const sel of GMAIL_SELECTORS.sender) {
    for (const el of container.querySelectorAll(sel)) {
      const email = el.getAttribute("email") ?? "";
      if (!EMAIL_RE.test(email)) continue;
      // Skip the recipient ("to me") spans that Gmail also marks with [email].
      if (el.closest(".hb, .g2") && sel === "span[email]") continue;
      return { name: el.getAttribute("name") ?? cleanText(el.textContent), email: email.toLowerCase(), selector: sel };
    }
  }
  return null;
}

/**
 * Header rows in Gmail's "show details" popup: a label cell ("reply-to:",
 * "mailed-by:", "signed-by:") followed by a value cell. Read without
 * depending on class names: find cells whose whole text is the label.
 */
export function readHeaderDetail(root: ParentNode, label: "reply-to" | "mailed-by" | "signed-by"): string {
  const re = new RegExp(`^${label.replace("-", "[-\\s]?")}:?$`, "i");
  for (const cell of root.querySelectorAll("td, span, div")) {
    if (cell.children.length > 2) continue;
    if (!re.test(cleanText(cell.textContent))) continue;
    const valueCell = cell.nextElementSibling ?? cell.parentElement?.nextElementSibling ?? null;
    if (!valueCell) continue;
    const span = valueCell.querySelector("[email]");
    if (span?.getAttribute("email")) return span.getAttribute("email")!.toLowerCase();
    const txt = cleanText(valueCell.textContent);
    if (label === "reply-to") return txt.match(EMAIL_RE)?.[0]?.toLowerCase() ?? "";
    return txt.split(/\s/)[0]?.toLowerCase() ?? "";
  }
  return "";
}

export function extractSubject(doc: Document): string {
  const m = firstMatch<HTMLElement>(doc, GMAIL_SELECTORS.subject);
  return cleanText(m?.el.textContent);
}

/** Gmail wraps links as https://www.google.com/url?q=<real>; unwrap them. */
export function unwrapGmailHref(href: string): string {
  if (/^https:\/\/www\.google\.com\/url\?/i.test(href)) {
    try { return new URL(href).searchParams.get("q") ?? href; } catch { return href; }
  }
  return href;
}

export function extractLinks(body: Element): RawEmailData["links"] {
  const seen = new Set<string>();
  const out: RawEmailData["links"] = [];
  for (const a of body.querySelectorAll("a[href]")) {
    // Gmail keeps the real URL in href and its google.com/url wrapper in
    // data-saferedirecturl; unwrap in case only the wrapper is present.
    const href = unwrapGmailHref(a.getAttribute("href") ?? "");
    if (!/^https?:\/\//i.test(href) || seen.has(href)) continue;
    seen.add(href);
    let domain = "";
    try { domain = new URL(href).hostname; } catch { continue; }
    out.push({ href, text: cleanText(a.textContent).slice(0, 200), domain });
    if (out.length >= 100) break;
  }
  return out;
}

/** Body text: keep up to 20,000 chars (v1.0.0 truncated at 3,000). Stays local. */
export const BODY_LIMIT = 20_000;

function bodyText(body: Element): string {
  const el = body as HTMLElement;
  const t = (typeof el.innerText === "string" && el.innerText.length ? el.innerText : el.textContent) ?? "";
  return t.slice(0, BODY_LIMIT);
}

export type ExtractOutcome =
  | { ok: true; data: RawEmailData; messageKey: string }
  | { ok: false; reason: "no_message_found" | "selectors_failed"; detail: string };

export function extractOpenEmail(doc: Document): ExtractOutcome {
  const msg = findOpenMessage(doc);
  if (!msg) return { ok: false, reason: "no_message_found", detail: "No expanded message body matched any selector." };

  const sender = extractSender(msg.container);
  if (!sender) return { ok: false, reason: "selectors_failed", detail: `Found a message body (${msg.path.join(", ")}) but no sender address.` };

  const subject = extractSubject(doc);
  const replyTo = readHeaderDetail(doc, "reply-to");
  const messageKey =
    msg.container.getAttribute("data-message-id") ??
    msg.container.getAttribute("data-legacy-message-id") ??
    `${sender.email}|${subject}|${cleanText(msg.body.textContent).slice(0, 80)}`;

  return {
    ok: true,
    messageKey,
    data: {
      subject,
      sender: sender.name,
      senderEmail: sender.email,
      replyTo,
      bodyText: bodyText(msg.body),
      links: extractLinks(msg.body),
      timestamp: new Date().toISOString(),
      extractionPath: [...msg.path, `sender:${sender.selector}`].join(" · "),
    },
  };
}

export function findDetailsToggle(container: ParentNode): HTMLElement | null {
  return firstMatch<HTMLElement>(container, GMAIL_SELECTORS.detailsToggle)?.el ?? null;
}
