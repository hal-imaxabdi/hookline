/**
 * Domain helpers shared by the analyzers.
 *
 * Registrable-domain logic uses the Public Suffix List (via tldts), including
 * its PRIVATE section, so "evil.github.io", "x.blogspot.com" and
 * "y.firebaseapp.com" are treated as separate sites, not as github.io /
 * blogspot.com / firebaseapp.com. (Change C1 in eval/TUNING_LOG.md.)
 */

import { parse } from "tldts";
import { KNOWN_BRANDS, SUSPICIOUS_TLDS, type BrandDef } from "./detectionRules";

const PARSE_OPTS = { allowPrivateDomains: true } as const;

interface Parsed {
  host: string;
  registrable: string;
  label: string;      // registrable domain without its suffix ("paypal" of paypal.co.uk)
  subdomain: string;
  isIp: boolean;
}

const cache = new Map<string, Parsed>();

export function parseHost(hostname: string): Parsed {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const hit = cache.get(host);
  if (hit) return hit;
  const p = parse(host, PARSE_OPTS);
  const isIp = p.isIp === true || /^\[[0-9a-f:.]+\]$/.test(host);
  const registrable = isIp ? host : p.domain ?? host;
  const out: Parsed = {
    host,
    registrable,
    label: isIp ? "" : p.domainWithoutSuffix ?? registrable.split(".")[0] ?? "",
    subdomain: isIp ? "" : p.subdomain ?? "",
    isIp,
  };
  if (cache.size > 50_000) cache.clear();
  cache.set(host, out);
  return out;
}

// ─── Punycode (RFC 3492) decoding ─────────────────────────────────────────
// `new URL()` converts Unicode hostnames to xn-- form, so homoglyph checks must
// decode back to Unicode to see the Cyrillic/Greek letters (C7).

function decodePunycodeLabel(input: string): string | null {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  let n = 128, i = 0, bias = 72;
  const out: number[] = [];
  let b = input.lastIndexOf("-");
  if (b < 0) b = 0;
  for (let j = 0; j < b; j++) {
    const c = input.charCodeAt(j);
    if (c >= 0x80) return null;
    out.push(c);
  }
  const adapt = (delta: number, numPoints: number, first: boolean): number => {
    let d = first ? Math.floor(delta / damp) : delta >> 1;
    d += Math.floor(d / numPoints);
    let k = 0;
    while (d > ((base - tMin) * tMax) >> 1) { d = Math.floor(d / (base - tMin)); k += base; }
    return k + Math.floor(((base - tMin + 1) * d) / (d + skew));
  };
  for (let idx = b > 0 ? b + 1 : 0; idx < input.length; ) {
    const oldi = i;
    for (let w = 1, k = base; ; k += base) {
      if (idx >= input.length) return null;
      const cp = input.charCodeAt(idx++);
      const digit =
        cp >= 48 && cp <= 57 ? cp - 22 :   // 0-9 → 26-35
        cp >= 65 && cp <= 90 ? cp - 65 :   // A-Z → 0-25
        cp >= 97 && cp <= 122 ? cp - 97 :  // a-z → 0-25
        base;
      if (digit >= base) return null;
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= base - t;
    }
    bias = adapt(i - oldi, out.length + 1, oldi === 0);
    n += Math.floor(i / (out.length + 1));
    if (n > 0x10ffff) return null;
    i %= out.length + 1;
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

/** "xn--pypal-4ve.com" → "pаypal.com" (Cyrillic а). Invalid labels are kept as-is. */
export function toUnicodeHost(host: string): string {
  if (!host.includes("xn--")) return host;
  return host
    .split(".")
    .map((l) => (l.startsWith("xn--") ? decodePunycodeLabel(l.slice(4)) ?? l : l))
    .join(".");
}

/** Last DNS label as ".tld" ("" for IPs). */
export function getTld(domain: string): string {
  if (isIpAddress(domain)) return "";
  const parts = domain.split(".");
  return parts.length >= 2 ? `.${parts[parts.length - 1]}` : "";
}

export function getRegistrableDomain(domain: string): string {
  if (!domain) return "";
  return parseHost(domain).registrable;
}

export function getRegistrableLabel(domain: string): string {
  return parseHost(domain).label;
}

export function getSubdomain(domain: string): string {
  return parseHost(domain).subdomain;
}

export function isIpAddress(host: string): boolean {
  return parseHost(host).isIp;
}

/** Number of labels left of the registrable domain ("www" is not counted). */
export function subdomainDepth(domain: string): number {
  const sub = getSubdomain(domain).replace(/^www\./, "").replace(/^www$/, "");
  return sub ? sub.split(".").length : 0;
}

/** Flag deep chains like paypal.com.secure.login.evil.xyz (≥ 3 non-www levels). */
export const DEEP_SUBDOMAIN_MIN = 3;

/** Brand TLDs operated by the brand itself (ICANN .brand registry agreements). */
const BRAND_TLDS: Record<string, string> = {
  google: "Google", youtube: "Google", gmail: "Google",
  microsoft: "Microsoft", office: "Microsoft", xbox: "Microsoft",
  apple: "Apple", amazon: "Amazon", dhl: "DHL", hsbc: "HSBC", chase: "Chase", citi: "Citi",
};

export function isOfficialBrandDomain(domain: string): boolean {
  return officialBrandFor(domain) !== null;
}

export function officialBrandFor(domain: string, brands: readonly BrandDef[] = KNOWN_BRANDS): string | null {
  const d = domain.toLowerCase();
  for (const brand of brands) {
    for (const o of brand.officialDomains) {
      if (d === o || d.endsWith(`.${o}`)) return brand.brand;
    }
  }
  // Brand-owned TLDs (.google, .microsoft, .amazon, .apple …)
  const tld = d.split(".").pop() ?? "";
  if (brands === KNOWN_BRANDS && BRAND_TLDS[tld]) return BRAND_TLDS[tld];
  // Country-code variants: google.de, amazon.co.jp, hsbc.co.uk …
  const p = parseHost(d);
  if (!p.isIp && p.label) {
    const suffix = p.registrable.slice(p.label.length + 1);
    const last = suffix.split(".").pop() ?? "";
    if (last.length === 2 && !SUSPICIOUS_TLDS.has(`.${last}`)) {
      for (const brand of brands) {
        if (!brand.ccVariants) continue;
        const primaryLabel = brand.officialDomains[0].split(".")[0];
        if (p.label === primaryLabel) return brand.brand;
      }
    }
  }
  return null;
}

export interface BrandHit {
  brand: string;
  keyword: string;
  official: string;
}

/**
 * Find a brand inside a hostname using token matching (C2): long distinctive
 * keywords may sit inside a token (paypalsecure.net), short or dictionary-like
 * ones must be a whole token (apple-id.help ✓, pineapple.com ✗, groups.io ✗).
 */
export function findBrandInHost(host: string, brands: readonly BrandDef[] = KNOWN_BRANDS): BrandHit | null {
  const h = host.toLowerCase();
  const tokens = h.split(/[.\-_]/).filter(Boolean);
  for (const brand of brands) {
    for (const raw of brand.keywords) {
      const kw = raw.toLowerCase();
      let hit: boolean;
      if (kw.includes("-")) hit = h.includes(kw);
      else if (kw.length >= 6 && !brand.wholeTokenOnly?.includes(kw)) hit = tokens.some((t) => t.includes(kw));
      else hit = tokens.includes(kw);
      if (hit) return { brand: brand.brand, keyword: raw, official: brand.officialDomains[0] };
    }
  }
  return null;
}

/** Brand labels used for typosquat comparison (C3): registrable labels of official domains. */
export const BRAND_LABELS: Array<{ brand: string; label: string; official: string }> = (() => {
  const seen = new Set<string>();
  const out: Array<{ brand: string; label: string; official: string }> = [];
  for (const b of KNOWN_BRANDS) {
    for (const o of b.officialDomains) {
      const label = parse(o, PARSE_OPTS).domainWithoutSuffix ?? o.split(".")[0];
      if (!label || seen.has(label)) continue;
      seen.add(label);
      out.push({ brand: b.brand, label, official: o });
    }
  }
  return out;
})();

/**
 * Known open-redirect / link-wrapping services and the query parameter that
 * holds the real destination (C4). Gmail itself wraps links as
 * google.com/url?q=…, and phishing kits abuse the same wrappers.
 */
const REDIRECTORS: Array<{ host: RegExp; path: RegExp; params: string[] }> = [
  { host: /^(www\.)?google\.[a-z.]+$/, path: /^\/url$/, params: ["q", "url"] },
  { host: /^(l|lm|m|www)\.facebook\.com$/, path: /^\/l\.php$/, params: ["u"] },
  { host: /^l\.instagram\.com$/, path: /^\/$/, params: ["u"] },
  { host: /\.safelinks\.protection\.outlook\.com$/, path: /^\/$/, params: ["url"] },
  { host: /^(www\.)?youtube\.com$/, path: /^\/redirect$/, params: ["q"] },
  { host: /^(www\.)?linkedin\.com$/, path: /^\/redir\/redirect$/, params: ["url"] },
  { host: /^(www\.)?bing\.com$/, path: /^\/ck\/a$/, params: ["u"] },
];

export function unwrapRedirector(url: URL, depth = 0): URL | null {
  if (depth > 3) return null;
  const host = url.hostname.toLowerCase();
  for (const r of REDIRECTORS) {
    if (!r.host.test(host) || !r.path.test(url.pathname)) continue;
    for (const p of r.params) {
      const v = url.searchParams.get(p);
      if (!v) continue;
      try {
        const inner = new URL(v.replace(/&amp;$/, ""));
        if (inner.protocol !== "http:" && inner.protocol !== "https:") continue;
        return unwrapRedirector(inner, depth + 1) ?? inner;
      } catch {
        // not a URL — ignore
      }
    }
  }
  return null;
}
