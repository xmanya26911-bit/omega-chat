"use client";

import { create } from "zustand";

const SUB_API = "https://omega-subscriptions.vercel.app";

export type Tier = "free" | "pro" | "max";

interface SubscriptionState {
  tier: Tier;
  usageToday: number;
  dailyLimit: number;
  email: string;
  loading: boolean;
  dialogOpen: boolean;

  fetchSubscription: (accessToken: string) => Promise<void>;
  upgrade: (accessToken: string, tier: Tier) => Promise<boolean>;
  setDialogOpen: (open: boolean) => void;
  reset: () => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  usageToday: 0,
  dailyLimit: 100,
  email: "",
  loading: false,
  dialogOpen: false,

  fetchSubscription: async (accessToken) => {
    set({ loading: true });
    try {
      const res = await fetch(`${SUB_API}/v1/user`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch subscription");
      const data = await res.json();
      set({
        tier: data.tier || "free",
        usageToday: data.usageToday || 0,
        dailyLimit: data.dailyLimit || 100,
        email: data.email || "",
        loading: false,
      });
    } catch {
      // Offline/not set up yet — default to free
      set({ tier: "free", loading: false });
    }
  },

  upgrade: async (accessToken, tier) => {
    try {
      const res = await fetch(`${SUB_API}/v1/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ tier }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data.success) {
        set({
          tier: data.tier,
          dailyLimit: data.dailyLimit,
          dialogOpen: false,
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  setDialogOpen: (open) => set({ dialogOpen: open }),
  reset: () => set({ tier: "free", usageToday: 0, dailyLimit: 100, email: "" }),
}));
