// Subscription service — server-side storage via Vercel Blob
// User CANNOT forge their subscription — tier is stored server-side
// keyed by Google's immutable 'sub' (unique user ID)
//
// All 5 models are available to all tiers. The only gating is the
// time-window rate limit (free: 30/3h, pro: 100/5h, max: unlimited).
"use client";

import { create } from "zustand";
import { getAccessToken } from "@/lib/access-token";

export type Tier = "free" | "pro" | "max";

export interface TIER_WINDOWS_TYPE {
  maxMessages: number;
  windowMs: number;
  windowHours: number;
}

export const TIER_WINDOWS: Record<Tier, TIER_WINDOWS_TYPE> = {
  free: { maxMessages: 30, windowMs: 3 * 60 * 60 * 1000, windowHours: 3 },
  pro: { maxMessages: 100, windowMs: 5 * 60 * 60 * 1000, windowHours: 5 },
  max: { maxMessages: 0, windowMs: 0, windowHours: 0 },
};

export interface CheckAccessResult {
  allowed: boolean;
  reason?: string;
  messagesUsed?: number;
  messagesLimit?: number;
  resetsInMinutes?: number;
}

interface SubscriptionState {
  tier: Tier;
  messagesUsed: number;
  messagesLimit: number;
  windowHours: number;
  loading: boolean;
  dialogOpen: boolean;
  initialized: boolean;
  error: string | null;

  init: (accessToken: string) => Promise<void>;
  upgrade: (tier: Tier) => Promise<boolean>;
  checkAccess: (modelId?: string) => Promise<CheckAccessResult>;
  setDialogOpen: (open: boolean) => void;
}

const API = "/api/subscription";

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  messagesUsed: 0,
  messagesLimit: TIER_WINDOWS.free.maxMessages,
  windowHours: TIER_WINDOWS.free.windowHours,
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
      const tier: Tier = ["free", "pro", "max"].includes(data.tier) ? data.tier : "free";
      const cfg = TIER_WINDOWS[tier];
      set({
        tier,
        messagesUsed: typeof data.messagesUsed === "number" ? data.messagesUsed : 0,
        messagesLimit: typeof data.messagesLimit === "number" ? data.messagesLimit : cfg.maxMessages,
        windowHours: typeof data.windowHours === "number" ? data.windowHours : cfg.windowHours,
        initialized: true,
        loading: false,
      });
    } catch (err: any) {
      // On failure, default to free — no privileges leak
      const cfg = TIER_WINDOWS.free;
      set({
        tier: "free",
        messagesUsed: 0,
        messagesLimit: cfg.maxMessages,
        windowHours: cfg.windowHours,
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
        const cfg = TIER_WINDOWS[tier];
        set({
          tier: data.tier,
          messagesLimit: typeof data.messagesLimit === "number" ? data.messagesLimit : cfg.maxMessages,
          windowHours: typeof data.windowHours === "number" ? data.windowHours : cfg.windowHours,
          dialogOpen: false,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  checkAccess: async (_modelId) => {
    // Model gating is gone — all 5 models are available to all tiers.
    // This now only checks the time-window rate limit server-side.
    const accessToken = getAccessToken();
    if (!accessToken) return { allowed: false, reason: "Not signed in" };

    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check-access" }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return { allowed: false, reason: "Server error" };
      const data = await res.json();
      return {
        allowed: !!data.allowed,
        reason: data.reason,
        messagesUsed: data.messagesUsed,
        messagesLimit: data.messagesLimit,
        resetsInMinutes: data.resetsInMinutes,
      };
    } catch {
      return { allowed: false, reason: "Network error" };
    }
  },

  setDialogOpen: (open) => set({ dialogOpen: open }),
}));
