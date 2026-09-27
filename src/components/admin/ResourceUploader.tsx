"use client";
import { useActionState, useState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadResource, registerUploadedResource } from "@/app/admin/actions";

type Result = { error: string } | { ok: true; extracted: boolean } | undefined;

// `direct` = storage is Vercel Blob: the browser uploads the file straight to Blob
// (no 4.5 MB serverless limit), then we register it. Otherwise the file goes
// through the server action to local disk.
export function ResourceUploader({ chapterId, direct }: { chapterId: string; direct: boolean }) {
  const [pct, setPct] = useState<number | null>(null);
  const [state, action, pending] = useActionState<Result, FormData>(async (_prev, form) => {
    if (!direct) return uploadResource(undefined, form);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) return { error: "Choose a PDF or image to upload." };
    if (file.size > 30 * 1024 * 1024) return { error: "Max file size is 30 MB." };
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!["pdf", "png", "jpg", "jpeg", "webp"].includes(ext)) return { error: "Upload a PDF, PNG, JPG or WEBP." };
    try {
      const { upload } = await import("@vercel/blob/client");
      const key = `resources/${crypto.randomUUID()}.${ext}`;
      setPct(0);
      await upload(key, file, {
        access: "private",
        handleUploadUrl: "/api/admin/blob-upload",
        contentType: file.type,
        multipart: file.size > 8 * 1024 * 1024,
        onUploadProgress: ({ percentage }) => setPct(Math.round(percentage)),
      });
      setPct(null);
      return registerUploadedResource({
        key,
        mimeType: file.type,
        size: file.size,
        chapterId,
        type: String(form.get("type") ?? "NOTES"),
        title: String(form.get("title") ?? "") || file.name.replace(/\.[^.]+$/, ""),
        requiresPurchase: form.get("requiresPurchase") === "on",
        includeInChatbot: form.get("includeInChatbot") === "on",
      });
    } catch (e) {
      setPct(null);
      return { error: (e as Error).message || "Upload failed" };
    }
  }, undefined);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="chapterId" value={chapterId} />
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <input name="title" placeholder="Title, e.g. “Limits — 2-page formula sheet”" className="input" />
        <select name="type" className="input" defaultValue="NOTES">
          <option value="NOTES">Short notes</option>
          <option value="MINDMAP">Mind map</option>
          <option value="FORMULA_SHEET">Formula sheet</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-border p-4 text-sm hover:border-brand">
        <UploadCloud className="size-6 text-brand" />
        <span>PDF, PNG, JPG or WEBP · up to 30 MB</span>
        <input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required className="ml-auto max-w-[200px] text-xs" />
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" name="requiresPurchase" defaultChecked /> Only for students who bought the chapter</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="includeInChatbot" defaultChecked /> Teach FlexCare this content</label>
      </div>
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">
        {pct !== null ? `Uploading… ${pct}%` : pending ? "Reading the file…" : "Upload"}
      </button>
      {state && "error" in state && <p className="text-sm text-bad">{state.error}</p>}
      {state && "ok" in state && (
        <p className="text-sm text-ok">
          Uploaded.{" "}
          {state.extracted ? "FlexCare has read it and can now answer questions from it." : "FlexCare couldn't read it automatically (is ANTHROPIC_API_KEY set?). You can paste the text below."}
        </p>
      )}
    </form>
  );
}
