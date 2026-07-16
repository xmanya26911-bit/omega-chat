"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PinsState {
  pinnedIds: string[];
  togglePin: (id: string) => void;
  isPinned: (id: string) => boolean;
}

export const usePinsStore = create<PinsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],

      togglePin: (id) =>
        set((s) => ({
          pinnedIds: s.pinnedIds.includes(id)
            ? s.pinnedIds.filter((x) => x !== id)
            : [id, ...s.pinnedIds],
        })),

      isPinned: (id) => get().pinnedIds.includes(id),
    }),
    { name: "omega_pins_v1" }
  )
);
