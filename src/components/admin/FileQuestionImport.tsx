"use client";
import { useActionState, useState, useTransition, startTransition } from "react";
import { commitQuestionDrafts, previewQuestionFile, type PreviewState } from "@/app/admin/questions/import-actions";
import type { Draft } from "@/lib/question-import/parse";

type Row = Draft & { key: number; include: boolean };
const L = "ABCDEF";

function problems(d: Draft): string[] {
  const opts = d.options.filter((o) => o.trim());
  if (!d.prompt.trim()) return ["Question text is empty."];
  if (d.format === "NUMERICAL") return d.numericAnswer === null || Number.isNaN(d.numericAnswer) ? ["Enter the numeric answer."] : [];
  if (opts.length < 2) return ["Needs at least 2 options."];
  if (d.format === "SINGLE") return d.correctIndex >= opts.length ? ["Pick the correct option."] : [];
  return d.correctIndices.length ? [] : ["Tick the correct options."];
}

// Upload a PDF / Word file of DPP or PYQ questions, review what was found, then import.
// Questions belong to the whole chapter (not a part). `kind` fixes the section: DPPs or PYQs.
const MIME: Record<string, string> = { pdf: "application/pdf", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", txt: "text/plain", md: "text/markdown", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" };

// `direct`: storage is Vercel Blob, so files go from the browser straight to storage (the server only
// gets their keys). That avoids the 4.5 MB limit on requests to the server.
export function FileQuestionImport({ chapterId, kind, aiOn, direct }: { chapterId: string; kind: "DPP" | "PYQ"; aiOn: boolean; direct: boolean }) {
  const [state, run, reading] = useActionState<PreviewState, FormData>(previewQuestionFile, undefined);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [seen, setSeen] = useState<PreviewState>(undefined);
  const type = kind;
  const [exam, setExam] = useState("");
  const [year, setYear] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [publish, setPublish] = useState(true);
  const [saving, save] = useTransition();
  const [sending, setSending] = useState<string | null>(null);
  const [sendError, setSendError] = useState("");

  async function submitFiles(form: HTMLFormElement) {
    setSendError("");
    const fd = new FormData(form);
    if (direct) {
      try {
        const { upload } = await import("@vercel/blob/client");
        for (const field of ["file", "solutions"] as const) {
          const f = fd.get(field);
          fd.delete(field);
          if (!(f instanceof File) || f.size === 0) continue;
          const ext = (f.name.split(".").pop() ?? "").toLowerCase();
          if (!MIME[ext]) throw new Error(`“${f.name}”: use a PDF, Word (.docx), text file or a PNG/JPG photo.`);
          if (f.size > 30 * 1024 * 1024) throw new Error(`“${f.name}” is over 30 MB. Split it into smaller files.`);
          const key = `resources/${crypto.randomUUID()}.${ext}`;
          setSending(`Uploading ${f.name}… 0%`);
          await upload(key, f, {
            access: "private",
            handleUploadUrl: "/api/admin/blob-upload",
            contentType: MIME[ext],
            multipart: f.size > 8 * 1024 * 1024,
            onUploadProgress: ({ percentage }) => setSending(`Uploading ${f.name}… ${Math.round(percentage)}%`),
          });
          fd.set(`${field}Key`, key);
          fd.set(`${field}Name`, f.name);
          fd.set(`${field}Type`, MIME[ext]);
        }
      } catch (e) {
        setSending(null);
        setSendError((e as Error).message || "The upload failed. Please try again.");
        return;
      }
      setSending(null);
    }
    startTransition(() => run(fd));
  }
  const [result, setResult] = useState<{ created?: number; error?: string; skipped?: string[] } | null>(null);

  // A new preview result arrived: load it into the editable list.
  if (state !== seen) {
    setSeen(state);
    setRows(state?.drafts ? state.drafts.map((d, i) => ({ ...d, key: i, include: problems(d).length === 0 })) : null);
    setResult(null);
  }

  const patch = (key: number, p: Partial<Draft>) => setRows((cur) => cur?.map((r) => (r.key === key ? { ...r, ...p } : r)) ?? null);
  const ready = rows?.filter((r) => r.include && problems(r).length === 0) ?? [];

  function importNow() {
    if (!rows) return;
    save(async () => {
      const res = await commitQuestionDrafts({
        chapterId, type, partOrder: 0, kept: state?.kept ?? [], exam: exam.trim(), year: year ? Number(year) : null, difficulty, publish,
        drafts: ready.map((r) => ({ prompt: r.prompt, options: r.options, format: r.format, correctIndex: r.correctIndex, correctIndices: r.correctIndices, numericAnswer: r.numericAnswer, tolerance: r.tolerance, solution: r.solution, exam: r.exam, year: r.year ?? null })),
      });
      setResult(res ?? null);
      if (res?.created) setRows((cur) => cur?.filter((r) => !ready.includes(r)) ?? null);
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => { e.preventDefault(); void submitFiles(e.currentTarget); }}
        className="space-y-3"
      >
        <p className="text-sm text-muted">
          Upload the {kind === "PYQ" ? "previous-year questions" : "daily practice problems"} as a <b>PDF or Word (.docx)</b>: one file with questions and solutions, or a questions file plus a solutions file. They become interactive {kind} practice for the whole chapter. You review everything before it goes live.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Questions file
            <input name="file" type="file" required accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" className="input mt-1" />
          </label>
          <label className="block text-sm font-semibold">Solutions file <span className="font-normal text-muted">(optional, if answers are in a separate file)</span>
            <input name="solutions" type="file" accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" className="input mt-1" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input name="keepPdf" type="checkbox" defaultChecked className="mt-1" />
          <span><b>Let students download the PDF</b> too, from the chapter&apos;s practice page (only students who bought the chapter).</span>
        </label>
        <label className={`flex items-start gap-2 text-sm ${aiOn ? "" : "opacity-60"}`}>
          <input name="useAi" type="checkbox" disabled={!aiOn} className="mt-1" />
          <span><b>Read with AI</b> for scanned pages, photos and handwritten or formula-heavy files. {aiOn ? "Costs a few cents per file." : "Needs the Anthropic API key, which isn't set. Text-based PDFs and Word files work without it."}</span>
        </label>
        <button disabled={reading || !!sending} className="btn btn-primary !py-2 text-sm">{sending ?? (reading ? "Reading the file…" : `Read ${kind} questions`)}</button>
        {(sendError || state?.error) && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{sendError || state?.error}</p>}
      </form>

      {rows && (
        <div className="space-y-4 border-t border-border pt-4">
          <p className="text-sm"><b>{rows.length} question{rows.length === 1 ? "" : "s"} found</b> in {state?.filename} ({state?.via === "ai" ? "read with AI" : "read from text"}). Check each one, fix anything wrong, untick any you don&apos;t want.</p>
          {state?.warnings?.map((w) => <p key={w} className="rounded-xl bg-gold/20 px-3 py-2 text-sm">{w}</p>)}

          <div className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold">Exam <input value={exam} onChange={(e) => setExam(e.target.value)} placeholder={type === "PYQ" ? "JEE Main" : "optional"} className="input mt-1" /></label>
            <label className="text-xs font-semibold">Year for all <input value={year} onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="if not in the file" className="input mt-1" /></label>
            <label className="text-xs font-semibold">Difficulty
              <select value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="input mt-1"><option value={1}>Easy</option><option value={2}>Medium</option><option value={3}>Hard</option></select>
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs font-semibold"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish right away</label>
          </div>

          <ul className="space-y-3">
            {rows.map((r) => {
              const bad = problems(r);
              const opts = r.options.length ? r.options : ["", "", "", ""];
              return (
                <li key={r.key} className={`rounded-xl border p-3 ${bad.length ? "border-gold/60" : "border-border"} ${r.include ? "" : "opacity-50"}`}>
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={r.include} onChange={() => setRows((cur) => cur?.map((x) => (x.key === r.key ? { ...x, include: !x.include } : x)) ?? null)} /> Question {r.n}</label>
                    <select value={r.format} onChange={(e) => patch(r.key, { format: e.target.value as Draft["format"], options: e.target.value === "NUMERICAL" ? [] : r.options.length ? r.options : ["", "", "", ""] })} className="input !w-auto !py-1 text-xs">
                      <option value="SINGLE">One correct answer</option><option value="MULTIPLE">Several correct</option><option value="NUMERICAL">Numerical answer</option>
                    </select>
                    <input value={r.exam ?? ""} onChange={(e) => patch(r.key, { exam: e.target.value })} placeholder="Exam" className="input !w-28 !py-1 text-xs" aria-label="Exam" />
                    <input value={r.year ?? ""} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(0, 4); patch(r.key, { year: v ? Number(v) : undefined }); }} placeholder="Year" className="input !w-20 !py-1 text-xs" aria-label="Year" />
                    {bad.map((b) => <span key={b} className="rounded bg-gold/25 px-2 py-0.5 text-xs font-semibold">{b}</span>)}
                    {r.warnings.filter((w) => !bad.length && w).map((w) => <span key={w} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">{w}</span>)}
                  </div>
                  <textarea value={r.prompt} onChange={(e) => patch(r.key, { prompt: e.target.value })} rows={2} className="input w-full text-sm" />
                  {r.format === "NUMERICAL" ? (
                    <div className="mt-2 flex flex-wrap gap-3 text-sm">
                      <label className="font-semibold">Answer <input type="number" step="any" value={r.numericAnswer ?? ""} onChange={(e) => patch(r.key, { numericAnswer: e.target.value === "" ? null : Number(e.target.value) })} className="input !w-32" /></label>
                      <label className="font-semibold">± tolerance <input type="number" step="any" min={0} value={r.tolerance} onChange={(e) => patch(r.key, { tolerance: Math.max(0, Number(e.target.value) || 0) })} className="input !w-24" /></label>
                    </div>
                  ) : (
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {opts.map((o, i) => {
                        const on = r.format === "SINGLE" ? r.correctIndex === i : r.correctIndices.includes(i);
                        return (
                          <label key={i} className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm ${on ? "border-ok bg-ok/10" : "border-border"}`}>
                            <input
                              type={r.format === "SINGLE" ? "radio" : "checkbox"}
                              name={`c${r.key}`}
                              checked={on}
                              onChange={() => patch(r.key, r.format === "SINGLE" ? { correctIndex: i } : { correctIndices: on ? r.correctIndices.filter((x) => x !== i) : [...r.correctIndices, i].sort() })}
                              aria-label={`Option ${L[i]} is correct`}
                            />
                            <b className="w-4">{L[i]}</b>
                            <input value={o} onChange={(e) => patch(r.key, { options: opts.map((x, k) => (k === i ? e.target.value : x)) })} className="min-w-0 flex-1 bg-transparent outline-none" />
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <textarea value={r.solution} onChange={(e) => patch(r.key, { solution: e.target.value })} rows={2} placeholder="Explanation shown to the student after they answer" className="input mt-2 w-full text-sm" />
                </li>
              );
            })}
          </ul>

          {result?.error && <p role="alert" className="rounded-xl bg-bad/10 px-3 py-2 text-sm font-medium text-bad">{result.error}</p>}
          {result?.created ? <p className="rounded-xl bg-ok/10 px-3 py-2 text-sm font-medium text-ok">{result.created} {type} question{result.created === 1 ? "" : "s"} imported{publish ? " and live for students" : " as drafts"}{state?.kept?.length ? `, and the PDF${state.kept.length > 1 ? "s are" : " is"} available to download` : ""}.{result.skipped?.length ? ` Skipped: ${result.skipped.join(", ")}.` : ""}</p> : null}
          <button type="button" disabled={saving || ready.length === 0} onClick={importNow} className="btn btn-primary !py-2 text-sm">{saving ? "Importing…" : `Import ${ready.length} question${ready.length === 1 ? "" : "s"}`}</button>
          {rows.some((r) => r.include && problems(r).length) && <p className="text-xs text-muted">Questions that still need fixing are left out until they&apos;re complete.</p>}
        </div>
      )}
    </div>
  );
}
