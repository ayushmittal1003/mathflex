import { getSettings } from "@/lib/settings";
import { SiteExtras } from "@/components/site/SiteExtras";
import { ToastProvider } from "@/components/site/web/Toast";

// Focused checkout shell (dipankar-design/designs/Checkout.dc.html): light theme, its own
// minimal header (rendered by the page), no site nav or footer.
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="site-light min-h-dvh bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))] text-foreground">
      <ToastProvider>
        {children}
        <SiteExtras settings={settings} />
      </ToastProvider>
    </div>
  );
}
