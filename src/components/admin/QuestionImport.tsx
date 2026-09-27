"use client";
import { useActionState } from "react";
import { importQuestions } from "@/app/admin/actions";

export function QuestionImport({ chapterId }: { chapterId: string }) {
  const [state, action, pending] = useActionState(importQuestions, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="chapterId" value={chapterId} />
      <p className="text-xs text-muted">
        One question per line, columns separated by <b>|</b> or tabs (you can paste straight from Google Sheets):<br />
        <code className="text-fg">type | part | question | A | B | C | D | answer | solution | exam | year | difficulty</code>
      </p>
      <textarea name="rows" rows={5} className="input font-mono text-xs" placeholder="DPP | 1 | lim (x→0) sin 5x / x = ? | 0 | 1 | 5 | 1/5 | C | sin5x/x = 5·sin5x/5x → 5 | | | 1" />
      <button disabled={pending} className="btn btn-primary !py-2 text-sm">{pending ? "Importing…" : "Import questions"}</button>
      {state && <p className="text-sm"><span className="font-semibold text-ok">{state.created} imported.</span> {state.errors.length > 0 && <span className="text-bad">{state.errors.join(" · ")}</span>}</p>}
    </form>
  );
}
