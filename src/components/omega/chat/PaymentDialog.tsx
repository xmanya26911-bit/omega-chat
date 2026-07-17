"use client";

import * as React from "react";
import { Check, X, Copy, Loader2 } from "lucide-react";

interface PaymentDialogProps {
  tier: "pro" | "max";
  open: boolean;
  onClose: () => void;
}

const PLAN_PRICES: Record<string, { label: string; usd: number; inr: number }> = {
  pro: { label: "Pro", usd: 10, inr: 849 },
  max: { label: "Max", usd: 20, inr: 1699 },
};

const UPI_ID = "9974526911@pt";
const UPI_NAME = "Omega Cloud";

export function PaymentDialog({ tier, open, onClose }: PaymentDialogProps) {
  const [step, setStep] = React.useState<"show" | "verify" | "submitted" | "error">("show");
  const [utrRef, setUtrRef] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      // Delay reset to avoid flash
      const t = setTimeout(() => { setStep("show"); setUtrRef(""); setSubmitting(false); setCopied(false); }, 200);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const price = PLAN_PRICES[tier];
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${price.inr}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiLink)}`;

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmit = async () => {
    if (!utrRef.trim() || utrRef.trim().length < 6) return;
    setSubmitting(true);
    try {
      const { getAccessToken } = await import("@/lib/access-token");
      const token = getAccessToken();
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier, utr: utrRef.trim(), amount: price.inr }),
      });
      setStep(res.ok ? "submitted" : "error");
    } catch {
      setStep("error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative mx-auto w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{ background: "oklch(0.2 0.03 260 / 0.95)", borderColor: "oklch(0.5 0.04 260 / 0.3)" }}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--omega-fg-dim)] transition-colors hover:text-[var(--omega-fg)]"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>

        {step === "submitted" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[var(--omega-emerald)]/20">
              <Check className="size-7 text-[var(--omega-emerald)]" strokeWidth={2.5} />
            </div>
            <h3 className="text-lg font-semibold text-[var(--omega-fg)]">Payment Submitted!</h3>
            <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">
              Admin will verify and activate <strong>{price.label}</strong> within 24h.
            </p>
            <p className="mt-3 text-[10px] text-[var(--omega-muted)]">
              UTR: <span className="font-mono">{utrRef.trim()}</span>
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg px-4 py-2 text-xs font-medium"
              style={{ background: "var(--omega-emerald)", color: "#000" }}
            >
              Done
            </button>
          </div>
        ) : step === "error" ? (
          <div className="flex flex-col items-center py-6 text-center">
            <h3 className="text-lg font-semibold text-[var(--omega-rose)]">Submission Failed</h3>
            <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">Please try again.</p>
            <button
              onClick={() => setStep("verify")}
              className="mt-4 rounded-lg px-4 py-2 text-xs font-medium"
              style={{ background: "var(--omega-emerald)", color: "#000" }}
            >
              Try Again
            </button>
          </div>
        ) : step === "verify" ? (
          <div className="py-2">
            <h3 className="text-center text-lg font-semibold text-[var(--omega-fg)]">Enter UPI Reference</h3>
            <p className="mt-1 text-center text-xs text-[var(--omega-fg-dim)]">
              After paying, enter the UPI transaction reference (UTR) number
            </p>
            <div className="mt-4 rounded-xl border p-3 text-center" style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "oklch(0.5 0.02 260 / 0.08)" }}>
              <div className="text-xs text-[var(--omega-fg-dim)]">Pay to</div>
              <div className="mt-0.5 flex items-center justify-center gap-2">
                <span className="font-mono text-sm font-semibold text-[var(--omega-fg)]">{UPI_ID}</span>
                <button onClick={handleCopyUpi} className="rounded p-0.5 hover:bg-[oklch(0.82_0.17_162_/_0.15)] transition" title="Copy UPI ID">
                  {copied ? <Check className="size-3.5 text-[var(--omega-emerald)]" /> : <Copy className="size-3.5 text-[var(--omega-fg-dim)]" />}
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[var(--omega-muted)]">
                <span>Amount: <strong className="text-[var(--omega-fg)]">₹{price.inr}</strong></span>
                <span>Plan: <strong className="text-[var(--omega-fg)]">{price.label}</strong></span>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-[var(--omega-fg-dim)] mb-1">UPI Transaction Reference (UTR)</label>
              <input
                value={utrRef}
                onChange={(e) => setUtrRef(e.target.value)}
                placeholder="e.g. 452138765432"
                className="w-full rounded-xl border px-3 py-2.5 text-xs font-mono text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--omega-emerald)]/50"
                style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "oklch(0.5 0.02 260 / 0.08)" }}
              />
              <p className="mt-1 text-[9px] text-[var(--omega-muted)]">UTR is a 12-digit number in your payment confirmation</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={utrRef.trim().length < 6 || submitting}
              className="mt-4 w-full rounded-xl bg-[var(--omega-emerald)] px-4 py-3 text-xs font-semibold text-black transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Verifying…
                </span>
              ) : (
                "I've Paid — Verify"
              )}
            </button>
          </div>
        ) : (
          /* show QR */
          <div className="flex flex-col items-center">
            <h3 className="text-lg font-semibold text-[var(--omega-fg)]">Subscribe to {price.label}</h3>
            <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">Scan & pay via any UPI app</p>
            <div className="mt-4 rounded-xl border p-2" style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "#fff" }}>
              <img
                src={qrUrl}
                alt={`UPI QR for ₹${price.inr}`}
                className="size-[200px] rounded-lg"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: "oklch(0.5 0.02 260 / 0.1)" }}>
              <span className="text-xs text-[var(--omega-fg-dim)]">UPI ID:</span>
              <span className="font-mono text-sm font-semibold text-[var(--omega-fg)]">{UPI_ID}</span>
              <button onClick={handleCopyUpi} className="rounded p-0.5 hover:bg-[oklch(0.82_0.17_162_/_0.15)] transition" title="Copy UPI ID">
                {copied ? <Check className="size-3.5 text-[var(--omega-emerald)]" /> : <Copy className="size-3.5 text-[var(--omega-fg-dim)]" />}
              </button>
            </div>
            <div className="mt-2 flex gap-4 text-[10px] text-[var(--omega-muted)]">
              <span>Amount: <strong className="text-[var(--omega-fg)]">₹{price.inr}</strong></span>
            </div>
            <button
              onClick={() => setStep("verify")}
              className="mt-4 w-full rounded-xl bg-[var(--omega-emerald)] px-4 py-3 text-xs font-semibold text-black transition-all hover:brightness-110"
            >
              I've Paid — Enter UPI Ref
            </button>
            <p className="mt-2 text-[9px] text-[var(--omega-muted)] text-center">
              Payment via UPI. Your account will be upgraded after admin verification.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
