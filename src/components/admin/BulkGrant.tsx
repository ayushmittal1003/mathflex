"use client";
import { useActionState } from "react";
import { bulkGrantAccess } from "@/app/admin/actions";

type State = { granted: string[]; missing: string[]; error: string } | undefined;

export function BulkGrant({ children }: { children: React.ReactNode }) {
  const [state, action, pending] = useActionState<State, FormData>(bulkGrantAccess, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="font-semibold">Student emails</span>
        <textarea name="emails" rows={6} required placeholder={"one@example.com\ntwo@example.com, three@example.com"} className="input mt-1 font-mono text-xs" />
        <span className="mt-1 block text-xs text-muted">One per line or comma-separated, up to 500. They need a MathFlex account already.</span>
      </label>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_1fr] sm:items-end">
        {children}
        <label className="block text-sm"><span className="font-semibold">Days</span><input name="days" type="number" min={1} defaultValue={365} className="input mt-1" /></label>
        <label className="block text-sm"><span className="font-semibold">Note (optional)</span><input name="note" placeholder="e.g. Coaching batch A" className="input mt-1" /></label>
      </div>
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">{pending ? "Granting…" : "Grant access"}</button>
      {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
      {state && !state.error && (
        <div className="space-y-2 rounded-xl bg-surface-2 p-3 text-sm">
          <p><b className="text-ok">{state.granted.length} granted.</b> They&apos;ll see it within about 20 seconds.</p>
          {state.missing.length > 0 && (
            <p className="text-bad">No account for {state.missing.length}: <span className="font-mono text-xs">{state.missing.join(", ")}</span>. Ask them to sign up, then grant again.</p>
          )}
        </div>
      )}
    </form>
  );
}
