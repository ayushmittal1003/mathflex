import { redirect } from "next/navigation";
import { AuthForm } from "@/components/site/AuthForm";
import { getSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { isStaff } from "@/lib/permissions";
import { getAuthPanel } from "@/components/site/web/data";
import { googleConfigured } from "@/lib/google";

export const metadata = { title: "Log in" };

// Only same-site paths are followed (same rule as the auth actions).
const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const [{ next, error }, settings, user] = await Promise.all([searchParams, getSettings(), getCurrentUser()]);
  // Already signed in: skip the form and go where they were headed.
  if (user) redirect(safeNext(next) ?? (isStaff(user.role) ? "/admin" : "/my-learning"));
  const panel = await getAuthPanel(settings);
  return <AuthForm mode="login" next={safeNext(next) ?? "/my-learning"} panel={panel} googleReady={googleConfigured()} error={error} />;
}
