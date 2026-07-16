// Omega Cloud — OAuth Token Exchange (PKCE)
// Handles authorization code exchange and token refresh server-side.
// Faithful port of the original Vercel edge function to a Next.js route handler.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID =
  "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function cors(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin") || request.nextUrl.origin;

  try {
    const body = await request.json();

    // ─── Refresh flow ───
    if (body.mode === "refresh") {
      if (!body.refresh_token) {
        return NextResponse.json(
          { error: "No refresh token" },
          { status: 400, headers: { "Content-Type": "application/json", ...cors(origin) } }
        );
      }
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: body.refresh_token,
      });
      if (process.env.GOOGLE_CLIENT_SECRET)
        params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);

      const res = await fetch(GOOGLE_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await res.json();

      if (!res.ok) {
        return NextResponse.json(
          { error: data.error_description || "Refresh failed" },
          { status: res.status, headers: { "Content-Type": "application/json", ...cors(origin) } }
        );
      }
      return NextResponse.json(
        { access_token: data.access_token, expires_in: data.expires_in },
        { status: 200, headers: { "Content-Type": "application/json", ...cors(origin) } }
      );
    }

    // ─── Authorization code exchange ───
    if (!body.code || !body.code_verifier) {
      return NextResponse.json(
        { error: "Missing code or code_verifier" },
        { status: 400, headers: { "Content-Type": "application/json", ...cors(origin) } }
      );
    }

    const params = new URLSearchParams({
      code: body.code,
      client_id: GOOGLE_CLIENT_ID,
      code_verifier: body.code_verifier,
      redirect_uri: body.redirect_uri || origin,
      grant_type: "authorization_code",
    });
    if (process.env.GOOGLE_CLIENT_SECRET)
      params.append("client_secret", process.env.GOOGLE_CLIENT_SECRET);

    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data.error_description || "Auth failed" },
        { status: res.status, headers: { "Content-Type": "application/json", ...cors(origin) } }
      );
    }

    // Fetch user email
    let email = "";
    try {
      const u = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: "Bearer " + data.access_token },
      });
      if (u.ok) {
        const ui = await u.json();
        email = ui.email || "";
      }
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        access_token: data.access_token,
        refresh_token: data.refresh_token || "",
        expires_in: data.expires_in,
        email,
      },
      { status: 200, headers: { "Content-Type": "application/json", ...cors(origin) } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: { "Content-Type": "application/json", ...cors(origin) } }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || request.nextUrl.origin;
  return new NextResponse(null, { status: 204, headers: cors(origin) });
}
