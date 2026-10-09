import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "./primitives";
import { cx } from "./ui";

// Legal pages (Terms / Privacy / Refund Policy .dc.html layout) over Ayush's policy text in
// lib/legal/*. Same small Markdown subset LegalDoc reads (#, ##, ###, lists, **bold**,
// [links](/x), ---); nothing in the text is changed or dropped. No placeholders here:
// missing company details are simply not shown.

type Block = { kind: "p" | "h3" | "hr"; text: string } | { kind: "list"; ordered: boolean; items: string[] };
type Section = { id: string; n: string; title: string; blocks: Block[] };

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-bold text-foreground">{bold[1]}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      const href = link[2];
      return href.startsWith("/")
        ? <Link key={i} href={href} className="font-semibold text-primary underline underline-offset-2">{link[1]}</Link>
        : <a key={i} href={href} className="font-semibold text-primary underline underline-offset-2" {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>{link[1]}</a>;
    }
    return part;
  });
}

function parse(source: string) {
  let title = "";
  let updated: string | null = null;
  const intro: Block[] = [];
  const sections: Section[] = [];
  let target = intro;
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => { if (list) { target.push({ kind: "list", ...list }); list = null; } };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    const ul = line.match(/^[-*]\s+(.*)/);
    const ol = line.match(/^\d+\.\s+(.*)/);
    if ((ul || ol) && !line.startsWith("## ")) {
      const ordered = !!ol;
      if (list && list.ordered !== ordered) flush();
      list ??= { ordered, items: [] };
      list.items.push((ul ?? ol)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    if (line.startsWith("# ")) { title = line.slice(2); continue; }
    const date = line.match(/^\*\*(?:Effective Date|Last Updated|Last updated):\*\*\s*(.+)$/);
    if (date && !sections.length) { updated = date[1]; continue; }
    if (line.startsWith("## ")) {
      const h = line.slice(3);
      const m = h.match(/^(\d+)\.\s*(.*)$/);
      const n = m ? m[1] : String(sections.length + 1);
      const sec: Section = { id: `s${n}`, n, title: m ? m[2] : h, blocks: [] };
      sections.push(sec);
      target = sec.blocks;
      continue;
    }
    if (line === "---") target.push({ kind: "hr", text: "" });
    else if (line.startsWith("### ")) target.push({ kind: "h3", text: line.slice(4) });
    else target.push({ kind: "p", text: line });
  }
  flush();
  return { title, updated, intro, sections };
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((b, i) =>
        b.kind === "list" ? (
          <div key={i} className="mt-3.5 grid gap-2.5">
            {b.items.map((it, j) => (
              <div key={j} className="flex gap-3 text-base leading-[1.6] text-secondary-foreground">
                {b.ordered ? <span className="w-5 shrink-0 font-mono text-sm font-bold text-primary">{j + 1}.</span> : <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className="min-w-0">{inline(it)}</span>
              </div>
            ))}
          </div>
        ) : b.kind === "h3" ? (
          <h3 key={i} className="mt-6 text-lg font-extrabold tracking-[-0.015em]">{inline(b.text)}</h3>
        ) : b.kind === "hr" ? (
          <hr key={i} className="my-7 border-border" />
        ) : (
          <p key={i} className="mt-3.5 text-base leading-[1.7] text-secondary-foreground text-pretty">{inline(b.text)}</p>
        ),
      )}
    </>
  );
}

const DOCS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/refund-policy", label: "Refunds" },
];

export function LegalPage({ source, current, email }: { source: string; current: string; email: string }) {
  const { title, updated, intro, sections } = parse(source);
  return (
    <>
      <section className="px-6 pt-[calc(86px+40px)] text-center">
        {updated && <Eyebrow dot="primary">Last updated {updated}</Eyebrow>}
        <h1 className="mx-auto mt-5.5 max-w-[900px] text-[clamp(40px,6vw,76px)] font-extrabold leading-none tracking-[-0.045em] text-balance">{title}</h1>
        <nav aria-label="Policies" className="mx-auto mt-7 inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-foreground p-1">
          {DOCS.map((d) => (
            <Link key={d.href} href={d.href} aria-current={d.href === current ? "page" : undefined} className={cx("whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-bold", d.href === current ? "bg-card text-foreground" : "text-white/75 hover:text-white")}>
              {d.label}
            </Link>
          ))}
        </nav>
      </section>

      <section className="pb-22 pt-14">
        <div className="mx-auto flex w-[min(1120px,calc(100%-48px))] items-start gap-14">
          {sections.length > 2 && (
            <aside className="sticky top-24 hidden w-[240px] flex-none min-[960px]:block">
              <div className="pb-3 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">On this page</div>
              <div className="grid gap-0.5 border-l-2 border-border">
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`} className="-ml-0.5 block border-l-2 border-transparent py-[7px] pl-3.5 text-sm font-semibold text-secondary-foreground hover:border-foreground hover:text-foreground">
                    {s.n}. {s.title}
                  </a>
                ))}
              </div>
              <div className="mt-6 border-t border-border pt-4.5 text-[13px] leading-[1.55] text-muted-foreground">
                Questions? <Link href="/contact" className="font-semibold text-primary">Contact us</Link>
              </div>
            </aside>
          )}
          <article className="min-w-0 max-w-[720px] flex-1">
            {intro.length > 0 && <div className="mb-9"><Blocks blocks={intro} /></div>}
            {sections.map((s) => (
              <div key={s.id} id={s.id} className="scroll-mt-24 pb-9">
                <h2 className="text-[clamp(22px,2.4vw,26px)] font-extrabold tracking-[-0.025em]">
                  <span className="mr-2.5 font-mono text-sm font-bold text-primary">{s.n.padStart(2, "0")}</span>
                  {inline(s.title)}
                </h2>
                <Blocks blocks={s.blocks} />
              </div>
            ))}
            <div className="mt-2 border-t border-border pt-6 text-sm leading-[1.6] text-muted-foreground">
              Mathflex · <a href={`mailto:${email}`} className="font-semibold text-primary">{email}</a>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
