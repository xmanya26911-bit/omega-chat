// Omega Cloud — Image analysis endpoint
// Uses OpenCode vision-capable models for image understanding
// Auth-required.

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

  let imageData = "";
  let prompt = "";
  try {
    const b = await request.json();
    imageData = b.image;
    prompt = b.prompt || "Describe this image in detail";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!imageData || typeof imageData !== "string") {
    return NextResponse.json({ error: "No image data provided" }, { status: 400 });
  }

  try {
    // Use OpenCode.ai vision model for image analysis
    const openAiRes = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash-free",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: imageData, detail: "auto" },
              },
            ],
          },
        ],
        max_tokens: 1024,
      }),
    });

    if (!openAiRes.ok) {
      const errText = await openAiRes.text();
      return NextResponse.json(
        { error: `AI service error: ${errText}` },
        { status: 502 }
      );
    }

    const data = await openAiRes.json();
    const description = data.choices?.[0]?.message?.content || "";

    return NextResponse.json({
      description: description.trim(),
      model: data.model,
      usage: data.usage,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Analysis failed" },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
