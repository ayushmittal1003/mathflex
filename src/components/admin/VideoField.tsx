"use client";
import { useState } from "react";
import { UploadCloud, CheckCircle2 } from "lucide-react";
import { startVideoUpload } from "@/app/admin/actions";

// Provider + reference inputs for a video. For Bunny, the file uploads directly
// from this browser to Bunny (resumable TUS), so large lectures never touch our server.
export function VideoField({
  defaultProvider,
  defaultRef,
  bunnyReady,
  title,
  prefix = "",
}: {
  defaultProvider: string;
  defaultRef: string;
  bunnyReady: boolean;
  title: string;
  prefix?: string;
}) {
  const [provider, setProvider] = useState(defaultProvider || "URL");
  const [ref, setRef] = useState(defaultRef);
  const [pct, setPct] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload(file: File) {
    setMsg(null);
    setPct(0);
    try {
      const ticket = await startVideoUpload(title || file.name);
      const tus = await import("tus-js-client");
      await new Promise<void>((resolve, reject) => {
        const up = new tus.Upload(file, {
          endpoint: ticket.endpoint,
          retryDelays: [0, 3000, 5000, 10000, 20000],
          headers: ticket.headers,
          metadata: { filetype: file.type, title: title || file.name },
          onError: reject,
          onProgress: (sent, total) => setPct(Math.round((sent / total) * 100)),
          onSuccess: () => resolve(),
        });
        up.start();
      });
      setRef(ticket.videoId);
      setMsg("Uploaded! Bunny is encoding it now — save the part, then use “Sync duration” in a few minutes.");
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setPct(null);
    }
  }

  const placeholder = { BUNNY: "Bunny video ID (auto-filled after upload)", YOUTUBE: "YouTube link or ID", URL: "https://… .mp4 or .m3u8" }[provider];

  return (
    <div className="space-y-2">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr]">
        <select name={prefix ? `${prefix}VideoProvider` : "videoProvider"} value={provider} onChange={(e) => setProvider(e.target.value)} className="input">
          <option value="BUNNY">Bunny Stream</option>
          <option value="YOUTUBE">YouTube (unlisted)</option>
          <option value="URL">Direct URL</option>
        </select>
        <input name={prefix ? `${prefix}VideoRef` : "videoRef"} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={placeholder} className="input" />
      </div>
      {provider === "BUNNY" && (
        bunnyReady ? (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-3 text-sm hover:border-brand">
            <UploadCloud className="size-5 text-brand" />
            <span className="flex-1">{pct !== null ? `Uploading… ${pct}%` : "Upload a video file to Bunny"}</span>
            {pct !== null && <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2"><span className="block h-full bg-brand" style={{ width: `${pct}%` }} /></span>}
            <input type="file" accept="video/*" className="sr-only" disabled={pct !== null} onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          </label>
        ) : (
          <p className="text-xs text-gold">Add your Bunny keys (see Video hosting) to upload from here.</p>
        )
      )}
      {msg && <p className="flex items-start gap-1.5 text-xs text-muted"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-ok" />{msg}</p>}
    </div>
  );
}
