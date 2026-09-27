"use client";
import { useActionState } from "react";
import { updateProfile } from "@/app/actions/profile";

export function ProfileForm({ user }: { user: { name: string; email: string; phone: string | null; classLevel: number | null } }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="card space-y-3 p-5">
      <label className="block text-sm font-semibold">Name<input name="name" defaultValue={user.name} className="input mt-1" /></label>
      <label className="block text-sm font-semibold">Email<input value={user.email} disabled className="input mt-1 opacity-60" /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-semibold">Mobile<input name="phone" defaultValue={user.phone ?? ""} inputMode="numeric" className="input mt-1" /></label>
        <label className="block text-sm font-semibold">Class
          <select name="classLevel" defaultValue={user.classLevel ?? ""} className="input mt-1">
            <option value="11">Class 11</option><option value="12">Class 12</option><option value="13">Dropper</option>
          </select>
        </label>
      </div>
      {state && "error" in state && <p className="text-sm text-bad">{state.error}</p>}
      {state && "ok" in state && <p className="text-sm text-ok">Saved!</p>}
      <button disabled={pending} className="btn btn-primary">Save changes</button>
    </form>
  );
}
