import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getCatalog } from "@/lib/catalog";
import { requestNow } from "@/lib/time";
import { inr } from "@/lib/format";
import { Eyebrow, Mark, posterBg } from "@/components/site/web/primitives";
import { BuyButton } from "@/components/site/web/BuyButton";
import { button, container, cx, tone } from "@/components/site/web/ui";

export const metadata = { title: "Plan validity & renewal" };

const DAY = 86_400_000;
const RENEW_WINDOW = 30; // days; matches pricing.ts, where plans this close to expiry can be bought again
const card = "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_24px_48px_-38px_rgb(80_20_0/0.4)]";
const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

// Plan validity & renewal: every chapter or course plan with what was paid, when it started
// and ends, and renewal (renewals stack on the time left; the price is recomputed at checkout).
export default async function PlansPage() {
  const user = await requireUser("/plans");
  const now = requestNow();
  const [ents, catalog, settings] = await Promise.all([
    db.entitlement.findMany({
      where: { userId: user.id },
      orderBy: { expiresAt: "asc" },
      include: {
        chapter: { select: { id: true, slug: true, title: true, symbol: true, coverFrom: true, coverTo: true, price: true, validityDays: true, isPublished: true } },
        course: { select: { id: true, slug: true, title: true, coverFrom: true, coverTo: true, price: true, validityDays: true, isPublished: true, _count: { select: { chapters: true } } } },
      },
    }),
    getCatalog(user.id),
    getSettings(),
  ]);
  const orderIds = [...new Set(ents.map((e) => e.orderId).filter((id): id is string => !!id))];
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true, paidAt: true, createdAt: true, total: true, items: { select: { itemId: true, price: true } } } })
    : [];
  const orderBy = new Map(orders.map((o) => [o.id, o]));
  const progress = new Map(catalog.map((c) => [c.id, c.progress]));

  // A renewal adds a new record for the same chapter/course: show one row per plan, with the
  // latest end date, the first start date and a "Renewed" tag.
  const groups = new Map<string, typeof ents>();
  for (const e of ents) {
    const k = e.courseId ? `c:${e.courseId}` : `ch:${e.chapterId}`;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const latest = [...groups.values()].map((g) => ({ e: g.reduce((x, y) => (y.expiresAt > x.expiresAt ? y : x)), first: g.reduce((x, y) => (y.createdAt < x.createdAt ? y : x)).createdAt, renewed: g.length > 1 }));

  const plans = latest.sort((x, y) => x.e.expiresAt.getTime() - y.e.expiresAt.getTime()).map(({ e, first, renewed }) => {
    const isCourse = !!e.course;
    const item = e.course ?? e.chapter!;
    const order = e.orderId ? orderBy.get(e.orderId) : undefined;
    const paid = order?.items.find((i) => i.itemId === item.id)?.price;
    const daysLeft = Math.ceil((e.expiresAt.getTime() - now) / DAY);
    const total = Math.max(1, (e.expiresAt.getTime() - first.getTime()) / DAY);
    return {
      id: e.id, isCourse, item, order, paid, renewed, source: e.source, start: first, expiresAt: e.expiresAt, daysLeft,
      used: Math.min(1, Math.max(0, 1 - daysLeft / total)),
      canRenew: daysLeft <= RENEW_WINDOW && item.isPublished,
      cover: isCourse ? { from: e.course!.coverFrom, to: e.course!.coverTo, symbol: "Σ" } : { from: e.chapter!.coverFrom, to: e.chapter!.coverTo, symbol: e.chapter!.symbol },
      href: isCourse ? `/courses/${e.course!.slug}` : `/chapter/${e.chapter!.slug}`,
      sub: isCourse ? `Complete course · ${e.course!._count.chapters} chapters` : `Chapter · ${Math.round((progress.get(e.chapter!.id) ?? 0) * 100)}% done`,
    };
  });
  const active = plans.filter((p) => p.daysLeft > 0);
  const expired = plans.filter((p) => p.daysLeft <= 0);
  const soon = active.filter((p) => p.canRenew);

  // Courses that include chapters the student already owns.
  const ownedChapterIds = new Set(catalog.filter((c) => c.owned).map((c) => c.id));
  const ownedCourseIds = new Set(active.filter((p) => p.isCourse).map((p) => p.item.id));
  const upsell = ownedChapterIds.size
    ? (await db.course.findMany({
        where: { isPublished: true, id: { notIn: [...ownedCourseIds] }, chapters: { some: { chapterId: { in: [...ownedChapterIds] } } } },
        orderBy: { sortOrder: "asc" },
        select: { id: true, slug: true, title: true, price: true, mrp: true, coverFrom: true, coverTo: true, validityDays: true, chapters: { select: { chapterId: true } } },
      })).slice(0, 2)
    : [];

  return (
    <div className={cx(container.detail, "pb-28 pt-[calc(86px+36px)]")}>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Link href="/profile" className="hover:text-foreground">Profile</Link>
        <span aria-hidden>/</span>
        <span className="text-foreground">Plans</span>
      </nav>
      <section className="mt-5 flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div>
          <Eyebrow dot="ok">Plan validity &amp; renewal</Eyebrow>
          <h1 className="mt-5 text-[clamp(36px,4.6vw,56px)] font-extrabold leading-[1.04] tracking-[-0.045em]">
            Your <Mark>plans</Mark>
          </h1>
          <p className="mt-3 max-w-[560px] text-[17px] leading-[1.55] text-secondary-foreground">
            What you&apos;ve bought, how long it lasts and when you can renew. Renewing adds a full new period on top of the days you have left.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Count value={active.length} label="Active" />
          <Count value={soon.length} label="Ending soon" warn={soon.length > 0} />
          <Count value={expired.length} label="Ended" />
        </div>
      </section>

      {plans.length === 0 ? (
        <div className="mt-10 rounded-2xl bg-wash px-6 py-14 text-center">
          <div className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.035em]">No plans yet</div>
          <p className="mx-auto mt-2 max-w-[440px] text-[15px] text-secondary-foreground">Buy a chapter or a complete course and it will show up here with its validity.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Link href="/chapters" className={cx(button.md, tone.primary)}>Browse chapters</Link>
            <Link href="/courses" className={cx(button.md, tone.secondary)}>Complete courses</Link>
          </div>
        </div>
      ) : (
        <>
          {active.length > 0 && <PlanList title="Active plans" plans={active} />}
          {expired.length > 0 && <PlanList title="Ended" plans={expired} />}
        </>
      )}

      {/* Upsell */}
      {(upsell.length > 0 || settings.features.mentorshipUpsell) && (
        <section className="mt-16">
          <h2 className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.035em]">Get more out of Mathflex</h2>
          <div className="mt-6 grid gap-5 min-[760px]:grid-cols-2">
            {upsell.map((c) => {
              const have = c.chapters.filter((x) => ownedChapterIds.has(x.chapterId)).length;
              return (
                <Link key={c.id} href={`/courses/${c.slug}`} className={cx(card, "group flex overflow-hidden text-foreground transition hover:-translate-y-0.5")}>
                  <span className="relative w-28 flex-none overflow-hidden text-white tablet:w-36" style={posterBg(c.coverFrom, c.coverTo)}>
                    <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-[110px] font-black leading-none text-white/25">Σ</span>
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-primary">Upgrade to a course</span>
                    <span className="mt-1 text-lg font-extrabold tracking-[-0.02em]">{c.title}</span>
                    <span className="mt-1 text-sm text-secondary-foreground">You have {have} of its {c.chapters.length} chapters. Get all of them for {c.validityDays} days.</span>
                    <span className="mt-3 flex items-baseline gap-2">
                      <span className="text-xl font-extrabold">{inr(c.price)}</span>
                      {c.mrp > c.price && <span className="text-sm text-muted-foreground line-through">{inr(c.mrp)}</span>}
                      <span className="ml-auto text-sm font-bold text-primary transition group-hover:translate-x-1">View →</span>
                    </span>
                  </span>
                </Link>
              );
            })}
            {settings.features.mentorshipUpsell && (
              <Link href="/book-a-call" className="group flex flex-col justify-between rounded-xl bg-wash p-6 text-foreground transition hover:-translate-y-0.5">
                <span>
                  <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-primary">Talk to Karan bhaiya</span>
                  <span className="mt-1 block text-lg font-extrabold tracking-[-0.02em]">{settings.mentorshipTitle}</span>
                  <span className="mt-1 block text-sm text-secondary-foreground">{settings.mentorshipBlurb}</span>
                </span>
                <span className="mt-4 flex items-baseline gap-2">
                  <span className="text-xl font-extrabold">{inr(settings.mentorshipPrice)}</span>
                  <span className="ml-auto text-sm font-bold text-primary transition group-hover:translate-x-1">Book a call →</span>
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      <p className="mt-14 text-center text-sm text-muted-foreground">
        Need a GST invoice for an order? Write to <a href={`mailto:${settings.supportEmail}`} className="font-bold text-foreground underline underline-offset-2">{settings.supportEmail}</a> with the order number.
      </p>
    </div>
  );
}

type Plan = {
  id: string; isCourse: boolean; item: { id: string; title: string; price: number; validityDays: number }; order?: { orderNo: string; paidAt: Date | null; createdAt: Date };
  paid?: number; renewed: boolean; source: string; start: Date; expiresAt: Date; daysLeft: number; used: number; canRenew: boolean;
  cover: { from: string; to: string; symbol: string }; href: string; sub: string;
};

function PlanList({ title, plans }: { title: string; plans: Plan[] }) {
  return (
    <section className="mt-12">
      <h2 className="text-[clamp(24px,2.6vw,30px)] font-extrabold tracking-[-0.035em]">{title}</h2>
      <div className="mt-6 grid gap-4">
        {plans.map((p) => {
          const ended = p.daysLeft <= 0;
          const warn = !ended && p.daysLeft <= RENEW_WINDOW;
          return (
            <article key={p.id} className={cx(card, "grid overflow-hidden min-[860px]:grid-cols-[200px_1fr_auto]", ended && "opacity-80")}>
              <Link href={p.href} className="relative block min-h-[110px] overflow-hidden text-white" style={posterBg(p.cover.from, p.cover.to)}>
                <span className={cx("absolute right-4 top-1/2 -translate-y-1/2 whitespace-nowrap font-black leading-none text-white/25", p.cover.symbol.length > 2 ? "text-[48px]" : "text-[84px]")}>{p.cover.symbol}</span>
                <span className="absolute left-3 top-3 flex gap-1.5">
                  <span className="rounded-md bg-white/92 px-2 py-1 text-[11px] font-extrabold text-black">{p.isCourse ? "Course" : "Chapter"}</span>
                  {p.renewed && <span className="rounded-md bg-ok px-2 py-1 text-[11px] font-extrabold">Renewed</span>}
                </span>
              </Link>
              <div className="min-w-0 p-5 tablet:p-6">
                <Link href={p.href} className="text-lg font-extrabold tracking-[-0.02em] text-foreground hover:text-primary">{p.item.title}</Link>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.sub}</p>
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm min-[600px]:grid-cols-4">
                  <Fact label={p.source === "purchase" ? (p.renewed ? "Last paid" : "Paid") : "Access"} value={p.source === "purchase" ? (p.paid !== undefined ? inr(p.paid) : "–") : p.source === "admin" ? "Given by Mathflex" : "Free"} />
                  <Fact label="Started" value={fmtDate(p.start)} />
                  <Fact label={ended ? "Ended" : "Valid till"} value={fmtDate(p.expiresAt)} />
                  <Fact label="Order" value={p.order?.orderNo ?? "–"} mono />
                </dl>
                {!ended && (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[13px] font-semibold">
                      <span className={warn ? "text-[color-mix(in_oklab,var(--gold)_55%,black)]" : "text-muted-foreground"}>{p.daysLeft} day{p.daysLeft === 1 ? "" : "s"} left</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cx("h-full rounded-full", warn ? "bg-gold" : "bg-ok")} style={{ width: `${(1 - p.used) * 100}%` }} /></div>
                  </div>
                )}
              </div>
              <div className="flex flex-col justify-center gap-2 border-t border-border p-5 min-[860px]:w-[220px] min-[860px]:border-l min-[860px]:border-t-0">
                {p.canRenew ? (
                  <>
                    <BuyButton item={{ type: p.isCourse ? "COURSE" : "CHAPTER", id: p.item.id }} className={cx(button.sm, tone.primary)}>
                      {ended ? "Buy again" : "Renew"} · {inr(p.item.price)}
                    </BuyButton>
                    <span className="text-center text-xs text-muted-foreground">Adds {p.item.validityDays} days{ended ? "" : " on top"}</span>
                  </>
                ) : ended ? (
                  <span className="text-center text-xs text-muted-foreground">No longer on sale</span>
                ) : (
                  <span className="text-center text-xs leading-[1.5] text-muted-foreground">Renewal opens on {fmtDate(new Date(p.expiresAt.getTime() - RENEW_WINDOW * DAY))}</span>
                )}
                <Link href={p.isCourse ? "/my-learning" : p.href.replace("/chapter/", "/learn/")} className={cx(button.sm, tone.secondary)}>{p.isCourse ? "My Learning" : "Open chapter"}</Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Fact({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</dt>
      <dd className={cx("mt-0.5 truncate font-bold", mono && "font-mono text-[13px]")}>{value}</dd>
    </div>
  );
}

function Count({ value, label, warn = false }: { value: number; label: string; warn?: boolean }) {
  return (
    <div className={cx("min-w-[96px] rounded-xl border border-border px-4 py-3", warn ? "bg-gold/12" : "bg-card")}>
      <div className="text-2xl font-extrabold tracking-[-0.04em]">{value}</div>
      <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
    </div>
  );
}
