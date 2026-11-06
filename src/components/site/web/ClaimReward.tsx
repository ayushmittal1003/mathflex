"use client";
import { useActionState } from "react";
import { claimReward, type ClaimState } from "@/app/actions/rewards";

// The claim form on /rewards. Gold also asks whether the student is happy to be featured publicly.
export function ClaimReward({ tier, askShoutout }: { tier: string; askShoutout: boolean }) {
  const [state, action, pending] = useActionState<ClaimState, FormData>(claimReward, undefined);
  if (state?.ok) return <p role="status" className="rounded-lg bg-ok/12 px-3.5 py-3 text-sm font-bold text-ok-strong">Claimed! We&apos;ll contact you on WhatsApp or email to arrange it.</p>;
  return (
    <form action={action} className="grid gap-2.5">
      <input type="hidden" name="tier" value={tier} />
      {askShoutout && (
        <label className="flex items-start gap-2.5 text-sm text-secondary-foreground">
          <input type="checkbox" name="shoutout" className="mt-0.5 size-4 shrink-0 accent-primary" />
          Yes, you can feature my name on the Mathflex website and Instagram.
        </label>
      )}
      <button disabled={pending} className="min-h-11 rounded-lg bg-ok px-4 text-sm font-bold text-white hover:brightness-108 disabled:opacity-60">{pending ? "Claiming…" : "Claim reward"}</button>
      {state?.error && <p role="alert" className="text-sm font-semibold text-bad">{state.error}</p>}
    </form>
  );
}
