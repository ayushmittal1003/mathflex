import "katex/dist/katex.min.css";
import { toHtml } from "@/lib/math-html";

// Shows question text, options and explanations with proper maths (see lib/math-html).
export function MathText({ text, className, as: Tag = "span" }: { text: string; className?: string; as?: "span" | "div" | "p" }) {
  // toHtml escapes plain text and only emits KaTeX markup
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: toHtml(text) }} />;
}
