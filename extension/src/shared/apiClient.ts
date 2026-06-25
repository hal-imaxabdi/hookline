/**
 * Hookline API Client — Phase 7
 *
 * Talks to the local Hookline backend for domain registration intelligence.
 * Designed to fail SILENTLY: if the backend is offline or slow, this returns
 * null and the extension's local analysis continues working unchanged.
 */

import { DomainInfo } from "./types";

// Where the backend runs. Change this if you start uvicorn on another port.
export const BACKEND_URL = "http://localhost:8000";

export async function fetchDomainInfo(domain: string): Promise<DomainInfo | null> {
  if (!domain || domain.includes(" ")) return null;

  try {
    const res = await fetch(
      `${BACKEND_URL}/analyze/domain?domain=${encodeURIComponent(domain)}`,
      { method: "GET", headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    return (await res.json()) as DomainInfo;
  } catch {
    // Backend not running / unreachable — that's fine, stay quiet.
    return null;
  }
}
