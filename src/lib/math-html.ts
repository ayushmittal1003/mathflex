import katex from "katex";

// Question text, options and explanations -> safe HTML. Maths is LaTeX between dollar signs:
// $x^2 + 1$ inline, $$ ... $$ for a display line. Everything else is plain text; line breaks are
// kept and **bold** works. Invalid LaTeX never breaks a page: it is shown as typed.
// The output is built from escaped text and KaTeX's own markup, never from raw input.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function tex(src: string, display: boolean) {
  try {
    return katex.renderToString(src.trim(), { displayMode: display, throwOnError: false, strict: "ignore", trust: false, output: "htmlAndMathml" });
  } catch {
    return `<code>${esc(src)}</code>`;
  }
}

// $$...$$ first, then $...$ (an escaped \$ is a literal dollar sign).
const MATH = /\$\$([\s\S]+?)\$\$|(?<!\\)\$(?!\s)((?:\\.|[^$\\\n])+?)(?<!\s)\$/g;

export function toHtml(text: string): string {
  let out = "";
  let last = 0;
  const plain = (s: string) => esc(s).replace(/\\\$/g, "$").replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br/>");
  for (const m of text.matchAll(MATH)) {
    out += plain(text.slice(last, m.index));
    out += m[1] !== undefined ? tex(m[1], true) : tex(m[2], false);
    last = m.index! + m[0].length;
  }
  return out + plain(text.slice(last));
}
