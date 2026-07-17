"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Crown, Sparkles, Check, X } from "lucide-react";
import { useSubscriptionStore, type Tier } from "../store/subscription-store";
import { cn } from "@/lib/utils";
import { PaymentDialog } from "./PaymentDialog";

const PLANS: { id: Tier; name: string; desc: string; limit: string; features: string[]; icon: React.ReactNode }[] = [
  {
    id: "pro", name: "Pro",
    desc: "Unlock all proxy models",
    limit: "500 msg/day",
    features: ["All Free models", "Groq (Llama, Qwen)", "Google (Gemini, Gemma)", "Mistral (Large, Codestral)", "OpenRouter (DeepSeek, Kimi)"],
    icon: <Crown className="size-5" />,
  },
  {
    id: "max", name: "Max",
    desc: "Everything unlimited",
    limit: "Unlimited",
    features: ["All Pro models", "Unlimited usage", "Priority routing", "Early access"],
    icon: <Sparkles className="size-5" />,
  },
  {
    id: "free", name: "Free",
    desc: "5 OpenCode models",
    limit: "100 msg/day",
    features: ["DeepSeek V4 Flash Free", "MiMo-V2.5 Free", "Nemotron 3 Ultra Free", "North Mini Code Free", "Big Pickle (Free)"],
    icon: <Check className="size-5" />,
  },
];

export function SubscriptionDialog() {
  const { tier, dialogOpen, setDialogOpen } = useSubscriptionStore();
  const [payOpen, setPayOpen] = React.useState<"pro" | "max" | null>(null);

  if (!dialogOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div
          className="relative mx-auto w-full max-w-lg rounded-2xl border p-6 shadow-2xl"
          style={{ background: "oklch(0.2 0.03 260 / 0.95)", borderColor: "oklch(0.5 0.04 260 / 0.3)" }}
        >
          <button type="button" onClick={() => setDialogOpen(false)} className="absolute right-4 top-4 rounded-lg p-1 text-[var(--omega-fg-dim)] transition-colors hover:text-[var(--omega-fg)]">
            <X className="size-4" />
          </button>

          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-[var(--omega-fg)]">Choose Your Plan</h2>
            <p className="mt-1 text-sm text-[var(--omega-fg-dim)]">Pick what fits</p>
          </div>

          <div className="grid gap-3">
            {PLANS.map((plan) => {
              const active = plan.id === tier;
              return (
                <button type="button"
                  key={plan.id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (plan.id === "free" || plan.id === tier) return;
                    setPayOpen(plan.id as "pro" | "max");
                  }}
                  className={cn(
                    "group relative flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300",
                    active
                      ? "border-[var(--omega-emerald)] bg-[oklch(0.82_0.17_162_/_0.08)]"
                      : "border-transparent bg-[oklch(0.5_0.02_260_/_0.1)] hover:bg-[oklch(0.5_0.02_260_/_0.18)]"
                  )}
                >
                  <div className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
                    active ? "bg-[var(--omega-emerald)] text-black" : "bg-[oklch(0.5_0.02_260_/_0.2)] text-[var(--omega-fg-dim)]"
                  )}>
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

          <p className="mt-4 text-center text-[10px] text-[var(--omega-fg-dim)]">Pro & Max plans require payment verification</p>
        </div>
      </div>

      {/* Payment dialog portaled to body so no z-index/scroll issues */}
      {payOpen && typeof document !== "undefined" && createPortal(
        <PaymentDialog
          tier={payOpen}
          open={true}
          onClose={() => setPayOpen(null)}
        />,
        document.body
      )}
    </>
  );
}
