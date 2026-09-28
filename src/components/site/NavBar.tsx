"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, ShoppingBag, Flame, Zap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useCart } from "./cart-store";
import { MenuDrawer, type DrawerUser } from "./MenuDrawer";

export type NavProps = {
  user: (DrawerUser & { xp: number; streak: number }) | null;
  features: { leaderboard: boolean; referAndEarn: boolean; practice: boolean };
  contact: { whatsapp: string; email: string };
};

const links = [
  { href: "/", label: "Home" },
  { href: "/browse", label: "Chapters" },
  { href: "/courses", label: "Courses" },
  { href: "/my-learning", label: "My Learning" },
  { href: "/practice", label: "Practice", flag: "practice" as const },
  { href: "/leaderboard", label: "Leaderboard", flag: "leaderboard" as const },
];

export function NavBar({ user, features, contact, ticker }: NavProps & { ticker?: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const cartCount = useCart().length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const transparent = pathname === "/" && !scrolled;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 pt-[env(safe-area-inset-top)] ${
          transparent ? "bg-gradient-to-b from-black/70 to-transparent text-white" : "border-b border-border bg-bg/85 backdrop-blur-xl"
        }`}
      >
        {ticker}
        <nav className="mx-auto flex h-16 max-w-[1500px] items-center gap-2 px-4 md:px-8">
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-white/10 lg:hidden" aria-label="Open menu">
            <Menu className="size-6" />
          </button>
          <Link href="/" className="mr-4 shrink-0">
            <Logo size={32} />
          </Link>
          <ul className="hidden items-center gap-1 lg:flex">
            {links
              .filter((l) => !l.flag || features[l.flag])
              .map((l) => {
                const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
                return (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${active ? "" : "opacity-70 hover:opacity-100"}`}
                    >
                      {l.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
          <div className="ml-auto flex items-center gap-1">
            {user && (
              <Link href="/my-learning" className="mr-1 hidden items-center gap-3 rounded-full bg-black/20 px-3 py-1.5 text-sm font-bold sm:flex dark:bg-white/5">
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="size-4" />
                  {user.streak}
                </span>
                <span className="flex items-center gap-1 text-violet-400">
                  <Zap className="size-4" />
                  {user.xp.toLocaleString("en-IN")}
                </span>
              </Link>
            )}
            <Link href="/browse" className="grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Search">
              <Search className="size-5" />
            </Link>
            <ThemeToggle className="hover:bg-white/10" />
            <Link href="/cart" className="relative grid size-10 place-items-center rounded-full hover:bg-white/10" aria-label="Cart">
              <ShoppingBag className="size-5" />
              {cartCount > 0 && (
                <span className="animate-pop absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-brand text-[11px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </Link>
            {user ? (
              <button
                onClick={() => setOpen(true)}
                className="ml-1 hidden size-9 place-items-center rounded-full text-sm font-bold text-white lg:grid"
                style={{ background: user.avatarColor }}
                aria-label="Account menu"
              >
                {user.name[0]?.toUpperCase()}
              </button>
            ) : (
              <Link href="/login" className="btn btn-primary ml-1 !px-4 !py-2 text-sm">
                Sign in
              </Link>
            )}
          </div>
        </nav>
      </header>
      <MenuDrawer open={open} onClose={() => setOpen(false)} user={user} features={features} contact={contact} />
    </>
  );
}
