"use client";
import { useActionState, useState, useTransition } from "react";
import { Check, Copy, UserPlus } from "lucide-react";
import { inviteMember, changeRole, renewInvite, type InviteState } from "@/app/admin/team/actions";

const ROLES = [
  ["ADMIN", "Super Admin"],
  ["EDITOR", "Editor"],
  ["SUPPORT", "Support"],
] as const;

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="btn btn-ghost !px-3 !py-1.5 text-xs"
    >
      {done ? <Check className="size-3.5 text-ok" /> : <Copy className="size-3.5" />} {done ? "Copied" : label}
    </button>
  );
}

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(inviteMember, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
        <label className="block text-sm">
          <span className="font-semibold">Email</span>
          <input name="email" type="email" required placeholder="name@example.com" className="input mt-1" />
        </label>
        <label className="block text-sm">
          <span className="font-semibold">Role</span>
          <select name="role" defaultValue="EDITOR" className="input mt-1">
            {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <button disabled={pending} className="btn btn-primary !py-2.5 text-sm"><UserPlus className="size-4" /> {pending ? "Inviting…" : "Invite"}</button>
      </div>
      {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
      {state?.ok && (
        <div className="rounded-xl bg-ok/10 p-3 text-sm">
          <p className="font-medium">{state.ok}</p>
          {state.link && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-2 py-1.5 text-xs">{state.link}</code>
              <CopyButton text={state.link} />
            </div>
          )}
        </div>
      )}
    </form>
  );
}

// Changing the select saves straight away.
export function RoleSelect({ userId, role }: { userId: string; role: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <div>
      <select
        defaultValue={role}
        disabled={pending}
        aria-label="Role"
        onChange={(e) => {
          const next = e.target.value;
          if (next === "STUDENT" && !confirm("Remove this person from the team? They keep their student account.")) {
            e.target.value = role;
            return;
          }
          const form = new FormData();
          form.set("userId", userId);
          form.set("role", next);
          setError("");
          start(async () => {
            try {
              await changeRole(form);
            } catch (err) {
              e.target.value = role;
              setError(err instanceof Error ? err.message : "Couldn't change the role.");
            }
          });
        }}
        className="input !w-auto !py-1.5 text-sm"
      >
        {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        <option value="STUDENT">Remove from team</option>
      </select>
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

export function RenewInvite({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [link, setLink] = useState("");
  if (link) return <CopyButton text={link} label="Copy new link" />;
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => setLink(await renewInvite(id)))} className="btn btn-ghost !px-3 !py-1.5 text-xs">
      {pending ? "…" : "Renew"}
    </button>
  );
}
