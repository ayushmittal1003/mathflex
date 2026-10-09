import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { ChevronDown } from "lucide-react";
import { db } from "@/lib/db";
import { requestNow } from "@/lib/time";
import { claudeConfigured, buildPlatformKnowledge, systemPrompt } from "@/lib/flexcare";
import { BotStudio } from "@/components/admin/BotStudio";
import { getSettings, BOT_PROMPT_MAX, BOT_KNOWLEDGE_MAX } from "@/lib/settings";
import { Card, Field, PageHeader, Toggle, SubmitButton, Badge } from "@/components/admin/ui";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { saveKnowledge, deleteKnowledge, saveBotBrain, saveBotWidget } from "../actions";
import { StatusForm } from "@/components/admin/StatusForm";

export const metadata = { title: "MathMate" };

export default async function MathMateAdmin() {
  await requireStaff("flexcare");
  const [faqs, logs, resources, knowledge, settings, versions, chats7, chats30] = await Promise.all([
    db.knowledgeEntry.findMany({ orderBy: { createdAt: "asc" } }),
    db.chatLog.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { user: { select: { name: true } } } }),
    db.resource.findMany({ where: { includeInChatbot: true }, include: { chapter: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    buildPlatformKnowledge(),
    getSettings(),
    db.botPromptVersion.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
    db.chatLog.count({ where: { createdAt: { gte: new Date(requestNow() - 7 * 86_400_000) } } }),
    db.chatLog.count({ where: { createdAt: { gte: new Date(requestNow() - 30 * 86_400_000) } } }),
  ]);
  const ai = claudeConfigured();
  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title={`${settings.chatbot.name} chatbot`} subtitle="What the bottom-right assistant knows, and what students are asking it." />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`size-3 rounded-full ${ai ? "bg-ok" : "bg-gold"}`} />
          <p className="flex-1 text-sm">
            {ai
              ? <>AI mode is on (<code>{settings.chatbot.model}</code>). MathMate answers from your chapters, prices, offers, FAQ and notes below — and from each student&apos;s own progress.</>
              : <>FAQ-only mode. Add <code>ANTHROPIC_API_KEY</code> to the server environment to switch on AI answers and automatic reading of uploaded notes.</>}
          </p>
          <Link href="/admin/settings#chatbot" className="btn btn-ghost !py-2 text-sm">Name & greeting</Link>
        </div>
      </Card>

      <Card title="Chat bubble">
        <StatusForm action={saveBotWidget} label="Save chat bubble">
          <div className="flex flex-wrap items-start gap-5">
            <div className="shrink-0">
              {settings.chatbot.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.chatbot.avatar} alt="" className="size-20 rounded-full object-cover ring-4 ring-brand" />
              ) : (
                <div className="grid size-20 place-items-center rounded-full bg-surface-2 text-xs text-muted ring-4 ring-border">No photo</div>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <Field label="Photo" hint="Square or portrait, PNG/JPG/WebP up to 3 MB. Shown in a circle with a green online dot.">
                <input name="avatarFile" type="file" accept="image/png,image/jpeg,image/webp" className="input" />
              </Field>
              {settings.chatbot.avatar && <label className="flex items-center gap-1.5 text-xs text-muted"><input type="checkbox" name="removeAvatar" /> Remove the photo</label>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" defaultValue={settings.chatbot.name} maxLength={30} className="input" /></Field>
            <Field label="Greeting"><input name="greeting" defaultValue={settings.chatbot.greeting} maxLength={300} className="input" /></Field>
          </div>
          <Field label="Starter questions" hint="One per line, up to 6. Students tap one to start the chat.">
            <textarea name="starters" rows={4} defaultValue={settings.chatbot.starters.join("\n")} className="input" />
          </Field>
        </StatusForm>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><p className="text-sm text-muted">Questions, last 7 days</p><p className="mt-1 text-2xl font-extrabold">{chats7}</p></Card>
        <Card><p className="text-sm text-muted">Questions, last 30 days</p><p className="mt-1 text-2xl font-extrabold">{chats30}</p></Card>
        <Card><p className="text-sm text-muted">Model</p><p className="mt-1 truncate font-mono text-sm font-bold">{settings.chatbot.model}</p></Card>
      </div>

      <BotStudio
        published={settings.chatbot.instructions}
        draft={settings.chatbot.draft}
        builtIn={systemPrompt(settings.chatbot.name, settings.siteName)}
        versions={versions.map((v) => ({ id: v.id, when: v.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }), author: v.authorName, note: v.note, content: v.content }))}
        max={BOT_PROMPT_MAX}
        aiOn={ai}
        botName={settings.chatbot.name}
      />

      <Card title="Knowledge notes">
        <StatusForm action={saveBotBrain} label="Save knowledge notes">
          <Field label="Facts the bot should know" hint="Timings, policies, announcements, how-to steps. For single Q&As use the FAQ list below.">
            <textarea name="knowledge" rows={8} maxLength={BOT_KNOWLEDGE_MAX} defaultValue={settings.chatbot.knowledge} className="input" />
          </Field>
        </StatusForm>
      </Card>

      <section className="space-y-3">
        <h2 className="font-bold">FAQ & policies</h2>
        {faqs.map((f) => (
          <details key={f.id} className="card group overflow-hidden">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">{f.question}</span>
              {!f.isActive && <Badge>Off</Badge>}
              <ChevronDown className="size-5 transition group-open:rotate-180" />
            </summary>
            <div className="border-t border-border p-4">
              <KnowledgeForm f={f} />
              <div className="mt-3"><ConfirmButton action={deleteKnowledge.bind(null, f.id)} message="Delete this FAQ?">Delete</ConfirmButton></div>
            </div>
          </details>
        ))}
        <Card title="Add FAQ"><KnowledgeForm f={null} /></Card>
      </section>

      <Card title="Notes & mind maps MathMate has read">
        <ul className="divide-y divide-border text-sm">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{r.title}</span> <span className="text-muted">· {r.chapter?.title ?? "General"}</span></span>
              {r.knowledgeText ? <Badge tone="ok">{Math.round(r.knowledgeText.length / 1000)}k chars</Badge> : <Badge tone="gold">Empty</Badge>}
              {r.chapter && <Link href={`/admin/chapters/${r.chapter.id}?tab=notes`} className="text-xs font-bold text-brand">Edit</Link>}
            </li>
          ))}
          {!resources.length && <li className="py-2 text-muted">Upload notes from a chapter&apos;s “Notes & mind maps” tab.</li>}
        </ul>
      </Card>

      <Card title="Recent questions from students">
        <ul className="divide-y divide-border text-sm">
          {logs.map((l) => (
            <li key={l.id} className="py-3">
              <p className="font-semibold">{l.question}</p>
              <p className="mt-1 line-clamp-3 text-muted">{l.answer}</p>
              <p className="mt-1 text-xs text-muted">{l.user?.name ?? "Guest"} · {l.createdAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p>
            </li>
          ))}
          {!logs.length && <li className="py-2 text-muted">No conversations yet.</li>}
        </ul>
      </Card>

      <details className="card group overflow-hidden">
        <summary className="cursor-pointer list-none p-4 text-sm font-bold">See exactly what MathMate knows ({Math.round(knowledge.length / 1000)}k characters)</summary>
        <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap border-t border-border p-4 text-xs text-muted">{knowledge}</pre>
      </details>
    </div>
  );
}

function KnowledgeForm({ f }: { f: { id: string; question: string; answer: string; isActive: boolean } | null }) {
  return (
    <form action={saveKnowledge} className="space-y-3">
      {f && <input type="hidden" name="id" value={f.id} />}
      <Field label="Question"><input name="question" defaultValue={f?.question} required className="input" /></Field>
      <Field label="Answer"><textarea name="answer" rows={3} defaultValue={f?.answer} required className="input" /></Field>
      <Toggle name="isActive" label="Active" defaultChecked={f?.isActive ?? true} />
      <SubmitButton>{f ? "Save" : "Add"}</SubmitButton>
    </form>
  );
}
