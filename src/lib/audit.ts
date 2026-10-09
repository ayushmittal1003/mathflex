import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

type Actor = { id: string; name: string; email: string };

// Record an admin change. Never let a logging hiccup break the action itself.
export async function audit(
  actor: Actor,
  action: string,
  summary: string,
  target: { entity: string; id?: string | null; meta?: Prisma.InputJsonValue } = { entity: action.split(".")[0] },
) {
  try {
    await db.auditLog.create({
      data: { actorId: actor.id, actorName: actor.name, actorEmail: actor.email, action, entity: target.entity, entityId: target.id ?? null, summary, meta: target.meta },
    });
  } catch (e) {
    console.error("audit log write failed", e);
  }
}

export const ACTION_LABEL: Record<string, string> = {
  chapter: "Chapter", part: "Part", question: "Question", resource: "Notes", course: "Course", coupon: "Coupon", banner: "Banner",
  order: "Order", user: "Student", access: "Access", mentorship: "Mentorship", flexcare: "MathMate", settings: "Settings",
  team: "Team", impersonate: "Impersonation", video: "Video",
};
