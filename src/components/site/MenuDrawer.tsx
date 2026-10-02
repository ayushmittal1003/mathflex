"use client";
import Link from "next/link";
import { isStaff } from "@/lib/permissions";
import { useEffect } from "react";
import { X, User, CalendarClock, Gift, MessageCircle, Mail, LogIn, LogOut, Shield, BookOpen, Trophy, Target, LayoutGrid, GraduationCap } from "lucide-react";
import { Logo } from "@/components/Logo";
import { logout } from "@/app/actions/auth";

export type DrawerUser = { name: string; email: string; avatarColor: string; role: string; planSummary: string | null };

export function MenuDrawer({
  open,
  onClose,
  user,
  features,
  contact,
}: {
  open: boolean;
  onClose: () => void;
  user: DrawerUser | null;
  features: { leaderboard: boolean; referAndEarn: boolean; practice: boolean };
  contact: { whatsapp: string; email: string };
}) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const item = "flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold hover:bg-surface-2";

  return (
    <div className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-black/60 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <aside
        className={`absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-card pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] text-foreground shadow-2xl transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4">
          <Logo size={30} />
          <button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-surface-2" aria-label="Close menu">
            <X className="size-5" />
          </button>
        </div>

        {user ? (
          <div className="mx-4 mb-2 rounded-3xl bg-brand-gradient p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-full bg-white/25 text-lg font-bold">{user.name[0]?.toUpperCase()}</div>
              <div className="min-w-0">
                <p className="truncate font-bold">{user.name}</p>
                <p className="truncate text-sm opacity-85">{user.email}</p>
              </div>
            </div>
            <p className="mt-3 rounded-xl bg-black/15 px-3 py-2 text-sm">{user.planSummary ?? "No active plan yet — start with any chapter."}</p>
          </div>
        ) : (
          <div className="mx-4 mb-2 rounded-3xl bg-surface-2 p-4">
            <p className="font-bold">Learn maths like you binge shows.</p>
            <Link href="/signup" onClick={onClose} className="btn btn-primary mt-3 w-full">
              Create free account
            </Link>
          </div>
        )}

        <nav className="flex flex-col gap-0.5 p-2" onClick={onClose}>
          <Link href="/" className={item}><LayoutGrid className="size-5 text-muted-foreground" /> Home</Link>
          <Link href="/browse" className={item}><BookOpen className="size-5 text-muted-foreground" /> All chapters</Link>
          <Link href="/courses" className={item}><GraduationCap className="size-5 text-muted-foreground" /> Complete courses</Link>
          {features.practice && <Link href="/practice" className={item}><Target className="size-5 text-muted-foreground" /> Practice Q bank</Link>}
          {features.leaderboard && <Link href="/leaderboard" className={item}><Trophy className="size-5 text-muted-foreground" /> Leaderboard</Link>}
          {user && (
            <>
              <div className="mx-4 my-2 border-t border-border" />
              <Link href="/profile" className={item}><User className="size-5 text-muted-foreground" /> Profile</Link>
              <Link href="/profile#plans" className={item}><CalendarClock className="size-5 text-muted-foreground" /> Plan validity & renewal</Link>
              {features.referAndEarn && <Link href="/profile#refer" className={item}><Gift className="size-5 text-muted-foreground" /> Refer & Earn</Link>}
            </>
          )}
          <div className="mx-4 my-2 border-t border-border" />
          <a href={`https://wa.me/${contact.whatsapp}`} target="_blank" rel="noreferrer" className={item}>
            <MessageCircle className="size-5 text-ok" /> WhatsApp us
          </a>
          <a href={`mailto:${contact.email}`} className={item}><Mail className="size-5 text-muted-foreground" /> {contact.email}</a>
          {isStaff(user?.role) && <Link href="/admin" className={item}><Shield className="size-5 text-primary" /> Admin panel</Link>}
        </nav>

        <div className="mt-auto p-4">
          {user ? (
            <form action={logout}>
              <button className="btn btn-ghost w-full"><LogOut className="size-4" /> Log out</button>
            </form>
          ) : (
            <Link href="/login" onClick={onClose} className="btn btn-ghost w-full"><LogIn className="size-4" /> Log in</Link>
          )}
        </div>
      </aside>
    </div>
  );
}
