"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ImagePlus, RotateCcw, Send, X, Sparkles } from "lucide-react";

type Shot = { mediaType: "image/jpeg"; data: string; preview: string };
type Msg = { role: "user" | "assistant"; content: string; shots?: Shot[] };
const MAX_SHOTS = 3;

// Shrink a screenshot to at most 1400px on its long side and re-encode as JPEG, so a phone
// screenshot becomes a few hundred KB instead of several MB.
async function toShot(file: File): Promise<Shot | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#fff"; // transparent PNGs would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.82);
    return { mediaType: "image/jpeg", data: preview.split(",")[1], preview };
  } catch {
    return null;
  }
}

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

// Bot replies: paragraphs and bullet lists (lines starting with -, • or *), with links and **bold**.
function Reply({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) { blocks.push({ list: false, lines: [] }); continue; }
    const bullet = /^([-•*]|\d+[.)])\s+(.*)/.exec(line);
    const last = blocks.at(-1);
    if (bullet) {
      if (last?.list) last.lines.push(bullet[2]);
      else blocks.push({ list: true, lines: [bullet[2]] });
    } else if (last && !last.list && last.lines.length) last.lines.push(line);
    else if (last && !last.list && !last.lines.length) last.lines.push(line);
    else blocks.push({ list: false, lines: [line] });
  }
  return (
    <div className="space-y-2">
      {blocks.filter((b) => b.lines.length).map((b, i) =>
        b.list ? (
          <ul key={i} className="list-disc space-y-1 pl-5 marker:text-muted-foreground">{b.lines.map((l, k) => <li key={k}><RichText text={l} /></li>)}</ul>
        ) : (
          <p key={i}><RichText text={b.lines.join(" ")} /></p>
        ),
      )}
    </div>
  );
}

function Avatar({ src, size, ring = false }: { src: string; size: number; ring?: boolean }) {
  const cls = `shrink-0 rounded-full object-cover ${ring ? "ring-2 ring-white" : ""}`;
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} style={{ width: size, height: size }} className={cls} />
  ) : (
    <span style={{ width: size, height: size }} className={`grid place-items-center bg-white/20 text-white ${cls}`}><Sparkles style={{ width: size * 0.5, height: size * 0.5 }} /></span>
  );
}

export function ChatWidget({ name, greeting, avatar, starters, lifted: liftedProp = true }: { name: string; greeting: string; avatar: string; starters: string[]; lifted?: boolean }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [shots, setShots] = useState<Shot[]>([]);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function addFiles(files: FileList | File[]) {
    setNote("");
    const room = MAX_SHOTS - shots.length;
    const picked = [...files].filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (!picked.length) return;
    const made = (await Promise.all(picked.map(toShot))).filter((x): x is Shot => !!x);
    if (made.length < picked.length) setNote("One image couldn't be read. Try a screenshot or JPG.");
    setShots((cur) => [...cur, ...made].slice(0, MAX_SHOTS));
  }

  async function send(text: string) {
    const q = text.trim();
    if ((!q && !shots.length) || busy) return;
    const sent = shots;
    const next: Msg[] = [...msgs, { role: "user", content: q, shots: sent.length ? sent : undefined }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setInput("");
    setShots([]);
    setNote("");
    setBusy(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(-20).map((m) => ({ role: m.role, content: m.content, images: m.shots?.map((x) => ({ mediaType: x.mediaType, data: x.data })) })) }) });
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
  const lifted = liftedProp && !pathname.startsWith("/learn/");

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed right-4 z-40 transition hover:scale-105 tablet:bottom-6 tablet:right-6 ${
          lifted ? "bottom-[calc(80px+env(safe-area-inset-bottom))]" : "bottom-4"
        } ${open ? "scale-0" : ""}`}
        aria-label={`Open ${name} chat`}
      >
        <span className="relative block">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-16 rounded-full border-[3px] border-primary bg-card object-cover shadow-cta" />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-primary to-brand-2 text-white shadow-cta"><Sparkles className="size-7" /></span>
          )}
          <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-white bg-ok" aria-hidden />
        </span>
      </button>

      {open && (
        <div className="animate-mf-rise fixed inset-0 z-[65] flex flex-col bg-card text-foreground sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[620px] sm:max-h-[calc(100dvh-48px)] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-border sm:shadow-2xl">
          <header className="flex items-center gap-3 bg-primary px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] text-white sm:pt-3">
            <span className="relative">
              <Avatar src={avatar} size={48} ring />
              <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-primary bg-ok" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-extrabold leading-tight">{name}</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold"><span className="size-2 rounded-full bg-ok" /> Online</p>
            </div>
            <button onClick={() => { setMsgs([]); setShots([]); setNote(""); }} className="grid size-9 place-items-center rounded-full bg-white/20" aria-label="Start a new chat"><RotateCcw className="size-4.5" /></button>
            <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full bg-white/20" aria-label="Close chat"><X className="size-5" /></button>
          </header>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            <div className="flex items-start gap-2.5">
              <Avatar src={avatar} size={36} />
              <div className="max-w-[82%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-[15px] leading-relaxed">{greeting}</div>
            </div>
            {msgs.length === 0 && starters.length > 0 && (
              <div className="flex flex-wrap gap-2 pl-[46px]">
                {starters.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-full border-2 border-primary bg-card px-3.5 py-1.5 text-left text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground">{s}</button>
                ))}
              </div>
            )}
            {msgs.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-[15px] leading-relaxed text-white">
                  {m.shots && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.shots.map((x, k) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={x.preview} alt="Attached problem" className="max-h-40 rounded-lg border border-white/30 object-contain" />
                      ))}
                    </div>
                  )}
                  {m.content}
                </div>
              ) : (
                <div key={i} className="flex items-start gap-2.5">
                  <Avatar src={avatar} size={36} />
                  <div className="max-w-[82%] rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-[15px] leading-relaxed">
                    {m.content ? <Reply text={m.content} /> : <span className="inline-flex gap-1"><Dot /><Dot d={150} /><Dot d={300} /></span>}
                  </div>
                </div>
              ),
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="border-t border-border p-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:pb-3"
          >
            {shots.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {shots.map((x, k) => (
                  <div key={k} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.preview} alt="Attached problem" className="h-16 rounded-lg border border-border object-cover" />
                    <button type="button" onClick={() => setShots((cur) => cur.filter((_, i) => i !== k))} className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-foreground text-background" aria-label="Remove image"><X className="size-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {note && <p className="mb-2 text-xs font-medium text-destructive">{note}</p>}
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || shots.length >= MAX_SHOTS} className="grid size-11 shrink-0 place-items-center rounded-xl border-2 border-border text-muted-foreground transition hover:text-foreground disabled:opacity-40" aria-label="Attach a photo or screenshot of a problem"><ImagePlus className="size-5" /></button>
              <div className="flex min-w-0 flex-1 items-center rounded-xl border-2 border-border bg-card pr-1.5 focus-within:border-primary">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={(e) => { const f = [...e.clipboardData.files]; if (f.length) { e.preventDefault(); void addFiles(f); } }}
                  placeholder={shots.length ? "Add a note (optional)…" : "Type your message…"}
                  className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[15px] outline-none"
                />
                <button disabled={busy || (!input.trim() && !shots.length)} className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40" aria-label="Send">
                  <Send className="size-4.5" />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Dot({ d = 0 }: { d?: number }) {
  return <span className="size-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}ms` }} />;
}
