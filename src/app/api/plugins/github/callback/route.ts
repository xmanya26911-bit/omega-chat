import { NextRequest } from "next/server";

export const runtime = "edge";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const BLOB_URL = "https://blob.vercel-storage.com";

async function putBlob(path: string, data: any) {
  try {
    const body = typeof data === "string" ? data : JSON.stringify(data);
    await fetch(`${BLOB_URL}/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${BLOB_TOKEN}`,
        "Content-Type": "application/json",
        "x-api-version": "2",
      },
      body,
    });
  } catch { /* silent */ }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const statePayload = url.searchParams.get("state") || "";

  if (!code) {
    return new Response("Missing code parameter", { status: 400 });
  }

  // Extract Google sub from state: `gh:{uuid}:{googleSub}`
  const parts = statePayload.split(":");
  const googleSub = parts.length >= 3 ? parts[2] : null;

  // Exchange code for token
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!tokenRes.ok) {
    return new Response("GitHub OAuth token exchange failed", { status: 400 });
  }

  const data = await tokenRes.json();
  if (data.error) {
    return new Response(`GitHub error: ${data.error_description || data.error}`, { status: 400 });
  }

  // Get GitHub user info
  const ghRes = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  const ghUser = ghRes.ok ? await ghRes.json() : { login: "unknown" };

  // Store token in Blob keyed by user's Google sub
  const key = googleSub || ghUser.login;
  await putBlob(`users/${key}/plugins/github_token.json`, {
    access_token: data.access_token,
    gh_login: ghUser.login,
    scope: data.scope,
    created_at: Date.now(),
  });

  // Redirect back to chat app
  const origin = request.nextUrl.origin;
  return Response.redirect(`${origin}/?plugin=github&status=connected`, 302);
}
