// Plain data the home page hands to its sections (all from the existing database).
export type HomePart = { id: string; order: number; title: string; durationSec: number; isFreePreview: boolean; watchThreshold: number };

export type HomeChapter = {
  id: string;
  slug: string;
  title: string;
  classLevel: number;
  price: number;
  mrp: number;
  coverFrom: string;
  coverTo: string;
  symbol: string;
  jeeWeightage: number;
  parts: HomePart[];
  hasFreePart: boolean;
  // Chapter preview video (3–4 min) as an embeddable URL; null until it is uploaded.
  previewSrc: string | null;
};

export type HomeCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  price: number;
  mrp: number;
  highlights: string[];
  chapterCount: number;
};

export type Leader = { id: string; name: string; avatarColor: string; xp: number };

// 18:40 style part length.
export function clock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Big faded glyphs need a smaller size for long symbols (as in the design).
export const glyphSize = (symbol: string, long: string, short: string) => (symbol.length > 2 ? long : short);
