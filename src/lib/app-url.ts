// The public site address, used for links that leave the app (payment return and webhook URLs, invites).
// APP_URL is easy to save without its scheme ("mathflex.in"); a scheme-less value would be treated as a
// relative path by Cashfree, so we add https:// and strip trailing slashes.
export function appUrl(): string {
  const raw = (process.env.APP_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}
