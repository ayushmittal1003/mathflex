import "server-only";
import { db } from "./db";

// Settings only the team sees, kept apart from getSettings() so they can never reach a student's
// page by accident. Admin → Settings edits them.
const KEY = "mentorPrivate";
export type MentorPrivate = { whatsapp: string };
const DEFAULTS: MentorPrivate = { whatsapp: "918094847625" };

export async function getMentorPrivate(): Promise<MentorPrivate> {
  const row = await db.setting.findUnique({ where: { key: KEY } });
  return { ...DEFAULTS, ...((row?.value as Partial<MentorPrivate> | null) ?? {}) };
}

export async function saveMentorPrivate(value: MentorPrivate) {
  await db.setting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}
