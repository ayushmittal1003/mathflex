"use client";
import { useState } from "react";

type Format = "SINGLE" | "MULTIPLE" | "NUMERICAL";

const HELP: Record<Format, string> = {
  SINGLE: "Pick the one correct option. Can be attached to a part's practice set.",
  MULTIPLE: "Tick every correct option (JEE Advanced style, partial marking). Question bank only.",
  NUMERICAL: "Students type a number. Add a tolerance for decimal answers. Question bank only.",
};

// Answer inputs for the admin question form; switch shape with the JEE question format.
export function AnswerFields({ q }: {
  q: { format: Format; options: string[]; correctIndex: number; correctIndices: number[]; numericAnswer: number | null; tolerance: number } | null;
}) {
  const [format, setFormat] = useState<Format>(q?.format ?? "SINGLE");
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="font-semibold">Answer format</span>
        <select name="format" value={format} onChange={(e) => setFormat(e.target.value as Format)} className="input mt-1 sm:max-w-xs">
          <option value="SINGLE">Single correct (JEE Main MCQ)</option>
          <option value="MULTIPLE">Multi-correct (JEE Advanced)</option>
          <option value="NUMERICAL">Numerical / integer</option>
        </select>
        <span className="mt-1 block text-xs text-muted">{HELP[format]}</span>
      </label>

      {format === "NUMERICAL" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-semibold">Correct answer</span>
            <input name="numericAnswer" type="number" step="any" required defaultValue={q?.numericAnswer ?? ""} className="input mt-1" />
          </label>
          <label className="block text-sm">
            <span className="font-semibold">Tolerance (±)</span>
            <input name="tolerance" type="number" step="any" min={0} defaultValue={q?.tolerance ?? 0} className="input mt-1" />
            <span className="mt-1 block text-xs text-muted">0 for integers; e.g. 0.01 for answers rounded to 2 decimals</span>
          </label>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex items-center gap-2">
                {format === "SINGLE" ? (
                  <input type="radio" name="correctIndex" value={i} defaultChecked={(q?.correctIndex ?? 0) === i} className="size-4 accent-[var(--ok)]" aria-label={`Option ${"ABCD"[i]} is correct`} />
                ) : (
                  <input type="checkbox" name="correctIndices" value={i} defaultChecked={q?.correctIndices.includes(i)} className="size-4 accent-[var(--ok)]" aria-label={`Option ${"ABCD"[i]} is correct`} />
                )}
                <span className="w-5 text-sm font-bold">{"ABCD"[i]}</span>
                <input name={`option${i}`} defaultValue={q?.options[i] ?? ""} required={i < 2} className="input" />
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">{format === "SINGLE" ? "Select the radio button next to the correct option." : "Tick all the correct options."}</p>
        </>
      )}
    </div>
  );
}
