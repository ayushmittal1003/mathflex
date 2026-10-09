"use client";
import { useActionState, useEffect, useRef, startTransition, type ReactNode } from "react";

export type FormState = { ok?: string; error?: string } | undefined;

// A form for server actions that report back: shows "Saving…", then the success note or the
// real error. Submits without React's automatic reset so typed values (and the chosen file) survive.
export function StatusForm({ action, children, label, resetOnOk = false, className = "space-y-4" }: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  label: string;
  resetOnOk?: boolean;
  className?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
      className={className}
    >
      {children}
      {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm font-medium text-ok">{state.ok}</p>}
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">{pending ? "Saving…" : label}</button>
    </form>
  );
}
