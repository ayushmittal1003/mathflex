import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { accountContact } from "@/lib/format";
import { Badge, Card, Field, PageHeader, SubmitButton, Table, Td } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/ConfirmButton";
import { saveRewardTiers, setRewardClaim } from "../actions";

export const metadata = { title: "Rewards" };

const STATUS_TONE = { REQUESTED: "gold", SENT: "ok", DECLINED: "bad" } as const;

// Milestone rewards: the claims waiting for the team, and the tier targets students see on /rewards.
export default async function RewardsAdmin() {
  await requireStaff("students");
  const [settings, claims] = await Promise.all([
    getSettings(),
    db.rewardClaim.findMany({ orderBy: [{ status: "desc" }, { createdAt: "desc" }], take: 300, include: { user: { select: { id: true, name: true, email: true, phone: true, bestStreak: true, xp: true } } } }),
  ]);
  const tierName = new Map(settings.rewards.tiers.map((t) => [t.key, t.name]));
  const waiting = claims.filter((c) => c.status === "REQUESTED").length;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Rewards" subtitle={`Milestone rewards students have claimed. ${waiting} waiting. Contact the student, send the reward, then mark it sent.`} />

      <Card title="Claims">
        <Table head={["Student", "Tier", "Contact", "Shout-out", "Claimed", "Status", ""]} empty={!claims.length}>
          {claims.map((c) => (
            <tr key={c.id}>
              <Td><Link href={`/admin/students/${c.user.id}`} className="font-semibold hover:text-brand">{c.user.name}</Link><span className="block text-xs text-muted">{c.user.xp.toLocaleString("en-IN")} XP · best streak {c.user.bestStreak}</span></Td>
              <Td className="font-bold">{tierName.get(c.tier) ?? c.tier}</Td>
              <Td className="text-xs">{accountContact(c.user.email)}{c.user.phone && <span className="block">{c.user.phone}</span>}</Td>
              <Td className="text-xs">{c.shoutout ? "Agreed" : "No"}</Td>
              <Td className="whitespace-nowrap text-xs text-muted">{c.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}</Td>
              <Td><Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "muted"}>{c.status}</Badge></Td>
              <Td>
                <div className="flex gap-1">
                  {c.status !== "SENT" && <ActionButton action={setRewardClaim.bind(null, c.id, "SENT")}>Mark sent</ActionButton>}
                  {c.status === "REQUESTED" && <ActionButton action={setRewardClaim.bind(null, c.id, "DECLINED")}>Decline</ActionButton>}
                  {c.status !== "REQUESTED" && <ActionButton action={setRewardClaim.bind(null, c.id, "REQUESTED")}>Reopen</ActionButton>}
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Tiers">
        <form action={saveRewardTiers} className="space-y-6">
          <p className="text-sm text-muted">A student unlocks a tier when all three targets are met. Parts count when watched to the end; each question counts once, the first time it&apos;s answered correctly; the streak is their best ever.</p>
          {settings.rewards.tiers.map((t) => (
            <fieldset key={t.key} className="space-y-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-bold">{t.key}</legend>
              <div className="grid gap-3 sm:grid-cols-4">
                <Field label="Name"><input name={`${t.key}.name`} defaultValue={t.name} className="input" /></Field>
                <Field label="Parts watched"><input type="number" min={1} name={`${t.key}.parts`} defaultValue={t.parts} className="input" /></Field>
                <Field label="Correct answers"><input type="number" min={1} name={`${t.key}.correct`} defaultValue={t.correct} className="input" /></Field>
                <Field label="Best streak (days)"><input type="number" min={1} name={`${t.key}.streak`} defaultValue={t.streak} className="input" /></Field>
              </div>
              <Field label="Reward" hint="What the student gets. Mention a shout-out and students will be asked for permission."><input name={`${t.key}.reward`} defaultValue={t.reward} className="input" /></Field>
            </fieldset>
          ))}
          <SubmitButton>Save tiers</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
