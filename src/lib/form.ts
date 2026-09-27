// Helpers for reading admin <form> posts in server actions.
export const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
export const int = (f: FormData, k: string, d = 0) => {
  const n = parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : d;
};
export const num = (f: FormData, k: string, d = 0) => {
  const n = parseFloat(str(f, k));
  return Number.isFinite(n) ? n : d;
};
export const optInt = (f: FormData, k: string) => (str(f, k) === "" ? null : int(f, k));
export const bool = (f: FormData, k: string) => f.get(k) === "on";
export const list = (f: FormData, k: string) => str(f, k).split(/\n|,/).map((s) => s.trim()).filter(Boolean);
// <input type="datetime-local"> has no timezone; admins enter times in IST.
export const date = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(v) ? v : `${v.length === 16 ? `${v}:00` : v}+05:30`);
};
export const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
