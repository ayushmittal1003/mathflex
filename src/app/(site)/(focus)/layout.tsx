import { getSettings } from "@/lib/settings";
import { SiteExtras } from "@/components/site/SiteExtras";
import { ToastProvider } from "@/components/site/web/Toast";

// Focused pages without the site nav/footer: checkout, payment status, log in and sign up
// (each page renders its own minimal header, as in the designs). Always light.
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="site-light min-h-dvh bg-[color-mix(in_oklab,var(--muted)_45%,var(--card))] text-foreground">
      <ToastProvider>
        {children}
        <SiteExtras settings={settings} lifted={false} />
      </ToastProvider>
    </div>
  );
}
