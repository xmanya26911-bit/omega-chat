// Subscription service — server-side storage via Vercel Blob
// User CANNOT forge their subscription — tier is stored server-side
// keyed by Google's immutable 'sub' (unique user ID)
"use client";

import { create } from "zustand";
import { getAccessToken } from "@/lib/access-token";

export type Tier = "free" | "pro" | "max";

interface SubscriptionState {
  tier: Tier;
  usageToday: number;
  dailyLimit: number;
  loading: boolean;
  dialogOpen: boolean;
  initialized: boolean;
  error: string | null;

  init: (accessToken: string) => Promise<void>;
  upgrade: (tier: Tier) => Promise<boolean>;
  checkAccess: (modelId: string) => Promise<{ allowed: boolean; reason?: string }>;
  setDialogOpen: (open: boolean) => void;
}

const TIER_LIMITS: Record<Tier, number> = { free: 100, pro: 500, max: 99999 };
const API = "/api/subscription";

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  usageToday: 0,
  dailyLimit: 100,
  loading: false,
  dialogOpen: false,
  initialized: false,
  error: null,

  init: async (accessToken) => {
    if (!accessToken) return;
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API}?token=${encodeURIComponent(accessToken)}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const data = await res.json();
      const tier = ["free", "pro", "max"].includes(data.tier) ? data.tier : "free";
      set({
        tier,
        usageToday: data.usageToday || 0,
        dailyLimit: data.dailyLimit || 100,
        initialized: true,
        loading: false,
      });
    } catch (err: any) {
      // On failure, default to free — no privileges leak
      set({
        tier: "free",
        dailyLimit: 100,
        initialized: true,
        loading: false,
        error: err.message || "Failed to load subscription",
      });
    }
  },

  upgrade: async (tier) => {
    const accessToken = getAccessToken();
    if (!accessToken) return false;

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", tier }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success) {
        set({ tier: data.tier, dailyLimit: data.dailyLimit, dialogOpen: false });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  checkAccess: async (modelId) => {
    const accessToken = getAccessToken();
    if (!accessToken) return { allowed: false, reason: "Not signed in" };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-access", model: modelId }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { allowed: false, reason: "Server error" };
      return await res.json();
    } catch {
      return { allowed: false, reason: "Network error" };
    }
  },

  setDialogOpen: (open) => set({ dialogOpen: open }),
}));

// Client-side helper for instant model gating in the dropdown
export function canAccessModel(tier: Tier, modelId: string): boolean {
  if (/-free$/.test(modelId) || modelId === "big-pickle") return true;
  if (!/^(groq|google|mistral|openrouter|cerebras)\//.test(modelId)) return tier !== "free";
  return tier === "pro" || tier === "max";
}
