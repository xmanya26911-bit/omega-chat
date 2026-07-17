// Submit a UPI payment proof for manual verification
import { NextRequest } from "next/server";

export const runtime = "nodejs";

const GOOGLE_CLIENT_ID = "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || "";

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

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const user = await verifyToken(authHeader);
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  const body = await req.json().catch(() => ({}));
  const { tier, utr, amount } = body;

  if (!["pro", "max"].includes(tier)) {
    return new Response(JSON.stringify({ error: "Invalid tier" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!utr || utr.length < 6) {
    return new Response(JSON.stringify({ error: "Invalid UTR" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Store payment request
  const payment = {
    id: `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userSub: user.sub,
    email: user.email || user.sub,
    tier,
    amount: amount || (tier === "pro" ? 849 : 1699),
    utr,
    status: "pending", // pending | approved | rejected
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await blobPut(`users/${user.sub}/payment_${payment.id}.json`, payment);

  return new Response(JSON.stringify({ success: true, id: payment.id }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
