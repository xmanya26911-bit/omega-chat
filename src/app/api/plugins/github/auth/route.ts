import { NextRequest } from "next/server";

export const runtime = "edge";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";

const tokenCache = new Map<string, { sub: string; exp: number }>();

async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  if (token.length < 10) return null;
  const cached = tokenCache.get(token);
  if (cached && cached.exp > Date.now() / 1000) return cached;
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.exp && parseInt(data.exp) < Date.now() / 1000) return null;
    const info = { sub: data.sub, exp: parseInt(data.exp || "0") };
    const ttl = Math.max(60, info.exp - Date.now() / 1000 - 300) * 1000;
    tokenCache.set(token, info);
    setTimeout(() => tokenCache.delete(token), ttl);
    return info;
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  // Verify user is signed in
  const authInfo = await verifyToken(request.headers.get("Authorization"));

  const state = crypto.randomUUID();
  // Encode Google sub in state for callback to use
  const statePayload = authInfo?.sub ? `gh:${state}:${authInfo.sub}` : `gh:${state}`;

  const redirectUri = `${request.nextUrl.origin}/api/plugins/github/callback`;

  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "repo,user");
  url.searchParams.set("state", statePayload);

  return Response.redirect(url.toString());
}
