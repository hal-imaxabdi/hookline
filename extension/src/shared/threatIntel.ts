/**
 * Optional threat-intel lookups with a local cache (chrome.storage.local,
 * 6-hour TTL, max 500 entries). OFF by default; see settings.ts.
 */

import type { EvidenceItem, ThreatIntelHit } from "./types";
import type { Settings } from "./settings";
import { lookupSafeBrowsing, lookupUrlhaus, SAFE_BROWSING_ORIGIN } from "./apiClient";
import { makeEvidence } from "./riskEngine";

const CACHE_KEY = "hookline:intelCache";
const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 500;

type CacheEntry = { at: number; hits: ThreatIntelHit[] };
type Cache = Record<string, CacheEntry>;

async function readCache(): Promise<Cache> {
  const d = await chrome.storage.local.get(CACHE_KEY);
  const c = d[CACHE_KEY];
  return typeof c === "object" && c !== null ? (c as Cache) : {};
}

async function writeCache(c: Cache): Promise<void> {
  const entries = Object.entries(c).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_ENTRIES);
  await chrome.storage.local.set({ [CACHE_KEY]: Object.fromEntries(entries) });
}

export async function hasSafeBrowsingPermission(): Promise<boolean> {
  try {
    return await chrome.permissions.contains({ origins: [SAFE_BROWSING_ORIGIN] });
  } catch {
    return false;
  }
}

export interface IntelOutcome {
  hits: ThreatIntelHit[];
  errors: string[];
}

/** Look up URLs with whichever sources are enabled. Never throws. */
export async function checkThreatIntel(urls: string[], settings: Settings): Promise<IntelOutcome> {
  const wanted = [...new Set(urls.filter((u) => /^https?:\/\//i.test(u)))].slice(0, 20);
  const out: IntelOutcome = { hits: [], errors: [] };
  if (wanted.length === 0 || (!settings.safeBrowsingEnabled && !settings.urlhausEnabled)) return out;

  const cache = await readCache();
  const now = Date.now();
  const sources = `${settings.safeBrowsingEnabled ? "g" : ""}${settings.urlhausEnabled ? "u" : ""}`;
  const key = (u: string) => `${sources}|${u}`;
  const uncached = wanted.filter((u) => {
    const e = cache[key(u)];
    if (e && now - e.at < TTL_MS) { out.hits.push(...e.hits); return false; }
    return true;
  });

  const fresh: Record<string, ThreatIntelHit[]> = Object.fromEntries(uncached.map((u) => [u, []]));
  const failed = new Set<string>();

  if (settings.safeBrowsingEnabled && uncached.length) {
    if (!(await hasSafeBrowsingPermission())) {
      out.errors.push("Safe Browsing is enabled but permission to contact safebrowsing.googleapis.com was not granted.");
      uncached.forEach((u) => failed.add(u));
    } else {
      const r = await lookupSafeBrowsing(uncached, settings.safeBrowsingApiKey);
      if (r.ok) for (const h of r.data) (fresh[h.url] ??= []).push(h);
      else { out.errors.push(`Safe Browsing: ${r.reason}${r.detail ? ` (${r.detail})` : ""}`); uncached.forEach((u) => failed.add(u)); }
    }
  }

  if (settings.urlhausEnabled) {
    for (const u of uncached.slice(0, 10)) {
      const r = await lookupUrlhaus(u);
      if (r.ok) { if (r.data) (fresh[u] ??= []).push(r.data); }
      else { out.errors.push(`URLhaus: ${r.reason}${r.detail ? ` (${r.detail})` : ""}`); failed.add(u); break; }
    }
  }

  for (const [u, hits] of Object.entries(fresh)) {
    out.hits.push(...hits);
    if (!failed.has(u)) cache[key(u)] = { at: now, hits };
  }
  await writeCache(cache);
  return out;
}

export function intelEvidence(hits: ThreatIntelHit[]): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  const gsb = hits.find((h) => h.source === "google_safe_browsing");
  if (gsb) {
    out.push(makeEvidence("INTEL_SAFE_BROWSING", "Listed by Google Safe Browsing",
      `Google Safe Browsing currently lists this link as ${gsb.threat.replace(/_/g, " ").toLowerCase()}. Do not open it.`,
      gsb.url));
  }
  const uh = hits.find((h) => h.source === "urlhaus");
  if (uh) {
    out.push(makeEvidence("INTEL_URLHAUS", "Listed by abuse.ch URLhaus",
      `URLhaus lists this link as distributing malware (${uh.threat}). Do not open it or download anything from it.`,
      uh.url));
  }
  return out;
}
