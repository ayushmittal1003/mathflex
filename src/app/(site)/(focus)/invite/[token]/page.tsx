import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/invite";
import { findOpenInvite } from "@/lib/invites";
import { ROLE_BLURB, ROLE_LABEL, type StaffRole } from "@/lib/permissions";
import { InviteSignup } from "@/components/site/InviteSignup";
import { SiteLogo } from "@/components/site/web/SiteLogo";
import { logout } from "@/app/actions/auth";
import { button, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Join the team", robots: { index: false } };

// Staff invite (link from a super admin). Same checks and actions as before; website styling.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [inv, user] = await Promise.all([findOpenInvite(token), getCurrentUser()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-6 pt-6">
        <Link href="/" aria-label="Mathflex home"><SiteLogo /></Link>
      </header>
      <main className="grid flex-1 place-items-center px-4 pb-18 pt-10">
        <div className="w-[min(460px,100%)] animate-mf-rise rounded-xl border border-border bg-card p-7 shadow-[0_30px_60px_-40px_rgb(80_20_0/0.45)] tablet:p-9">
          <span className="grid size-14 place-items-center rounded-xl bg-gradient-to-br from-primary to-brand-2 text-white" aria-hidden>
            <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
          </span>
          {!inv ? (
            <>
              <h1 className="mt-5 text-[30px] font-extrabold leading-tight tracking-[-0.035em]">Invite not valid</h1>
              <p className="mt-2 text-[15px] leading-[1.6] text-secondary-foreground">This link has expired, was already used, or was revoked. Ask a Mathflex super admin to send you a fresh one.</p>
              <Link href="/" className={cx(button.md, tone.secondary, "mt-6")}>Go home</Link>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-[30px] font-extrabold leading-tight tracking-[-0.035em]">Join the Mathflex team</h1>
              <p className="mt-2 text-[15px] leading-[1.6] text-secondary-foreground">
                You&apos;ve been invited as <b className="text-foreground">{ROLE_LABEL[inv.role]}</b>. {ROLE_BLURB[inv.role as StaffRole]}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">Invite for {inv.email} · valid until {inv.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
              <div className="mt-7">
                {user && user.email === inv.email ? (
                  <form action={acceptInvite.bind(null, token)}>
                    <button className={cx(button.lg, tone.primary, "w-full")}>Accept and open the admin panel</button>
                  </form>
                ) : user ? (
                  <div className="rounded-lg bg-muted p-5 text-sm leading-[1.6]">
                    You&apos;re signed in as <b>{user.email}</b>, but this invite is for <b>{inv.email}</b>. Log out and sign in with the invited email to accept.
                    <form action={logout} className="mt-4"><button className={cx(button.sm, tone.dark)}>Log out</button></form>
                  </div>
                ) : (
                  <InviteSignup token={token} email={inv.email} />
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
