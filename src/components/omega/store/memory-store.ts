"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveMemoriesToDrive, loadMemoriesFromDrive } from "@/lib/drive-service";
import { createUserStorage } from "@/lib/user-storage";

export interface Memory {
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

interface MemoryState {
  memories: Memory[];
  loaded: boolean;

  addMemory: (key: string, value: string) => void;
  removeMemory: (key: string) => void;
  updateMemory: (key: string, value: string) => void;
  getMemoriesForPrompt: () => string;
  hydrate: () => void;
  setMemories: (m: Memory[]) => void;
  syncToDrive: () => Promise<void>;
  syncFromDrive: () => Promise<void>;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      memories: [],
      loaded: false,

      addMemory: (key, value) => {
        const now = Date.now();
        set((s) => ({
          memories: [
            ...s.memories.filter((m) => m.key !== key),
            { key, value, createdAt: now, updatedAt: now },
          ],
        }));
        get().syncToDrive();
      },

      removeMemory: (key) => {
        set((s) => ({
          memories: s.memories.filter((m) => m.key !== key),
        }));
        get().syncToDrive();
      },

      updateMemory: (key, value) => {
        set((s) => ({
          memories: s.memories.map((m) =>
            m.key === key ? { ...m, value, updatedAt: Date.now() } : m
          ),
        }));
        get().syncToDrive();
      },

      getMemoriesForPrompt: () => {
        const mems = get().memories;
        if (mems.length === 0) return "";
        return (
          "## Known facts about the user:\n" +
          mems.map((m) => `- ${m.key}: ${m.value}`).join("\n")
        );
      },

      hydrate: () => set({ loaded: true }),

      setMemories: (m) => set({ memories: m }),

      syncToDrive: async () => {
        try {
          const mems = get().memories;
          if (mems.length > 0) {
            await saveMemoriesToDrive(mems);
          }
        } catch {}
      },

      syncFromDrive: async () => {
        try {
          const data = await loadMemoriesFromDrive<Memory[]>();
          if (data && data.length > 0) {
            // Merge: Drive has priority (cross-device)
            set({ memories: data });
          }
        } catch {}
      },
    }),
    {
      name: "omega_memories_v1",
      storage: createUserStorage(),
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrate();
      },
    }
  )
);
