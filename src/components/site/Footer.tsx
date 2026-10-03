import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Footer({ email, whatsapp }: { email: string; whatsapp: string }) {
  return (
    <footer className="mt-24 border-t border-border pb-28 pt-12 md:pb-12">
      <div className="mx-auto grid max-w-[1500px] gap-10 px-4 md:grid-cols-5 md:px-8">
        <div className="md:col-span-2">
          <Logo size={34} />
          <p className="mt-3 max-w-sm text-sm text-muted">
            JEE & Board maths by IIT Delhi and NIT Jalandhar alumni. Buy only the chapters you need, and actually enjoy learning them.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Learn</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/browse?class=11">Class 11 chapters</Link></li>
            <li><Link href="/browse?class=12">Class 12 chapters</Link></li>
            <li><Link href="/courses">Complete courses</Link></li>
            <li><Link href="/leaderboard">Leaderboard</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Company</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/about">About us</Link></li>
            <li><Link href="/privacy">Privacy policy</Link></li>
            <li><Link href="/terms">Terms of use</Link></li>
            <li><Link href="/refund-policy">Refund policy</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="mb-3 font-bold">Help</p>
          <ul className="space-y-2 text-muted">
            <li><a href={`mailto:${email}`}>{email}</a></li>
            <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a></li>
            <li><Link href="/contact">Contact us</Link></li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-[1500px] px-4 text-xs text-muted md:px-8">© {new Date().getFullYear()} MathFlex · mathflex.in</p>
    </footer>
  );
}
