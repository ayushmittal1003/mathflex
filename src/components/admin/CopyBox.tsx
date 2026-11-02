"use client";
import { useState } from "react";

// A block of text with Copy (and optional Download) buttons.
export function CopyBox({ text, label, filename }: { text: string; label: string; filename?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="btn btn-primary !py-2 text-sm"
        >
          {copied ? "Copied" : label}
        </button>
        {filename && <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`} download={filename} className="btn btn-ghost !py-2 text-sm">Download</a>}
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-xs">{text}</pre>
    </div>
  );
}
