"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";
import { useFocusTrap } from "./useFocusTrap";

// Phone sheets (design.md §6a): dimmed backdrop, drag handle, a 44px close button, Escape and
// swipe-down to close, a focus trap, and no scrolling behind it. Lives on phones only: the
// caller decides when it is mounted (usually with `tablet:hidden` on its trigger).

// Drag the handle down to dismiss. Returns props for the draggable header and the live offset.
export function useSwipeDown(onClose: () => void) {
  const [dy, setDy] = useState(0);
  const start = useRef<number | null>(null);
  return {
    dy,
    handleProps: {
      onTouchStart: (e: React.TouchEvent) => { start.current = e.touches[0].clientY; },
      onTouchMove: (e: React.TouchEvent) => { if (start.current !== null) setDy(Math.max(0, e.touches[0].clientY - start.current)); },
      onTouchEnd: () => { const far = dy > 90; start.current = null; setDy(0); if (far) onClose(); },
    },
  };
}

export function CloseX({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-11 shrink-0 place-items-center rounded-full bg-muted text-foreground">
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  );
}

export function BottomSheet({ title, onClose, children, footer, className }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useFocusTrap(panel);
  const { dy, handleProps } = useSwipeDown(onClose);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <div ref={panel} tabIndex={-1} className="fixed inset-0 z-[60] tablet:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" tabIndex={-1} aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div
        className={cx("absolute inset-x-0 bottom-0 flex max-h-[88dvh] animate-mf-rise flex-col rounded-t-2xl bg-card text-foreground shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.4)]", className)}
        style={dy ? { transform: `translateY(${dy}px)`, transition: "none" } : undefined}
      >
        <div {...handleProps} className="touch-none px-4 pt-2.5">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" aria-hidden />
          <div className="flex items-center justify-between gap-3 pb-1 pt-1.5">
            <div className="text-lg font-extrabold tracking-[-0.02em]">{title}</div>
            <CloseX onClick={onClose} />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
        {footer && <div className="border-t border-border bg-card px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3">{footer}</div>}
      </div>
    </div>
  );
}
