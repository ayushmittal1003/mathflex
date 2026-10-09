import "server-only";

// "Continue with Google" (OAuth 2.0 authorization-code flow, no extra packages).
// Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET; without them the button shows as
// "being set up" and the routes send people back to /login.
// Google Cloud Console → Credentials → OAuth client (Web): add the redirect URI
// `${APP_URL}/api/auth/google/callback`.

export const GOOGLE_STATE_COOKIE = "mf_google_state";

export function googleConfigured() {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri() {
  return `${(process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = { email: string; name: string };

// Swap the one-time code for tokens, then ask Google (server to server, over TLS) who the
// user is. Only verified Google emails are accepted.
export async function googleProfileFromCode(code: string): Promise<GoogleProfile | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;

  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as { email?: string; email_verified?: boolean; name?: string; given_name?: string };
  if (!info.email || info.email_verified !== true) return null;
  const email = info.email.trim().toLowerCase();
  return { email, name: (info.name || info.given_name || email.split("@")[0]).trim().slice(0, 60) };
}
