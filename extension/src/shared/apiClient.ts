/**
 * Hookline API client — local backend (domain intel, URLhaus relay) and
 * Google Safe Browsing (direct, user-supplied key).
 *
 * Every call has a hard timeout and returns a typed result instead of
 * throwing, so the UI can say "backend offline" instead of failing silently.
 */

import type { DomainInfo, ThreatIntelHit } from "./types";
import { HOOKLINE_VERSION } from "./version";

/** Where the backend runs. Must match host_permissions in manifest.json. */
export const BACKEND_URL = "http://localhost:8000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "offline" | "timeout" | "http_error" | "bad_response" | "disabled"; detail?: string };

async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function classify(err: unknown): "timeout" | "offline" {
  return err instanceof DOMException && err.name === "AbortError" ? "timeout" : "offline";
}

// ─── Backend ───────────────────────────────────────────────────────────────

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetchWithTimeout(`${BACKEND_URL}/health`, { headers: { Accept: "application/json" } }, 1500);
    if (!res.ok) return false;
    const j: unknown = await res.json();
    return typeof j === "object" && j !== null && (j as { status?: unknown }).status === "ok";
  } catch {
    return false;
  }
}

function isDomainInfo(x: unknown): x is DomainInfo {
  if (typeof x !== "object" || x === null) return false;
  const d = x as Record<string, unknown>;
  return typeof d.domain === "string" && typeof d.registrar === "string" && typeof d.isNewDomain === "boolean";
}

export async function fetchDomainInfo(domain: string, opts: { ssl: boolean }): Promise<ApiResult<DomainInfo>> {
  if (!domain || !/^[a-z0-9.-]+$/i.test(domain)) return { ok: false, reason: "bad_response", detail: "invalid domain" };
  try {
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/analyze/domain?domain=${encodeURIComponent(domain)}&ssl=${opts.ssl ? 1 : 0}`,
      { method: "GET", headers: { Accept: "application/json" } },
      10_000
    );
    if (!res.ok) return { ok: false, reason: "http_error", detail: String(res.status) };
    const j: unknown = await res.json();
    return isDomainInfo(j) ? { ok: true, data: j } : { ok: false, reason: "bad_response" };
  } catch (e) {
    return { ok: false, reason: classify(e) };
  }
}

/** URLhaus lookup relayed by the backend (which holds the abuse.ch Auth-Key). */
export async function lookupUrlhaus(url: string): Promise<ApiResult<ThreatIntelHit | null>> {
  try {
    const res = await fetchWithTimeout(
      `${BACKEND_URL}/intel/urlhaus`,
      { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ url }) },
      8000
    );
    if (res.status === 503) return { ok: false, reason: "disabled", detail: "URLhaus key not configured on backend" };
    if (!res.ok) return { ok: false, reason: "http_error", detail: String(res.status) };
    const j = (await res.json()) as { listed?: unknown; threat?: unknown };
    if (j.listed === true) return { ok: true, data: { source: "urlhaus", url, threat: typeof j.threat === "string" ? j.threat : "malware_download" } };
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, reason: classify(e) };
  }
}

// ─── Google Safe Browsing v4 Lookup API ────────────────────────────────────
// https://developers.google.com/safe-browsing/v4/lookup-api
// Sends the full URLs to Google. Only called when the user enabled it and
// granted the optional host permission.

export const SAFE_BROWSING_ORIGIN = "https://safebrowsing.googleapis.com/*";

export async function lookupSafeBrowsing(urls: string[], apiKey: string): Promise<ApiResult<ThreatIntelHit[]>> {
  if (!apiKey) return { ok: false, reason: "disabled", detail: "no API key" };
  if (urls.length === 0) return { ok: true, data: [] };
  const body = {
    client: { clientId: "hookline-research-extension", clientVersion: HOOKLINE_VERSION },
    threatInfo: {
      threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
      platformTypes: ["ANY_PLATFORM"],
      threatEntryTypes: ["URL"],
      threatEntries: urls.slice(0, 50).map((url) => ({ url })),
    },
  };
  try {
    const res = await fetchWithTimeout(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      6000
    );
    if (!res.ok) return { ok: false, reason: "http_error", detail: String(res.status) };
    const j = (await res.json()) as { matches?: Array<{ threatType?: string; threat?: { url?: string } }> };
    const hits: ThreatIntelHit[] = (j.matches ?? [])
      .filter((m) => typeof m.threat?.url === "string")
      .map((m) => ({ source: "google_safe_browsing", url: m.threat!.url!, threat: m.threatType ?? "THREAT" }));
    return { ok: true, data: hits };
  } catch (e) {
    return { ok: false, reason: classify(e) };
  }
}
