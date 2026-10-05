"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlayCircle, Target, Trophy, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

// Bottom tab bar for phones, thumb-reachable like a native app. Website tokens: white bar,
// active tab in the brand colour with a small marker.
export function TabBar({ leaderboard, practice }: { leaderboard: boolean; practice: boolean }) {
  const pathname = usePathname();
  const count = useCart().length;
  // Hidden in the player and at checkout (checkout has its own sticky pay bar).
  if (pathname.startsWith("/learn/") || pathname.startsWith("/checkout")) return null;
  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/chapters", label: "Chapters", icon: Search },
    { href: "/my-learning", label: "Learning", icon: PlayCircle },
    ...(practice ? [{ href: "/practice", label: "Practice", icon: Target }] : []),
    ...(leaderboard ? [{ href: "/leaderboard", label: "Ranks", icon: Trophy }] : []),
    { href: "/checkout", label: "Cart", icon: ShoppingBag, badge: count },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_-20px_rgb(0_0_0/0.3)] backdrop-blur-xl md:hidden" aria-label="Quick links">
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={active ? "page" : undefined} className={`relative flex flex-col items-center gap-0.5 pb-2 pt-2.5 text-[11px] font-bold ${active ? "text-primary" : "text-muted-foreground"}`}>
                {active && <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary" aria-hidden />}
                <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
                {label}
                {!!badge && <span className="absolute right-[calc(50%-20px)] top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] text-white">{badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
