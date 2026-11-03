"use client";
import { useState, useTransition } from "react";
import { setChapterThumbnail } from "@/app/admin/actions";

// Pick a file and it is saved straight away, then used for this chapter everywhere on the site.
export function ChapterThumbnail({ chapterId, title, url: initial }: { chapterId: string; title: string; url: string | null }) {
  const [url, setUrl] = useState(initial);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const save = (file?: File) =>
    start(async () => {
      setError("");
      const form = new FormData();
      if (file) form.set("file", file);
      const res = await setChapterThumbnail(chapterId, form);
      if (res.error) setError(res.error);
      else setUrl(res.url ?? null);
    });

  return (
    <div className="w-32">
      <label className={`relative block aspect-video cursor-pointer overflow-hidden rounded-md border border-border bg-surface-2 ${busy ? "opacity-60" : ""}`}>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${title} thumbnail`} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center text-xs font-semibold text-muted">{busy ? "Uploading…" : "+ Upload"}</span>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={`Upload thumbnail for ${title}`}
          disabled={busy}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) save(file);
          }}
        />
      </label>
      {url && !busy && (
        <button type="button" onClick={() => confirm(`Remove the thumbnail for “${title}”?`) && save()} className="mt-1 text-xs text-muted underline">Remove</button>
      )}
      {error && <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
