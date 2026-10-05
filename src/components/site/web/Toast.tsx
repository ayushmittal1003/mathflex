"use client";
import Link from "next/link";
import { createContext, useCallback, useContext, useRef, useState } from "react";

// design.md §4 Toast: fixed bottom-centre, dark, optional primary action, hides after 2.6s.
type ToastMsg = { id: number; text: string; action?: { label: string; href: string } };
const ToastCtx = createContext<(text: string, action?: ToastMsg["action"]) => void>(() => {});

export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, action?: ToastMsg["action"]) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg({ id: Date.now(), text, action });
    timer.current = setTimeout(() => setMsg(null), 2600);
  }, []);

  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(84px+env(safe-area-inset-bottom))] z-[80] flex justify-center px-4 md:bottom-6">
        {msg && (
          <div key={msg.id} className="pointer-events-auto flex animate-mf-rise items-center gap-4 rounded-xl bg-foreground py-2.5 pl-4 pr-2.5 text-sm font-semibold text-card shadow-[0_20px_40px_-16px_rgb(0_0_0/0.5)]">
            <span>{msg.text}</span>
            {msg.action && (
              <Link href={msg.action.href} className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 font-bold text-primary-foreground">
                {msg.action.label}
              </Link>
            )}
          </div>
        )}
      </div>
    </ToastCtx.Provider>
  );
}
