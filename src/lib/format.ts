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

// Mobile-only accounts have no email, but every account needs a unique one, so they get this stand-in
// (nothing is ever delivered to it). `accountContact` shows the number instead.
const PHONE_EMAIL = /^91(\d{5})(\d{5})@phone\.mathflex\.in$/;
export const phoneOnlyEmail = (e164: string) => `${e164.replace(/^\+/, "")}@phone.mathflex.in`;
export const isPhoneOnlyEmail = (email: string) => email.endsWith("@phone.mathflex.in");
// Someone who paid without logging in gets an account straight away, so they can start at once. It
// has this stand-in too, because the email they typed isn't proven. See startGuestAccess in lib/orders.
const GUEST_DOMAIN = "@guest.mathflex.in";
export const guestEmail = (orderNo: string) => `guest-${orderNo.toLowerCase()}${GUEST_DOMAIN}`;
export const isGuestEmail = (email: string) => email.endsWith(GUEST_DOMAIN);
export const isPlaceholderEmail = (email: string) => isPhoneOnlyEmail(email) || isGuestEmail(email);
export function accountContact(email: string) {
  if (isGuestEmail(email)) return "Guest account";
  const m = email.match(PHONE_EMAIL);
  return m ? `+91 ${m[1]} ${m[2]}` : email;
}
