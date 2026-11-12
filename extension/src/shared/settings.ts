/**
 * User settings, stored in chrome.storage.local (never synced).
 *
 * Privacy defaults: everything that sends data off the machine is OFF except
 * the local backend, which only receives domains and itself contacts RDAP/DNS.
 */

export interface ReportLink {
  label: string;
  url: string;
}

export interface Settings {
  /** Query the local backend (http://localhost:8000) for domain age / DNS. Sends domains only. */
  backendEnabled: boolean;
  /**
   * Let the backend open a TLS connection to the domain to read its certificate.
   * Off by default: connecting to a phishing domain tells its operator your IP.
   */
  sslProbe: boolean;
  /** Google Safe Browsing v4 Lookup API. Sends full URLs to Google. Off by default. */
  safeBrowsingEnabled: boolean;
  safeBrowsingApiKey: string;
  /** abuse.ch URLhaus lookup via the local backend (needs URLHAUS_AUTH_KEY there). Off by default. */
  urlhausEnabled: boolean;
  /** When you click the toolbar icon on a normal web page, read it and check for shopping/job scams. */
  autoAnalyzePage: boolean;
  /** Briefly open Gmail's "show details" panel to read the Reply-To header, then close it again. */
  readGmailDetails: boolean;
  showWhatToDo: boolean;
  reportLinks: ReportLink[];
}

export const DEFAULT_REPORT_LINKS: ReportLink[] = [
  { label: "FTC — ReportFraud.ftc.gov (US)", url: "https://reportfraud.ftc.gov/" },
  { label: "FBI — IC3.gov (internet crime, US)", url: "https://www.ic3.gov/" },
  { label: "APWG — forward phishing to reportphishing@apwg.org", url: "mailto:reportphishing@apwg.org" },
  { label: "Google — report a phishing page", url: "https://safebrowsing.google.com/safebrowsing/report_phish/" },
];

export const DEFAULT_SETTINGS: Settings = {
  backendEnabled: false,
  sslProbe: false,
  safeBrowsingEnabled: false,
  safeBrowsingApiKey: "",
  urlhausEnabled: false,
  autoAnalyzePage: true,
  readGmailDetails: true,
  showWhatToDo: true,
  reportLinks: DEFAULT_REPORT_LINKS,
};

const KEY = "hookline:settings";

function isReportLink(x: unknown): x is ReportLink {
  return typeof x === "object" && x !== null &&
    typeof (x as ReportLink).label === "string" && typeof (x as ReportLink).url === "string";
}

/** Merge stored values over defaults, dropping anything of the wrong type. */
export function normalizeSettings(raw: unknown): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, reportLinks: [...DEFAULT_SETTINGS.reportLinks] };
  if (typeof raw !== "object" || raw === null) return s;
  const r = raw as Record<string, unknown>;
  for (const k of ["backendEnabled", "sslProbe", "safeBrowsingEnabled", "urlhausEnabled", "autoAnalyzePage", "readGmailDetails", "showWhatToDo"] as const) {
    if (typeof r[k] === "boolean") s[k] = r[k] as boolean;
  }
  if (typeof r.safeBrowsingApiKey === "string") s.safeBrowsingApiKey = r.safeBrowsingApiKey.trim();
  if (Array.isArray(r.reportLinks)) {
    const links = r.reportLinks.filter(isReportLink).filter((l) => /^(https:|mailto:)/i.test(l.url));
    if (links.length) s.reportLinks = links.slice(0, 12);
  }
  return s;
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(KEY);
  return normalizeSettings(data[KEY]);
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY]: normalizeSettings(s) });
}

export function onSettingsChanged(cb: (s: Settings) => void): () => void {
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === "local" && changes[KEY]) cb(normalizeSettings(changes[KEY].newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
