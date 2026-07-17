import { NextRequest } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID = "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const BLOB_URL = "https://blob.vercel-storage.com";

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

// Extract plugin ID from URL path: /api/plugins/disconnect?plugin=github
export async function POST(request: NextRequest) {
  const authInfo = await verifyToken(request.headers.get("Authorization"));
  if (!authInfo) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const pluginId = url.searchParams.get("plugin");

  if (!pluginId) {
    return new Response(JSON.stringify({ error: "Missing plugin param" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Delete the token from Blob by overwriting with empty
  try {
    await fetch(`${BLOB_URL}/users/${authInfo.sub}/plugins/${pluginId}_token.json`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BLOB_TOKEN}`,
        "Content-Type": "application/json",
        "x-api-version": "2",
      },
      body: JSON.stringify({ deleted: true, at: Date.now() }),
    });
  } catch { /* silent */ }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
