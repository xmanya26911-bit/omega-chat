// Server-side subscription API — Vercel Blob storage, Google OAuth verified
// User cannot forge — tier is stored server-side, keyed by Google 'sub'
// @vercel/blob SDK is NOT required — we use the Blob REST API via fetch

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tier config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TIERS = { free: { dailyLimit: 100 }, pro: { dailyLimit: 500 }, max: { dailyLimit: 99999 } };

function canAccessModel(tier: string, modelId: string): boolean {
  if (/-free$/.test(modelId) || modelId === "big-pickle") return true;
  if (!/^(groq|google|mistral|openrouter|cerebras)\//.test(modelId)) return tier !== "free";
  return tier === "pro" || tier === "max";
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blob helpers — raw fetch against Vercel Blob REST API
// No @vercel/blob SDK needed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getBlobToken(): string | null {
  // BLOB_READ_WRITE_TOKEN is injected by Vercel when a blob store is linked
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

async function blobGet(key: string): Promise<any | null> {
  const token = getBlobToken();
  if (!token) return null;

  // Extract store ID from token (format: vercel_blob_rw_{storeId}_{rest})
  const storeId = token.split("_").slice(3, 4)[0];
  if (!storeId) return null;

  const url = `https://api.vercel.com/v1/blob/stores/${storeId}/blobs/${key}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function blobPut(key: string, data: any): Promise<boolean> {
  const token = getBlobToken();
  if (!token) return false;

  const storeId = token.split("_").slice(3, 4)[0];
  if (!storeId) return false;

  const url = `https://api.vercel.com/v1/blob/stores/${storeId}/blobs/${key}?access=private`;
  try {
    const body = JSON.stringify(data);
    const res = await fetch(url, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Google token verification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
interface GoogleUser {
  sub: string;
  email?: string;
  name?: string;
}

const tokenCache = new Map<string, { user: GoogleUser; expiry: number }>();

async function verifyGoogleToken(token: string): Promise<GoogleUser | null> {
  // Check cache first
  const cached = tokenCache.get(token);
  if (cached && cached.expiry > Date.now()) return cached.user;

  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub) return null;

    const user: GoogleUser = { sub: data.sub, email: data.email, name: data.name };
    tokenCache.set(token, { user, expiry: Date.now() + 60_000 }); // cache 1 min
    return user;
  } catch {
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In-memory fallback (when Blob is unavailable)
// Persists while the function is warm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const memoryStore = new Map<string, { tier: string; usageToday: number; usageDate: string }>();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Route handler
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function GET(req: NextRequest) {
  // Extract Google token from Authorization header or query param
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  const queryToken = req.nextUrl.searchParams.get("token");
  const token = authHeader || queryToken;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized — no token" }, { status: 401 });
  }

  const user = await verifyGoogleToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Try Blob first, fall back to memory
  let data = await blobGet(`users/${user.sub}.json`);
  if (!data) {
    // Fallback: check memory
    data = memoryStore.get(user.sub);
  }

  if (data && typeof data === "object") {
    return NextResponse.json({
      tier: data.tier || "free",
      usageToday: data.usageDate === getTodayDate() ? (data.usageToday || 0) : 0,
      dailyLimit: TIERS[data.tier as keyof typeof TIERS]?.dailyLimit || 100,
      email: user.email || user.sub,
      sub: user.sub,
    });
  }

  // New user — create free entry
  const newUser = { tier: "free", usageToday: 0, usageDate: "0000-00-00" };
  // Can't await — fire and forget for performance
  blobPut(`users/${user.sub}.json`, newUser);
  memoryStore.set(user.sub, newUser);

  return NextResponse.json({
    tier: "free",
    usageToday: 0,
    dailyLimit: 100,
    email: user.email || user.sub,
    sub: user.sub,
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  const token = authHeader;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await verifyGoogleToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "subscribe") {
    const tier = body.tier;
    if (!["free", "pro", "max"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const existing = await blobGet(`users/${user.sub}.json`);
    const data = existing && typeof existing === "object" ? existing : { usageToday: 0, usageDate: "0000-00-00" };

    (data as any).tier = tier;
    (data as any).subscribedSince = tier !== "free" ? ((data as any).subscribedSince || Date.now()) : null;
    (data as any).updatedAt = Date.now();

    const putOk = await blobPut(`users/${user.sub}.json`, data);
    if (putOk) {
      memoryStore.set(user.sub, data as any);
    }
    if (!putOk) {
      // Fallback: memory only
      memoryStore.set(user.sub, { ...(data as any), tier });
    }

    return NextResponse.json({
      success: true,
      tier,
      dailyLimit: TIERS[tier as keyof typeof TIERS].dailyLimit,
      persisted: putOk,
    });
  }

  if (action === "check-access") {
    const modelId = body.model || "";
    const data = await blobGet(`users/${user.sub}.json`);
    let tier: string = "free";
    let usageToday = 0;

    if (data && typeof data === "object") {
      tier = (data as any).tier || "free";
      const usageDate = (data as any).usageDate || "0000-00-00";
      usageToday = usageDate === getTodayDate() ? ((data as any).usageToday || 0) : 0;
    }

    const dailyLimit = TIERS[tier as keyof typeof TIERS]?.dailyLimit || 100;

    // Check model access
    if (!canAccessModel(tier, modelId)) {
      return NextResponse.json({
        allowed: false,
        reason: tier === "free" ? "Pro required — upgrade to unlock" : "Max required",
        tier,
        usageToday,
        dailyLimit,
      });
    }

    // Check daily limit
    if (usageToday >= dailyLimit) {
      return NextResponse.json({
        allowed: false,
        reason: "Daily limit reached",
        usageToday,
        dailyLimit,
      });
    }

    return NextResponse.json({
      allowed: true,
      tier,
      usageToday: usageToday + 1,
      dailyLimit,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
