"use client";
import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { signupWithInvite, type InviteSignupState } from "@/app/actions/invite";

export function InviteSignup({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState<InviteSignupState, FormData>(signupWithInvite.bind(null, token), undefined);
  return (
    <form action={action} className="space-y-3">
      <input value={email} readOnly className="w-full rounded-lg border border-border bg-card px-4 py-3 text-[15px] outline-none transition focus:border-foreground bg-muted text-muted-foreground" aria-label="Email" />
      <input name="name" placeholder="Your name" autoComplete="name" required className="w-full rounded-lg border border-border bg-card px-4 py-3 text-[15px] outline-none transition focus:border-foreground" />
      <input name="password" type="password" placeholder="Choose a password (8+ characters)" autoComplete="new-password" required minLength={8} className="w-full rounded-lg border border-border bg-card px-4 py-3 text-[15px] outline-none transition focus:border-foreground" />
      {state?.error && <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 px-3 py-2 text-sm font-medium text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{state.error}</p>}
      <button disabled={pending} className="w-full rounded-lg bg-primary px-4.5 py-3.5 text-[15px] font-bold text-primary-foreground shadow-cta transition hover:brightness-108 disabled:opacity-50">{pending ? "One sec…" : "Create account and join"}</button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account with this email? <Link href={`/login?next=/invite/${token}`} className="font-bold text-primary">Log in</Link>
      </p>
    </form>
  );
}
