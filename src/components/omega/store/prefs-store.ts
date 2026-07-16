"use client";

import { create } from "zustand";

const PREFS_KEY = "omega_prefs_v1";

interface PrefsState {
  customInstructions: string;
  temperature: number;
  loaded: boolean;

  setCustomInstructions: (v: string) => void;
  setTemperature: (v: number) => void;
  hydrate: () => void;
}

export const usePrefsStore = create<PrefsState>((set, get) => ({
  customInstructions: "",
  temperature: 0.7,
  loaded: false,

  setCustomInstructions: (v) => {
    set({ customInstructions: v });
    const { temperature } = get();
    persist({ customInstructions: v, temperature });
  },

  setTemperature: (v) => {
    set({ temperature: v });
    const { customInstructions } = get();
    persist({ customInstructions, temperature });
  },

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) { set({ loaded: true }); return; }
      const data = JSON.parse(raw);
      set({
        customInstructions: data.customInstructions || "",
        temperature: typeof data.temperature === "number" ? data.temperature : 0.7,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },
}));

function persist(data: { customInstructions: string; temperature: number }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(data));
  } catch {
    /* quota */
  }
}
