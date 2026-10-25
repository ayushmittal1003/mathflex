export const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export const pctOff = (price: number, mrp: number) => (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);

export function duration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function initials(name: string) {
  return name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

// Access length for display: 90 → "3 months", 365 → "1 year", 730 → "2 years", otherwise "N days".
export function validity(days: number) {
  if (days >= 365 && days % 365 === 0) { const y = days / 365; return `${y} year${y > 1 ? "s" : ""}`; }
  if (days >= 30 && days % 30 === 0) { const m = days / 30; return `${m} month${m > 1 ? "s" : ""}`; }
  return `${days} day${days === 1 ? "" : "s"}`;
}
