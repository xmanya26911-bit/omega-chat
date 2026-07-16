// Omega Cloud — Web Search endpoint
// Multi-source: DuckDuckGo Instant Answer + Wikipedia. Auth-required.

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

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
}

export async function POST(request: NextRequest) {
  const ok = await verifyToken(request.headers.get("Authorization"));
  if (!ok) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let query = "";
  try {
    const b = await request.json();
    query = b.query;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!query || typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  const q = query.trim();
  const results: SearchResult[] = [];

  // DuckDuckGo Instant Answer
  try {
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`,
      { headers: { "User-Agent": "Mozilla/5.0 OmegaCloud/1.0" } }
    );
    if (ddgRes.ok) {
      const d = await ddgRes.json();
      if (d.AbstractText) {
        results.push({
          title: d.Heading || "Summary",
          snippet: d.AbstractText,
          url: d.AbstractURL || "",
          source: "DuckDuckGo",
        });
      }
      for (const topic of d.RelatedTopics || []) {
        if (topic.Text && results.length < 6) {
          results.push({
            title: topic.Text.split(" - ")[0] || "Related",
            snippet: topic.Text,
            url: topic.FirstURL || "",
            source: "DuckDuckGo",
          });
        }
        if (topic.Topics) {
          for (const sub of topic.Topics) {
            if (sub.Text && results.length < 6) {
              results.push({
                title: sub.Text.split(" - ")[0] || "Related",
                snippet: sub.Text,
                url: sub.FirstURL || "",
                source: "DuckDuckGo",
              });
            }
          }
        }
      }
    }
  } catch {
    /* ignore */
  }

  // Wikipedia summary
  if (results.length < 3) {
    try {
      const wikiQ = q.replace(/^(what is|who is|the|a|an) /i, "").trim();
      const wikiRes = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiQ)}`,
        { headers: { "User-Agent": "OmegaCloud/1.0" } }
      );
      if (wikiRes.ok) {
        const w = await wikiRes.json();
        if (w.extract && w.extract.length > 50) {
          results.push({
            title: w.title || wikiQ,
            snippet: w.extract.slice(0, 600),
            url:
              w.content_urls?.desktop?.page ||
              `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiQ)}`,
            source: "Wikipedia",
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  // Wikipedia opensearch fallback
  if (results.length < 2) {
    try {
      const sRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`,
        { headers: { "User-Agent": "OmegaCloud/1.0" } }
      );
      if (sRes.ok) {
        const [, titles, snippets, urls] = await sRes.json();
        if (titles) {
          for (let i = 0; i < titles.length && results.length < 4; i++) {
            results.push({
              title: titles[i],
              snippet: snippets[i] || "",
              url: urls[i] || "",
              source: "Wikipedia",
            });
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json(
    { results, query: q, total: results.length },
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
