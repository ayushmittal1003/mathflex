import Link from "next/link";
import { requestNow } from "@/lib/time";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { levelFromXp } from "@/lib/gamification";
import { logout } from "@/app/actions/auth";
import { ProfileForm } from "@/components/site/web/ProfileForm";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Profile" };

const card = "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)]";
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Profile: account details (same form and action as before), a plans summary that links to
// /plans, 1:1 calls, refer & earn (when switched on) and order history.
export default async function Profile() {
  const user = await requireUser("/profile");
  const settings = await getSettings();
  const now = requestNow();
  const [ents, orders, mentorships] = await Promise.all([
    db.entitlement.findMany({ where: { userId: user.id }, orderBy: { expiresAt: "asc" }, select: { expiresAt: true } }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true }, take: 20 }),
    db.mentorshipBooking.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const active = ents.filter((e) => e.expiresAt.getTime() > now);
  const soon = active.filter((e) => e.expiresAt.getTime() - now < 30 * 86_400_000).length;
  const lvl = levelFromXp(user.xp);

  return (
    <div className={cx(container.detail, "pb-28 pt-[calc(86px+36px)]")}>
      {/* Account header */}
      <section className="flex flex-wrap items-center gap-5">
        <span className="grid size-20 flex-none place-items-center rounded-full text-3xl font-extrabold text-white ring-4 ring-white shadow-[0_14px_30px_-14px_rgb(0_0_0/0.4)]" style={{ background: user.avatarColor }}>
          {user.name.trim()[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[clamp(30px,3.6vw,44px)] font-extrabold leading-[1.05] tracking-[-0.04em]">{user.name}</h1>
          <p className="mt-1 text-[15px] text-secondary-foreground">
            {user.email} · Member since {user.createdAt.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm font-extrabold">
          <span className="rounded-full bg-muted px-3 py-1.5">Level {lvl.level} · {lvl.title}</span>
          <span className="rounded-full bg-muted px-3 py-1.5 text-xp">⚡ {user.xp.toLocaleString("en-IN")} XP</span>
          <span className="rounded-full bg-muted px-3 py-1.5 text-brand-2">🔥 {user.streak}-day streak</span>
        </div>
      </section>

      <div className="mt-10 grid gap-6 min-[960px]:grid-cols-[1.35fr_1fr] min-[960px]:items-start">
        {/* Details */}
        <section className={cx(card, "p-6 tablet:p-8")}>
          <h2 className="text-xl font-extrabold tracking-[-0.025em]">Your details</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your mobile number is needed to pay and for call bookings.</p>
          <div className="mt-6"><ProfileForm user={user} /></div>
        </section>

        <div className="grid gap-6">
          {/* Plans summary */}
          <Link href="/plans" className={cx(card, "group block p-6 text-foreground transition hover:-translate-y-0.5")}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-[-0.025em]">Plan validity &amp; renewal</h2>
              <span aria-hidden className="text-primary transition group-hover:translate-x-1">→</span>
            </div>
            {active.length ? (
              <>
                <p className="mt-3 text-[28px] font-extrabold leading-none tracking-[-0.04em]">{active.length} active plan{active.length > 1 ? "s" : ""}</p>
                <p className="mt-2 text-sm text-muted-foreground">Next expiry {fmtDate(active[0].expiresAt)}</p>
                {soon > 0 && <p className="mt-3 inline-flex rounded-md bg-gold/15 px-2.5 py-1 text-[13px] font-bold">{soon} ending within 30 days · renew now</p>}
              </>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">{ents.length ? "Your plans have ended. See them and renew." : "No plans yet. Start with any chapter."}</p>
            )}
          </Link>

          {settings.features.referAndEarn && (
            <section id="refer" className="scroll-mt-24 rounded-xl bg-wash p-6">
              <h2 className="text-xl font-extrabold tracking-[-0.025em]">Refer &amp; Earn</h2>
              <p className="mt-1 text-sm text-secondary-foreground">Share your code with friends. When they buy their first chapter, you both win.</p>
              <p className="mt-4 inline-block rounded-lg bg-card px-4 py-2 font-mono text-lg font-bold tracking-wider">{user.referralCode.slice(-8).toUpperCase()}</p>
            </section>
          )}

          {mentorships.length > 0 && (
            <section className={cx(card, "p-6")}>
              <h2 className="text-xl font-extrabold tracking-[-0.025em]">1:1 calls</h2>
              <ul className="mt-4 grid gap-2">
                {mentorships.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block font-bold">{settings.mentorshipTitle}</span>
                      <span className="text-muted-foreground">{m.scheduledAt ? m.scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : m.status.toLowerCase()}</span>
                    </span>
                    {m.meetLink && <a href={m.meetLink} className={cx(button.sm, tone.primaryFlat)}>Join</a>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <form action={logout}>
            <button className={cx(button.md, tone.secondary, "w-full")}>Log out</button>
          </form>
        </div>
      </div>

      {/* Orders */}
      <section className="mt-14">
        <h2 className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.035em]">Orders</h2>
        {orders.length ? (
          <div className={cx(card, "mt-5 overflow-hidden")}>
            {orders.map((o, i) => (
              <div key={o.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-4 text-sm", i > 0 && "border-t border-border")}>
                <div className="min-w-0 flex-[1_1_240px]">
                  <p className="truncate font-bold">{o.items.map((it) => it.title).join(", ")}</p>
                  <p className="text-muted-foreground">{o.orderNo} · {fmtDate(o.createdAt)}</p>
                </div>
                <span className={cx("rounded-full px-2.5 py-1 text-xs font-bold", o.status === "PAID" ? "bg-ok/12 text-ok" : o.status === "PENDING" ? "bg-gold/18" : "bg-bad/10 text-bad")}>{o.status.toLowerCase()}</span>
                <span className="w-20 text-right text-[15px] font-extrabold">{inr(o.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/50 px-6 py-10 text-center text-sm text-muted-foreground">
            No orders yet. <Link href="/chapters" className="font-bold text-primary">Browse chapters</Link>
          </div>
        )}
      </section>
    </div>
  );
}
