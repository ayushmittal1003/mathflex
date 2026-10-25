import { NextResponse, type NextRequest } from "next/server";
import { hostConfig, isAppPath, isNeutralPath } from "@/lib/hosts";

// Keeps each page on its own host when APP_HOST is configured:
//   mathflex.in      -> marketing pages. App pages redirect to app.mathflex.in.
//   app.mathflex.in  -> student pages. Marketing pages (and login/signup) redirect to mathflex.in;
//                       the app's front door "/" goes to My Learning.
// Access control is NOT done here: every page and server action still checks the session itself.
export function proxy(req: NextRequest) {
  const cfg = hostConfig();
  if (!cfg) return NextResponse.next();
  const host = (req.headers.get("host") ?? "").toLowerCase().split(":")[0];
  const onApp = host === cfg.app;
  const onSite = host === cfg.site || host === `www.${cfg.site}`;
  if (!onApp && !onSite) return NextResponse.next(); // localhost, *.vercel.app previews

  const { pathname, search } = req.nextUrl;
  if (isNeutralPath(pathname)) return NextResponse.next();

  if (onSite && isAppPath(pathname)) return NextResponse.redirect(`https://${cfg.app}${pathname}${search}`, 308);
  if (onApp && !isAppPath(pathname)) {
    if (pathname === "/") return NextResponse.redirect(`https://${cfg.app}/my-learning`, 307);
    return NextResponse.redirect(`https://${cfg.site}${pathname}${search}`, 308);
  }

  const res = NextResponse.next();
  if (onApp) res.headers.set("X-Robots-Tag", "noindex, nofollow"); // the app is for signed-in students, not search
  return res;
}

export const config = {
  // Skip static files and Next's own assets entirely.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
