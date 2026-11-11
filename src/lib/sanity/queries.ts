import { defineQuery } from "next-sanity";

// Same filter everywhere: published, has a slug, and not scheduled for the future.
const LIVE = `_type == "post" && defined(slug.current) && publishedAt <= now()`;

const POST_FIELDS = `
  "slug": slug.current,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  seoTitle,
  seoDescription,
  "cover": coverImage{ "url": asset->url, alt, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height },
  "categories": categories[]->{ "slug": slug.current, title },
  "author": author->{ name, "slug": slug.current, credential, bio, sameAs, "photo": photo{ "url": asset->url, alt } },
  body[]{
    ...,
    _type == "image" => { ..., "url": asset->url, "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }
  }
`;

export const POSTS_QUERY = defineQuery(`*[${LIVE}] | order(publishedAt desc){ ${POST_FIELDS} }`);

export const POST_QUERY = defineQuery(`*[${LIVE} && slug.current == $slug][0]{ ${POST_FIELDS} }`);
