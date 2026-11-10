import { defineField, defineType } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name", maxLength: 60 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "photo",
      type: "image",
      options: { hotspot: true },
      fields: [
        defineField({
          name: "alt",
          title: "Alt text",
          type: "string",
          description: "Describe the photo for screen readers, e.g. “Karan Mittal, JEE maths mentor”.",
          validation: (r) => r.required(),
        }),
      ],
    }),
    defineField({
      name: "credential",
      type: "string",
      description: "Shown next to the name. Confirmed wording only, e.g. “IIT Delhi alumnus”.",
      validation: (r) => r.required().max(80),
    }),
    defineField({ name: "bio", type: "text", rows: 4, description: "Two or three plain sentences. Confirmed facts only.", validation: (r) => r.max(500) }),
    defineField({
      name: "sameAs",
      title: "Profile links",
      type: "array",
      of: [{ type: "url", validation: (r) => r.uri({ scheme: ["https"] }) }],
      description: "Real profiles for this person (LinkedIn, Instagram…). Used in the article's structured data.",
    }),
  ],
  preview: { select: { title: "name", subtitle: "credential", media: "photo" } },
});
