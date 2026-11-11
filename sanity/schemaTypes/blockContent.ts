import { defineArrayMember, defineField, defineType } from "sanity";

// Article body. Maps to BlogBlock in src/lib/blog.ts (see src/lib/sanity/portable-text.ts).
export const blockContent = defineType({
  name: "blockContent",
  title: "Body",
  type: "array",
  of: [
    defineArrayMember({
      type: "block",
      styles: [
        { title: "Paragraph", value: "normal" },
        { title: "Heading 2", value: "h2" },
        { title: "Heading 3", value: "h3" },
        { title: "Quote", value: "blockquote" },
      ],
      lists: [
        { title: "Bullets", value: "bullet" },
        { title: "Numbers", value: "number" },
      ],
      marks: {
        decorators: [
          { title: "Bold", value: "strong" },
          { title: "Italic", value: "em" },
          { title: "Code", value: "code" },
        ],
        annotations: [
          {
            name: "link",
            type: "object",
            title: "Link",
            fields: [
              defineField({
                name: "href",
                type: "url",
                validation: (r) => r.required().uri({ scheme: ["https", "http", "mailto"], allowRelative: true }),
              }),
            ],
          },
        ],
      },
      of: [
        defineArrayMember({
          name: "inlineMath",
          title: "Inline maths",
          type: "object",
          fields: [defineField({ name: "latex", title: "LaTeX", type: "string", validation: (r) => r.required() })],
          preview: { select: { title: "latex" }, prepare: ({ title }) => ({ title: `$${title}$` }) },
        }),
      ],
    }),
    defineArrayMember({
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "What the image shows, for screen readers and search. Use a short description, not “image of…”.",
          validation: (r) => r.required(),
        }),
        defineField({ name: "caption", type: "string" }),
      ],
    }),
    defineArrayMember({
      name: "code",
      title: "Code block",
      type: "object",
      fields: [
        defineField({ name: "language", type: "string", description: "e.g. python, js, text" }),
        defineField({ name: "filename", type: "string" }),
        defineField({ name: "code", type: "text", rows: 8, validation: (r) => r.required() }),
      ],
      preview: { select: { title: "filename", subtitle: "language", code: "code" }, prepare: ({ title, subtitle, code }) => ({ title: title || code?.split("\n")[0] || "Code", subtitle }) },
    }),
    defineArrayMember({
      name: "table",
      title: "Table",
      type: "object",
      fields: [
        defineField({ name: "caption", type: "string", description: "Optional. Short description shown under the table and read by screen readers." }),
        defineField({
          name: "rows",
          type: "array",
          description: "The first row is the header. Every row should have the same number of cells.",
          of: [
            defineArrayMember({
              name: "tableRow",
              type: "object",
              fields: [defineField({ name: "cells", type: "array", of: [{ type: "string" }], validation: (r) => r.required().min(1) })],
              preview: { select: { cells: "cells" }, prepare: ({ cells }) => ({ title: (cells ?? []).join("  |  ") }) },
            }),
          ],
          validation: (r) =>
            r.required().min(2).custom((value) => {
              const rows = (value ?? []) as { cells?: string[] }[];
              const widths = new Set(rows.map((row) => row.cells?.length ?? 0));
              return widths.size <= 1 ? true : "Every row needs the same number of cells.";
            }),
        }),
      ],
      preview: { select: { rows: "rows", caption: "caption" }, prepare: ({ rows, caption }) => ({ title: caption || "Table", subtitle: `${rows?.length ?? 0} rows` }) },
    }),
    defineArrayMember({
      name: "math",
      title: "Maths block",
      type: "object",
      fields: [defineField({ name: "latex", title: "LaTeX", type: "text", rows: 3, description: "Displayed on its own line, e.g. \\int_0^1 x^2\\,dx = \\tfrac{1}{3}", validation: (r) => r.required() })],
      preview: { select: { title: "latex" }, prepare: ({ title }) => ({ title: `$$ ${title} $$` }) },
    }),
  ],
});
