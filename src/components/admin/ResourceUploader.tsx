"use client";
import { useActionState } from "react";
import { UploadCloud } from "lucide-react";
import { uploadResource } from "@/app/admin/actions";

export function ResourceUploader({ chapterId }: { chapterId: string }) {
  const [state, action, pending] = useActionState(uploadResource, undefined);
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
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">{pending ? "Uploading & reading the file…" : "Upload"}</button>
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
