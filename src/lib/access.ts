import { cache } from "react";
import { db } from "./db";

// Chapter ids the user can currently open (directly bought, or via a course bundle).
export const getAccessibleChapterIds = cache(async (userId: string | undefined) => {
  if (!userId) return new Set<string>();
  const now = new Date();
  const ents = await db.entitlement.findMany({
    where: { userId, expiresAt: { gt: now } },
    include: { course: { include: { chapters: true } } },
  });
  const ids = new Set<string>();
  for (const e of ents) {
    if (e.chapterId) ids.add(e.chapterId);
    e.course?.chapters.forEach((c) => ids.add(c.chapterId));
  }
  return ids;
});

export async function hasChapterAccess(userId: string | undefined, chapterId: string) {
  return (await getAccessibleChapterIds(userId)).has(chapterId);
}

export type PartState = "locked" | "open" | "done";

// Sequential unlock: Part N opens once Part N-1's video AND its practice set are done.
export function computePartStates(
  parts: { id: string; order: number }[],
  progress: Map<string, { videoDone: boolean; practiceDone: boolean }>,
  opts: { hasAccess: boolean; sequential: boolean; freePreviewIds: Set<string> },
): Map<string, PartState> {
  const states = new Map<string, PartState>();
  let prevComplete = true;
  for (const p of [...parts].sort((a, b) => a.order - b.order)) {
    const pr = progress.get(p.id);
    const complete = !!pr?.videoDone && !!pr?.practiceDone;
    let state: PartState;
    if (!opts.hasAccess) state = opts.freePreviewIds.has(p.id) ? "open" : "locked";
    else if (complete) state = "done";
    else if (!opts.sequential || prevComplete) state = "open";
    else state = "locked";
    states.set(p.id, state);
    prevComplete = complete;
  }
  return states;
}
