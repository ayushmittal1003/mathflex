"use server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getImpersonator } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaff } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { reached, rewardProgress } from "@/lib/rewards";

export type ClaimState = { ok?: boolean; error?: string } | undefined;

// Checked again here: the page only shows the button, the server decides whether the tier is reached.
export async function claimReward(_: ClaimState, form: FormData): Promise<ClaimState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in to claim your reward." };
  if (isStaff(user.role) || (await getImpersonator())) return { error: "Only students can claim rewards." };
  const tier = (await getSettings()).rewards.tiers.find((t) => t.key === form.get("tier"));
  if (!tier) return { error: "That reward doesn't exist." };
  if (!reached(tier, await rewardProgress(user.id))) return { error: `You haven't reached ${tier.name} yet.` };
  try {
    await db.rewardClaim.create({ data: { userId: user.id, tier: tier.key, shoutout: form.get("shoutout") === "on" } });
  } catch {
    return { error: "You've already claimed this reward." };
  }
  revalidatePath("/rewards");
  return { ok: true };
}
