"use client";

import * as React from "react";
import { Crown, Sparkles, Check, X, Copy, Loader2 } from "lucide-react";
import { useSubscriptionStore, type Tier } from "../store/subscription-store";
import { cn } from "@/lib/utils";

const PLANS: { id: Tier; name: string; desc: string; limit: string; features: string[]; icon: React.ReactNode }[] = [
  { id: "pro", name: "Pro", desc: "5 AI models + higher limits", limit: "5hr rate limit",
    features: ["All Free models", "Faster response priority", "Priority support"],
    icon: <Crown className="size-5" /> },
  { id: "max", name: "Max", desc: "Everything unlimited", limit: "Unlimited",
    features: ["All models", "No rate limit", "Priority support", "Early access"],
    icon: <Sparkles className="size-5" /> },
  { id: "free", name: "Free", desc: "5 AI models", limit: "3hr rate limit",
    features: ["DeepSeek V4 Flash", "MiMo-V2.5", "Nemotron 3 Ultra", "North Mini Code", "Big Pickle"],
    icon: <Check className="size-5" /> },
];

const UPI_ID = "9974526911@pt";
const PLAN_PRICES: Record<string, { label: string; inr: number }> = {
  pro: { label: "Pro", inr: 849 },
  max: { label: "Max", inr: 1699 },
};

export function SubscriptionDialog() {
  const { tier, dialogOpen, setDialogOpen } = useSubscriptionStore();
  const [payTier, setPayTier] = React.useState<"pro" | "max" | null>(null);
  const [utrRef, setUtrRef] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [step, setStep] = React.useState<"show" | "verify" | "submitted" | "error">("show");

  if (!dialogOpen) return null;

  const price = payTier ? PLAN_PRICES[payTier] : null;

  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent("Omega Cloud")}&am=${price?.inr || 0}&cu=INR`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(upiLink)}`;

  const copyUpi = async () => {
    try { await navigator.clipboard.writeText(UPI_ID); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const submitPayment = async () => {
    if (!utrRef.trim() || utrRef.trim().length < 6 || !payTier) return;
    setSubmitting(true);
    try {
      const { getAccessToken } = await import("@/lib/access-token");
      const token = getAccessToken();
      const res = await fetch("/api/payment/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tier: payTier, utr: utrRef.trim(), amount: price?.inr }),
      });
      setStep(res.ok ? "submitted" : "error");
    } catch { setStep("error"); }
    finally { setSubmitting(false); }
  };

  const reset = () => { setPayTier(null); setStep("show"); setUtrRef(""); setSubmitting(false); setCopied(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) { if (payTier) reset(); else setDialogOpen(false); } }}>
      <div className="relative mx-auto w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
        style={{ background: "oklch(0.2 0.03 260 / 0.95)", borderColor: "oklch(0.5 0.04 260 / 0.3)" }}>
        
        <button type="button" onClick={() => { if (payTier) reset(); else setDialogOpen(false); }}
          className="absolute right-4 top-4 rounded-lg p-1 text-[var(--omega-fg-dim)] transition-colors hover:text-[var(--omega-fg)]">
          <X className="size-4" />
        </button>

        {/* ─── PAYMENT VIEW ─── */}
        {payTier ? (
          /* If submitted */
          step === "submitted" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-3 flex size-14 items-center justify-center rounded-full bg-[var(--omega-emerald)]/20">
                <Check className="size-7 text-[var(--omega-emerald)]" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-[var(--omega-fg)]">Payment Submitted!</h3>
              <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">Admin will verify within 24h.</p>
              <p className="mt-3 text-[10px] text-[var(--omega-muted)]">UTR: <span className="font-mono">{utrRef.trim()}</span></p>
              <button type="button" onClick={() => reset()}
                className="mt-4 rounded-lg px-4 py-2 text-xs font-medium" style={{ background: "var(--omega-emerald)", color: "#000" }}>
                Done
              </button>
            </div>
          ) : step === "error" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <h3 className="text-lg font-semibold text-[var(--omega-rose)]">Submission Failed</h3>
              <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">Please try again.</p>
              <button type="button" onClick={() => setStep("verify")}
                className="mt-4 rounded-lg px-4 py-2 text-xs font-medium" style={{ background: "var(--omega-emerald)", color: "#000" }}>
                Try Again
              </button>
            </div>
          ) : step === "verify" ? (
            <div className="py-2">
              <h3 className="text-center text-lg font-semibold text-[var(--omega-fg)]">Enter UPI Reference</h3>
              <p className="mt-1 text-center text-xs text-[var(--omega-fg-dim)]">Enter the UPI transaction reference (UTR) after paying</p>
              <div className="mt-4 rounded-xl border p-3 text-center" style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "oklch(0.5 0.02 260 / 0.08)" }}>
                <div className="text-xs text-[var(--omega-fg-dim)]">Pay to</div>
                <div className="mt-0.5 flex items-center justify-center gap-2">
                  <span className="font-mono text-sm font-semibold text-[var(--omega-fg)]">{UPI_ID}</span>
                  <button type="button" onClick={copyUpi} className="rounded p-0.5 hover:bg-[oklch(0.82_0.17_162_/_0.15)] transition">
                    {copied ? <Check className="size-3.5 text-[var(--omega-emerald)]" /> : <Copy className="size-3.5 text-[var(--omega-fg-dim)]" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-[var(--omega-muted)]">
                  <span>Amount: <strong className="text-[var(--omega-fg)]">₹{price?.inr}</strong></span>
                  <span>Plan: <strong className="text-[var(--omega-fg)]">{price?.label}</strong></span>
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-medium text-[var(--omega-fg-dim)] mb-1">UTR Number</label>
                <input value={utrRef} onChange={(e) => setUtrRef(e.target.value)}
                  placeholder="e.g. 452138765432"
                  className="w-full rounded-xl border px-3 py-2.5 text-xs font-mono text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--omega-emerald)]/50"
                  style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "oklch(0.5 0.02 260 / 0.08)" }} />
                <p className="mt-1 text-[9px] text-[var(--omega-muted)]">12-digit number from your UPI app payment confirmation</p>
              </div>
              <button type="button" onClick={submitPayment} disabled={utrRef.trim().length < 6 || submitting}
                className="mt-4 w-full rounded-xl bg-[var(--omega-emerald)] px-4 py-3 text-xs font-semibold text-black transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed">
                {submitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="size-3.5 animate-spin" /> Verifying…</span> : "I've Paid — Verify"}
              </button>
            </div>
          ) : (
            /* QR step */
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-[var(--omega-fg)]">Subscribe to {price?.label}</h3>
              <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">Scan & pay via any UPI app</p>
              <div className="mt-4 rounded-xl border p-2" style={{ borderColor: "oklch(0.5 0.04 260 / 0.3)", background: "#fff" }}>
                <img src={qrUrl} alt={`UPI QR for ₹${price?.inr}`} className="size-[200px] rounded-lg" />
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2" style={{ background: "oklch(0.5 0.02 260 / 0.1)" }}>
                <span className="text-xs text-[var(--omega-fg-dim)]">UPI ID:</span>
                <span className="font-mono text-sm font-semibold text-[var(--omega-fg)]">{UPI_ID}</span>
                <button type="button" onClick={copyUpi} className="rounded p-0.5 hover:bg-[oklch(0.82_0.17_162_/_0.15)] transition">
                  {copied ? <Check className="size-3.5 text-[var(--omega-emerald)]" /> : <Copy className="size-3.5 text-[var(--omega-fg-dim)]" />}
                </button>
              </div>
              <div className="mt-2 text-[10px] text-[var(--omega-muted)]">Amount: <strong className="text-[var(--omega-fg)]">₹{price?.inr}</strong></div>
              <button type="button" onClick={() => setStep("verify")}
                className="mt-4 w-full rounded-xl bg-[var(--omega-emerald)] px-4 py-3 text-xs font-semibold text-black hover:brightness-110">I've Paid — Enter UPI Ref</button>
              <p className="mt-2 text-[9px] text-[var(--omega-muted)] text-center">Account upgraded after admin verification.</p>
            </div>
          )
        ) : (
          /* ─── PLAN SELECTION VIEW ─── */
          <>
            <div className="mb-6 text-center">
              <h2 className="text-xl font-semibold text-[var(--omega-fg)]">Choose Your Plan</h2>
              <p className="mt-1 text-sm text-[var(--omega-fg-dim)]">Pick what fits</p>
            </div>
            <div className="grid gap-3">
              {PLANS.map((plan) => {
                const active = plan.id === tier;
                return (
                  <button type="button" key={plan.id}
                    onClick={() => {
                      if (plan.id === "free" || plan.id === tier) return;
                      // Open UPI in new tab directly — simplest possible flow
                      const p = plan.id === "pro" ? "849" : "1699";
                      const upi = `upi://pay?pa=9974526911@pt&pn=Omega%20Cloud&am=${p}&cu=INR`;
                      window.open(upi, "_blank");
                      // Show the UPI ID + UTR form inline
                      setPayTier(plan.id as "pro" | "max");
                      setStep("verify");
                    }}
                    className={cn(
                      "group relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300",
                      active ? "border-[var(--omega-emerald)] bg-[oklch(0.82_0.17_162_/_0.08)]" : "border-transparent bg-[oklch(0.5_0.02_260_/_0.1)] hover:bg-[oklch(0.5_0.02_260_/_0.18)]"
                    )}>
                    <div className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
                      active ? "bg-[var(--omega-emerald)] text-black" : "bg-[oklch(0.5_0.02_260_/_0.2)] text-[var(--omega-fg-dim)]")}>
                      {plan.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-[var(--omega-fg)]">{plan.name}</span>
                        <span className="font-mono text-xs text-[var(--omega-emerald)]">{plan.limit}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--omega-fg-dim)]">{plan.desc}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {plan.features.map((f) => (
                          <span key={f} className="rounded-md px-1.5 py-0.5 font-mono text-[9px]" style={{ color: "var(--omega-fg-dim)", background: "oklch(0.5 0.02 0 / 0.15)" }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    {active && <Check className="absolute right-3 top-3 size-4 text-[var(--omega-emerald)]" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-center text-[10px] text-[var(--omega-fg-dim)]">Pro & Max require payment verification</p>
          </>
        )}
      </div>
    </div>
  );
}
