"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";
import { button, cx, tone } from "./ui";

// Website-styled profile form. Same fields and server action as components/site/ProfileForm.
const field = "mt-1.5 w-full rounded-lg border border-border bg-card px-4 py-3 text-[15px] outline-none transition focus:border-foreground disabled:bg-muted disabled:text-muted-foreground";
const label = "block text-sm font-bold";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; classLevel: number | null } }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="grid gap-5">
      <label className={label}>Full name<input name="name" defaultValue={user.name} autoComplete="name" className={field} /></label>
      <label className={label}>
        Email
        <input value={user.email} disabled className={field} />
        <span className="mt-1.5 block text-xs font-medium text-muted-foreground">Used to log in. Write to support to change it.</span>
      </label>
      <div className="grid gap-5 min-[560px]:grid-cols-2">
        <label className={label}>
          Mobile number
          <span className="mt-1.5 flex overflow-hidden rounded-lg border border-border bg-card transition focus-within:border-foreground">
            <span className="grid place-items-center bg-muted px-3 text-sm font-bold text-muted-foreground">+91</span>
            <input name="phone" defaultValue={user.phone ?? ""} inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" className="w-full bg-transparent px-3 py-3 text-[15px] outline-none" />
          </span>
        </label>
        <label className={label}>
          Class
          <select name="classLevel" defaultValue={user.classLevel ?? ""} className={field}>
            <option value="11">Class 11</option>
            <option value="12">Class 12</option>
            <option value="13">Dropper</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={pending} className={cx(button.md, tone.primary)}>{pending ? "Saving…" : "Save changes"}</button>
        {state && "error" in state && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
        {state && "ok" in state && <p role="status" className="text-sm font-semibold text-ok">✓ Saved</p>}
      </div>
    </form>
  );
}
