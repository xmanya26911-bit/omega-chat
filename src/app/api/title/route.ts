// Omega Cloud — Title generation endpoint (non-streaming JSON)
// Returns a short AI-generated title for a conversation.
import { NextRequest } from "next/server";

export const runtime = "edge";

const OPENCODE_BASE_URL =
  process.env.OPENCODE_BASE_URL || "https://opencode.ai/zen/v1";
const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_CLIENT_ID || "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";

const tokenCache = new Map<string, { email: string; sub: string; exp: number }>();

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
    if (!res.ok) { tokenCache.delete(token); return null; }
    const data = await res.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    if (data.exp && parseInt(data.exp) < Date.now() / 1000) return null;
    const info = {
      email: data.email || data.sub,
      sub: data.sub,
      exp: parseInt(data.exp || "0"),
    };
    const ttl = Math.max(60, info.exp - Date.now() / 1000 - 300) * 1000;
    tokenCache.set(token, info);
    setTimeout(() => tokenCache.delete(token), ttl);
    return info;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const authInfo = await verifyToken(request.headers.get("Authorization"));
  if (!authInfo) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { preview?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!body.preview || body.preview.length < 5) {
    return new Response(JSON.stringify({ title: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const apiKey = process.env.OPENCODE_API_KEY || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${OPENCODE_BASE_URL}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "deepseek-v4-flash-free",
        messages: [
          {
            role: "system",
            content:
              "You generate short, descriptive titles for conversations. " +
              "Rules:\n" +
              "1. Max 6 words, no quotes, no punctuation at end.\n" +
              "2. Capture the core topic or question.\n" +
              "3. Never answer the question — just generate the title.\n" +
              "4. Respond with ONLY the title, nothing else.\n",
          },
          {
            role: "user",
            content: `Generate a title for this conversation:\n\n${body.preview}\n\nTitle:`,
          },
        ],
        stream: false,
        max_tokens: 30,
        temperature: 0.3,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Title gen API error:", res.status, errText);
      return new Response(JSON.stringify({ title: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const rawTitle =
      data?.choices?.[0]?.message?.content || data?.content || "";
    const title = rawTitle
      .replace(/^["']|["']$/g, "")
      .trim()
      .slice(0, 60);

    if (title && title.length > 3) {
      return new Response(JSON.stringify({ title }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ title: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Title gen error:", err);
    return new Response(JSON.stringify({ title: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
