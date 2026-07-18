// Omega Cloud — Models endpoint
// Static list of the 5 OpenCode free models. No proxy fetch, no caching.

import { NextResponse } from "next/server";

export const runtime = "edge";

const MODELS = [
  { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free", provider: "opencode", free: true },
  { id: "mimo-v2.5-free", name: "MiMo-V2.5 Free", provider: "opencode", free: true },
  { id: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free", provider: "opencode", free: true },
  { id: "north-mini-code-free", name: "North Mini Code Free", provider: "opencode", free: true },
  { id: "big-pickle", name: "Big Pickle", provider: "opencode", free: true },
];

export async function GET() {
  return NextResponse.json(
    { object: "list", data: MODELS },
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
