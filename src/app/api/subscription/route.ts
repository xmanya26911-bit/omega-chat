// API route for user subscription management — GET current user tier
// Uses Vercel Blob for storage (1GB free, no external service)

const BLOB_API = "https://api.vercel.com/v1/blob/stores/store_McMfozoKKfiKsUcU/blobs";
const CORS = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

function getHeaders() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// ── Tier config ────────────────────────────────────────────
const TIERS = { free: { dailyLimit: 100 }, pro: { dailyLimit: 500 }, max: { dailyLimit: 99999 } };

function canAccessModel(tier = "free", modelId) {
  if (/-free$/.test(modelId) || modelId === "big-pickle") return true;
  if (!/^(groq|google|mistral|openrouter|cerebras)\//.test(modelId)) return tier !== "free";
  return tier === "pro" || tier === "max";
}

// ── Blob helpers ───────────────────────────────────────────
async function readUser(sub) {
  const headers = getHeaders();
  if (!headers) return null;
  const res = await fetch(`${BLOB_API}/users/${sub}.json`, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function writeUser(sub, data) {
  const headers = getHeaders();
  if (!headers) return false;
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const res = await fetch(`${BLOB_API}/users/${sub}.json?access=private`, {
    method: "PUT", headers, body: blob,
  });
  return res.ok;
}

export default async function handler(req) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // Auth check
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
  const token = auth.slice(7);

  // Verify Google token
  let userInfo;
  try {
    const r = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`);
    if (!r.ok) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: CORS });
    userInfo = await r.json();
  } catch {
    return new Response(JSON.stringify({ error: "Auth failed" }), { status: 401, headers: CORS });
  }
  const sub = userInfo.sub;
  const email = userInfo.email || sub;

  if (req.method === "GET") {
    const existing = await readUser(sub);
    if (existing) {
      return new Response(JSON.stringify({
        tier: existing.tier || "free",
        usageToday: existing.usageToday || 0,
        dailyLimit: TIERS[existing.tier]?.dailyLimit || 100,
        email: existing.email || email,
      }), { status: 200, headers: CORS });
    }
    // Create new user
    const newUser = { sub, email, tier: "free", usageToday: 0, usageDate: new Date().toISOString().slice(0, 10), createdAt: Date.now() };
    await writeUser(sub, newUser);
    return new Response(JSON.stringify({ tier: "free", usageToday: 0, dailyLimit: 100, email }), { status: 200, headers: CORS });
  }

  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    const action = body.action;
    if (action === "subscribe") {
      const tier = body.tier;
      if (!["free", "pro", "max"].includes(tier)) return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: CORS });
      const existing = await readUser(sub) || { sub, email, tier: "free", usageToday: 0 };
      await writeUser(sub, { ...existing, tier, subscribedSince: tier !== "free" ? (existing.subscribedSince || Date.now()) : null });
      return new Response(JSON.stringify({ success: true, tier, dailyLimit: TIERS[tier].dailyLimit }), { status: 200, headers: CORS });
    }
    if (action === "check-access") {
      const modelId = body.model || "";
      const existing = await readUser(sub);
      const tier = existing?.tier || "free";
      const dailyLimit = TIERS[tier].dailyLimit;
      if (!canAccessModel(tier, modelId)) {
        return new Response(JSON.stringify({ allowed: false, reason: `Requires ${tier === "free" ? "Pro or Max" : "Max"} subscription`, tier }), { status: 200, headers: CORS });
      }
      // Check daily limit
      const today = new Date().toISOString().slice(0, 10);
      const usageToday = existing?.usageDate === today ? (existing?.usageToday || 0) : 0;
      if (usageToday >= dailyLimit) {
        return new Response(JSON.stringify({ allowed: false, reason: "Daily limit reached", usageToday, dailyLimit }), { status: 200, headers: CORS });
      }
      // Increment
      await writeUser(sub, { ...existing, usageToday: usageToday + 1, usageDate: today });
      return new Response(JSON.stringify({ allowed: true, tier, usageToday: usageToday + 1, dailyLimit }), { status: 200, headers: CORS });
    }
    return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: CORS });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });
}
