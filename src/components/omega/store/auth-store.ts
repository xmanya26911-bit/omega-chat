"use client";

import { create } from "zustand";

export interface OmegaUser {
  email: string;
  name: string;
  picture: string;
  sub: string;
}

interface AuthState {
  user: OmegaUser | null;
  accessToken: string | null;
  ready: boolean; // finished initial restore attempt
  loginOverlayOpen: boolean;
  setUser: (u: OmegaUser | null) => void;
  setAccessToken: (t: string | null) => void;
  setReady: (v: boolean) => void;
  openLoginOverlay: () => void;
  closeLoginOverlay: () => void;
  signOut: () => void;
}

const USER_KEY = "omega_user";
const REFRESH_KEY = "omega_refresh_v1";

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  ready: false,
  loginOverlayOpen: false,
  setUser: (u) => {
    if (typeof window !== "undefined") {
      if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
      else localStorage.removeItem(USER_KEY);
    }
    set({ user: u });
  },
  setAccessToken: (t) => {
    if (typeof window !== "undefined" && t) {
      window.__omega_access_token = t;
    }
    set({ accessToken: t });
  },
  setReady: (v) => set({ ready: v }),
  openLoginOverlay: () => set({ loginOverlayOpen: true }),
  closeLoginOverlay: () => set({ loginOverlayOpen: false }),
  signOut: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem("omega_state");
      localStorage.removeItem("omega_verifier");
      window.__omega_access_token = "";
    }
    set({ user: null, accessToken: null, loginOverlayOpen: false });
  },
}));

export { USER_KEY, REFRESH_KEY };
