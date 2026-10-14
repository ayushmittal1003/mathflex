"use client";
import { useState } from "react";

// "Students must watch the video": a switch with a percentage that only appears when it is on.
export function WatchRule({ defaultOn, defaultPct }: { defaultOn: boolean; defaultPct: number }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="rounded-xl border border-border p-3">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="requireWatch" checked={on} onChange={(e) => setOn(e.target.checked)} className="peer sr-only" />
        <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-border transition peer-checked:bg-ok after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-5" />
        <span className="text-sm">
          <span className="font-semibold">Students must watch the video</span>
          <span className="block text-xs text-muted">
            {on
              ? "Practice and the next part unlock only after they have really watched the share below. Skipping ahead doesn't count."
              : "No watch requirement. Students can drag to any point, and reaching the end unlocks the practice, DPPs, notes and the next part."}
          </span>
        </span>
      </label>
      {on && (
        <label className="mt-3 block max-w-xs text-sm font-semibold">
          Must watch (%)
          <input name="watchThresholdPct" type="number" min={10} max={100} defaultValue={defaultPct} className="input mt-1" />
          <span className="mt-1 block text-xs font-normal text-muted">Of the video, before practice unlocks</span>
        </label>
      )}
    </div>
  );
}
