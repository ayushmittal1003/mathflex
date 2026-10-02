import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/invite";
import { findOpenInvite } from "@/lib/invites";
import { ROLE_BLURB, ROLE_LABEL, type StaffRole } from "@/lib/permissions";
import { InviteSignup } from "@/components/site/InviteSignup";

export const metadata = { title: "Join the team", robots: { index: false } };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, user] = await Promise.all([findOpenInvite(token), getCurrentUser()]);

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col justify-center px-4 pb-24 pt-[calc(var(--nav-h)+2rem)]">
      <ShieldCheck className="size-12 text-primary" />
      {!inv ? (
        <>
          <h1 className="mt-4 font-display text-3xl font-extrabold">Invite not valid</h1>
          <p className="mt-2 text-muted-foreground">This link has expired, was already used, or was revoked. Ask a MathFlex super admin to send you a fresh one.</p>
          <Link href="/" className="btn btn-ghost mt-6 self-start">Go home</Link>
        </>
      ) : (
        <>
          <h1 className="mt-4 font-display text-3xl font-extrabold">Join the MathFlex team</h1>
          <p className="mt-2 text-muted-foreground">
            You&apos;ve been invited as <b className="text-foreground">{ROLE_LABEL[inv.role]}</b>. {ROLE_BLURB[inv.role as StaffRole]}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Invite for {inv.email} · valid until {inv.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
          <div className="mt-8">
            {user && user.email === inv.email ? (
              <form action={acceptInvite.bind(null, token)}>
                <button className="btn btn-primary w-full !py-3.5">Accept and open the admin panel</button>
              </form>
            ) : user ? (
              <div className="card p-5 text-sm">
                You&apos;re signed in as <b>{user.email}</b>, but this invite is for <b>{inv.email}</b>. Log out and sign in with the invited email to accept.
              </div>
            ) : (
              <InviteSignup token={token} email={inv.email} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
