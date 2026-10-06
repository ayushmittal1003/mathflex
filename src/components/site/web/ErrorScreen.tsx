"use client";
import Link from "next/link";
import { useEffect } from "react";
import { button, cx, tone } from "./ui";

// Shared "something went wrong" screen for the site's error.tsx boundaries. The message
// stays generic (no internals); the digest helps support find the server log.
export function ErrorScreen({ error, retry, compact = false }: { error: Error & { digest?: string }; retry: () => void; compact?: boolean }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className={cx("grid place-items-center px-4", compact ? "min-h-dvh" : "min-h-[70vh] pb-20 pt-[calc(86px+48px)]")}>
      <div className="w-[min(520px,100%)] animate-mf-rise rounded-2xl bg-wash px-6 py-12 text-center tablet:px-10">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-card text-3xl shadow-[0_14px_30px_-16px_rgb(80_20_0/0.5)]" aria-hidden>⚠️</span>
        <h1 className="mt-5 text-[clamp(28px,4vw,38px)] font-extrabold leading-tight tracking-[-0.04em]">Something went wrong</h1>
        <p className="mx-auto mt-3 max-w-[380px] text-[15px] leading-[1.6] text-secondary-foreground">
          This page didn&apos;t load properly. It&apos;s usually a brief network or server hiccup. Your progress and purchases are safe.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          <button type="button" onClick={() => retry()} className={cx(button.md, tone.primary)}>Try again</button>
          <Link href="/" className={cx(button.md, tone.secondary)}>Go home</Link>
        </div>
        {error.digest && <p className="mt-6 font-mono text-xs text-muted-foreground">Error ref: {error.digest}</p>}
      </div>
    </div>
  );
}

