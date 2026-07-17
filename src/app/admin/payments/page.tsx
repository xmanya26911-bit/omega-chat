"use client";
// Force dynamic rendering for auth
export const dynamic = 'force-dynamic';

import * as React from "react";
import { Check, X, RefreshCw, Crown, Sparkles } from "lucide-react";
import { getAccessToken } from "@/lib/access-token";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "approved" | "rejected";

interface Payment {
  id: string;
  userSub: string;
  email: string;
  tier: string;
  amount: number;
  utr: string;
  status: PaymentStatus;
  createdAt: number;
  updatedAt: number;
  approvedBy?: string;
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      if (!token) { setError("Not signed in"); setLoading(false); return; }
      const res = await fetch("/api/payment/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403) { setError("Access denied — admin only"); setLoading(false); return; }
      if (!res.ok) { setError(`Error ${res.status}`); setLoading(false); return; }
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (e) {
      setError("Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "approve" | "reject", payment: Payment) => {
    setProcessing(payment.id);
    try {
      const token = getAccessToken();
      const res = await fetch("/api/payment/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, paymentId: payment.id, userSub: payment.userSub }),
      });
      if (res.ok) {
        await fetchPayments();
      }
    } catch {} finally {
      setProcessing(null);
    }
  };

  React.useEffect(() => {
    const token = getAccessToken();
    if (token) fetchPayments();
    else setLoading(false);
  }, []);

  const pending = payments.filter((p) => p.status === "pending");
  const done = payments.filter((p) => p.status !== "pending");

  return (
    <div className="min-h-screen p-6" style={{ background: "oklch(0.15 0.02 260)", color: "oklch(0.9 0.01 260)" }}>
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold">Payment Admin</h1>
            <p className="text-xs opacity-60 mt-0.5">Verify UPI payments and upgrade users</p>
          </div>
          <button
            onClick={fetchPayments}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition"
            style={{ background: "oklch(0.82 0.17 162 / 0.15)", color: "oklch(0.82 0.17 162)" }}
          >
            <RefreshCw className={cn("size-3", loading && "animate-spin")} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border p-3 text-xs" style={{ borderColor: "oklch(0.7 0.21 14 / 0.3)", background: "oklch(0.7 0.21 14 / 0.1)" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="size-6 animate-spin opacity-40" />
          </div>
        ) : (
          <>
            {/* Pending Payments */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                Pending Verification
                {pending.length > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: "oklch(0.6 0.15 50 / 0.3)", color: "oklch(0.8 0.15 50)" }}>
                    {pending.length}
                  </span>
                )}
              </h2>
              {pending.length === 0 ? (
                <div className="rounded-xl border py-10 text-center text-xs opacity-40" style={{ borderColor: "oklch(0.5 0.02 260 / 0.3)" }}>
                  No pending payments
                </div>
              ) : (
                <div className="space-y-2">
                  {pending.map((p) => (
                    <PaymentCard key={p.id} payment={p} processing={processing} onAction={handleAction} />
                  ))}
                </div>
              )}
            </div>

            {/* History */}
            {done.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3">History ({done.length})</h2>
                <div className="space-y-1.5">
                  {done.map((p) => (
                    <PaymentCard key={p.id} payment={p} processing={processing} onAction={handleAction} compact />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PaymentCard({
  payment,
  processing,
  onAction,
  compact,
}: {
  payment: Payment;
  processing: string | null;
  onAction: (action: "approve" | "reject", payment: Payment) => void;
  compact?: boolean;
}) {
  const tierIcon = payment.tier === "max" ? <Sparkles className="size-3.5" /> : <Crown className="size-3.5" />;

  return (
    <div
      className={cn(
        "rounded-xl border p-3 transition-all",
        payment.status === "pending" && "border-[oklch(0.6_0.15_50_/_0.3)] bg-[oklch(0.6_0.15_50_/_0.05)]",
        payment.status === "approved" && "border-[oklch(0.82_0.17_162_/_0.2)] bg-[oklch(0.82_0.17_162_/_0.05)] opacity-70",
        payment.status === "rejected" && "border-[oklch(0.7_0.21_14_/_0.2)] bg-[oklch(0.7_0.21_14_/_0.05)] opacity-60",
      )}
    >
      <div className={cn("flex items-start gap-3", compact && "gap-2")}>
        <div className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs",
          payment.tier === "max" ? "bg-[oklch(0.6_0.15_280_/_0.2)]" : "bg-[oklch(0.82_0.17_162_/_0.15)]",
        )}>
          {tierIcon}
        </div>

        <div className="flex-1 min-w-0">
          <div className={cn("flex items-center gap-2", compact && "gap-1.5")}>
            <span className="font-mono text-xs font-medium">{payment.email}</span>
            <span className={cn(
              "rounded-full px-1.5 py-[1px] text-[9px] font-semibold uppercase",
              payment.status === "pending" && "bg-[oklch(0.6_0.15_50_/_0.2)] text-[oklch(0.8_0.15_50)]",
              payment.status === "approved" && "bg-[oklch(0.82_0.17_162_/_0.2)] text-[oklch(0.82_0.17_162)]",
              payment.status === "rejected" && "bg-[oklch(0.7_0.21_14_/_0.2)] text-[oklch(0.7_0.21_14)]",
            )}>
              {payment.status}
            </span>
          </div>
          {!compact && (
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] opacity-60">
              <span>UTR: <span className="font-mono">{payment.utr}</span></span>
              <span>₹{payment.amount}</span>
              <span className="capitalize">{payment.tier}</span>
              <span>{relativeTime(payment.createdAt)}</span>
            </div>
          )}
          {compact && (
            <div className="flex gap-3 text-[9px] opacity-50 mt-0.5">
              <span>UTR: {payment.utr}</span>
              <span>₹{payment.amount}</span>
              <span>{relativeTime(payment.createdAt)}</span>
            </div>
          )}
        </div>

        {payment.status === "pending" && (
          <div className="flex gap-1.5 shrink-0">
            <button
              disabled={processing === payment.id}
              onClick={() => onAction("approve", payment)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition hover:brightness-110 disabled:opacity-40"
              style={{ background: "oklch(0.82 0.17 162 / 0.2)", color: "oklch(0.82 0.17 162)" }}
            >
              {processing === payment.id ? "…" : <><Check className="size-3" /> Approve</>}
            </button>
            <button
              disabled={processing === payment.id}
              onClick={() => onAction("reject", payment)}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition hover:brightness-110 disabled:opacity-40"
              style={{ background: "oklch(0.7 0.21 14 / 0.2)", color: "oklch(0.7 0.21 14)" }}
            >
              {processing === payment.id ? "…" : <><X className="size-3" /> Reject</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
