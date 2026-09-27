"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlayCircle, Trophy, ShoppingBag } from "lucide-react";
import { useCart } from "./cart-store";

// Bottom tab bar for phones — thumb-reachable, like a native app.
export function TabBar({ leaderboard }: { leaderboard: boolean }) {
  const pathname = usePathname();
  const count = useCart().length;
  if (pathname.startsWith("/learn/")) return null;
  const tabs = [
    { href: "/", label: "Home", icon: Home },
    { href: "/browse", label: "Browse", icon: Search },
    { href: "/my-learning", label: "Learning", icon: PlayCircle },
    ...(leaderboard ? [{ href: "/leaderboard", label: "Ranks", icon: Trophy }] : []),
    { href: "/cart", label: "Cart", icon: ShoppingBag, badge: count },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
      <ul className="flex">
        {tabs.map(({ href, label, icon: Icon, badge }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link href={href} className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${active ? "text-brand" : "text-muted"}`}>
                <Icon className="size-[22px]" strokeWidth={active ? 2.5 : 2} />
                {label}
                {!!badge && <span className="absolute right-[calc(50%-20px)] top-1 grid size-4 place-items-center rounded-full bg-brand text-[10px] text-white">{badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
