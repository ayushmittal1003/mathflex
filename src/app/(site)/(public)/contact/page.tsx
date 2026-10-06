import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { knownSocials, placeholders } from "@/lib/site-content";
import { Eyebrow, Mark } from "@/components/site/web/primitives";

export const metadata = { title: "Contact us", alternates: { canonical: "/contact" } };

// Contact (dipankar-design/designs/Contact.dc.html). There's no backend for the design's
// form, so it's replaced by direct Email / WhatsApp / Call actions from settings (phone and
// hours are marked placeholders until they exist as settings). Ayush's guidance on what to
// include and the privacy-request note are kept.
export default async function ContactPage() {
  const { supportEmail, whatsappNumber } = await getSettings();
  const channels = [
    { key: "wa", label: "WhatsApp", value: "Chat with our team", href: `https://wa.me/${whatsappNumber}`, icon: "WA", bg: "bg-ok", external: true },
    { key: "mail", label: "Email", value: supportEmail, href: `mailto:${supportEmail}`, icon: "@", bg: "bg-primary" },
    { key: "call", label: "Call us", value: placeholders.phone, href: placeholders.phoneHref, icon: "☎", bg: "bg-foreground" },
  ];

  return (
    <>
      <section className="px-6 pt-[calc(86px+40px)] text-center">
        <Eyebrow dot="ok">Usually replies within one working day</Eyebrow>
        <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(42px,6.4vw,84px)] font-extrabold leading-none tracking-[-0.045em] text-balance">
          Talk to a <Mark>real person</Mark>
        </h1>
        <p className="mx-auto mt-4.5 max-w-[540px] text-[17px] leading-[1.55] text-secondary-foreground text-pretty">
          Questions about a chapter, a payment, your access or your account? Reach us any of these ways and we&apos;ll get back to you.
        </p>
      </section>

      <section className="pb-24 pt-14">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] flex-wrap items-start gap-x-14 gap-y-10">
          <div className="min-w-0 flex-[1.4_1_480px] rounded-xl border border-border bg-card p-6 shadow-[0_24px_48px_-32px_rgb(80_20_0/0.4)] tablet:p-8">
            <div className="grid gap-3 tablet:grid-cols-3">
              {channels.map((c) => {
                const inner = (
                  <>
                    <span className={`grid size-11 place-items-center rounded-[10px] text-[13px] font-extrabold text-white ${c.bg}`}>{c.icon}</span>
                    <span className="mt-4 block text-[13px] text-muted-foreground">{c.label}</span>
                    <span className="mt-0.5 block break-all text-base font-bold">{c.value}</span>
                  </>
                );
                return c.href ? (
                  <a key={c.key} href={c.href} {...(c.external ? { target: "_blank", rel: "noreferrer" } : {})} className="rounded-xl border border-border p-5 text-foreground transition duration-300 ease-mf hover:-translate-y-1 hover:border-primary hover:shadow-[0_18px_34px_-22px_rgb(80_20_0/0.45)]">
                    {inner}
                  </a>
                ) : (
                  <div key={c.key} className="rounded-xl border border-dashed border-border p-5 text-foreground">{inner}</div>
                );
              })}
            </div>

            <h2 className="mt-9 text-xl font-extrabold tracking-[-0.02em]">Include these for a faster reply</h2>
            <ul className="mt-3.5 grid gap-2.5">
              {["Your name and registered email or mobile number", "Your order number, for payment or access issues", "A screenshot of the problem, if any"].map((t) => (
                <li key={t} className="flex gap-3 text-base leading-[1.6] text-secondary-foreground">
                  <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-primary" />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-7 border-t border-border pt-5 text-sm leading-[1.6] text-muted-foreground">
              For privacy requests, write to {supportEmail} with the subject “Privacy Policy / Data Protection Request”. See our <Link href="/privacy" className="font-semibold text-primary">privacy policy</Link>.
            </p>
          </div>

          <aside className="min-w-0 flex-[1_1_300px] min-[960px]:sticky min-[960px]:top-24">
            <div className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Other ways to reach us</div>
            <div className="mt-3.5 border-t border-border">
              {[
                { k: "Instagram", v: "@mathflex.in", href: knownSocials.instagram ?? placeholders.socials.instagram, icon: "IG", bg: "bg-xp" },
                { k: "Website", v: "mathflex.in", href: "https://mathflex.in", icon: "↗", bg: "bg-brand-2" },
              ].map((c) => (
                <a key={c.k} href={c.href} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 border-b border-border py-4 text-foreground hover:text-primary">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-[10px] text-xs font-extrabold text-white ${c.bg}`}>{c.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-muted-foreground">{c.k}</span>
                    <span className="block text-[15px] font-bold">{c.v}</span>
                  </span>
                </a>
              ))}
            </div>
            <div className="mt-5.5 text-sm leading-[1.6] text-secondary-foreground"><b className="text-foreground">Hours</b><br />{placeholders.hours} IST</div>
            <Link href="/faq" className="mt-5.5 flex items-center justify-between gap-3 rounded-xl bg-muted px-4.5 py-4 text-foreground hover:brightness-98">
              <span className="text-sm leading-[1.4]"><b>Quick answers</b><br /><span className="text-muted-foreground">Payments, refunds, access and more</span></span>
              <span className="text-lg">→</span>
            </Link>
          </aside>
        </div>
      </section>
    </>
  );
}
