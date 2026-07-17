// Omega Cloud — Models endpoint
// Fetches live model list from FreeLLMAPI proxy with rate limit info

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const FREELMAPI_BASE = process.env.FREELMAPI_BASE || "https://omegafreellmapi.vercel.app";

// Cache the model list in memory (refreshes every 5 minutes)
let cachedModels: { data: any[] } | null = null;
let cacheTime = 0;
const CACHE_TTL = 300_000; // 5 min

export async function GET(request: NextRequest) {
  try {
    // Return cached or fetch fresh
    if (!cachedModels || Date.now() - cacheTime > CACHE_TTL) {
      const res = await fetch(`${FREELMAPI_BASE}/v1/models`, {
        headers: { "Content-Type": "application/json" },
        // Timeout after 5s to avoid slow model loading
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
      const data = await res.json();
      cachedModels = data;
      cacheTime = Date.now();
    }

    return NextResponse.json(cachedModels, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err) {
    // Return fallback model list if proxy is unreachable
    return NextResponse.json({
      object: "list",
      data: [
        { id: "deepseek-v4-flash-free", provider: "opencode", free: true, rate_limit: "50 req/day" },
      ],
    }, {
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
