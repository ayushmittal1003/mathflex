import { getCurrentUser } from "@/lib/auth";
import { accessSnapshot, activeEntitlements } from "@/lib/access";

// Polled by the site so newly granted (or revoked) access appears without a reload.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ signedIn: false }, { headers: { "Cache-Control": "no-store" } });
  const snap = accessSnapshot(user.role, await activeEntitlements(user.id));
  return Response.json({ signedIn: true, ...snap }, { headers: { "Cache-Control": "no-store" } });
}
