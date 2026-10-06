"use client";
import { useEffect, useState } from "react";
import { useToast } from "../Toast";
import { cx } from "../ui";

// 3px reading-progress bar pinned to the top of the viewport.
export function ReadingProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setP(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return (
    <div aria-hidden className="fixed inset-x-0 top-0 z-[60] h-[3px]">
      <div className="h-full origin-left bg-gradient-to-r from-primary to-brand-2" style={{ transform: `scaleX(${p})` }} />
    </div>
  );
}

// WhatsApp share + copy link. The URL is read on click so it's always the page being read.
export function ShareButtons({ title }: { title: string }) {
  const toast = useToast();
  const base = "grid size-10 place-items-center rounded-full border border-border bg-card text-foreground transition hover:border-foreground";
  return (
    <div className="flex gap-2">
      <button
        type="button"
        aria-label="Share on WhatsApp"
        className={base}
        onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${location.href}`)}`, "_blank", "noopener")}
      >
        <svg className="size-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2Z" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Copy link"
        className={base}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(location.href);
            toast("Link copied");
          } catch {
            toast("Couldn't copy the link");
          }
        }}
      >
        <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
        </svg>
      </button>
    </div>
  );
}

// "In this article": highlights the section currently being read.
export function Toc({ items }: { items: { id: string; text: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: "-90px 0px -65% 0px" },
    );
    items.forEach((i) => { const el = document.getElementById(i.id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [items]);
  return (
    <nav aria-label="In this article">
      <div className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">In this article</div>
      <ul className="mt-4 space-y-1 border-l-2 border-border">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={cx(
                "-ml-0.5 block border-l-2 py-1.5 pl-4 text-sm leading-snug transition",
                active === i.id ? "border-primary font-bold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {i.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
