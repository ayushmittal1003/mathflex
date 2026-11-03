import "server-only";
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

// Google and mobile OTP sign-in through Firebase. The browser talks to Firebase; our server only
// trusts the signed ID token it gets back, then starts our normal session. Firebase's own session isn't used.
// Needs FIREBASE_API_KEY, FIREBASE_PROJECT_ID and FIREBASE_APP_ID (the web app's public config, not secrets).
// FIREBASE_PHONE_ENABLED=true shows the mobile option: it only works once the project is on the Blaze plan.

export type FirebaseWebConfig = { apiKey: string; authDomain: string; projectId: string; appId: string; phone: boolean };

export function firebaseWebConfig(): FirebaseWebConfig | null {
  const { FIREBASE_API_KEY: apiKey, FIREBASE_PROJECT_ID: projectId, FIREBASE_APP_ID: appId } = process.env;
  if (!apiKey || !projectId || !appId) return null;
  return { apiKey, projectId, appId, authDomain: `${projectId}.firebaseapp.com`, phone: process.env.FIREBASE_PHONE_ENABLED === "true" };
}

const KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));

export type FirebaseIdentity = { provider: "google"; email: string; name: string } | { provider: "phone"; phone: string };

// Checks the signature, project and expiry as Firebase documents, and returns who was proven.
// Returns null for anything else, including a provider we don't sign in with.
export async function verifyFirebaseToken(token: string, keys: JWTVerifyGetKey = KEYS): Promise<FirebaseIdentity | null> {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) return null;
  try {
    const { payload } = await jwtVerify(token, keys, { algorithms: ["RS256"], audience: projectId, issuer: `https://securetoken.google.com/${projectId}` });
    if (!payload.sub) return null;
    if (typeof payload.auth_time !== "number" || payload.auth_time > Date.now() / 1000 + 60) return null;
    const provider = (payload.firebase as { sign_in_provider?: string } | undefined)?.sign_in_provider;
    if (provider === "google.com") {
      if (typeof payload.email !== "string" || payload.email_verified !== true) return null;
      return { provider: "google", email: payload.email.toLowerCase(), name: typeof payload.name === "string" ? payload.name.trim() : "" };
    }
    if (provider === "phone" && typeof payload.phone_number === "string") return { provider: "phone", phone: payload.phone_number };
    return null;
  } catch {
    return null;
  }
}
