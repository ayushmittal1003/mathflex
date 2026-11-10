import type { BlogBlock, Span } from "@/lib/blog";

// Portable Text from Sanity -> the BlogBlock shape the article page renders. Only the block
// types defined in sanity/schemaTypes/blockContent.ts are handled; anything else is skipped.

type PtSpan = { _type: "span"; text: string; marks?: string[] };
type PtInlineMath = { _type: "inlineMath"; latex?: string };
type PtMarkDef = { _key: string; _type: string; href?: string };
type PtBlock = {
  _type: "block";
  style?: string;
  listItem?: "bullet" | "number";
  children?: (PtSpan | PtInlineMath)[];
  markDefs?: PtMarkDef[];
};
type PtImage = { _type: "image"; url?: string | null; alt?: string; caption?: string; width?: number | null; height?: number | null };
type PtCode = { _type: "code"; code?: string; language?: string; filename?: string };
type PtMath = { _type: "math"; latex?: string };
export type PtNode = PtBlock | PtImage | PtCode | PtMath | { _type: string };

const SAFE_HREF = /^(https?:\/\/|mailto:|\/(?!\/))/i;

function toSpans(block: PtBlock): Span[] {
  const defs = new Map((block.markDefs ?? []).map((d) => [d._key, d]));
  const out: Span[] = [];
  for (const c of block.children ?? []) {
    if (c._type === "inlineMath") {
      if ((c as PtInlineMath).latex) out.push({ text: "", math: (c as PtInlineMath).latex });
      continue;
    }
    const s = c as PtSpan;
    if (!s.text) continue;
    const span: Span = { text: s.text };
    for (const m of s.marks ?? []) {
      if (m === "strong") span.strong = true;
      else if (m === "em") span.em = true;
      else if (m === "code") span.code = true;
      else {
        const def = defs.get(m);
        if (def?.href && SAFE_HREF.test(def.href)) span.href = def.href;
      }
    }
    out.push(span);
  }
  return out;
}

const plain = (spans: Span[]) => spans.map((s) => s.text || (s.math ? `$${s.math}$` : "")).join("");

function slugify(text: string, taken: Set<string>) {
  const base = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "section";
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  taken.add(id);
  return id;
}

export function portableTextToBlocks(nodes: PtNode[] | null | undefined): BlogBlock[] {
  const blocks: BlogBlock[] = [];
  const ids = new Set<string>();

  for (const node of nodes ?? []) {
    if (node._type === "block") {
      const b = node as PtBlock;
      const spans = toSpans(b);
      if (!spans.length) continue;

      if (b.listItem) {
        const ordered = b.listItem === "number";
        const last = blocks[blocks.length - 1];
        if (last?._type === "list" && !!last.ordered === ordered) {
          last.items.push(plain(spans));
          last.itemSpans!.push(spans);
        } else {
          blocks.push({ _type: "list", ordered, items: [plain(spans)], itemSpans: [spans] });
        }
        continue;
      }

      if (b.style === "h2") blocks.push({ _type: "h2", id: slugify(plain(spans), ids), text: plain(spans) });
      else if (b.style === "h3") blocks.push({ _type: "h3", id: slugify(plain(spans), ids), text: plain(spans) });
      else if (b.style === "blockquote") blocks.push({ _type: "quote", text: plain(spans), spans });
      else blocks.push({ _type: "p", text: plain(spans), spans });
    } else if (node._type === "image") {
      const i = node as PtImage;
      if (i.url) blocks.push({ _type: "image", url: i.url, alt: i.alt ?? "", caption: i.caption, width: i.width ?? undefined, height: i.height ?? undefined });
    } else if (node._type === "code") {
      const c = node as PtCode;
      if (c.code) blocks.push({ _type: "code", code: c.code, language: c.language, filename: c.filename });
    } else if (node._type === "math") {
      const m = node as PtMath;
      if (m.latex) blocks.push({ _type: "math", latex: m.latex });
    }
  }
  return blocks;
}

export function readMinutes(blocks: BlogBlock[]) {
  const words = blocks
    .map((b) => {
      switch (b._type) {
        case "p": case "h2": case "h3": case "quote": return b.text;
        case "list": return b.items.join(" ");
        default: return "";
      }
    })
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
