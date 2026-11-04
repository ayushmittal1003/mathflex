import { FirebaseSignIn } from "@/components/site/FirebaseSignIn";
import type { FirebaseWebConfig } from "@/lib/firebase";
import { cx } from "./ui";

const FIELD = "h-12 w-full rounded-lg border border-input bg-card px-3.5 text-base text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/25";

// Shown to someone using the account made for them at checkout. It only works in this browser until
// they prove who they are; doing that moves everything they bought to a permanent account.
export function SecureAccess({ firebase, className }: { firebase: FirebaseWebConfig | null; className?: string }) {
  if (!firebase) return null;
  return (
    <section className={cx("rounded-xl border border-border bg-card p-5 text-left", className)} aria-labelledby="secure-access">
      <h2 id="secure-access" className="text-lg font-extrabold tracking-[-0.02em]">Keep your access on every device</h2>
      <p className="mt-1 text-sm leading-[1.5] text-secondary-foreground">You&apos;re logged in on this device only. Add Google or your mobile number once, so you can log back in anywhere. Your chapters stay with you.</p>
      <FirebaseSignIn config={firebase} next="/my-learning" field={FIELD} />
    </section>
  );
}
