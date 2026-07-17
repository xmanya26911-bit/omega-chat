// Middleware — injects Authorization header from HTTP-only cookie for all /api/* routes
// This lets users refresh the page without losing their auth session.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Skip non-API routes and the set-cookie endpoint itself
  const path = request.nextUrl.pathname;
  if (!path.startsWith("/api/") || path === "/api/auth/set-cookie") {
    return NextResponse.next();
  }

  // If Authorization header already set (e.g. by client-side code), keep it
  if (request.headers.get("authorization")) {
    return NextResponse.next();
  }

  // Read the HTTP-only cookie
  const token = request.cookies.get("omega_at")?.value;
  if (!token) {
    return NextResponse.next();
  }

  // Inject Authorization header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Authorization", `Bearer ${token}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
