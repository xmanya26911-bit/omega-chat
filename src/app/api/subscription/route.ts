// Server-side subscription API — Vercel Blob storage, Google OAuth verified
// User cannot forge — tier is stored server-side, keyed by Google 'sub'
// @vercel/blob SDK is NOT required — we use the Blob REST API via fetch
//
// Rate limiting is time-window based:
//   free: 30 messages per 3-hour window
//   pro:  100 messages per 5-hour window
//   max:  unlimited (no tracking)
// All 5 models are available to all tiers — no model gating, only rate gating.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Tier config — time-window rate limiting
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const TIERS = {
  free: { windowMs: 3 * 60 * 60 * 1000, maxMessages: 30 },
  pro: { windowMs: 5 * 60 * 60 * 1000, maxMessages: 100 },
  max: { windowMs: 0, maxMessages: 0 }, // 0 = unlimited
} as const;

type TierName = keyof typeof TIERS;

function getTierConfig(tier: string): { windowMs: number; maxMessages: number } {
  if (tier === "pro" || tier === "max") return TIERS[tier];
  return TIERS.free;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Blob helpers — raw fetch against Vercel Blob REST API
// No @vercel/blob SDK needed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getBlobToken(): string | null {
  // BLOB_READ_WRITE_TOKEN is injected by Vercel when a blob store is linked
  return process.env.BLOB_READ_WRITE_TOKEN || null;
}

function getStoreId(): string | null {
  const token = getBlobToken();
  if (!token) return null;
  // Extract store ID from token (format: vercel_blob_rw_{storeId}_{rest})
  const storeId = token.split("_").slice(3, 4)[0];
  return storeId || null;
}

export async function blobGet(key: string): Promise<any | null> {
  const token = getBlobToken();
  if (!token) return null;
  const storeId = getStoreId();
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

export async function blobPut(key: string, data: any): Promise<boolean> {
  const token = getBlobToken();
  if (!token) return false;
  const storeId = getStoreId();
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
export interface GoogleUser {
  sub: string;
  email?: string;
  name?: string;
}

const tokenCache = new Map<string, { user: GoogleUser; expiry: number }>();

export async function verifyGoogleToken(token: string): Promise<GoogleUser | null> {
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
// Time-window rate limit helper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// User data shape in Blob:
//   { tier: string, messageTimestamps: number[], ... }
//
// Returns the count of messages currently within the window (for tier with
// a finite window). For `max` tier, no tracking is needed.

export interface RateLimitResult {
  allowed: boolean;
  tier: string;
  messagesUsed: number;
  messagesLimit: number;
  windowHours: number;
  reason?: string;
  resetsInMinutes?: number;
}

export async function checkAndIncrementRateLimit(
  user: GoogleUser,
  existing: any | null
): Promise<RateLimitResult> {
  const now = Date.now();
  const tier: TierName =
    existing && (existing.tier === "pro" || existing.tier === "max" || existing.tier === "free")
      ? (existing.tier as TierName)
      : "free";
  const cfg = getTierConfig(tier);
  const windowHours = cfg.windowMs > 0 ? cfg.windowMs / 3600000 : 0;

  // max tier — unlimited, no tracking
  if (tier === "max" || cfg.maxMessages === 0 || cfg.windowMs === 0) {
    return {
      allowed: true,
      tier,
      messagesUsed: 0,
      messagesLimit: 0,
      windowHours: 0,
    };
  }

  // Filter timestamps to those within the current window
  const rawTs: number[] = Array.isArray(existing?.messageTimestamps)
    ? (existing.messageTimestamps as number[])
    : [];
  const inWindow = rawTs.filter((t) => typeof t === "number" && now - t < cfg.windowMs);

  if (inWindow.length >= cfg.maxMessages) {
    // Oldest in-window timestamp determines the reset time
    const oldest = inWindow.length > 0 ? Math.min(...inWindow) : now;
    const resetsInMs = oldest + cfg.windowMs - now;
    const resetsInMinutes = Math.max(1, Math.ceil(resetsInMs / 60000));
    return {
      allowed: false,
      tier,
      messagesUsed: inWindow.length,
      messagesLimit: cfg.maxMessages,
      windowHours,
      reason: `Rate limit: You've used ${inWindow.length} of ${cfg.maxMessages} messages. Your window resets in ${resetsInMinutes} minutes.`,
      resetsInMinutes,
    };
  }

  // Allowed — push current timestamp and save
  inWindow.push(now);
  // Cap stored timestamps to avoid unbounded growth (keep last 2x max)
  const capped = inWindow.slice(-Math.max(cfg.maxMessages * 2, 50));
  const updated = {
    ...(existing && typeof existing === "object" ? existing : {}),
    tier,
    messageTimestamps: capped,
  };
  await blobPut(`users/${user.sub}.json`, updated);

  return {
    allowed: true,
    tier,
    messagesUsed: inWindow.length, // includes the message just consumed
    messagesLimit: cfg.maxMessages,
    windowHours,
  };
}

// Count messages in the current window WITHOUT incrementing (for GET / status)
export function countMessagesInWindow(existing: any | null, tier: string): number {
  const cfg = getTierConfig(tier);
  if (cfg.maxMessages === 0 || cfg.windowMs === 0) return 0;
  const now = Date.now();
  const rawTs: number[] = Array.isArray(existing?.messageTimestamps)
    ? (existing.messageTimestamps as number[])
    : [];
  return rawTs.filter((t) => typeof t === "number" && now - t < cfg.windowMs).length;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// In-memory fallback (when Blob is unavailable)
// Persists while the function is warm
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const memoryStore = new Map<string, { tier: string; messageTimestamps: number[] }>();

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
    data = memoryStore.get(user.sub) || null;
  }

  if (data && typeof data === "object") {
    const tier: string = data.tier || "free";
    const cfg = getTierConfig(tier);
    const messagesUsed = countMessagesInWindow(data, tier);
    const windowHours = cfg.windowMs > 0 ? cfg.windowMs / 3600000 : 0;
    return NextResponse.json({
      tier,
      messagesUsed,
      messagesLimit: cfg.maxMessages,
      windowHours,
      email: user.email || user.sub,
      sub: user.sub,
    });
  }

  // New user — create free entry
  const newUser = { tier: "free", messageTimestamps: [] };
  // Can't await — fire and forget for performance
  blobPut(`users/${user.sub}.json`, newUser);
  memoryStore.set(user.sub, { tier: "free", messageTimestamps: [] });

  const cfg = getTierConfig("free");
  return NextResponse.json({
    tier: "free",
    messagesUsed: 0,
    messagesLimit: cfg.maxMessages,
    windowHours: cfg.windowMs / 3600000,
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
    const data =
      existing && typeof existing === "object"
        ? existing
        : { messageTimestamps: [] };

    (data as any).tier = tier;
    (data as any).subscribedSince =
      tier !== "free" ? (data as any).subscribedSince || Date.now() : null;
    (data as any).updatedAt = Date.now();
    if (!Array.isArray((data as any).messageTimestamps)) {
      (data as any).messageTimestamps = [];
    }

    const putOk = await blobPut(`users/${user.sub}.json`, data);
    if (putOk) {
      memoryStore.set(user.sub, data as any);
    } else {
      // Fallback: memory only
      memoryStore.set(user.sub, { ...(data as any), tier });
    }

    const cfg = getTierConfig(tier);
    return NextResponse.json({
      success: true,
      tier,
      messagesLimit: cfg.maxMessages,
      windowHours: cfg.windowMs > 0 ? cfg.windowMs / 3600000 : 0,
      persisted: putOk,
    });
  }

  if (action === "check-access") {
    const data = await blobGet(`users/${user.sub}.json`);
    const result = await checkAndIncrementRateLimit(user, data);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
