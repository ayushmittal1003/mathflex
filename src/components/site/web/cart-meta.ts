// Display-only catalogue details for the cart drawer and checkout (titles, access length, ids).
// Prices shown to the student always come from the server quote (getQuote), never from here.
export type CartMetaChapter = {
  id: string; slug: string; title: string; classLevel: number; symbol: string; coverFrom: string; coverTo: string;
  price: number; mrp: number; validityDays: number; order: number; // order: position in syllabus order (class, then sortOrder)
};
export type CartMetaCourse = { id: string; slug: string; title: string; validityDays: number; chapterIds: string[] };
export type CartMeta = { chapters: Record<string, CartMetaChapter>; courses: CartMetaCourse[] };
