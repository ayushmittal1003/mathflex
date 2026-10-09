"use client";
import Link from "next/link";
import { useState } from "react";
import { cx } from "./ui";

// FAQ rows (design.md §4): one open at a time, expands via grid-template-rows 0fr → 1fr.
export function FaqList({ items, initialOpen = 0 }: { items: { q: string; a: string }[]; initialOpen?: number }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div className="border-t border-border">
      {items.map((item, i) => {
        const isOpen = open === i;
        const id = `faq-${i}`;
        return (
          <div key={item.q} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              aria-controls={id}
              className="flex w-full items-center gap-5 py-5.5 text-left text-foreground"
            >
              <span className={cx("shrink-0 font-mono text-[13px] font-bold transition-colors duration-300", isOpen ? "text-primary" : "text-muted-foreground")}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-[17px] font-bold tracking-[-0.01em] sm:text-lg">{item.q}</span>
              <span
                aria-hidden
                className={cx(
                  "grid size-[30px] shrink-0 place-items-center rounded-full transition duration-300 ease-mf",
                  isOpen ? "rotate-45 bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </button>
            <div id={id} className={cx("grid transition-[grid-template-rows] duration-[400ms] ease-mf", isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="overflow-hidden">
                <p className="pb-5.5 pl-[52px] pr-4 text-base leading-[1.6] text-muted-foreground text-pretty sm:pr-[50px]">
                  <RichText text={item.a} />
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Turns [label](/path) in FAQ copy into links; everything else is plain text.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        return m ? (
          <Link key={i} href={m[2]} className="font-semibold text-primary underline-offset-2 hover:underline">
            {m[1]}
          </Link>
        ) : (
          p
        )
      })}
    </>
  );
}
