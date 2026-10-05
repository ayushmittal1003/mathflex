import { AuthForm } from "@/components/site/AuthForm";
import { getSettings } from "@/lib/settings";
import { getAuthPanel } from "@/components/site/web/data";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  const panel = await getAuthPanel(settings);
  return <AuthForm mode="signup" next={next ?? "/my-learning"} panel={panel} />;
}
