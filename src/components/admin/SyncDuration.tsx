"use client";
import { useState, useTransition } from "react";
import { syncBunnyDuration } from "@/app/admin/actions";

export function SyncDuration({ partId }: { partId: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setMsg((await syncBunnyDuration(partId)).message))} className="btn btn-ghost !px-3 !py-1.5 text-xs">
        {pending ? "Checking…" : "Sync duration from Bunny"}
      </button>
      {msg && <span className="text-xs text-muted">{msg}</span>}
    </span>
  );
}
