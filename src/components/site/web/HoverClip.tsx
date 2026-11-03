"use client";
import { useEffect, useRef, useState } from "react";
import { cx } from "./ui";

// Plays a chapter's short silent clip while the mouse is over the poster it sits in. Every visitor
// gets the same clip, served by /api/previews so the video's own address never reaches the page.
// Chapters without a video have no clip and keep showing the poster. The poster must be positioned.
export function HoverClip({ chapterId }: { chapterId: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const [on, setOn] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const poster = box.current?.parentElement;
    if (!poster || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let timer: ReturnType<typeof setTimeout>;
    // A short wait so moving the mouse across a grid doesn't start every card on the way.
    const enter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") timer = setTimeout(() => setOn(true), 200);
    };
    const leave = () => {
      clearTimeout(timer);
      setOn(false);
      setReady(false);
    };
    poster.addEventListener("pointerenter", enter);
    poster.addEventListener("pointerleave", leave);
    return () => {
      clearTimeout(timer);
      poster.removeEventListener("pointerenter", enter);
      poster.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <span ref={box} aria-hidden className="pointer-events-none absolute inset-0">
      {on && (
        // eslint-disable-next-line @next/next/no-img-element -- an animated clip, which image optimisation would flatten
        <img src={`/api/previews/${chapterId}`} alt="" onLoad={() => setReady(true)} className={cx("size-full object-cover transition-opacity duration-200", ready ? "opacity-100" : "opacity-0")} />
      )}
    </span>
  );
}
