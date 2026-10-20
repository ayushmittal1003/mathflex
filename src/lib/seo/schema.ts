import { SITE_NAME, SITE_URL, SOCIAL_PROFILES, absoluteUrl } from "./config";

// schema.org builders. Every value passed in must be visible on the same page and come from
// the database or settings; nothing here invents data. NOTE: Google retired the Course Info,
// Learning Video and FAQ rich results, so this markup is for semantic understanding by
// search engines and AI systems, not a promise of rich results. No ratings or reviews.

type Json = Record<string, unknown>;

export const ORG_ID = `${SITE_URL}/#organization`;
export const PERSON_ID = `${SITE_URL}/about#mentor`;

const IIT_DELHI = { "@type": "CollegeOrUniversity", name: "Indian Institute of Technology Delhi" };

// The mentor. Every value here is also visible on /about (MentorSection); do not add facts
// that are not confirmed and shown there.
export function person({ name, jobTitle, degree, image }: { name: string; jobTitle: string; degree: string; image?: string | null }): Json {
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name,
    jobTitle,
    url: absoluteUrl("/about"),
    ...(image ? { image: absoluteUrl(image) } : {}),
    alumniOf: IIT_DELHI,
    hasCredential: { "@type": "EducationalOccupationalCredential", credentialCategory: "degree", name: degree, recognizedBy: IIT_DELHI },
    sameAs: SOCIAL_PROFILES,
  };
}

export function profilePage(path: string, name: string): Json {
  return { "@type": "ProfilePage", "@id": `${absoluteUrl(path)}#profile`, url: absoluteUrl(path), name, inLanguage: "en-IN", isPartOf: { "@id": `${SITE_URL}/#website` }, mainEntity: { "@id": PERSON_ID } };
}

export function organization({ phone, email }: { phone?: string | null; email?: string | null }): Json {
  return {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/brand/mathflex-logo-black.png"),
    sameAs: SOCIAL_PROFILES,
    ...(phone || email ? { contactPoint: { "@type": "ContactPoint", contactType: "customer support", areaServed: "IN", ...(phone ? { telephone: phone } : {}), ...(email ? { email } : {}) } } : {}),
  };
}

// No SearchAction: the sitelinks search box was retired.
export function website(): Json {
  return { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, inLanguage: "en-IN", publisher: { "@id": ORG_ID } };
}

export function graph(...nodes: Json[]): Json {
  return { "@context": "https://schema.org", "@graph": nodes };
}

type CourseInput = { path: string; name: string; description: string; price: number; level?: string; teaches?: string[]; instructorName?: string };

// A purchasable video course (a chapter or a bundle of chapters).
export function course({ path, name, description, price, level, teaches, instructorName }: CourseInput): Json {
  const url = absoluteUrl(path);
  return {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    inLanguage: "en-IN",
    provider: { "@id": ORG_ID, "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    ...(level ? { educationalLevel: level } : {}),
    ...(teaches?.length ? { teaches } : {}),
    offers: { "@type": "Offer", url, price: String(price), priceCurrency: "INR", category: price > 0 ? "Paid" : "Free", availability: "https://schema.org/InStock" },
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      ...(instructorName ? { instructor: { "@type": "Person", "@id": PERSON_ID, name: instructorName, url: absoluteUrl("/about") } } : {}),
    },
  };
}

export function itemList(name: string, items: { path: string; name: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, url: absoluteUrl(it.path) })),
  };
}

// Must match the visible breadcrumb trail on the page.
export function breadcrumbs(items: { name: string; path: string }[]): Json {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: absoluteUrl(it.path) })),
  };
}
