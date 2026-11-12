/**
 * Hookline web demo — runs the extension's own rule engine in a plain web page,
 * so anyone can try it without installing the extension.
 *
 * Privacy: this page makes no network requests. Everything typed here is
 * analysed in the browser by the same code the extension uses.
 * Safety: results are rendered with textContent only, never innerHTML, so
 * pasted text cannot inject markup into the page.
 */

import { analyzeEmail } from "../src/shared/emailAnalyzer";
import { analyzeUrl } from "../src/shared/urlAnalyzer";
import { ADVICE } from "../src/shared/advice";
import { CATEGORY_DISPLAY, type CategoryResult, type EvidenceItem, type RawEmailData, type RiskLevel } from "../src/shared/types";

interface Example { label: string; mode: "message" | "link"; sender?: string; senderEmail?: string; subject?: string; body?: string; url?: string }

/** SYNTHETIC examples written for this demo. None is a real message. */
const EXAMPLES: Example[] = [
  {
    label: "Fake PayPal alert", mode: "message",
    sender: "PayPal Security", senderEmail: "security.team.alerts@gmail.com",
    subject: "Urgent: verify your PayPal account",
    body: "Dear customer, we detected unusual activity on your PayPal account. Your account will be suspended within 24 hours unless you verify your password immediately. Click here to confirm your password: https://paypa1.com/login",
  },
  {
    label: "Fake internship offer", mode: "message",
    sender: "Contoso Talent Team", senderEmail: "contoso.talent.team@gmail.com",
    subject: "Internship offer - Data Analyst Intern",
    body: "I am the hiring manager at Contoso and we reviewed your resume for the data analyst internship. You are hired, no interview is needed. The position pays $45/hr with no experience required. Before onboarding, you will need to pay a refundable $150 training fee for the starter kit. Please contact our hiring manager on Telegram to continue the process.",
  },
  {
    label: "Ordinary email", mode: "message",
    sender: "Amina", senderEmail: "amina@student.example.edu",
    subject: "Notes from Tuesday's class",
    body: "Hi, here are the notes from Tuesday's networking class. Let me know if you want to study together before the quiz on Friday.",
  },
  { label: "Look-alike link", mode: "link", url: "https://paypa1.com/login" },
];

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/gi;

function linksIn(text: string): RawEmailData["links"] {
  const out: RawEmailData["links"] = [];
  const seen = new Set<string>();
  for (const m of text.match(URL_RE) ?? []) {
    const href = m.replace(/[.,;:!?]+$/, "");
    if (seen.has(href)) continue;
    seen.add(href);
    try { out.push({ href, text: href, domain: new URL(href).hostname }); } catch { /* not a URL */ }
    if (out.length >= 50) break;
  }
  return out;
}

interface View { verdict: RiskLevel; riskScore: number; category: CategoryResult; evidence: EvidenceItem[]; note?: string }

function $<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el as T;
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

let mode: "message" | "link" = "message";

function analyse(): View | null {
  if (mode === "link") {
    let url = $<HTMLInputElement>("f-url").value.trim();
    if (!url) return null;
    // A bare domain is treated as https so the "no HTTPS" rule isn't triggered by missing typing.
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    const r = analyzeUrl(url);
    if (r.error) return { verdict: "unknown", riskScore: 0, category: r.category, evidence: [], note: "That doesn't look like a web address. Try something like https://example.com/page." };
    return r;
  }
  const body = $<HTMLTextAreaElement>("f-body").value;
  const subject = $<HTMLInputElement>("f-subject").value;
  const sender = $<HTMLInputElement>("f-sender").value;
  const senderEmail = $<HTMLInputElement>("f-email").value.trim();
  if (!body.trim() && !subject.trim()) return null;
  return analyzeEmail({ subject, sender, senderEmail, replyTo: "", bodyText: body.slice(0, 20_000), links: linksIn(body), timestamp: new Date().toISOString() });
}

function render(v: View | null): void {
  const out = $("result");
  out.replaceChildren();
  if (!v) {
    out.dataset.verdict = "idle";
    out.append(el("p", "idle-title", "Nothing to read yet"), el("p", "idle-text", "Pick an example on the left, or type a message of your own. Hookline reads it as you type."));
    return;
  }
  if (v.note) {
    out.dataset.verdict = "idle";
    out.append(el("p", "idle-title", "Couldn't read that"), el("p", "idle-text", v.note));
    return;
  }
  const risky = v.verdict === "high_risk" || v.verdict === "suspicious";
  out.dataset.verdict = v.verdict;

  const card = el("div", "verdict");
  card.append(el("p", "verdict-title", v.verdict === "high_risk" ? "High risk" : v.verdict === "suspicious" ? "Suspicious" : "No warning signs found"));
  card.append(el("p", "verdict-sub", risky
    ? `Risk score ${v.riskScore}/100 · ${CATEGORY_DISPLAY[v.category.label]}`
    : `Risk score ${v.riskScore}/100 · Hookline can miss scams, so stay careful`));
  out.append(card);

  if (risky) {
    out.append(el("h3", "", "Why Hookline flagged this"));
    const list = el("ul", "reasons");
    const order = (e: EvidenceItem) => (e.severity === "high" ? 0 : e.severity === "medium" ? 1 : 2);
    for (const e of [...v.evidence].sort((a, b) => order(a) - order(b))) {
      const li = el("li");
      li.append(el("p", "reason-title", e.title), el("p", "reason-text", e.description.replace(/\s*See the Links tab\.$/, "")), el("code", "rule", e.ruleId));
      list.append(li);
    }
    out.append(list);

    out.append(el("h3", "", "What to do"));
    const tips = el("ul", "tips");
    for (const t of ADVICE[v.category.label]) tips.append(el("li", "", t));
    out.append(tips);
  } else {
    out.append(el("h3", "", "What this means"));
    out.append(el("p", "plain", v.evidence.length === 0
      ? "None of Hookline's 47 rules matched. That is not proof the message is safe: in testing, Hookline missed about 75% of phishing links. If something still feels off, check with the sender another way."
      : `Only minor signals matched (score ${v.riskScore}/100), which is not enough to flag. That is not proof the message is safe.`));
  }
}

function setMode(next: "message" | "link"): void {
  mode = next;
  $("pane-message").hidden = next !== "message";
  $("pane-link").hidden = next !== "link";
  for (const m of ["message", "link"] as const) $(`tab-${m}`).setAttribute("aria-selected", String(m === next));
}

function load(ex: Example): void {
  setMode(ex.mode);
  if (ex.mode === "link") $<HTMLInputElement>("f-url").value = ex.url ?? "";
  else {
    $<HTMLInputElement>("f-sender").value = ex.sender ?? "";
    $<HTMLInputElement>("f-email").value = ex.senderEmail ?? "";
    $<HTMLInputElement>("f-subject").value = ex.subject ?? "";
    $<HTMLTextAreaElement>("f-body").value = ex.body ?? "";
  }
  render(analyse());
}

function start(): void {
  const chips = $("examples");
  for (const ex of EXAMPLES) {
    const b = el("button", "chip", ex.label) as HTMLButtonElement;
    b.type = "button";
    b.addEventListener("click", () => load(ex));
    chips.append(b);
  }
  $("tab-message").addEventListener("click", () => { setMode("message"); render(analyse()); });
  $("tab-link").addEventListener("click", () => { setMode("link"); render(analyse()); });

  let timer: ReturnType<typeof setTimeout> | undefined;
  for (const id of ["f-sender", "f-email", "f-subject", "f-body", "f-url"]) {
    $(id).addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(() => render(analyse()), 200); });
  }
  $("clear").addEventListener("click", () => {
    for (const id of ["f-sender", "f-email", "f-subject", "f-body", "f-url"]) ($(id) as HTMLInputElement).value = "";
    render(null);
  });
  load(EXAMPLES[0]);
}

start();
