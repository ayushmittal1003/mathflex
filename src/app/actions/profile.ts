"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const Schema = z.object({
  name: z.string().trim().min(2).max(60),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/).optional().or(z.literal("")),
  classLevel: z.coerce.number().int().min(11).max(13).optional(),
});

export async function updateProfile(_: unknown, form: FormData) {
  const user = await requireUser("/profile");
  const parsed = Schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Please check your name and mobile number." };
  await db.user.update({ where: { id: user.id }, data: { ...parsed.data, phone: parsed.data.phone || null } });
  revalidatePath("/profile");
  return { ok: true };
}
