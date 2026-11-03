"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import type { FirebaseWebConfig } from "@/lib/firebase";
import { firebaseAuth, firebaseMessage, freshCaptchaBox } from "../FirebaseSignIn";
import { button, cx, tone } from "./ui";

const field = "w-full rounded-lg border border-border bg-card px-4 py-3 text-[15px] outline-none transition focus:border-foreground";

// Lets a student with an email or Google login add mobile OTP login to the same account, purchases included.
export function VerifyPhone({ config, initial }: { config: FirebaseWebConfig; initial: string }) {
  const router = useRouter();
  const [phone, setPhone] = useState(initial);
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const confirmation = useRef<ConfirmationResult | null>(null);
  const verifier = useRef<RecaptchaVerifier | null>(null);
  const captcha = useRef<HTMLDivElement>(null);

  useEffect(() => () => verifier.current?.clear(), []);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(firebaseMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const send = () => {
    if (!/^[6-9]\d{9}$/.test(phone)) return setError("Enter your 10-digit mobile number.");
    return run(async () => {
      const { auth, api } = await firebaseAuth(config);
      try {
        verifier.current ??= new api.RecaptchaVerifier(auth, freshCaptchaBox(captcha.current!), { size: "invisible" });
        confirmation.current = await api.signInWithPhoneNumber(auth, `+91${phone}`, verifier.current);
        setCode("");
        setSent(true);
      } catch (e) {
        verifier.current?.clear();
        verifier.current = null;
        throw e;
      }
    });
  };

  const check = () => {
    if (!/^\d{6}$/.test(code)) return setError("Enter the 6-digit code.");
    return run(async () => {
      const { user } = await confirmation.current!.confirm(code);
      const res = await fetch("/api/auth/firebase/link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: await user.getIdToken() }) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const { auth, api } = await firebaseAuth(config);
      await api.signOut(auth).catch(() => {});
      if (!res.ok) return setError(data.error ?? "We couldn't verify that number. Please try again.");
      router.refresh();
    });
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); void (sent ? check() : send()); }} className="grid gap-3">
      {sent ? (
        <label className="grid gap-1.5 text-sm font-bold">
          Enter the 6-digit code sent to +91 {phone}
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" autoFocus className={field} />
        </label>
      ) : (
        <label className="grid gap-1.5 text-sm font-bold">
          Mobile number (+91)
          <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit number" className={field} />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button disabled={busy} className={cx(button.md, tone.primary)}>{busy ? "Please wait…" : sent ? "Verify number" : "Send OTP"}</button>
        {sent && <button type="button" onClick={() => { setError(""); setSent(false); }} className="text-sm font-bold text-primary hover:underline">Change number</button>}
      </div>
      <p className="text-xs leading-[1.5] text-muted-foreground">We use Google Firebase to send your code by SMS, so your number is shared with Google.</p>
      {error && <p role="alert" className="text-sm font-semibold text-bad">{error}</p>}
      <div ref={captcha} />
    </form>
  );
}
