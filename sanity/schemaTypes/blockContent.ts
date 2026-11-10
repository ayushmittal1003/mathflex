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
      name: "math",
      title: "Maths block",
      type: "object",
      fields: [defineField({ name: "latex", title: "LaTeX", type: "text", rows: 3, description: "Displayed on its own line, e.g. \\int_0^1 x^2\\,dx = \\tfrac{1}{3}", validation: (r) => r.required() })],
      preview: { select: { title: "latex" }, prepare: ({ title }) => ({ title: `$$ ${title} $$` }) },
    }),
  ],
});
