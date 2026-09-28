import Link from "next/link";
import { Lock } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { PERMISSIONS, ROLE_LABEL, type Permission } from "@/lib/permissions";

export const metadata = { title: "No access" };

export default async function NoAccess({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const [me, { need }] = await Promise.all([requireStaff(), searchParams]);
  const what = need && need in PERMISSIONS ? PERMISSIONS[need as Permission] : "this page";
  return (
    <div className="card mx-auto mt-10 max-w-md p-8 text-center">
      <Lock className="mx-auto size-10 text-muted" />
      <h1 className="mt-4 font-display text-2xl font-extrabold">You don&apos;t have access</h1>
      <p className="mt-2 text-sm text-muted">
        Your role is <b className="text-fg">{ROLE_LABEL[me.role]}</b>, which can&apos;t open <b className="text-fg">{what}</b>. Ask a super admin to change your role if you need it.
      </p>
      <Link href="/admin" className="btn btn-primary mt-6">Back to dashboard</Link>
    </div>
  );
}
