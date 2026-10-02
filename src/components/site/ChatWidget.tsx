"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircleHeart, Send, X, Sparkles } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = ["Which chapters have the highest JEE weightage?", "What's in the Class 12 course?", "How am I doing?", "Explain L'Hôpital's rule"];

// Turn "/chapter/limits" style paths into links, and **bold** into <strong>.
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\/(?:chapter|courses|learn)\/[a-z0-9-]+|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^\/(chapter|courses|learn)\//.test(p) ? (
          <Link key={i} href={p} className="font-semibold text-primary underline underline-offset-2">{p}</Link>
        ) : p.startsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export function ChatWidget({ name, greeting }: { name: string; greeting: string }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20) }) });
      if (!res.ok || !res.body) throw new Error();
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
      }
    } catch {
      setMsgs([...next, { role: "assistant", content: "Oops, I couldn't connect. Please try again in a moment." }]);
    } finally {
      setBusy(false);
    }
  }

  // Keep the button clear of the phone tab bar and the video player controls.
  const lifted = !pathname.startsWith("/learn/");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed right-4 z-40 flex items-center gap-2 rounded-full bg-brand-gradient py-3 pl-3 pr-4 font-bold text-white shadow-xl transition hover:scale-105 md:bottom-6 md:right-6 ${
          lifted ? "bottom-[calc(76px+env(safe-area-inset-bottom))]" : "bottom-4"
        } ${open ? "scale-0" : ""}`}
        aria-label={`Open ${name} chat`}
      >
        <MessageCircleHeart className="size-6" />
        <span className="hidden sm:inline">{name}</span>
      </button>

      {open && (
        <div className="animate-rise fixed inset-0 z-[65] flex flex-col bg-card sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[600px] sm:max-h-[calc(100dvh-48px)] sm:w-[400px] sm:rounded-3xl sm:border sm:border-border sm:shadow-2xl">
          <header className="flex items-center gap-3 rounded-t-3xl bg-brand-gradient px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white sm:pt-3">
            <div className="grid size-10 place-items-center rounded-full bg-white/20"><Sparkles className="size-5" /></div>
            <div className="flex-1">
              <p className="font-bold">{name}</p>
              <p className="text-xs opacity-85">Usually replies in seconds</p>
            </div>
            <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-black/15" aria-label="Close chat"><X className="size-5" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-2 px-4 py-2.5 text-[15px]">{greeting}</div>
            {msgs.length === 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-left text-sm hover:border-primary hover:text-primary">{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                  m.role === "user" ? "ml-auto rounded-tr-sm bg-primary text-white" : "rounded-tl-sm bg-surface-2"
                }`}
              >
                {m.content ? <RichText text={m.content} /> : <span className="inline-flex gap-1"><Dot /><Dot d={150} /><Dot d={300} /></span>}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex items-center gap-2 border-t border-border p-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3"
          >
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" className="input !rounded-full" maxLength={2000} />
            <button disabled={busy || !input.trim()} className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-gradient text-white disabled:opacity-40" aria-label="Send">
              <Send className="size-5" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />;
}
