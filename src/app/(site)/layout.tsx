import { getCurrentUser, getImpersonator } from "@/lib/auth";
import { accessSnapshot, activeEntitlements } from "@/lib/access";
import { AccessWatcher } from "@/components/site/AccessWatcher";
import { ImpersonationBanner } from "@/components/site/ImpersonationBanner";
import { getSettings } from "@/lib/settings";
import { CelebrateProvider } from "@/components/site/Celebrate";

// Shared by both site shells: (public) has the redesigned website chrome, (app) keeps the
// original nav/footer for pages that haven't been redesigned yet and for the learner app.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, settings, impersonator] = await Promise.all([getCurrentUser(), getSettings(), getImpersonator()]);
  const ents = user ? await activeEntitlements(user.id) : [];

  return (
    <CelebrateProvider sound={settings.features.celebrationSound}>
      {impersonator && user && <ImpersonationBanner student={user.name} admin={impersonator.name} />}
      {user && <AccessWatcher initial={accessSnapshot(user.role, ents)} />}
      {children}
    </CelebrateProvider>
  );
}
