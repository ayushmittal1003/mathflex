"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import type { FirebaseWebConfig } from "@/lib/firebase";

// Plain-language messages for the Firebase errors a student can actually hit.
const MESSAGES: Record<string, string> = {
  "auth/invalid-phone-number": "That mobile number doesn't look right.",
  "auth/too-many-requests": "Too many tries from this device. Please wait a while and try again.",
  "auth/invalid-verification-code": "That code isn't right. Please check it and try again.",
  "auth/code-expired": "That code has expired. Send a new one.",
  "auth/captcha-check-failed": "The security check failed. Please try again.",
  "auth/quota-exceeded": "We can't send codes right now. Please use Google or email for now.",
  "auth/billing-not-enabled": "Mobile login isn't available right now. Please use Google or email.",
  "auth/operation-not-allowed": "This sign-in option isn't available right now. Please use another.",
  "auth/popup-blocked": "Your browser blocked the Google window. Allow pop-ups and try again.",
  "auth/network-request-failed": "No connection. Check your internet and try again.",
};
const SILENT = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);
const RESEND_AFTER = 30;

// An error without a message of its own shows its code, so a set-up problem can be told apart from a bad try.
export function firebaseMessage(e: unknown) {
  const code = (e as { code?: string }).code ?? "";
  if (MESSAGES[code]) return MESSAGES[code];
  console.error("firebase sign-in failed", e);
  return `Something went wrong. Please try again.${code ? ` (${code})` : ""}`;
}

export async function firebaseAuth(config: FirebaseWebConfig) {
  // Loaded only when someone starts signing in, so the page itself stays light.
  const [{ getApps, initializeApp }, auth] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
  const app = getApps()[0] ?? initializeApp({ apiKey: config.apiKey, authDomain: config.authDomain, projectId: config.projectId, appId: config.appId });
  return { auth: auth.getAuth(app), api: auth };
}

// reCAPTCHA refuses to render twice in one element and clear() doesn't empty it, so every new verifier gets a new box.
export function freshCaptchaBox(host: HTMLElement) {
  const box = document.createElement("div");
  host.replaceChildren(box);
  return box;
}

export function FirebaseSignIn({ config, next, field }: { config: FirebaseWebConfig; next: string; field: string }) {
  const [step, setStep] = useState<"start" | "number" | "code" | "name">("start");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [wait, setWait] = useState(0);
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const idToken = useRef("");
  const captcha = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  useEffect(() => () => verifier.current?.clear(), []);

  const showError = (e: unknown) => {
    const c = (e as { code?: string }).code ?? "";
    if (!SILENT.has(c)) setError(firebaseMessage(e));
  };

  // Hand the proven identity to our server, which starts the session.
  const finish = async (token: string, withName?: string) => {
    const res = await fetch("/api/auth/firebase", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: token, next, name: withName }) });
    const data = (await res.json().catch(() => ({}))) as { redirect?: string; needName?: boolean; error?: string };
    if (data.needName) {
      idToken.current = token;
      setStep("name");
      return;
    }
    if (!data.redirect) {
      setError(data.error ?? "We couldn't sign you in. Please try again.");
      return;
    }
    const { auth, api } = await firebaseAuth(config);
    await api.signOut(auth).catch(() => {});
    window.location.assign(data.redirect);
  };

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const google = () =>
    run(async () => {
      const { auth, api } = await firebaseAuth(config);
      const { user } = await api.signInWithPopup(auth, new api.GoogleAuthProvider());
      await finish(await user.getIdToken());
    });

  const sendCode = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter your 10-digit mobile number.");
    return run(async () => {
      const { auth, api } = await firebaseAuth(config);
      try {
        verifier.current ??= new api.RecaptchaVerifier(auth, freshCaptchaBox(captcha.current!), { size: "invisible" });
        confirmation.current = await api.signInWithPhoneNumber(auth, `+91${phone}`, verifier.current);
        setCode("");
        setStep("code");
        setWait(RESEND_AFTER);
      } catch (e) {
        // A used or failed check can't be reused; the next try builds a new one.
        verifier.current?.clear();
        verifier.current = null;
        throw e;
      }
    });
  };

  const checkCode = () => {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    return run(async () => {
      const { user } = await confirmation.current!.confirm(code);
      await finish(await user.getIdToken());
    });
  };

  const saveName = () => {
    if (name.trim().length < 2) return setError("Please enter your name.");
    return run(() => finish(idToken.current, name.trim()));
  };

  const primary = "h-12 w-full rounded-lg bg-primary text-[15px] font-bold text-primary-foreground transition hover:brightness-108 disabled:opacity-60";
  const outline = "flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-border bg-card text-[15px] font-bold text-foreground shadow-[0_1px_4px_0_rgb(0_0_0/0.06)] transition hover:bg-muted disabled:opacity-60";
  const link = "text-sm font-bold text-primary hover:underline disabled:text-muted-foreground disabled:no-underline";

  return (
    <div className="mt-6 grid gap-3">
      {step === "start" && (
        <>
          <button type="button" onClick={google} disabled={busy} className={outline}>
            <svg className="size-[18px]" viewBox="0 0 24 24" aria-hidden><path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.5z" /><path fill="#34A853" d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5z" /><path fill="#FBBC05" d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3z" /><path fill="#EA4335" d="M12 5.1c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3C6.5 7.1 9 5.1 12 5.1z" /></svg>
            Continue with Google
          </button>
          {config.phone && (
            <button type="button" onClick={() => { setError(""); setStep("number"); }} disabled={busy} className={outline}>Continue with mobile number</button>
          )}
        </>
      )}

      {step === "number" && (
        <form onSubmit={(e) => { e.preventDefault(); void sendCode(); }} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-bold">
            Mobile number
            <span className="flex items-center gap-2">
              <span className="text-base font-semibold text-secondary-foreground">+91</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" autoFocus className={field} />
            </span>
          </label>
          <button disabled={busy} className={primary}>{busy ? "Sending…" : "Send OTP"}</button>
          <button type="button" onClick={() => { setError(""); setStep("start"); }} className={link}>Use another way</button>
          <p className="text-xs leading-[1.5] text-muted-foreground">
            We use Google Firebase to send your code by SMS, so your number is shared with Google. By continuing you agree to our <Link href="/terms" className="underline">terms</Link> and <Link href="/privacy" className="underline">privacy policy</Link>.
          </p>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={(e) => { e.preventDefault(); void checkCode(); }} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-bold">
            Enter the 6-digit code sent to +91 {phone}
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit OTP" autoFocus className={field} />
          </label>
          <button disabled={busy} className={primary}>{busy ? "Checking…" : "Verify and continue"}</button>
          <div className="flex justify-between">
            <button type="button" onClick={() => { setError(""); setStep("number"); }} className={link}>Change number</button>
            <button type="button" onClick={() => void sendCode()} disabled={busy || wait > 0} className={link}>{wait > 0 ? `Resend in ${wait}s` : "Resend code"}</button>
          </div>
        </form>
      )}

      {step === "name" && (
        <form onSubmit={(e) => { e.preventDefault(); void saveName(); }} className="grid gap-3">
          <label className="grid gap-1.5 text-sm font-bold">
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" autoFocus className={field} />
          </label>
          <p className="text-sm leading-[1.5] text-secondary-foreground">No account uses this number yet, so this creates a new one. Bought chapters with an email or Google login? Log in that way instead, then verify this number in your profile.</p>
          <button disabled={busy} className={primary}>{busy ? "Creating…" : "Create my account"}</button>
        </form>
      )}

      {error && <p role="alert" className="rounded-lg bg-bad/8 px-3.5 py-2.5 text-sm font-semibold text-foreground">{error}</p>}
      {/* Firebase's invisible reCAPTCHA attaches here; it stays mounted across the steps. */}
      <div ref={captcha} />
    </div>
  );
}
