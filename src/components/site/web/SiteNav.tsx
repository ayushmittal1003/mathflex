"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart } from "../cart-store";
import { SiteLogo } from "./SiteLogo";
import { button, cx, tone } from "./ui";

export type SiteNavUser = { name: string; avatarColor: string; isStaff: boolean } | null;

// Pages whose hero has no wash (design.md §3.1): the nav sits on white there.
const PLAIN_HEADER = ["/leaderboard"];

// design.md §3.2: logo · dark segmented nav · actions. Below 1024px the segmented nav and
// auth buttons hide and a dark hamburger opens a drop-down panel.
export function SiteNav({ user, leaderboard }: { user: SiteNavUser; leaderboard: boolean }) {
  const pathname = usePathname();
  const cartCount = useCart().length;
  // The menu is open for the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);
  const onWash = !PLAIN_HEADER.some((p) => pathname.startsWith(p));

  const links = [
    { href: "/", label: "Home" },
    { href: "/browse", label: "Chapters" },
    { href: "/courses", label: "Courses" },
    { href: "/#pricing", label: "Pricing" },
    ...(leaderboard ? [{ href: "/leaderboard", label: "Leaderboard" }] : []),
  ];
  const isActive = (href: string) => (href === "/" ? pathname === "/" : !href.includes("#") && pathname.startsWith(href));
  const secondary = onWash ? tone.glass : "border border-border bg-card text-foreground hover:brightness-97";

  return (
    <header className="absolute inset-x-4 top-4 z-30">
      <nav className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 px-5 py-5.5 sm:px-8" aria-label="Main">
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
            href="/cart"
            aria-label={`Cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
            className={cx("relative grid size-[42px] place-items-center rounded-lg transition hover:scale-[1.06]", secondary)}
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M6 7h12l-1 13H7z" />
              <path d="M9 7a3 3 0 0 1 6 0" />
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
                {user.isStaff && <Link href="/admin" className={cx(button.sm, secondary)}>Admin</Link>}
                <Link href="/my-learning" className={cx(button.sm, secondary)}>My Learning</Link>
                <Link
                  href="/profile"
                  aria-label="Your profile"
                  className="grid size-[42px] place-items-center rounded-full text-sm font-bold text-white"
                  style={{ background: user.avatarColor }}
                >
                  {user.name.trim()[0]?.toUpperCase() ?? "?"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className={cx(button.sm, secondary)}>Log in</Link>
                <Link href="/signup" className={cx(button.sm, tone.primary)}>Start free</Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="grid size-[42px] place-items-center rounded-lg bg-foreground text-card lg:hidden"
          >
            <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div className="absolute inset-x-0 top-[84px] z-20 animate-mf-rise rounded-xl bg-foreground p-2.5 text-white shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] lg:hidden">
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
            <>
              <Link href="/my-learning" className="block rounded-lg px-3 py-3.5 text-base font-semibold text-white/80">My Learning</Link>
              <Link href="/profile" className="block rounded-lg px-3 py-3.5 text-base font-semibold text-white/80">Profile</Link>
              {user.isStaff && <Link href="/admin" className="block rounded-lg px-3 py-3.5 text-base font-semibold text-white/80">Admin</Link>}
            </>
          )}
          {!user && (
            <div className="flex gap-2 px-0.5 pb-0.5 pt-2.5">
              <Link href="/login" className="flex-1 rounded-lg bg-white/12 p-3.5 text-center font-bold">Log in</Link>
              <Link href="/signup" className="flex-1 rounded-lg bg-primary p-3.5 text-center font-bold text-primary-foreground">Start free</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
