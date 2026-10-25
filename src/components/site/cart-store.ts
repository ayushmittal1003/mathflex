"use client";
import { useSyncExternalStore } from "react";

// Cart lives in localStorage so guests can shop before signing up.
// It only stores ids — prices are always re-computed on the server.
export type CartItem = { type: "CHAPTER" | "COURSE"; id: string };

const KEY = "mf-cart";
const COOKIE = "mf-cart";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

// The cart is also kept in a cookie so it survives the hop between mathflex.in and
// app.mathflex.in (browser storage is separate per address). Set NEXT_PUBLIC_COOKIE_DOMAIN
// (e.g. ".mathflex.in") to share it; without it the cookie is per-host, which is fine for one domain.
// Format: "C.<id>~K.<id>" (C = chapter, K = course). It only holds ids; prices come from the server.
const encode = (items: CartItem[]) => items.map((i) => `${i.type === "CHAPTER" ? "C" : "K"}.${i.id}`).join("~");
const decode = (raw: string): CartItem[] =>
  raw
    .split("~")
    .map((x) => /^([CK])\.([\w-]{5,40})$/.exec(x))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ type: m[1] === "C" ? "CHAPTER" : "COURSE", id: m[2] }) as CartItem);

function readCookie(): CartItem[] | null {
  const m = document.cookie.split("; ").find((c) => c.startsWith(`${COOKIE}=`));
  return m ? decode(decodeURIComponent(m.slice(COOKIE.length + 1))) : null;
}
function writeCookie(items: CartItem[]) {
  const domain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE}=${encodeURIComponent(encode(items))}; Path=/; Max-Age=${items.length ? 60 * 60 * 24 * 30 : 0}; SameSite=Lax${secure}${domain ? `; Domain=${domain}` : ""}`;
}

function read(): CartItem[] {
  if (cache) return cache;
  try {
    // The cookie wins (it is shared across hosts); an older browser-storage cart is picked up once.
    const fromCookie = readCookie();
    cache = fromCookie ?? JSON.parse(localStorage.getItem(KEY) || "[]");
    if (fromCookie === null && cache!.length) writeCookie(cache!);
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items)); // lets other tabs on this host update live
    writeCookie(items);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  add(item: CartItem) {
    const items = read();
    if (!items.some((i) => i.id === item.id)) write([...items, item]);
  },
  remove(id: string) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
