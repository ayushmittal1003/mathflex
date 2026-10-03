import Link from "next/link";
import type { ReactNode } from "react";

// Renders the small Markdown subset our policy pages use (headings, lists, bold, links, rules)
// as React elements, so the text lives in plain strings and nothing is injected as raw HTML.

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i}>{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      return href.startsWith("/")
        ? <Link key={i} href={href} className="font-semibold text-brand underline">{link[1]}</Link>
        : <a key={i} href={href} className="font-semibold text-brand underline" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{link[1]}</a>;
    }
    return part;
  });
}

export function LegalDoc({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={blocks.length} className={`my-3 space-y-1.5 pl-6 ${list.ordered ? "list-decimal" : "list-disc"}`}>
        {list.items.map((t, i) => <li key={i}>{inline(t)}</li>)}
      </Tag>,
    );
    list = null;
  };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const ul = line.match(/^[-*]\s+(.*)/);
    const ol = line.match(/^\d+\.\s+(.*)/);
    if (ul || ol) {
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const key = blocks.length;
    if (line === "---") blocks.push(<hr key={key} className="my-8 border-border" />);
    else if (line.startsWith("### ")) blocks.push(<h3 key={key} className="mt-6 text-lg font-bold">{inline(line.slice(4))}</h3>);
    else if (line.startsWith("## ")) blocks.push(<h2 key={key} className="mt-10 text-2xl font-extrabold">{inline(line.slice(3))}</h2>);
    else if (line.startsWith("# ")) blocks.push(<h1 key={key} className="text-4xl font-extrabold">{inline(line.slice(2))}</h1>);
    else blocks.push(<p key={key} className="my-3 leading-relaxed text-muted">{inline(line)}</p>);
  }
  flush();

  return <article className="mx-auto max-w-3xl px-4 py-10 md:px-8 md:py-16 [&_li]:text-muted">{blocks}</article>;
}
