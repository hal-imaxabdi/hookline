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
import { anatomy, bodySpans, linksInText, SENDER_RULES, urlSpans, type Flag, type Span } from "./xray";
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
    label: "Fake internship", mode: "message",
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

/** What was checked, kept so the X-ray can be drawn from exactly the same input. */
interface Checked {
  view: View;
  mode: "message" | "link";
  url?: string;
  body?: string;
  sender?: string;
  senderEmail?: string;
  subject?: string;
}

type Numbered = EvidenceItem & { n: number };

function $<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

let mode: "message" | "link" = "message";
const narrow = () => window.matchMedia("(max-width: 900px)").matches;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function analyse(): Checked | null {
  if (mode === "link") {
    let url = $<HTMLInputElement>("f-url").value.trim();
    if (!url) return null;
    // A bare domain is treated as https so the "no HTTPS" rule isn't triggered by missing typing.
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    const r = analyzeUrl(url);
    if (r.error) return { mode, url, view: { verdict: "unknown", riskScore: 0, category: r.category, evidence: [], note: "That doesn't look like a web address. Try something like https://example.com/page." } };
    return { mode, url, view: r };
  }
  const body = $<HTMLTextAreaElement>("f-body").value.slice(0, 20_000);
  const subject = $<HTMLInputElement>("f-subject").value;
  const sender = $<HTMLInputElement>("f-sender").value;
  const senderEmail = $<HTMLInputElement>("f-email").value.trim();
  if (!body.trim() && !subject.trim()) return null;
  const view = analyzeEmail({ subject, sender, senderEmail, replyTo: "", bodyText: body, links: linksIn(body), timestamp: new Date().toISOString() });
  return { mode, view, body, sender, senderEmail, subject };
}

const SEV_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const sevWord = (s: string) => (s === "high" ? "High" : s === "medium" ? "Medium" : "Low");

function numbered(v: View): Numbered[] {
  return [...v.evidence].sort((a, b) => (SEV_RANK[a.severity] ?? 3) - (SEV_RANK[b.severity] ?? 3)).map((e, i) => ({ ...e, n: i + 1 }));
}

// ─── Linked highlighting: reason ⇄ words in the message ────────────────────

function setFocus(n: number | null): void {
  for (const x of document.querySelectorAll(".on")) x.classList.remove("on");
  if (n === null) { delete document.body.dataset.focus; return; }
  const hits = document.querySelectorAll(`[data-n~="${n}"]`);
  if (!hits.length) return;
  document.body.dataset.focus = String(n);
  for (const x of hits) x.classList.add("on");
}

function nOf(target: EventTarget | null): number | null {
  const host = (target as HTMLElement | null)?.closest?.("[data-n]") as HTMLElement | null;
  return host ? Number((host.dataset.n ?? "").split(" ")[0]) : null;
}

/** Append text to `parent`, wrapping each span in a numbered <mark>. textContent only. */
function appendMarked(parent: HTMLElement, text: string, spans: Span[], counter: { i: number }): void {
  let at = 0;
  for (const s of spans) {
    if (s.start > at) parent.append(document.createTextNode(text.slice(at, s.start)));
    const m = el("mark", `hl sev-${s.severity}`, text.slice(s.start, s.end));
    m.dataset.n = s.ns.join(" ");
    m.style.setProperty("--i", String(counter.i++));
    m.title = `Warning sign ${s.ns.join(" and ")}`;
    parent.append(m);
    at = s.end;
  }
  if (at < text.length) parent.append(document.createTextNode(text.slice(at)));
}

// ─── Left: the X-ray of the checked message ───────────────────────────────

function renderXray(c: Checked, items: Numbered[]): void {
  const box = $("xray");
  box.replaceChildren();
  const flags: Flag[] = items.map((e) => ({ ruleId: e.ruleId, n: e.n, severity: e.severity }));
  const counter = { i: 0 };
  let marked = 0;

  if (c.mode === "link" && c.url) {
    const meta = el("dl", "xray-meta");
    meta.append(el("dt", "", "Checked"), el("dd", "", "Web address"));
    const p = el("p", "xray-url");
    const spans = urlSpans(c.url, flags);
    appendMarked(p, c.url, spans, counter);
    marked = spans.length;
    box.append(meta, p);
  } else {
    const meta = el("dl", "xray-meta");
    const from = [c.sender, c.senderEmail ? `<${c.senderEmail}>` : ""].filter(Boolean).join(" ");
    if (from) {
      const dd = el("dd");
      const senderFlag = flags.find((f) => SENDER_RULES.has(f.ruleId));
      if (senderFlag) { appendMarked(dd, from, [{ start: 0, end: from.length, ns: [senderFlag.n], severity: senderFlag.severity }], counter); marked++; }
      else dd.textContent = from;
      meta.append(el("dt", "", "From"), dd);
    }
    if (c.subject) meta.append(el("dt", "", "Subject"), el("dd", "", c.subject));
    if (meta.childElementCount) box.append(meta);
    const p = el("p", "xray-body");
    const spans = bodySpans(c.body ?? "", flags);
    appendMarked(p, c.body ?? "", spans, counter);
    marked += spans.length;
    box.append(p);
  }
  if (!marked) box.append(el("p", "xray-clean", items.length ? "These signs are about the message as a whole, so nothing is highlighted." : "Nothing in this message matched a warning sign."));
  box.scrollTop = 0;
}

// ─── Right: the result ─────────────────────────────────────────────────────

function renderIdle(out: HTMLElement): void {
  out.dataset.verdict = "idle";
  const list = el("ol", "preview");

  const one = el("li");
  const pills = el("span", "pv-pills");
  pills.append(el("span", "pill high", "High risk"), el("span", "pill med", "Suspicious"), el("span", "pill safe", "No warning signs found"));
  const oneBody = el("div");
  oneBody.append(el("span", "pv-title", "A clear verdict"), pills);
  one.append(el("span", "pv-num", "1"), oneBody);

  const two = el("li");
  const sample = el("span", "pv-sample");
  const m = el("mark", "hl sev-high", "suspended within 24 hours");
  m.dataset.n = "1";
  sample.append(document.createTextNode("Your account will be "), m);
  const twoBody = el("div");
  twoBody.append(el("span", "pv-title", "Every warning sign, highlighted in the message"), sample);
  two.append(el("span", "pv-num", "2"), twoBody);

  const three = el("li");
  const threeBody = el("div");
  threeBody.append(el("span", "pv-title", "What to do next"), el("span", "pv-steps", "Plain steps for that kind of scam."));
  three.append(el("span", "pv-num", "3"), threeBody);

  list.append(one, two, three);
  out.append(el("p", "idle-title", "Nothing checked yet"), el("p", "idle-text", "Pick an example on the left, or paste your own. You'll get:"), list);
}

function renderAnatomy(url: string): HTMLElement | null {
  const a = anatomy(url);
  if (!a) return null;
  const box = el("div", "anatomy");
  const segs = el("div", "segs");
  const seg = (cls: string, text: string, label: string) => {
    if (!text) return;
    const s = el("span", `seg ${cls}`);
    s.append(el("span", "seg-text", text), el("span", "seg-label", label));
    segs.append(s);
  };
  seg("scheme", a.scheme, "Protocol");
  seg("sub", a.subdomain, "Subdomain");
  seg("domain", a.domain, "Who really owns it");
  seg("path", a.path, "Page");
  box.append(segs);

  if (a.lookalike) {
    const look = el("div", "lookalike");
    const lead = el("p");
    const strong = el("strong", "", a.lookalike.official);
    lead.append(document.createTextNode(`Made to look like ${a.lookalike.brand}'s real address, `), strong, document.createTextNode("."));
    const swap = a.lookalike.chars.find((x) => x.changed);
    if (swap) lead.append(document.createTextNode(` The “${swap.ch}” is pretending to be “${swap.official}”.`));
    const cmp = el("div", "compare");
    const row = (label: string, chars: Array<{ ch: string; cls: string }>) => {
      const line = el("div", "chars");
      for (const ch of chars) line.append(el("span", ch.cls, ch.ch));
      cmp.append(el("span", "", label), line);
    };
    row("This link", a.lookalike.chars.map((x) => ({ ch: x.ch, cls: x.changed ? "diff-bad" : "" })));
    if (a.lookalike.chars.some((x) => x.official)) row("Real", a.lookalike.chars.map((x) => ({ ch: x.official, cls: x.changed ? "diff-good" : "" })));
    else row("Real", [...a.lookalike.official].map((ch) => ({ ch, cls: "" })));
    look.append(lead, cmp);
    box.append(look);
  }
  return box;
}

function renderResult(c: Checked, items: Numbered[]): void {
  const out = $("result");
  out.replaceChildren();
  const v = c.view;
  const risky = v.verdict === "high_risk" || v.verdict === "suspicious";
  out.dataset.verdict = v.verdict;

  const card = el("div", "verdict");
  const row = el("div", "verdict-row");
  const score = el("p", "score", String(v.riskScore));
  score.append(el("span", "", " / 100"));
  score.setAttribute("aria-label", `Risk score ${v.riskScore} out of 100`);
  row.append(el("p", "verdict-title", v.verdict === "high_risk" ? "High risk" : v.verdict === "suspicious" ? "Suspicious" : "No warning signs found"), score);
  const meter = el("div", "meter");
  const fill = el("i");
  fill.style.width = `${Math.max(2, Math.min(100, v.riskScore))}%`;
  meter.append(fill);
  card.append(row, el("p", "verdict-sub", risky ? CATEGORY_DISPLAY[v.category.label] : "Hookline can miss scams, so no warning doesn't mean safe."), meter);
  out.append(card);

  if (risky) {
    const head = el("div", "section-head");
    head.append(el("h3", "", `Warning signs (${items.length})`), el("span", "section-hint", narrow() ? "Tap one to find it in the message" : "Hover one to find it in the message"));
    out.append(head);
    const list = el("ul", "reasons");
    for (const e of items) {
      const li = el("li");
      const b = el("button", "reason") as HTMLButtonElement;
      b.type = "button";
      b.dataset.n = String(e.n);
      const body = el("span");
      const meta = el("span", "reason-meta");
      meta.append(el("span", `sev ${e.severity}`, sevWord(e.severity)), el("code", "rule", e.ruleId));
      body.append(el("span", "reason-title", e.title), el("span", "reason-text", e.description.replace(/\s*See the Links tab\.$/, "")), meta);
      b.append(el("span", `num ${e.severity}`, String(e.n)), body);
      li.append(b);
      list.append(li);
    }
    out.append(list);
  }

  const link = c.mode === "link" ? c.url : items.some((e) => e.ruleId === "EMAIL_SUSPICIOUS_LINKS") ? linksInText(c.body ?? "")[0] : undefined;
  const anat = link ? renderAnatomy(link) : null;
  if (anat && (risky || c.mode === "link")) {
    const head = el("div", "section-head");
    head.append(el("h3", "", "Link anatomy"));
    out.append(head, anat);
  }

  if (risky) {
    const todo = el("div", "section-head");
    todo.append(el("h3", "", "What to do"));
    out.append(todo);
    const tips = el("ul", "tips");
    for (const t of ADVICE[v.category.label]) tips.append(el("li", "", t));
    out.append(tips);
  } else {
    out.append(el("p", "plain", v.evidence.length === 0
      ? "None of Hookline's 47 rules matched this message."
      : `Only minor signals matched (score ${v.riskScore}/100), not enough to flag.`));
  }
  $("result").closest(".results")?.scrollTo({ top: 0 });
}

function showNote(text: string): void {
  const out = $("result");
  out.replaceChildren();
  out.dataset.verdict = "idle";
  out.append(el("p", "idle-title", "Couldn't check that"), el("p", "idle-text", text));
}

// ─── Controls ──────────────────────────────────────────────────────────────

function setState(state: "edit" | "xray"): void {
  $("input-card").dataset.state = state;
  setFocus(null);
}

function setMode(next: "message" | "link"): void {
  mode = next;
  $("pane-message").hidden = next !== "message";
  $("pane-link").hidden = next !== "link";
  for (const m of ["message", "link"] as const) $(`tab-${m}`).setAttribute("aria-selected", String(m === next));
}

function check(): void {
  const c = analyse();
  if (!c) { showNote(mode === "link" ? "Paste a web address first." : "Paste a message first."); return; }
  if (c.view.note) { showNote(c.view.note); return; }
  const items = numbered(c.view);
  renderResult(c, items);
  renderXray(c, items);
  setState("xray");
  if (narrow()) $("input-card").scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
}

function load(ex: Example): void {
  setMode(ex.mode);
  for (const id of ["f-sender", "f-email", "f-subject", "f-body", "f-url"]) ($(id) as HTMLInputElement).value = "";
  if (ex.mode === "link") $<HTMLInputElement>("f-url").value = ex.url ?? "";
  else {
    $<HTMLInputElement>("f-sender").value = ex.sender ?? "";
    $<HTMLInputElement>("f-email").value = ex.senderEmail ?? "";
    $<HTMLInputElement>("f-subject").value = ex.subject ?? "";
    $<HTMLTextAreaElement>("f-body").value = ex.body ?? "";
  }
  check();
}

function start(): void {
  const chips = $("examples");
  const buttons: HTMLButtonElement[] = [];
  const press = (active: HTMLButtonElement | null) => { for (const x of buttons) x.setAttribute("aria-pressed", String(x === active)); };
  for (const ex of EXAMPLES) {
    const b = el("button", "chip", ex.label) as HTMLButtonElement;
    b.type = "button";
    b.addEventListener("click", () => { press(b); load(ex); });
    buttons.push(b);
    chips.append(b);
  }
  $("tab-message").addEventListener("click", () => setMode("message"));
  $("tab-link").addEventListener("click", () => setMode("link"));
  $("check").addEventListener("click", check);
  $("edit").addEventListener("click", () => { setState("edit"); press(null); (mode === "link" ? $("f-url") : $("f-body")).focus(); });
  $("clear").addEventListener("click", () => {
    for (const id of ["f-sender", "f-email", "f-subject", "f-body", "f-url"]) ($(id) as HTMLInputElement).value = "";
    press(null);
    setState("edit");
    renderIdle(($("result").replaceChildren(), $("result")));
  });
  for (const id of ["f-sender", "f-email", "f-subject", "f-body", "f-url"]) {
    $(id).addEventListener("input", () => press(null));
    // Enter checks a link; Ctrl/Cmd+Enter checks a message.
    $(id).addEventListener("keydown", (e) => {
      const k = e as KeyboardEvent;
      if (k.key === "Enter" && (k.ctrlKey || k.metaKey || id === "f-url")) { k.preventDefault(); check(); }
    });
  }

  // Reason ⇄ highlight linking (hover, keyboard focus, click/tap).
  const result = $("result");
  const xray = $("xray");
  for (const zone of [result, xray]) {
    zone.addEventListener("pointerover", (e) => setFocus(nOf(e.target)));
    zone.addEventListener("pointerleave", () => setFocus(null));
    zone.addEventListener("focusin", (e) => setFocus(nOf(e.target)));
    zone.addEventListener("focusout", () => setFocus(null));
  }
  result.addEventListener("click", (e) => {
    const n = nOf(e.target);
    if (n === null) return;
    setFocus(n);
    const first = xray.querySelector(`mark[data-n~="${n}"]`);
    first?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
  });
  xray.addEventListener("click", (e) => {
    const n = nOf(e.target);
    if (n === null) return;
    setFocus(n);
    result.querySelector(`.reason[data-n="${n}"]`)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" });
  });

  press(null);
  renderIdle($("result"));
}

start();
