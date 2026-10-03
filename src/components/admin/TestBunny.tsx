"use client";
import { useState, useTransition } from "react";
import { testBunnyConnection } from "@/app/admin/actions";

export function TestBunny() {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" disabled={pending} onClick={() => start(async () => setResult(await testBunnyConnection()))} className="btn btn-ghost !px-3 !py-1.5 text-sm">
        {pending ? "Testing…" : "Test connection"}
      </button>
      {result && <span className={`text-sm font-medium ${result.ok ? "text-ok" : "text-bad"}`}>{result.message}</span>}
    </div>
  );
}
