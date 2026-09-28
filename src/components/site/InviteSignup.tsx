"use client";
import { useActionState } from "react";
import Link from "next/link";
import { signupWithInvite, type InviteSignupState } from "@/app/actions/invite";

export function InviteSignup({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<InviteSignupState, FormData>(signupWithInvite.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-3">
      <input value={email} readOnly className="input opacity-70" aria-label="Email" />
      <input name="name" placeholder="Your name" autoComplete="name" required className="input" />
      <input name="password" type="password" placeholder="Choose a password (8+ characters)" autoComplete="new-password" required minLength={8} className="input" />
      {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
      <button disabled={pending} className="btn btn-primary w-full !py-3.5">{pending ? "One sec…" : "Create account and join"}</button>
      <p className="text-center text-sm text-muted">
        Already have an account with this email? <Link href={`/login?next=/invite/${token}`} className="font-bold text-brand">Log in</Link>
      </p>
    </form>
  );
}
