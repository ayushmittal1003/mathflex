"use client";
import { useTransition } from "react";

// Runs a server action after a confirm() prompt. Used for deletes and refunds.
export function ConfirmButton({ action, message, children, className = "" }: { action: () => Promise<unknown>; message: string; children: React.ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => confirm(message) && start(async () => { await action(); })}
      className={`btn !px-3 !py-1.5 text-sm bg-bad/10 text-bad hover:bg-bad/20 ${className}`}
    >
      {pending ? "…" : children}
    </button>
  );
}

export function ActionButton({ action, children, className = "" }: { action: () => Promise<unknown>; children: React.ReactNode; className?: string }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await action(); })} className={`btn btn-ghost !px-3 !py-1.5 text-sm ${className}`}>
      {pending ? "…" : children}
    </button>
  );
}
