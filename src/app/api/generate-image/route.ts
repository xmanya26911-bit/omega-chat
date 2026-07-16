// Omega Cloud — Image generation endpoint
// Uses Pollinations.ai for free image generation. Auth-required.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const GOOGLE_CLIENT_ID =
  "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";

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

export async function POST(request: NextRequest) {
  const ok = await verifyToken(request.headers.get("Authorization"));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let prompt = "";
  try {
    const b = await request.json();
    prompt = b.prompt;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json({ error: "No prompt provided" }, { status: 400 });
  }

  // Basic content moderation for image generation
  const blockedImagePatterns = [
    /\b(child\s+porn|csam|nude\s+child|underage)\b/i,
    /\b(gore|beheading|torture|snuff)\b/i,
    /\b(malware|ransomware)\s+(screenshot|interface|ui)\b/i,
  ];
  for (const p of blockedImagePatterns) {
    if (p.test(prompt)) {
      return NextResponse.json(
        { error: "Prompt blocked by content policy" },
        { status: 400 }
      );
    }
  }

  try {
    // Use Pollinations.ai for free image generation
    const encodedPrompt = encodeURIComponent(prompt.trim());
    const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;

    // Verify the image is accessible
    const check = await fetch(url, { method: "HEAD" });

    return NextResponse.json({
      url,
      prompt: prompt.trim(),
      cached: check.ok,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Image generation failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
