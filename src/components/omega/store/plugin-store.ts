"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PluginId } from "@/lib/plugin-defs";
import { getAccessToken } from "@/lib/access-token";

interface PluginConnection {
  connected: boolean;
  connectedAt?: number;
  // Metadata only — actual tokens stay server-side
  permissions?: string;
}

interface PluginSessionStore {
  plugins: Record<PluginId, PluginConnection>;
  checking: Record<PluginId, boolean>;

  // Actions
  fetchStatus: () => Promise<void>;
  connect: (pluginId: PluginId) => void;
  disconnect: (pluginId: PluginId) => Promise<void>;
  getConnected: () => PluginId[];
  getSummary: () => string; // For system prompt injection
}

export const usePluginStore = create<PluginSessionStore>()(
  persist(
    (set, get) => ({
      plugins: {} as Record<PluginId, PluginConnection>,
      checking: {} as Record<PluginId, boolean>,

      fetchStatus: async () => {
        const token = getAccessToken();
        if (!token) return;
        try {
          const res = await fetch(`/api/plugins/status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) return;
          const data = await res.json();
          if (data.plugins) {
            set({ plugins: data.plugins });
          }
        } catch {
          // silent
        }
      },

      connect: (pluginId: PluginId) => {
        // Build state param for CSRF
        const state = pluginId + ":" + crypto.randomUUID();
        sessionStorage.setItem("omega_plugin_state", state);

        // Server-side auth redirect
        const url = `/api/plugins/${pluginId}/auth`;
        window.location.href = url;
      },

      disconnect: async (pluginId: PluginId) => {
        const token = getAccessToken();
        if (!token) return;
        try {
          set((s) => ({
            checking: { ...s.checking, [pluginId]: true },
          }));
          await fetch(`/api/plugins/disconnect?plugin=${pluginId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          set((s) => {
            const p = { ...s.plugins };
            delete p[pluginId];
            return { plugins: p, checking: { ...s.checking, [pluginId]: false } };
          });
        } catch {
          set((s) => ({
            checking: { ...s.checking, [pluginId]: false },
          }));
        }
      },

      getConnected: () => {
        return Object.entries(get().plugins)
          .filter(([, v]) => v.connected)
          .map(([k]) => k as PluginId);
      },

      getSummary: () => {
        const connected = get().getConnected();
        if (connected.length === 0) return "";
        return (
          "\n[Connected plugins: " +
          connected.join(", ") +
          "]\n" +
          connected
            .map((id) => {
              switch (id) {
                case "github":
                  return "[GitHub Plugin] You can: list repos, get file contents, search code, create issues, list PRs, read commits. Trigger by asking about repos, code, PRs, or issues.";
                case "notion":
                  return "[Notion Plugin] You can: read/write pages and databases.";
                default:
                  return `[${id} plugin] is connected, usable via API.`;
              }
            })
            .join("\n")
        );
      },
    }),
    {
      name: "omega_plugins",
      partialize: (state) => ({ plugins: state.plugins }),
    }
  )
);
