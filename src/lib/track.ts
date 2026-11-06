"use client";
// Browser side of the site analytics (see app/api/track). Ids live in first-party cookies so the
// server can attach login and sign-up events to the same visit: mf_vid for a year, mf_sid until 30
// minutes without activity. Events are queued and sent in batches, and with sendBeacon on leaving.

type Out = { name: string; path: string; label?: string; ms?: number; source?: string; medium?: string; campaign?: string };

const VISITOR = "mf_vid";
const SESSION = "mf_sid";
const SESSION_MINUTES = 30;
const queue: Out[] = [];
// start is null while the page is in the background, so that time isn't counted.
let page: { path: string; start: number | null } | null = null;
let entry: { source?: string; medium?: string; campaign?: string } | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ? `;domain=${process.env.NEXT_PUBLIC_COOKIE_DOMAIN}` : "";
const getCookie = (name: string) => document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))?.[1];
const setCookie = (name: string, value: string, seconds: number) => {
  document.cookie = `${name}=${value};path=/;max-age=${seconds};samesite=lax${domain}${location.protocol === "https:" ? ";secure" : ""}`;
};
const newId = () => (crypto.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`).replace(/-/g, "").slice(0, 24);

// Reading the ids also keeps the session alive; a new session records where the visitor came from.
function ids() {
  let vid = getCookie(VISITOR);
  if (!vid) vid = newId();
  setCookie(VISITOR, vid, 365 * 86_400);
  let sid = getCookie(SESSION);
  if (!sid) {
    sid = newId();
    const q = new URLSearchParams(location.search);
    let ref: string | undefined;
    try {
      const host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
      ref = host && host !== location.hostname.replace(/^www\./, "") ? host : undefined;
    } catch {}
    entry = { source: (q.get("utm_source") ?? ref)?.slice(0, 100), medium: q.get("utm_medium")?.slice(0, 100), campaign: q.get("utm_campaign")?.slice(0, 100) };
    try { sessionStorage.setItem("mf-entry", JSON.stringify(entry)); } catch {}
  } else if (!entry) {
    try { entry = JSON.parse(sessionStorage.getItem("mf-entry") ?? "{}"); } catch { entry = {}; }
  }
  setCookie(SESSION, sid, SESSION_MINUTES * 60);
  return { vid, sid };
}

function flush() {
  clearTimeout(timer);
  if (!queue.length) return;
  const { vid, sid } = ids();
  const body = JSON.stringify({ vid, sid, events: queue.splice(0, 50) });
  const sent = typeof navigator.sendBeacon === "function" && navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
  if (!sent) fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  if (queue.length) flush();
}

function push(e: Out) {
  ids();
  queue.push(e);
  clearTimeout(timer);
  timer = setTimeout(flush, queue.length >= 10 ? 0 : 4000);
}

// Time on a page is sent in pieces: each time it goes to the background (switching apps or tabs,
// which is often the last thing a phone browser reports) and when the visitor moves on.
function sendTime() {
  if (!page || page.start === null) return;
  push({ name: "page_leave", path: page.path, ms: Math.min(Date.now() - page.start, 30 * 60_000) });
  page.start = null;
}

function leavePage() {
  sendTime();
  page = null;
}

// A named event, e.g. track("add_to_cart", chapterTitle).
export function track(name: string, label?: string) {
  if (typeof window === "undefined") return;
  push({ name, path: location.pathname, label: label?.slice(0, 120) });
}

export function trackPageView(path: string) {
  // The same page reported twice in a row within a second is one view (React can run effects twice).
  if (page?.path === path && page.start !== null && Date.now() - page.start < 1000) return;
  leavePage();
  ids();
  page = { path, start: Date.now() };
  push({ name: "page_view", path, ...(entry ?? {}) });
}

// Clicks on any link or button (or anything marked data-track), named by data-track, its label or its text.
function onClick(e: MouseEvent) {
  const el = (e.target as Element | null)?.closest?.("a,button,[data-track]") as HTMLElement | null;
  if (!el || el.closest("[data-no-track]")) return;
  const name = el.dataset.track || el.getAttribute("aria-label") || el.textContent?.replace(/\s+/g, " ").trim() || el.getAttribute("href") || "";
  if (name) track("click", name.slice(0, 120));
}

let started = false;
export function startTracking() {
  if (started) return;
  started = true;
  document.addEventListener("click", onClick, { capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { sendTime(); flush(); }
    else if (page && page.start === null) page.start = Date.now();
  });
  addEventListener("pagehide", () => { leavePage(); flush(); });
}
