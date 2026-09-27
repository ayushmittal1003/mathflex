import { Gift } from "lucide-react";
import { requestNow } from "@/lib/time";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { inr } from "@/lib/format";
import { ProfileForm } from "@/components/site/ProfileForm";
import { RenewButton } from "@/components/site/RenewButton";

export const metadata = { title: "Profile" };

export default async function Profile() {
  const user = await requireUser("/profile");
  const settings = await getSettings();
  const [ents, orders, mentorships] = await Promise.all([
    db.entitlement.findMany({ where: { userId: user.id }, orderBy: { expiresAt: "asc" }, include: { chapter: true, course: true } }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { items: true }, take: 20 }),
    db.mentorshipBooking.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const now = requestNow();
  // A course renewal can't be computed per chapter, so renewals re-buy what was bought.
  const renewalWindow = 30 * 86_400_000;

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 pt-[calc(var(--nav-h)+2rem)]">
      <section>
        <h1 className="mb-4 font-display text-3xl font-extrabold">Profile</h1>
        <ProfileForm user={user} />
      </section>

      <section id="plans">
        <h2 className="mb-3 font-display text-2xl font-extrabold">Plan validity</h2>
        <div className="card divide-y divide-border">
          {ents.map((e) => {
            const left = Math.ceil((e.expiresAt.getTime() - now) / 86_400_000);
            const title = e.chapter?.title ?? e.course?.title ?? "Plan";
            const expired = left <= 0;
            return (
              <div key={e.id} className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{title}</p>
                  <p className={`text-sm ${expired ? "text-bad" : left < 30 ? "text-gold" : "text-muted"}`}>
                    {expired ? "Expired" : `${left} days left`} · till {e.expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                {(expired || e.expiresAt.getTime() - now < renewalWindow) && (e.chapterId || e.courseId) && (
                  <RenewButton type={e.courseId ? "COURSE" : "CHAPTER"} id={(e.courseId ?? e.chapterId)!} />
                )}
              </div>
            );
          })}
          {!ents.length && <p className="p-4 text-sm text-muted">No plans yet.</p>}
        </div>
      </section>

      {settings.features.referAndEarn && (
        <section id="refer" className="rounded-3xl bg-brand-gradient p-6 text-white">
          <Gift className="size-8" />
          <h2 className="mt-3 font-display text-2xl font-extrabold">Refer & Earn</h2>
          <p className="mt-1 opacity-90">Share your code with friends. When they buy their first chapter, you both win.</p>
          <p className="mt-4 inline-block rounded-xl bg-black/20 px-4 py-2 font-mono text-lg font-bold tracking-wider">{user.referralCode.slice(-8).toUpperCase()}</p>
        </section>
      )}

      {mentorships.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-2xl font-extrabold">Mentorship calls</h2>
          <div className="card divide-y divide-border">
            {mentorships.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-4 text-sm">
                <span className="font-semibold">{settings.mentorshipTitle}</span>
                <span className="text-muted">{m.scheduledAt ? m.scheduledAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : m.status.toLowerCase()}</span>
                {m.meetLink && <a href={m.meetLink} className="font-bold text-brand">Join</a>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-2xl font-extrabold">Orders</h2>
        <div className="card divide-y divide-border">
          {orders.map((o) => (
            <div key={o.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{o.items.map((i) => i.title).join(", ")}</p>
                <p className="text-muted">{o.orderNo} · {o.createdAt.toLocaleDateString("en-IN")}</p>
              </div>
              <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${o.status === "PAID" ? "bg-ok/15 text-ok" : o.status === "PENDING" ? "bg-gold/15 text-gold" : "bg-bad/10 text-bad"}`}>{o.status}</span>
              <span className="w-16 text-right font-bold">{inr(o.total)}</span>
            </div>
          ))}
          {!orders.length && <p className="p-4 text-sm text-muted">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}
