import { Eye } from "lucide-react";
import { stopImpersonation } from "@/app/actions/impersonation";

// Always-visible reminder that a super admin is looking at the site as a student.
export function ImpersonationBanner({ student, admin }: { student: string; admin: string }) {
  return (
    <div className="fixed inset-x-4 bottom-24 z-[65] mx-auto flex max-w-xl items-center gap-3 rounded-xl border-2 border-gold bg-card p-3 text-foreground shadow-[0_24px_48px_-20px_rgb(0_0_0/0.4)] md:bottom-6">
      <Eye className="size-5 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-sm">
        <b>Viewing as {student}.</b> <span className="text-muted-foreground">Anything you do is saved to their account. Signed in as {admin}.</span>
      </p>
      <form action={stopImpersonation}><button className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground hover:brightness-108">Back to admin</button></form>
    </div>
  );
}
