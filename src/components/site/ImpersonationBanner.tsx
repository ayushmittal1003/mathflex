import { Eye } from "lucide-react";
import { stopImpersonation } from "@/app/actions/impersonation";

// Always-visible reminder that a super admin is looking at the site as a student.
export function ImpersonationBanner({ student, admin }: { student: string; admin: string }) {
  return (
    <div className="fixed inset-x-4 bottom-24 z-[65] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border-2 border-gold bg-card p-3 shadow-2xl md:bottom-6">
      <Eye className="size-5 shrink-0 text-gold" />
      <p className="min-w-0 flex-1 text-sm">
        <b>Viewing as {student}.</b> <span className="text-muted-foreground">Anything you do is saved to their account. Signed in as {admin}.</span>
      </p>
      <form action={stopImpersonation}><button className="btn btn-primary !px-3 !py-1.5 text-sm">Back to admin</button></form>
    </div>
  );
}
