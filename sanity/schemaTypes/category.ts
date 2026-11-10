import { defineField, defineType } from "sanity";

export const category = defineType({
  name: "category",
  title: "Category",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title", maxLength: 60 },
      description: "Used in the blog filter. Changing it later can break filters people have bookmarked.",
      validation: (r) => r.required(),
    }),
  ],
  preview: { select: { title: "title", subtitle: "slug.current" } },
});
