/**
 * Scam X-ray: finds WHERE in a message each warning sign comes from, so the
 * demo can highlight it in place. It reuses the exact patterns the rules use
 * (src/shared), so a highlight is never a guess the engine didn't make.
 *
 * Only rules that actually fired are located. Nothing here changes a verdict.
 */

import { parse } from "tldts";
import { URGENCY_PATTERNS, CREDENTIAL_PATTERNS, KNOWN_BRANDS } from "../src/shared/detectionRules";
import {
  UPFRONT_FEE, CHECK_SCHEME, CHAT_APP, CHAT_LINK, CHAT_INTERVIEW, NO_INTERVIEW,
  PAY_HOURLY, PAY_DAILY, PAY_WEEKLY, PAY_EARN, LOW_EFFORT, SENSITIVE_REQUEST,
  TASK_WORD, TASK_MONEY, JOB_URGENCY,
} from "../src/shared/scamPatterns";

const URL_IN_TEXT = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

/** Patterns that locate each body-text rule. */
const BODY_PATTERNS: Record<string, RegExp[]> = {
  EMAIL_URGENCY: URGENCY_PATTERNS.map((p) => p.pattern),
  EMAIL_CREDENTIAL_REQUEST: CREDENTIAL_PATTERNS.map((p) => p.pattern),
  EMAIL_SUSPICIOUS_LINKS: [URL_IN_TEXT],
  JOB_UPFRONT_FEE: UPFRONT_FEE,
  JOB_CHECK_SCHEME: CHECK_SCHEME,
  JOB_MOVE_TO_CHAT: [CHAT_APP, CHAT_LINK],
  JOB_CHAT_INTERVIEW: CHAT_INTERVIEW,
  JOB_OFFER_NO_INTERVIEW: NO_INTERVIEW,
  JOB_UNREALISTIC_PAY: [PAY_HOURLY, PAY_DAILY, PAY_WEEKLY, PAY_EARN, LOW_EFFORT],
  JOB_SENSITIVE_INFO: [SENSITIVE_REQUEST],
  JOB_TASK_DEPOSIT: [TASK_WORD, TASK_MONEY],
  JOB_URGENCY: JOB_URGENCY,
};

/** Rules about who sent the message: highlighted on the sender line. */
export const SENDER_RULES = new Set([
  "EMAIL_BRAND_IMPERSONATION", "EMAIL_SENDER_TLD", "JOB_FREE_EMAIL_RECRUITER",
  "EMAIL_REPLYTO_MISMATCH", "EMAIL_NO_SPF", "EMAIL_NO_DMARC",
]);

/** Link rules, by the part of the address they are about. */
const URL_PART: Record<string, "scheme" | "host" | "path" | "all"> = {
  URL_NO_HTTPS: "scheme",
  URL_PATH_LOGIN: "path", URL_PATH_VERIFY: "path", URL_PATH_SCRIPT: "path", URL_PATH_BRAND: "path",
  URL_REDIRECTOR: "all",
};

export interface Flag { ruleId: string; n: number; severity: string }
/** A highlighted range. One range can carry several warning numbers (two rules about the same domain). */
export interface Span { start: number; end: number; ns: number[]; severity: string }

function globalCopy(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
}

const RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Keep the earliest, longest span when two overlap; identical ranges merge their numbers. */
function dedupe(spans: Span[]): Span[] {
  spans.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.start === last.start && s.end === last.end) {
      for (const n of s.ns) if (!last.ns.includes(n)) last.ns.push(n);
      if ((RANK[s.severity] ?? 3) < (RANK[last.severity] ?? 3)) last.severity = s.severity;
    } else if (!last || s.start >= last.end) out.push({ ...s, ns: [...s.ns] });
  }
  for (const s of out) s.ns.sort((a, b) => a - b);
  return out;
}

/** Where each fired body rule appears in the message text. */
export function bodySpans(text: string, flags: Flag[]): Span[] {
  const spans: Span[] = [];
  for (const f of flags) {
    for (const p of BODY_PATTERNS[f.ruleId] ?? []) {
      for (const m of text.matchAll(globalCopy(p))) {
        const raw = m[0].replace(/[.,;:!?]+$/, "");
        if (!raw.trim() || m.index === undefined) continue;
        spans.push({ start: m.index, end: m.index + raw.length, ns: [f.n], severity: f.severity });
      }
    }
  }
  return dedupe(spans);
}

/** Where each fired link rule sits inside the web address. */
export function urlSpans(url: string, flags: Flag[]): Span[] {
  let u: URL;
  try { u = new URL(url); } catch { return []; }
  const schemeEnd = u.protocol.length + 2;
  const hostStart = url.indexOf(u.host, schemeEnd - 2);
  const hostEnd = hostStart + u.host.length;
  const spans: Span[] = [];
  for (const f of flags) {
    if (!f.ruleId.startsWith("URL_")) continue;
    const part = URL_PART[f.ruleId] ?? "host";
    const [start, end] = part === "scheme" ? [0, schemeEnd] : part === "path" ? [hostEnd, url.length] : part === "all" ? [0, url.length] : [hostStart, hostEnd];
    if (end > start && start >= 0) spans.push({ start, end, ns: [f.n], severity: f.severity });
  }
  return dedupe(spans);
}

// ─── Link anatomy ──────────────────────────────────────────────────────────

export interface Anatomy {
  scheme: string;
  subdomain: string;
  domain: string;
  path: string;
  /** The official domain this one imitates, with per-character comparison. */
  lookalike?: { official: string; brand: string; chars: Array<{ ch: string; official: string; changed: boolean }> };
}

function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export function anatomy(url: string): Anatomy | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  const p = parse(u.hostname);
  const domain = p.domain ?? u.hostname;
  const out: Anatomy = {
    scheme: `${u.protocol}//`,
    subdomain: p.subdomain ? `${p.subdomain}.` : "",
    domain,
    path: `${u.pathname === "/" ? "" : u.pathname}${u.search}`,
  };
  let best: { official: string; brand: string; dist: number } | null = null;
  for (const b of KNOWN_BRANDS) {
    for (const official of b.officialDomains) {
      if (official === domain) return out; // it IS the real domain
      const dist = editDistance(domain, official);
      if (dist > 0 && dist <= 2 && (!best || dist < best.dist)) best = { official, brand: b.brand, dist };
    }
  }
  if (best) {
    const same = best.official.length === domain.length;
    out.lookalike = {
      official: best.official,
      brand: best.brand,
      chars: [...domain].map((ch, i) => ({ ch, official: same ? best!.official[i] : "", changed: same ? ch !== best!.official[i] : false })),
    };
  }
  return out;
}

export function linksInText(text: string): string[] {
  return [...new Set((text.match(URL_IN_TEXT) ?? []).map((s) => s.replace(/[.,;:!?]+$/, "")))];
}
