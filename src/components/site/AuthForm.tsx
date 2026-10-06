"use client";
import { useActionState } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";
import { login, signup, type AuthState } from "@/app/actions/auth";
import { SiteLogo } from "./web/SiteLogo";
import { Mark } from "./web/primitives";
import { cx } from "./web/ui";

export type AuthPanel = {
  tagline: string[]; // e.g. ["Part 1 free", "From ₹149 a chapter", ...]
  rows: { title: string; symbol: string; coverFrom: string; coverTo: string }[];
};

// Log in / sign up (dipankar-design/designs/Login.dc.html). Same server actions and fields as
// before (login: email, password; signup: name, email, optional phone, class incl. Dropper,
// password). Google, OTP and password reset aren't shown: there's no backend for them.
const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: "Google sign-in is being set up. Use your email for now.",
  google_cancelled: "Google sign-in was cancelled.",
  google_failed: "We couldn't sign you in with Google. Please try again.",
  blocked: "This account is suspended. Please contact support.",
  signup_paused: "New sign-ups are paused right now. Existing accounts can still log in.",
};

export function AuthForm({ mode, next, panel, paused = false, googleReady = false, error }: { mode: "login" | "signup"; next: string; panel?: AuthPanel; paused?: boolean; googleReady?: boolean; error?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";
  const field = "h-12 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/25";
  const q = `?next=${encodeURIComponent(next)}`;

  return (
    <div className="flex min-h-dvh gap-4 bg-card p-4">
      <div className="flex min-w-0 flex-[1_1_520px] flex-col">
        <header className="flex items-center justify-between gap-4 px-4 pt-1.5">
          <Link href="/" aria-label="Mathflex home"><SiteLogo /></Link>
          <Link href="/" className="text-sm font-bold text-secondary-foreground hover:text-foreground">← Back to home</Link>
        </header>
        <main className="grid flex-1 place-items-center px-4 py-10">
          <div className="w-[min(420px,100%)] animate-mf-rise">
            <h1 className="text-[clamp(32px,4vw,44px)] font-extrabold leading-[1.05] tracking-[-0.04em]">{isSignup ? "Start your streak" : "Welcome back"}</h1>
            <p className="mt-2.5 text-base leading-[1.5] text-secondary-foreground">
              {isSignup ? "Free account. Pay only for the chapters you want." : "Pick up right where you left off."}
            </p>
            <div className="mt-6 flex gap-0.5 rounded-lg bg-foreground p-1" role="tablist">
              <Link href={`/login${q}`} role="tab" aria-selected={!isSignup} className={cx("flex-1 rounded-md px-3 py-2.5 text-center text-sm font-bold", !isSignup ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>Log in</Link>
              <Link href={`/signup${q}`} role="tab" aria-selected={isSignup} className={cx("flex-1 rounded-md px-3 py-2.5 text-center text-sm font-bold", isSignup ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>Sign up</Link>
            </div>

            {error && GOOGLE_ERRORS[error] && (
              <p role="alert" className="mt-6 rounded-lg bg-bad/8 px-3.5 py-2.5 text-sm font-semibold text-foreground">{GOOGLE_ERRORS[error]}</p>
            )}
            {!(isSignup && paused) && (
              <>
                {googleReady ? (
                  <a href={`/api/auth/google?next=${encodeURIComponent(next)}`} className="mt-6 flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-[15px] font-bold text-foreground shadow-[0_1px_4px_0_rgb(0_0_0/0.06)] transition hover:bg-muted">
                    <GoogleMark /> Continue with Google
                  </a>
                ) : (
                  <span aria-disabled className="mt-6 flex h-12 w-full cursor-not-allowed items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/50 text-[15px] font-bold text-muted-foreground" title="Google sign-in is being set up">
                    <GoogleMark /> Continue with Google <span className="text-xs font-semibold">(coming soon)</span>
                  </span>
                )}
                <div className="mt-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground" aria-hidden>
                  <span className="h-px flex-1 bg-border" />or use email<span className="h-px flex-1 bg-border" />
                </div>
              </>
            )}
            {isSignup && paused ? (
              <div className="mt-6 rounded-xl bg-wash p-6 text-center">
                <div className="text-lg font-extrabold tracking-[-0.02em]">New sign-ups are paused right now</div>
                <p className="mt-1.5 text-sm leading-[1.6] text-secondary-foreground">Already have an account? Log in. Otherwise check back soon, or watch a free Part 1 without an account.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Link href={`/login${q}`} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground">Log in</Link>
                  <Link href="/chapters" className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold">Browse chapters</Link>
                </div>
              </div>
            ) : (
            <form action={action} className="mt-5 grid gap-3.5">
              <input type="hidden" name="next" value={next} />
              {isSignup && (
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-bold">Full name</span>
                  <input name="name" placeholder="Your name" autoComplete="name" required className={field} />
                </label>
              )}
              {isSignup && (
                <fieldset className="grid gap-1.5">
                  <legend className="mb-1.5 text-[13px] font-bold">I&apos;m in</legend>
                  <div className="flex gap-1.5">
                    {[["11", "Class 11"], ["12", "Class 12"], ["13", "Dropper"]].map(([v, label]) => (
                      <label key={v} className="flex-1">
                        <input type="radio" name="classLevel" value={v} className="peer sr-only" />
                        <span className="grid h-11 cursor-pointer place-items-center rounded-lg border border-border bg-card text-sm font-bold text-foreground transition peer-checked:border-foreground peer-checked:bg-foreground peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40">
                          {label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}
              <label className="grid gap-1.5">
                <span className="text-[13px] font-bold">Email</span>
                <input name="email" type="email" placeholder="you@example.com" autoComplete="email" required className={field} />
              </label>
              {isSignup && (
                <label className="grid gap-1.5">
                  <span className="text-[13px] font-bold">Mobile number <span className="font-semibold text-muted-foreground">(optional)</span></span>
                  <span className="flex gap-2">
                    <span className="grid h-12 shrink-0 place-items-center rounded-lg border border-border bg-muted px-3.5 text-[15px] font-bold">+91</span>
                    <input name="phone" type="tel" inputMode="numeric" placeholder="10-digit mobile" autoComplete="tel-national" className={field} />
                  </span>
                </label>
              )}
              <label className="grid gap-1.5">
                <span className="text-[13px] font-bold">Password</span>
                <input name="password" type="password" placeholder={isSignup ? "At least 8 characters" : "Your password"} autoComplete={isSignup ? "new-password" : "current-password"} required className={field} />
              </label>
              {state?.error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad/10 px-3 py-2 text-sm font-medium text-bad"><CircleAlert className="mt-0.5 size-4 shrink-0" />{state.error}</p>
              )}
              <button disabled={pending} className="h-[50px] rounded-lg bg-primary text-base font-bold text-primary-foreground shadow-cta transition hover:brightness-108 disabled:opacity-60">
                {pending ? "One sec…" : isSignup ? "Create account" : "Log in"}
              </button>
            </form>
            )}
            <p className="mt-4.5 text-center text-sm text-secondary-foreground">
              {isSignup ? "Already have an account? " : "New to Mathflex? "}
              <Link href={`/${isSignup ? "login" : "signup"}${q}`} className="font-bold text-primary">{isSignup ? "Log in" : "Create an account"}</Link>
            </p>
            <p className="mt-3.5 text-center text-xs leading-[1.5] text-muted-foreground">
              By continuing you agree to our <Link href="/terms" className="text-primary">Terms</Link> and <Link href="/privacy" className="text-primary">Privacy policy</Link>.
            </p>
          </div>
        </main>
      </div>

      {panel && (
        <aside className="relative order-first hidden min-w-0 flex-[1_1_520px] flex-col justify-between overflow-hidden rounded-xl bg-wash p-12 min-[900px]:flex">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/90 bg-white/70 px-3 py-1.5 text-[13px] font-semibold text-secondary-foreground">
              <span className="size-1.5 rounded-full bg-ok" />
              {isSignup ? "Free account" : "Welcome back"}
            </div>
            <h2 className="mt-6 text-[clamp(40px,4.4vw,64px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
              Your IIT seat starts with one <Mark onWash>chapter</Mark>
            </h2>
            {panel.rows.length > 0 && (
              <div className="mt-10 overflow-hidden rounded-xl border-[6px] border-foreground bg-card shadow-[0_40px_70px_-30px_rgb(80_20_0/0.5)]">
                <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
                  <span className="text-sm font-extrabold">Continue learning</span>
                  <span className="flex gap-3 text-xs"><span><b className="text-brand-2">7</b> day streak</span><span><b className="text-xp">2,340</b> XP</span></span>
                </div>
                {panel.rows.map((r, i) => (
                  <div key={r.title} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                    <span className="grid h-[30px] w-11 shrink-0 place-items-center rounded-md text-[11px] font-black text-white" style={{ background: `linear-gradient(155deg, ${r.coverFrom}, ${r.coverTo})` }}>{r.symbol}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold">{r.title}</span>
                      <span className="mt-1.5 block h-1 rounded-full bg-muted"><span className="block h-full rounded-full bg-primary" style={{ width: `${[62, 24, 88][i] ?? 40}%` }} /></span>
                    </span>
                    <span className="shrink-0 text-xs font-bold text-muted-foreground">{[62, 24, 88][i] ?? 40}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-secondary-foreground">
            {panel.tagline.map((t, i) => (
              <span key={t} className="flex gap-5">{i > 0 && <span aria-hidden>·</span>}{t}</span>
            ))}
          </div>
        </aside>
      )}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="size-5" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
