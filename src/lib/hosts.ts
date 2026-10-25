// Two hostnames, one codebase: the public marketing site (mathflex.in) and the student app
// (app.mathflex.in: My Learning, lessons, practice, exams, checkout). The split is OFF until
// APP_HOST is set, so local development and preview deployments behave as before.
//
//   APP_HOST       app.mathflex.in
//   SITE_HOST      mathflex.in          (www.mathflex.in is treated the same)
//   COOKIE_DOMAIN  .mathflex.in         (so one login works on both)

export type HostConfig = { app: string; site: string };

export function hostConfig(): HostConfig | null {
  const app = (process.env.APP_HOST ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const site = (process.env.SITE_HOST ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return app && site ? { app, site } : null;
}

// Pages that belong to the student app.
const APP_PREFIXES = ["/my-learning", "/learn", "/practice", "/profile", "/plans", "/checkout", "/cart", "/payment", "/leaderboard"];
// Served the same on both hosts: APIs (payment return/webhook, auth callbacks), the admin panel and assets.
const NEUTRAL_PREFIXES = ["/api", "/admin", "/_next", "/brand", "/icon.svg", "/favicon.ico", "/robots.txt", "/sitemap"];

const under = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(`${p}/`));
export const isAppPath = (path: string) => under(path, APP_PREFIXES);
export const isNeutralPath = (path: string) => under(path, NEUTRAL_PREFIXES) || /\.[a-z0-9]{2,5}$/i.test(path);

// "/my-learning" -> "https://app.mathflex.in/my-learning" when the split is on; other paths stay relative.
export function appHref(path: string): string {
  const cfg = hostConfig();
  const p = path.startsWith("/") ? path : `/${path}`;
  return cfg && isAppPath(p.split("?")[0]) ? `https://${cfg.app}${p}` : p;
}

// The page a signed-in student lands on by default.
export const STUDENT_HOME = "/my-learning";
