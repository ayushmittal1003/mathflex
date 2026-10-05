"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarClock, Gift, GraduationCap, Home, LayoutGrid, LogOut, Mail, MessageCircle, PlayCircle, Shield, ShoppingBag, Target, Trophy, User } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { useCart } from "../cart-store";
import { SiteLogo } from "./SiteLogo";
import { button, cx, tone } from "./ui";

export type SiteNavUser = { name: string; email: string; avatarColor: string; isStaff: boolean; xp: number; streak: number; planSummary: string | null } | null;
type Features = { leaderboard: boolean; practice: boolean; referAndEarn: boolean };
type Contact = { whatsapp: string; email: string };

// Pages whose hero has no wash (design.md §3.1): the nav sits on white there.
const PLAIN_HEADER = ["/leaderboard", "/contact", "/faq", "/terms", "/privacy", "/refund-policy", "/blog", "/free-practice", "/my-learning", "/practice", "/profile", "/plans"];

// design.md §3.2: logo · dark segmented nav · actions. Below 1024px the segmented nav and
// auth buttons hide and a dark hamburger opens a drop-down panel.
export function SiteNav({ user, features, contact }: { user: SiteNavUser; features: Features; contact: Contact }) {
  const pathname = usePathname();
  const cartCount = useCart().length;
  // The menu is open for the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<{ path: string; menu: "nav" | "account" | "more" } | null>(null);
  const open = openOn?.path === pathname && openOn.menu === "nav";
  const accountOpen = openOn?.path === pathname && openOn.menu === "account";
  const setOpen = (v: boolean) => setOpenOn(v ? { path: pathname, menu: "nav" } : null);
  const setAccountOpen = (v: boolean) => setOpenOn(v ? { path: pathname, menu: "account" } : null);
  const moreOpen = openOn?.path === pathname && openOn.menu === "more";
  const setMoreOpen = (v: boolean) => setOpenOn(v ? { path: pathname, menu: "more" } : null);
  const accountRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setOpenOn(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenOn(null); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("keydown", onKey); };
  }, [accountOpen]);
  // Once the page scrolls past the nav's own spot it sticks to the top on a white bar.
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 110);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const onWash = !stuck && !PLAIN_HEADER.some((p) => pathname.startsWith(p));

  // Signed in, the nav swaps Pricing for the student's own pages, like the original nav.
  const links = [
    { href: "/", label: "Home" },
    { href: "/chapters", label: "Chapters" },
    { href: "/courses", label: "Courses" },
    ...(user
      ? [{ href: "/my-learning", label: "My Learning" }, ...(features.practice ? [{ href: "/practice", label: "Practice" }] : [])]
      : [{ href: "/pricing", label: "Pricing" }]),
    ...(features.leaderboard ? [{ href: "/leaderboard", label: "Leaderboard" }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));
  const secondary = onWash ? tone.glass : "border border-border bg-card text-foreground hover:brightness-97";

  return (
    <>
    <header
      className={cx(
        stuck
          ? "fixed inset-x-0 top-0 z-40 animate-mf-drop border-b border-border bg-card/90 pt-[env(safe-area-inset-top)] shadow-[0_8px_24px_-16px_rgb(0_0_0/0.25)] backdrop-blur-xl"
          : "absolute inset-x-4 top-4 z-30",
      )}
    >
      <nav
        className={cx("mx-auto grid max-w-[1240px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 sm:px-8", stuck ? "py-3" : "py-5.5")}
        aria-label="Main"
      >
        <Link href="/" className="col-start-1 justify-self-start" aria-label="Mathflex home">
          <SiteLogo />
        </Link>

        <div className="col-start-2 hidden gap-0.5 whitespace-nowrap rounded-lg bg-foreground p-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cx(
                "rounded-md px-3.5 py-[7px] text-[13px] transition-colors",
                isActive(l.href) ? "bg-card font-bold text-foreground" : "font-semibold text-white/75 hover:text-white",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>

        <div className="col-start-3 flex items-center gap-2 justify-self-end">
          <Link
            href="/checkout"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className={cx("relative grid size-[42px] place-items-center rounded-lg transition hover:scale-[1.06]", secondary)}
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <>
                <Link href="/my-learning" aria-label={`${user.streak}-day streak, ${user.xp} XP`} className={cx("hidden h-[42px] items-center gap-3 rounded-lg px-3.5 text-sm font-extrabold xl:flex", secondary)}>
                  <span className="text-brand-2">🔥 {user.streak}</span>
                  <span className="text-xp">⚡ {user.xp.toLocaleString("en-IN")}</span>
                </Link>
                <div ref={accountRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setAccountOpen(!accountOpen)}
                    aria-label="Account menu"
                    aria-expanded={accountOpen}
                    className="grid size-[42px] place-items-center rounded-full text-sm font-bold text-white ring-2 ring-white transition hover:scale-[1.06]"
                    style={{ background: user.avatarColor }}
                  >
                    {user.name.trim()[0]?.toUpperCase() ?? "?"}
                  </button>
                  {accountOpen && (
                    <div className="absolute right-0 top-full z-50 mt-3 w-[340px] animate-mf-rise rounded-xl border border-border bg-card p-2 text-foreground shadow-[0_30px_60px_-20px_rgb(80_20_0/0.35)]">
                      <AccountMenu user={user} features={features} contact={contact} onNavigate={() => setOpenOn(null)} />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className={cx(button.sm, secondary)}>Log in</Link>
                <Link href="/signup" className={cx(button.sm, tone.primary)}>Start free</Link>
              </>
            )}
          </div>

          {/* Phones: account button (the rest lives in the bottom bar's More sheet). */}
          {user ? (
            <button type="button" onClick={() => setMoreOpen(true)} aria-label="Account menu" className="grid size-[42px] place-items-center rounded-full text-sm font-bold text-white ring-2 ring-white tablet:hidden" style={{ background: user.avatarColor }}>
              {user.name.trim()[0]?.toUpperCase() ?? "?"}
            </button>
          ) : (
            <Link href="/login" className={cx(button.sm, secondary, "h-[42px] tablet:hidden")}>Log in</Link>
          )}

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="hidden size-[42px] place-items-center rounded-lg bg-foreground text-card tablet:grid lg:hidden"
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className={cx("absolute z-20", stuck ? "inset-x-4 top-full mt-2" : "inset-x-0 top-[84px]")}>
        <div className="max-h-[calc(100dvh-110px)] animate-mf-rise overflow-y-auto rounded-xl bg-foreground p-2.5 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cx("block rounded-lg px-3 py-3.5 text-base", isActive(l.href) ? "bg-white/10 font-bold" : "font-semibold text-white/80")}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <div className="mt-2 rounded-lg bg-card p-1.5 text-foreground">
              <AccountMenu user={user} features={features} contact={contact} onNavigate={() => setOpen(false)} compact />
            </div>
          )}
          {!user && (
            <div className="flex gap-2 px-0.5 pb-0.5 pt-2.5">
              <Link href="/login" className="flex-1 rounded-lg bg-white/12 p-3.5 text-center font-bold">Log in</Link>
              <Link href="/signup" className="flex-1 rounded-lg bg-primary p-3.5 text-center font-bold text-primary-foreground">Start free</Link>
            </div>
          )}
        </div>
        </div>
      )}
    </header>
    <MobileTabBar pathname={pathname} user={user} features={features} onMore={() => setMoreOpen(!moreOpen)} moreOpen={moreOpen} />
    {moreOpen && <MoreSheet user={user} features={features} contact={contact} onClose={() => setOpenOn(null)} />}
    </>
  );
}

// Account menu (desktop dropdown and inside the mobile panel). Same items as the original
// account drawer: plan summary, site links, account pages, support, admin and log out.
function AccountMenu({ user, features, contact, onNavigate, compact = false }: { user: NonNullable<SiteNavUser>; features: Features; contact: Contact; onNavigate: () => void; compact?: boolean }) {
  const item = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-semibold text-foreground transition hover:bg-muted";
  const icon = "size-[18px] flex-none text-muted-foreground";
  const rule = <div className="mx-3 my-1.5 h-px bg-border" />;
  return (
    <div onClick={(e) => { if ((e.target as HTMLElement).closest("a")) onNavigate(); }}>
      <div className="rounded-lg bg-wash p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 flex-none place-items-center rounded-full text-base font-bold text-white ring-2 ring-white" style={{ background: user.avatarColor }}>{user.name.trim()[0]?.toUpperCase() ?? "?"}</span>
          <span className="min-w-0">
            <span className="block truncate font-extrabold">{user.name}</span>
            <span className="block truncate text-sm text-secondary-foreground">{user.email}</span>
          </span>
        </div>
        <Link href={user.planSummary ? "/plans" : "/chapters"} className="mt-3 flex items-center justify-between gap-2 rounded-md bg-card/80 px-3 py-2 text-[13px] font-semibold text-foreground">
          <span>{user.planSummary ?? "No active plan yet. Start with any chapter."}</span>
          <span aria-hidden className="text-primary">→</span>
        </Link>
        <div className="mt-2 flex gap-2 text-[13px] font-extrabold">
          <span className="rounded-md bg-card/80 px-2.5 py-1 text-brand-2">🔥 {user.streak}-day streak</span>
          <span className="rounded-md bg-card/80 px-2.5 py-1 text-xp">⚡ {user.xp.toLocaleString("en-IN")} XP</span>
        </div>
      </div>
      <nav className="mt-1.5 grid" aria-label="Account">
        {!compact && (
          <>
            <Link href="/" className={item}><LayoutGrid className={icon} /> Home</Link>
            <Link href="/chapters" className={item}><BookOpen className={icon} /> All chapters</Link>
            <Link href="/courses" className={item}><GraduationCap className={icon} /> Complete courses</Link>
            {features.practice && <Link href="/practice" className={item}><Target className={icon} /> Practice Q bank</Link>}
            {features.leaderboard && <Link href="/leaderboard" className={item}><Trophy className={icon} /> Leaderboard</Link>}
            {rule}
          </>
        )}
        <Link href="/my-learning" className={item}><PlayCircle className={icon} /> My Learning</Link>
        <Link href="/profile" className={item}><User className={icon} /> Profile</Link>
        <Link href="/plans" className={item}><CalendarClock className={icon} /> Plan validity &amp; renewal</Link>
        {features.referAndEarn && <Link href="/profile#refer" className={item}><Gift className={icon} /> Refer &amp; Earn</Link>}
        {rule}
        <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className={item}><MessageCircle className="size-[18px] flex-none text-ok" /> WhatsApp support</a>
        <a href={`mailto:${contact.email}`} className={cx(item, "break-all")}><Mail className={icon} /> {contact.email}</a>
        {user.isStaff && <Link href="/admin" className={item}><Shield className="size-[18px] flex-none text-primary" /> Admin panel</Link>}
        {rule}
        <form action={logout}>
          <button type="submit" className={cx(item, "w-full text-left")}><LogOut className={icon} /> Log out</button>
        </form>
      </nav>
    </div>
  );
}

// Phones (< 760px): app-style bottom bar. Tablets and up use the top nav instead.
function MobileTabBar({ pathname, user, features, onMore, moreOpen }: { pathname: string; user: SiteNavUser; features: Features; onMore: () => void; moreOpen: boolean }) {
  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chapters", label: "Chapters", icon: BookOpen },
    ...(user
      ? [{ href: "/my-learning", label: "Learning", icon: PlayCircle }, { href: features.practice ? "/practice" : "/free-practice", label: "Practice", icon: Target }]
      : [{ href: "/courses", label: "Courses", icon: GraduationCap }, { href: "/free-practice", label: "Practice", icon: Target }]),
  ];
  const item = "relative flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-bold";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/94 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-20px_rgb(0_0_0/0.3)] backdrop-blur-xl tablet:hidden" aria-label="Quick links">
      <ul className="grid h-16 grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = !moreOpen && (href === "/" ? pathname === "/" : pathname.startsWith(href));
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={cx(item, active ? "text-primary" : "text-muted-foreground")}>
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary" aria-hidden />}
                <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onMore} aria-expanded={moreOpen} className={cx(item, "w-full", moreOpen ? "text-primary" : "text-muted-foreground")}>
            {moreOpen && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary" aria-hidden />}
            <span className="relative">
              <LayoutGrid className="size-[22px]" strokeWidth={moreOpen ? 2.5 : 2} />
            </span>
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}

// The More sheet: everything that isn't in the bottom bar, plus the account menu.
function MoreSheet({ user, features, contact, onClose }: { user: SiteNavUser; features: Features; contact: Contact; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [onClose]);
  const tile = "flex min-h-[64px] flex-col justify-center gap-0.5 rounded-lg bg-muted px-3.5 py-2.5 text-[15px] font-bold text-foreground";
  const links = [
    { href: "/courses", label: "Complete courses", sub: "Every chapter, one price" },
    { href: "/pricing", label: "Pricing", sub: "Chapters and courses" },
    ...(features.leaderboard ? [{ href: "/leaderboard", label: "Leaderboard", sub: "This week's top students" }] : []),
    { href: "/free-practice", label: "Free practice", sub: "Easy to hard sets" },
    { href: "/blog", label: "Blog", sub: "Study tips and guides" },
    { href: "/book-a-call", label: "Book a 1:1 call", sub: "With Karan bhaiya" },
    { href: "/about", label: "About us", sub: "Our story" },
    { href: "/faq", label: "Help centre", sub: "FAQs and support" },
  ];
  return (
    <div className="fixed inset-0 z-[55] tablet:hidden" role="dialog" aria-modal aria-label="More">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
      <div className="absolute inset-x-0 bottom-0 max-h-[88dvh] animate-mf-rise overflow-y-auto rounded-t-2xl bg-card px-4 pb-[calc(80px+env(safe-area-inset-bottom))] pt-3 text-foreground shadow-[0_-30px_60px_-20px_rgb(0_0_0/0.4)]" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) onClose(); }}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" aria-hidden />
        {user ? (
          <AccountMenu user={user} features={features} contact={contact} onNavigate={onClose} compact />
        ) : (
          <div className="rounded-lg bg-wash p-4">
            <div className="text-lg font-extrabold tracking-[-0.02em]">Learn JEE maths, chapter by chapter</div>
            <div className="mt-3 flex gap-2">
              <Link href="/login" className={cx(button.md, "flex-1 border border-border bg-card text-foreground")}>Log in</Link>
              <Link href="/signup" className={cx(button.md, tone.primary, "flex-1")}>Start free</Link>
            </div>
          </div>
        )}
        <Link href="/checkout" className="mt-3 flex min-h-[52px] items-center justify-between rounded-lg border border-border px-4 text-[15px] font-bold">
          <span className="flex items-center gap-2.5"><ShoppingBag className="size-[18px] text-muted-foreground" /> Cart</span>
          <CartCount />
        </Link>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={tile}>
              {l.label}
              <span className="text-xs font-semibold text-muted-foreground">{l.sub}</span>
            </Link>
          ))}
        </div>
        {!user && (
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className="mt-3 flex min-h-[52px] items-center gap-2.5 rounded-lg border border-border px-4 text-[15px] font-bold">
            <MessageCircle className="size-[18px] text-ok" /> WhatsApp support
          </a>
        )}
      </div>
    </div>
  );
}

function CartCount() {
  const n = useCart().length;
  return n ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{n} item{n === 1 ? "" : "s"}</span> : <span className="text-sm font-semibold text-muted-foreground">Empty</span>;
}
