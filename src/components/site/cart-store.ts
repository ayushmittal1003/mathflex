"use client";
import { useSyncExternalStore } from "react";

// Cart lives in localStorage so guests can shop before signing up.
// It only stores ids — prices are always re-computed on the server.
export type CartItem = { type: "CHAPTER" | "COURSE"; id: string };

const KEY = "mf-cart";
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    cache = [];
  }
  return cache!;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
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
