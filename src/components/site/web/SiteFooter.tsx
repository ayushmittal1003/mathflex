import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { instructorNames, knownSocials, placeholders } from "@/lib/site-content";
import { SiteLogo } from "./SiteLogo";
import { container } from "./ui";

// design.md §3.8. Contact details come from settings; anything without a setting yet shows
// the marked placeholder from site-content.ts.
export function SiteFooter({ settings }: { settings: Settings }) {
  const names = instructorNames(settings);
  const wa = `https://wa.me/${settings.whatsappNumber}`;
  const socials = [
    { key: "instagram", label: "Instagram", href: knownSocials.instagram ?? placeholders.socials.instagram },
    { key: "youtube", label: "YouTube", href: knownSocials.youtube ?? placeholders.socials.youtube },
  ];
  const linkCls = "text-secondary-foreground transition-colors hover:text-primary";

  return (
    <footer className="relative overflow-hidden border-t border-border bg-card pb-20 md:pb-0">
      <div className={`${container.detail} grid grid-cols-2 gap-x-8 gap-y-10 pt-14 tablet:grid-cols-3 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]`}>
        <div className="col-span-2 min-w-0 tablet:col-span-3 lg:col-span-1">
          <SiteLogo className="h-[29px]" />
          <p className="mt-3.5 max-w-[340px] text-sm leading-[1.55] text-muted-foreground">
            Chapter-wise JEE maths for Class 11 and 12, taught by IIT Delhi alumnus {names.full}.
          </p>
          <p className="mt-3.5 max-w-[340px] text-[13px] leading-[1.55] text-muted-foreground">
            <b className="text-secondary-foreground">Registered address</b>
            <br />
            {placeholders.address}
          </p>
          <div className="mt-4 flex gap-2">
            {socials.map((s) => (
              <a
                key={s.key}
                href={s.href}
                target={s.href.startsWith("http") ? "_blank" : undefined}
                rel="noreferrer"
                aria-label={`Mathflex on ${s.label}`}
                className="grid size-9 place-items-center rounded-lg border border-border bg-secondary text-secondary-foreground transition hover:scale-[1.06] hover:text-primary"
              >
                {s.key === "instagram" ? (
                  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
                  </svg>
                ) : (
                  <svg className="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="2.5" y="5" width="19" height="14" rx="4" />
                    <path d="m10 9 5 3-5 3z" fill="currentColor" />
                  </svg>
                )}
              </a>
            ))}
          </div>
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
        </FooterCol>
        <FooterCol title="Support">
          {/* Placeholder phone: shown as text, not a dialable link. */}
          <span className="text-secondary-foreground">{placeholders.phone}</span>
          <a href={`mailto:${settings.supportEmail}`} className={`${linkCls} break-all`}>{settings.supportEmail}</a>
          <a href={wa} target="_blank" rel="noreferrer" className={linkCls}>WhatsApp</a>
          <span className="text-muted-foreground">{placeholders.hours}</span>
        </FooterCol>
      </div>

      <div className={`${container.detail} relative z-10 mt-12 flex flex-wrap justify-between gap-3 border-t border-border py-5 text-[13px] text-muted-foreground`}>
        <span>© {new Date().getFullYear()} Mathflex · mathflex.in</span>
        <div className="flex flex-wrap gap-5">
          <Link href="/terms" className="hover:text-foreground">Terms &amp; conditions</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy policy</Link>
          <Link href="/refund-policy" className="hover:text-foreground">Refund policy</Link>
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
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}
