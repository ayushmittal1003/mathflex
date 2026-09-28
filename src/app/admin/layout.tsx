import { requireStaff } from "@/lib/auth";
import { ROLE_PERMISSIONS, type StaffRole } from "@/lib/permissions";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata = { title: { default: "Admin", template: "%s · MathFlex Admin" }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireStaff();
  const role = me.role as StaffRole;
  return <AdminShell name={me.name} role={role} permissions={ROLE_PERMISSIONS[role]}>{children}</AdminShell>;
}
