// Admin endpoint — list pending payments and approve/reject them
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const GOOGLE_CLIENT_ID = "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "xmanya26911@gmail.com";

function getBlobStoreId(): string | null {
  if (!BLOB_TOKEN) return null;
  const parts = BLOB_TOKEN.split("_");
  return parts.length >= 4 ? parts[3] : null;
}

async function verifyToken(token: string): Promise<{ sub: string; email?: string } | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(token)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.aud !== GOOGLE_CLIENT_ID) return null;
    return { sub: data.sub, email: data.email || data.sub };
  } catch { return null; }
}

async function blobGet(key: string): Promise<any | null> {
  const storeId = getBlobStoreId();
  if (!storeId) return null;
  try {
    const res = await fetch(`https://api.vercel.com/v1/blob/stores/${storeId}/blobs/${key}`, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function blobPut(key: string, data: any): Promise<boolean> {
  const storeId = getBlobStoreId();
  if (!storeId) return false;
  try {
    const res = await fetch(`https://api.vercel.com/v1/blob/stores/${storeId}/blobs/${key}?access=private`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${BLOB_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch { return false; }
}

async function blobDelete(key: string): Promise<boolean> {
  const storeId = getBlobStoreId();
  if (!storeId) return false;
  try {
    const res = await fetch(`https://api.vercel.com/v1/blob/stores/${storeId}/blobs/${key}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 404;
  } catch { return false; }
}

// List all blobs in the store to find payment records
async function listBlobs(prefix: string): Promise<string[]> {
  const storeId = getBlobStoreId();
  if (!storeId) return [];
  try {
    const res = await fetch(`https://api.vercel.com/v1/blob/stores/${storeId}/blobs?prefix=${prefix}`, {
      headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.blobs || []).map((b: any) => b.pathname || b.key).filter(Boolean);
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const user = await verifyToken(authHeader);
  if (!user || user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  // List all payment blobs
  const blobKeys = await listBlobs("users/");
  const paymentKeys = blobKeys.filter((k) => k.includes("payment_"));

  const payments: any[] = [];
  for (const key of paymentKeys) {
    const data = await blobGet(key.replace(/.*\/blobs\//, ""));
    if (data && data.status) payments.push(data);
  }

  // Sort newest first
  payments.sort((a, b) => b.createdAt - a.createdAt);

  return new Response(JSON.stringify({ payments }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const user = await verifyToken(authHeader);
  if (!user || user.email !== ADMIN_EMAIL) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const { action, paymentId, userSub } = body;

  if (!paymentId || !userSub || !["approve", "reject"].includes(action)) {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const key = `users/${userSub}/payment_${paymentId}.json`;
  const payment = await blobGet(key);
  if (!payment) {
    return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
  }

  if (action === "approve") {
    payment.status = "approved";
    payment.updatedAt = Date.now();
    payment.approvedBy = user.email;
    payment.approvedAt = Date.now();
    await blobPut(key, payment);

    // Upgrade the user's subscription tier
    const userKey = `users/${userSub}.json`;
    const subData = await blobGet(userKey) || { usageToday: 0, usageDate: "0000-00-00" };
    subData.tier = payment.tier;
    subData.subscribedSince = subData.subscribedSince || Date.now();
    subData.updatedAt = Date.now();
    await blobPut(userKey, subData);
  } else {
    payment.status = "rejected";
    payment.updatedAt = Date.now();
    payment.approvedBy = user.email;
    await blobPut(key, payment);
  }

  return new Response(JSON.stringify({ success: true, status: payment.status }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
