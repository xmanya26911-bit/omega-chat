// Omega Cloud — Models endpoint
// Returns the curated model list. Auth-required.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID =
  "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";

const FREE_MODELS = new Set([
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "hy3-free",
  "nemotron-3-ultra-free",
  "north-mini-code-free",
]);

const ALL_MODELS = [
  "deepseek-v4-flash-free",
  "mimo-v2.5-free",
  "hy3-free",
  "nemotron-3-ultra-free",
  "north-mini-code-free",
  "claude-fable-5",
  "claude-sonnet-4",
  "claude-haiku-4-5",
  "gemini-3.5-flash",
  "gpt-5.4-mini",
  "deepseek-v4-flash",
];

const tokenCache = new Map<string, { exp: number }>();

async function verifyToken(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  if (token.length < 10) return false;
  const cached = tokenCache.get(token);
  if (cached && cached.exp > Date.now() / 1000) return true;
  try {
    const r = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
    );
    if (!r.ok) return false;
    const data = await r.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return false;
    if (data.exp && parseInt(data.exp) < Date.now() / 1000) return false;
    tokenCache.set(token, { exp: parseInt(data.exp || "0") });
    return true;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const ok = await verifyToken(request.headers.get("Authorization"));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const data = ALL_MODELS.map((id) => ({
    id,
    free: FREE_MODELS.has(id),
  }));
  return NextResponse.json(
    { data },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=600",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
