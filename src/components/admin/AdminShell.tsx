"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, BookOpen, ListChecks, Layers, Ticket, Megaphone, Receipt, Users, PhoneCall, Bot, Settings, Menu, X, ExternalLink, Video,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/site/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/chapters", label: "Chapters & content", icon: BookOpen },
  { href: "/admin/questions", label: "Question bank", icon: ListChecks },
  { href: "/admin/courses", label: "Courses (bundles)", icon: Layers },
  { href: "/admin/coupons", label: "Coupons", icon: Ticket },
  { href: "/admin/banners", label: "Banners & popups", icon: Megaphone },
  { href: "/admin/orders", label: "Orders & payments", icon: Receipt },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/mentorship", label: "Mentorship calls", icon: PhoneCall },
  { href: "/admin/flexcare", label: "FlexCare chatbot", icon: Bot },
  { href: "/admin/video-hosting", label: "Video hosting", icon: Video },
  { href: "/admin/settings", label: "Settings & features", icon: Settings },
];

export function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold ${active ? "bg-brand/10 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
            <Icon className="size-[18px]" /> {label}
          </Link>
        );
      })}
      <Link href="/" className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-2">
        <ExternalLink className="size-[18px]" /> View site
      </Link>
    </nav>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center justify-between p-5"><Logo size={28} /><span className="rounded-md bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold text-brand">ADMIN</span></div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="flex items-center justify-between border-t border-border p-4 text-sm"><span className="truncate font-semibold">{name}</span><ThemeToggle /></div>
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-bg/90 px-4 py-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Menu" className="grid size-10 place-items-center"><Menu /></button>
        <Logo size={26} />
        <ThemeToggle />
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
            <div className="flex items-center justify-between p-4"><Logo size={26} /><button onClick={() => setOpen(false)} aria-label="Close"><X /></button></div>
            {nav}
          </aside>
        </div>
      )}
      <main className="min-w-0 px-4 py-6 pb-[calc(24px+env(safe-area-inset-bottom))] md:px-8 md:py-8">{children}</main>
    </div>
  );
}
