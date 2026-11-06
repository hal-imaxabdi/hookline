/**
 * Page snapshot for shopping/job-scam analysis.
 *
 * Injected ON DEMAND with chrome.scripting.executeScript({ func }) only after
 * the user clicks the toolbar icon or the context menu (activeTab grant) — no
 * content script runs on arbitrary sites. The function must be SELF-CONTAINED
 * (no imports, no closures) because Chrome serialises it into the page.
 * The snapshot is returned to the extension and never sent over the network.
 */

import type { PageSnapshot } from "../shared/types";

export function extractPageSnapshot(): PageSnapshot {
  const HEAD = 30_000;
  const TAIL = 10_000; // footers hold contact details / payment logos
  const full = (document.body?.innerText ?? document.body?.textContent ?? "").replace(/ /g, " ");
  const text = full.length > HEAD + TAIL ? `${full.slice(0, HEAD)}\n…\n${full.slice(-TAIL)}` : full;

  const links: Array<{ href: string; text: string }> = [];
  for (const a of Array.from(document.querySelectorAll("a[href]")).slice(0, 400)) {
    const href = (a as HTMLAnchorElement).href;
    if (!href) continue;
    links.push({ href, text: (a.textContent ?? "").trim().slice(0, 120) });
  }

  const parsePrice = (s: string): number | null => {
    const m = s.match(/(?:[$€£¥]|usd|eur|gbp)\s?(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)/i);
    if (!m) return null;
    let n = m[1].replace(/\s/g, "");
    if (/,\d{1,2}$/.test(n)) n = n.replace(/\./g, "").replace(",", "."); // 1.234,56
    else n = n.replace(/,/g, "");
    const v = Number(n);
    return Number.isFinite(v) && v > 0 ? v : null;
  };

  const struckSel = "del, s, strike, [class*='compare' i], [class*='was-price' i], [class*='old-price' i], [class*='original' i], [class*='regular-price' i], [class*='strike' i], [class*='price--compare' i]";
  const pricePairs: Array<{ was: number; now: number }> = [];
  for (const el of Array.from(document.querySelectorAll(struckSel)).slice(0, 200)) {
    const style = getComputedStyle(el);
    const isStruck = /^(DEL|S|STRIKE)$/.test(el.tagName) || style.textDecorationLine.includes("line-through") || /compare|was|old|original|regular|strike/i.test(el.className.toString());
    if (!isStruck) continue;
    const was = parsePrice(el.textContent ?? "");
    if (was === null) continue;
    const scope = el.parentElement?.parentElement ?? el.parentElement;
    if (!scope) continue;
    let best: number | null = null;
    for (const cand of Array.from(scope.querySelectorAll("*")).slice(0, 60)) {
      if (cand === el || cand.contains(el) || el.contains(cand) || cand.children.length > 0) continue;
      const p = parsePrice(cand.textContent ?? "");
      if (p !== null && p < was && (best === null || p < best)) best = p;
    }
    if (best !== null) pricePairs.push({ was, now: best });
    if (pricePairs.length >= 50) break;
  }

  const controls = Array.from(document.querySelectorAll("button, input[type='submit'], a[role='button'], [class*='cart' i]")).slice(0, 300);
  const hasCheckoutUi = controls.some((c) => /add to (cart|bag|basket)|buy now|checkout|check out/i.test((c.textContent ?? "") + " " + ((c as HTMLInputElement).value ?? "")));

  return {
    url: location.href,
    title: document.title.slice(0, 300),
    text,
    links,
    pricePairs,
    hasCheckoutUi,
  };
}
