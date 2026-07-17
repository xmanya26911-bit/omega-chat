/**
 * Creates a zustand persist storage adapter that prefixes keys with the
 * current user's Google `sub`, preventing cross-account data leaks
 * when multiple users share the same device without signing out.
 *
 * Usage:
 *   persist(..., { storage: createUserStorage(), name: "omega_memories_v1" })
 *
 * The actual localStorage key becomes "omega_memories_v1_<sub>".
 * When no user is signed in, falls back to the base key.
 */

import { useAuthStore } from "@/components/omega/store/auth-store";

function getUserSub(): string | undefined {
  try {
    return useAuthStore.getState().user?.sub;
  } catch {
    return undefined;
  }
}

function userKey(name: string): string {
  const sub = getUserSub();
  return sub ? `${name}_${sub}` : name;
}

export function createUserStorage() {
  return {
    getItem: (name: string) => {
      try {
        const raw = localStorage.getItem(userKey(name));
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: unknown) => {
      try {
        localStorage.setItem(userKey(name), JSON.stringify(value));
      } catch {
        /* quota */
      }
    },
    removeItem: (name: string) => {
      try {
        localStorage.removeItem(userKey(name));
      } catch {
        /* ignore */
      }
    },
  };
}

/**
 * Custom persistToLocal replacement for stores that don't use zustand persist.
 * Prefixes the storage key with the current user's sub.
 */
export function persistWithUser<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(userKey(key), JSON.stringify(value));
  } catch {
    /* quota */
  }
}

export function loadWithUser<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(userKey(key));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
