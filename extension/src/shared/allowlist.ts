/**
 * Top-sites allow-list (C5).
 *
 * Source: a Tranco top-N subset — see ALLOWLIST_META for the exact list ID,
 * download date, sha256 and N. Regenerate with `npm run prepare:allowlist`.
 *
 * Effect: for an allow-listed registrable domain, rules marked
 * `allowlistSuppressible` in ruleRegistry.ts (lexical heuristics such as
 * "login path", "long hostname", "brand keyword") are ignored. Homoglyph,
 * IP-address, threat-intel and content-based scam rules still apply.
 *
 * Matching is on the PSL registrable domain (private section included), so
 * evil.github.io or evil.blogspot.com never inherit the platform's rank, and
 * user-content hosts (docs.google.com, sharepoint.com, …) are never matched.
 */

import { ALLOWLIST_DOMAINS_PACKED, ALLOWLIST_EXCLUSIONS, ALLOWLIST_GENERATED_META } from "./data/allowlist.generated";
import { getRegistrableDomain } from "./domainUtils";

const DOMAINS: ReadonlySet<string> = new Set(ALLOWLIST_DOMAINS_PACKED.split(" "));
const EXCLUSIONS: readonly string[] = ALLOWLIST_EXCLUSIONS;

export const ALLOWLIST_META = ALLOWLIST_GENERATED_META;

export function isAllowlisted(host: string): boolean {
  const h = host.toLowerCase();
  for (const ex of EXCLUSIONS) {
    if (h === ex || h.endsWith(`.${ex}`)) return false;
  }
  const reg = getRegistrableDomain(h);
  return reg !== "" && DOMAINS.has(reg);
}
