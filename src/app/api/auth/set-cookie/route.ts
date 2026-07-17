// Set HTTP-only + JS-accessible cookies for the Google access token
// Called after OAuth PKCE exchange and after refresh-token exchange

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const accessToken = body.accessToken as string | undefined;
  // Google access tokens typically last 3600s, but we default to 7200 for safety
  const maxAge = typeof body.maxAge === "number" ? body.maxAge : 7200;

  if (!accessToken) {
    return NextResponse.json({ error: "No accessToken provided" }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });

  // 1) HTTP-only cookie → sent with every request to our API
  //    Middleware reads this, injects Authorization header
  res.cookies.set("omega_at", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge,
  });

  // 2) JS-accessible cookie → read by access-token.ts for Google Drive API calls
  res.cookies.set("omega_at_js", accessToken, {
    httpOnly: false,
    secure: true,
    sameSite: "strict",
    path: "/",
    maxAge,
  });

  return res;
}

// DELETE — clear cookies on sign-out
export async function DELETE() {
  const res = NextResponse.json({ success: true });

  res.cookies.set("omega_at", "", {
    httpOnly: true, secure: true, sameSite: "strict", path: "/", maxAge: 0,
  });
  res.cookies.set("omega_at_js", "", {
    httpOnly: false, secure: true, sameSite: "strict", path: "/", maxAge: 0,
  });

  return res;
}
