import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { instructorNames, placeholders, socials, socialsComingSoon, supportPhone } from "@/lib/site-content";
import { SiteLogo } from "./SiteLogo";
import { container } from "./ui";

// design.md §3.8. Contact details come from settings; anything without a setting yet shows
// the marked placeholder from site-content.ts.
export function SiteFooter({ settings }: { settings: Settings }) {
  const names = instructorNames(settings);
  const wa = `https://wa.me/${settings.whatsappNumber}`;
  const linkCls = "flex min-h-11 items-center text-secondary-foreground transition-colors hover:text-primary tablet:inline tablet:min-h-0";

  return (
    <footer className="relative overflow-hidden bg-card pb-20 md:pb-0">
      <div className={`${container.detail} grid grid-cols-2 gap-x-8 gap-y-10 pt-14 tablet:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]`}>
        <div className="col-span-2 min-w-0 tablet:col-span-3 lg:col-span-1">
          <SiteLogo className="h-[29px]" />
          <p className="mt-3.5 max-w-[340px] text-sm leading-[1.55] text-muted-foreground">
            Chapter-wise JEE maths for Class 11 and 12, taught by IIT Delhi alumnus {names.full}.
          </p>
          <div className="mt-4 flex gap-1">
            <a
              href={socials.instagram.href}
              target="_blank"
              rel="noreferrer"
              aria-label={`Mathflex on ${socials.instagram.label}`}
              className="relative grid size-11 place-items-center rounded-lg border border-border bg-secondary text-secondary-foreground transition hover:scale-[1.06] hover:text-primary"
            >
              <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
              </svg>
            </a>
          </div>
          <p className="mt-3 text-[13px] text-muted-foreground">Coming soon: {socialsComingSoon.join(", ")}</p>
        </div>

        <FooterCol title="Learn">
          <Link href="/chapters" className={linkCls}>All chapters</Link>
          <Link href="/courses" className={linkCls}>Complete courses</Link>
          <Link href="/pricing" className={linkCls}>Pricing</Link>
          {settings.features.leaderboard && <Link href="/leaderboard" className={linkCls}>Leaderboard</Link>}
          {settings.features.mentorshipUpsell && <Link href="/book-a-call" className={linkCls}>Book a 1:1 call</Link>}
        </FooterCol>
        <FooterCol title="Company">
          <Link href="/about" className={linkCls}>About us</Link>
          <Link href="/contact" className={linkCls}>Contact us</Link>
          <Link href="/faq" className={linkCls}>FAQs</Link>
        </FooterCol>
        <FooterCol title="Resources">
          <Link href="/blog" className={linkCls}>Blog</Link>
          <Link href="/free-practice" className={linkCls}>Free practice</Link>
        </FooterCol>
        <FooterCol title="Support">
          <a href={`mailto:${settings.supportEmail}`} className={`${linkCls} break-all`}>{settings.supportEmail}</a>
          <a href={supportPhone.href} className={linkCls}>{supportPhone.display}</a>
          <a href={wa} target="_blank" rel="noreferrer" className={linkCls}>WhatsApp</a>
          <span className="py-2 text-muted-foreground tablet:py-0">{placeholders.hours}</span>
        </FooterCol>
      </div>

      <div className={`${container.detail} relative z-10 mt-12 flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[13px] text-muted-foreground`}>
        <span>© {new Date().getFullYear()} Mathflex · mathflex.in</span>
        <div className="flex flex-wrap gap-x-5">
          <Link href="/terms" className="flex min-h-11 items-center hover:text-foreground tablet:min-h-0">Terms &amp; conditions</Link>
          <Link href="/privacy" className="flex min-h-11 items-center hover:text-foreground tablet:min-h-0">Privacy policy</Link>
          <Link href="/refund-policy" className="flex min-h-11 items-center hover:text-foreground tablet:min-h-0">Refund policy</Link>
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none relative z-0 mb-[-0.06em] select-none whitespace-nowrap text-center text-[clamp(90px,21vw,300px)] font-black leading-[0.78] tracking-[-0.06em] text-wordmark"
      >
        mathflex
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-sm">
      <div className="mb-3.5 font-extrabold">{title}</div>
      <div className="grid gap-0 tablet:gap-2.5">{children}</div>
    </div>
  );
}
