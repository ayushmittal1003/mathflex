"use client";
import { useActionState } from "react";
import Link from "next/link";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { LogoMark } from "@/components/Logo";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";
  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 pb-24 pt-[calc(var(--nav-h)+2rem)]">
      <LogoMark size={52} className="mb-6" />
      <h1 className="font-display text-3xl font-extrabold">{isSignup ? "Start your streak" : "Welcome back"}</h1>
      <p className="mt-1 text-muted">{isSignup ? "Free account. Pay only for the chapters you want." : "Pick up right where you left off."}</p>
      <form action={action} className="mt-8 space-y-3">
        <input type="hidden" name="next" value={next} />
        {isSignup && <input name="name" placeholder="Your name" autoComplete="name" required className="input" />}
        <input name="email" type="email" placeholder="Email" autoComplete="email" required className="input" />
        {isSignup && (
          <div className="grid grid-cols-2 gap-3">
            <input name="phone" type="tel" inputMode="numeric" placeholder="Mobile (optional)" autoComplete="tel-national" className="input" />
            <select name="classLevel" className="input" defaultValue="">
              <option value="" disabled>Class</option>
              <option value="11">Class 11</option>
              <option value="12">Class 12</option>
              <option value="13">Dropper</option>
            </select>
          </div>
        )}
        <input name="password" type="password" placeholder="Password" autoComplete={isSignup ? "new-password" : "current-password"} required className="input" />
        {state?.error && <p className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{state.error}</p>}
        <button disabled={pending} className="btn btn-primary w-full !py-3.5">
          {pending ? "One sec…" : isSignup ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        {isSignup ? "Already have an account? " : "New to MathFlex? "}
        <Link href={`/${isSignup ? "login" : "signup"}?next=${encodeURIComponent(next)}`} className="font-bold text-brand">
          {isSignup ? "Log in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
