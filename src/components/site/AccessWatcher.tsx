"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, X } from "lucide-react";

type Snapshot = { fp: string; titles: string[] };
const EVERY_MS = 20_000;

// Keeps an open page in sync with access changes made in the admin (grants, revokes,
// extensions, role changes, blocks) and celebrates anything newly unlocked.
export function AccessWatcher({ initial }: { initial: Snapshot }) {
  const router = useRouter();
  const current = useRef(initial);
  const [unlocked, setUnlocked] = useState<string[]>([]);

  // A server render (navigation or refresh) is the new baseline.
  useEffect(() => {
    current.current = initial;
  }, [initial]);

  useEffect(() => {
    let busy = false;
    async function check() {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch("/api/me/access", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as { signedIn: boolean } & Partial<Snapshot>;
        if (!next.signedIn) return router.refresh(); // signed out or blocked
        if (next.fp === current.current.fp) return;
        const had = new Set(current.current.titles);
        const fresh = (next.titles ?? []).filter((t) => !had.has(t));
        current.current = { fp: next.fp!, titles: next.titles ?? [] };
        if (fresh.length) setUnlocked(fresh);
        router.refresh();
      } catch {
        // offline or restarting: try again next tick
      } finally {
        busy = false;
      }
    }
    const t = setInterval(check, EVERY_MS);
    const onShow = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("focus", onShow);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("focus", onShow);
    };
  }, [router]);

  useEffect(() => {
    if (!unlocked.length) return;
    const t = setTimeout(() => setUnlocked([]), 8000);
    return () => clearTimeout(t);
  }, [unlocked]);

  if (!unlocked.length) return null;
  return (
    <div role="status" className="animate-rise fixed inset-x-4 bottom-24 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl bg-foreground p-4 text-background shadow-2xl md:bottom-6">
      <PartyPopper className="size-6 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-sm">
        <b>Unlocked: {unlocked.join(", ")}</b>
        <span className="block opacity-80">It&apos;s in My Learning now.</span>
      </p>
      <button onClick={() => setUnlocked([])} aria-label="Dismiss" className="grid size-8 place-items-center rounded-full hover:bg-background/10"><X className="size-4" /></button>
    </div>
  );
}
