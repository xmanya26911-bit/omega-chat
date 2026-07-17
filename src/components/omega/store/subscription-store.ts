// Subscription service — stores user tier in Google Drive
// All tiers are free, this is just a preference/feature flag
"use client";

import { create } from "zustand";

export type Tier = "free" | "pro" | "max";

interface SubscriptionState {
  tier: Tier;
  usageToday: number;
  dailyLimit: number;
  loading: boolean;
  dialogOpen: boolean;
  initialized: boolean;

  init: (accessToken: string) => Promise<void>;
  upgrade: (tier: Tier) => Promise<boolean>;
  setDialogOpen: (open: boolean) => void;
}

const TIER_LIMITS: Record<Tier, number> = { free: 100, pro: 500, max: 99999 };

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: "free",
  usageToday: 0,
  dailyLimit: 100,
  loading: false,
  dialogOpen: false,
  initialized: false,

  init: async (accessToken) => {
    if (!accessToken) return;
    set({ loading: true });
    try {
      // Read subscription from Drive
      const res = await fetch("https://www.googleapis.com/drive/v3/files?q=name='omega_subscription_v1.json'", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.files?.length) {
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${data.files[0].id}?alt=media`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (fileRes.ok) {
          const sub = await fileRes.json();
          const tier = ["free", "pro", "max"].includes(sub.tier) ? sub.tier : "free";
          set({ tier, dailyLimit: TIER_LIMITS[tier], initialized: true, loading: false });
          return;
        }
      }
    } catch {}
    set({ tier: "free", dailyLimit: 100, initialized: true, loading: false });
  },

  upgrade: async (tier) => {
    const accessToken = typeof window !== "undefined" ? (
      (document.cookie.match(/\bomega_at=([^;]*)/) || [])[1] || null
    ) : null;
    if (!accessToken) return false;

    try {
      const sub = { tier, updatedAt: Date.now() };
      const body = JSON.stringify(sub, null, 2);

      // Find existing subscription file
      const search = await fetch("https://www.googleapis.com/drive/v3/files?q=name='omega_subscription_v1.json'", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const searchData = await search.json();

      if (searchData.files?.length) {
        // Update existing
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${searchData.files[0].id}?uploadType=media`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body,
        });
      } else {
        // Find omega-cloud folder
        const folderSearch = await fetch("https://www.googleapis.com/drive/v3/files?q=name='omega-cloud' and mimeType='application/vnd.google-apps.folder'", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const folderData = await folderSearch.json();
        const folderId = folderData.files?.[0]?.id;

        // Create file
        const metadata = JSON.stringify({ name: "omega_subscription_v1.json", parents: folderId ? [folderId] : [] });
        const formData = new FormData();
        formData.append("metadata", new Blob([metadata], { type: "application/json" }));
        formData.append("file", new Blob([body], { type: "application/json" }));
        await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
          body: formData,
        });
      }

      set({ tier, dailyLimit: TIER_LIMITS[tier], dialogOpen: false });
      return true;
    } catch {
      return false;
    }
  },

  setDialogOpen: (open) => set({ dialogOpen: open }),
}));

// Helper: check if user can access a model based on tier
export function canAccessModel(tier: Tier, modelId: string): boolean {
  if (/-free$/.test(modelId) || modelId === "big-pickle") return true;
  if (!/^(groq|google|mistral|openrouter|cerebras)\//.test(modelId)) return tier !== "free";
  return tier === "pro" || tier === "max";
}
