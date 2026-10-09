"use client";
import { useRef, useState, useTransition } from "react";
import { publishBotPrompt, saveBotDraft } from "@/app/admin/actions";

type Version = { id: string; when: string; author: string; note: string; content: string };
type Msg = { role: "user" | "assistant"; content: string };

// Base-prompt editor with draft / publish / history, plus a test chat that uses whatever is in the editor.
export function BotStudio({ published, draft, builtIn, versions, max, aiOn, botName }: {
  published: string; draft: string | null; builtIn: string; versions: Version[]; max: number; aiOn: boolean; botName: string;
}) {
  const [tab, setTab] = useState<"prompt" | "test" | "history">("prompt");
  const [view, setView] = useState<"edit" | "preview">("edit");
  const [text, setText] = useState(draft ?? published);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const hasDraft = text !== published;

  const run = (fn: () => Promise<{ ok?: string; error?: string } | undefined>) =>
    start(async () => {
      setMsg(null);
      setMsg((await fn()) ?? null);
    });

  const tabs: [typeof tab, string][] = [["prompt", "Base prompt"], ["test", "Test chat"], ["history", `Versions (${versions.length})`]];
  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 pt-3">
        <div className="flex gap-1" role="tablist">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-semibold ${tab === k ? "border-brand text-brand" : "border-transparent text-muted hover:text-fg"}`}>{label}</button>
          ))}
        </div>
        <span className={`ml-auto mb-2 rounded-full px-2.5 py-1 text-xs font-bold ${hasDraft ? "bg-gold/20 text-fg" : "bg-ok/15 text-ok"}`}>{hasDraft ? "Working draft" : "Published"}</span>
      </div>

      {tab === "prompt" && (
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">Add your own rules, tone and examples. The topic limits below are built in and always apply.</p>
            <div className="inline-flex rounded-lg bg-surface-2 p-0.5 text-xs font-bold">
              {(["edit", "preview"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 ${view === v ? "bg-brand text-white" : "text-muted"}`}>{v === "edit" ? "Edit" : "Preview"}</button>
              ))}
            </div>
          </div>
          {view === "edit" ? (
            <>
              <div className={`text-right text-xs ${text.length > max ? "font-bold text-bad" : "text-muted"}`}>{text.length.toLocaleString()} / {max.toLocaleString()} chars</div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={16} spellCheck
                placeholder={"Tone: friendly and motivating. Address students by first name.\n\nRULES\n• Replies under 80 words.\n• After solving a problem, suggest the matching practice set.\n• Ask one question at a time."}
                className="input w-full font-mono text-[13px] leading-relaxed" />
            </>
          ) : (
            <div className="max-h-[420px] overflow-auto rounded-xl border border-border bg-surface-2 p-3 text-xs">
              <p className="mb-2 font-bold uppercase tracking-wide text-muted">Built in (locked)</p>
              <pre className="whitespace-pre-wrap text-muted">{builtIn}</pre>
              <p className="mb-2 mt-4 font-bold uppercase tracking-wide text-muted">Your base prompt</p>
              <pre className="whitespace-pre-wrap">{text.trim() || "(empty)"}</pre>
            </div>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} placeholder="Version note, optional (e.g. “Shorter answers”)" className="input w-full text-sm" />
          {msg?.error && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{msg.error}</p>}
          {msg?.ok && <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm font-medium text-ok">{msg.ok}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending || text.length > max} onClick={() => run(() => saveBotDraft(text))} className="btn btn-ghost !py-2 text-sm">Save draft</button>
            <button type="button" disabled={pending || text.length > max || (!hasDraft && !note)} onClick={() => run(async () => { const r = await publishBotPrompt(text, note); if (r?.ok) setNote(""); return r; })} className="btn btn-primary !py-2 text-sm">{pending ? "Working…" : "Publish"}</button>
            {hasDraft && <button type="button" disabled={pending} onClick={() => { setText(published); setMsg(null); }} className="btn btn-ghost !py-2 text-sm">Discard changes</button>}
          </div>
          <p className="text-xs text-muted">Try the draft in “Test chat” first. Students keep getting the published prompt until you press Publish.</p>
        </div>
      )}

      {tab === "test" && <TestChat prompt={text} aiOn={aiOn} botName={botName} dirty={hasDraft} />}

      {tab === "history" && (
        <ul className="divide-y divide-border">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{v.note || "Published version"}</p>
                <p className="text-xs text-muted">{v.when} · {v.author} · {v.content.length.toLocaleString()} chars</p>
              </div>
              <button type="button" onClick={() => { setText(v.content); setTab("prompt"); setView("edit"); setMsg(null); }} className="btn btn-ghost !py-1.5 text-xs">Load into editor</button>
            </li>
          ))}
          {!versions.length && <li className="p-4 text-sm text-muted">Nothing published yet. Each time you press Publish, a version is kept here.</li>}
        </ul>
      )}
    </div>
  );
}

function TestChat({ prompt, aiOn, botName, dirty }: { prompt: string; aiOn: boolean; botName: string; dirty: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    const next = [...msgs, { role: "user" as const, content: q }];
    setMsgs(next); setInput(""); setErr(""); setBusy(true);
    try {
      const res = await fetch("/api/admin/playground", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, messages: next }) });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) setErr(data.error ?? "Something went wrong.");
      else setMsgs([...next, { role: "assistant", content: data.answer }]);
    } catch {
      setErr("Couldn't reach the server.");
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  if (!aiOn) return <p className="p-4 text-sm text-muted">Add <code>ANTHROPIC_API_KEY</code> to the server environment to test the AI here.</p>;
  return (
    <div className="space-y-3 p-4">
      <p className="text-xs text-muted">Testing {botName} with {dirty ? "your unpublished edits" : "the published prompt"}. Students don&apos;t see this chat.</p>
      <div className="h-80 space-y-2 overflow-auto rounded-xl border border-border bg-surface-2 p-3 text-sm">
        {!msgs.length && <p className="text-muted">Try: “Solve x² − 5x + 6 = 0”, “Which chapter should I buy for calculus?”, or something off-topic to check the limits.</p>}
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${m.role === "user" ? "bg-brand text-white" : "bg-surface"}`}>{m.content}</span>
          </div>
        ))}
        {busy && <p className="text-muted">Thinking…</p>}
        <div ref={end} />
      </div>
      {err && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{err}</p>}
      <div className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Ask like a student would…" maxLength={2000} className="input flex-1" />
        <button type="button" disabled={busy || !input.trim()} onClick={send} className="btn btn-primary !py-2 text-sm">Send</button>
        {msgs.length > 0 && <button type="button" onClick={() => { setMsgs([]); setErr(""); }} className="btn btn-ghost !py-2 text-sm">Clear</button>}
      </div>
    </div>
  );
}
