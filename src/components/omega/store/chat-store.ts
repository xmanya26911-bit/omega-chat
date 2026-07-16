"use client";

import { create } from "zustand";
import { saveToDrive as driveSave, loadFromDrive as driveLoad } from "@/lib/drive-service";
import { getAccessToken } from "@/lib/access-token";
import { usePrefsStore } from "../store/prefs-store";
import { useMemoryStore } from "../store/memory-store";

const STORAGE_KEY = "omega_sessions_v1";
const DEFAULT_MODEL = "deepseek-v4-flash-free";
const SYNC_DEBOUNCE = 1500;  // 1.5s debounce after any change
const POLL_INTERVAL = 30000; // check for remote changes every 30s

// ── Helpers ────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadSessions(): {
  sessions: Record<string, ChatSession>;
  order: string[];
} {
  if (typeof window === "undefined") return { sessions: {}, order: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: {}, order: [] };
    const parsed = JSON.parse(raw) as {
      sessions: Record<string, ChatSession>;
      order: string[];
    };
    return {
      sessions: parsed.sessions || {},
      order: parsed.order || [],
    };
  } catch {
    return { sessions: {}, order: [] };
  }
}

function persistToLocal(state: ChatState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessions: state.sessions,
        order: state.sessionOrder,
        active: state.activeSession,
        model: state.currentModel,
      })
    );
  } catch {
    /* quota */
  }
}

// Generates an AI title from the first few messages
async function generateSessionTitle(
  sessionId: string,
  messages: { role: string; content: string }[]
) {
  const preview = messages
    .filter((m) => m.role !== "error" && m.content.length > 0)
    .slice(0, 3)
    .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.content.slice(0, 200)}`)
    .join("\n");
  if (!preview) return;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Generate a short descriptive title (max 6 words, no quotes) for this conversation:\n\n${preview}\n\nTitle:`,
        model: "deepseek-v4-flash-free",
        sessionId: "title-gen",
        searchEnabled: false,
        mode: "standard",
        conversationHistory: [],
      }),
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    const title = (data.content || data.choices?.[0]?.message?.content || "")
      .replace(/^["']|["']$/g, "")
      .trim()
      .slice(0, 60);
    if (title && title.length > 3) {
      useChatStore.getState().renameSession(sessionId, title);
    }
  } catch {
    // silent — titles are non-critical
  }
}

// ── Types ──────────────────────────────────────────────────────────────

export type Role = "user" | "assistant" | "system" | "error";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  model?: string;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export type ChatMode = "standard" | "research" | "coding" | "canvas" | "python";

interface ChatState {
  sessions: Record<string, ChatSession>;
  sessionOrder: string[];
  activeSession: string | null;
  currentModel: string;
  currentMode: ChatMode;
  isStreaming: boolean;
  searchEnabled: boolean;
  abortController: AbortController | null;
  driveStatus: "idle" | "saving" | "loading" | "connected" | "error";
  lastSynced: number | null;

  // actions
  newChat: () => string;
  sendMessage: (text: string, opts?: { onAuthError?: () => void }) => Promise<void>;
  stopGeneration: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
  deleteMessage: (sessionId: string, messageId: string) => void;
  renameSession: (id: string, title: string) => void;
  setModel: (model: string) => void;
  setMode: (mode: ChatMode) => void;
  toggleSearch: () => void;
  setActiveSession: (id: string | null) => void;
  hydrateFromStorage: () => void;
  clearAll: () => void;
  saveToDrive: () => Promise<boolean>;
  loadFromDrive: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => {
  // ══ Auto-sync: debounced Drive save on every state change ═════════
  let syncTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerSync = () => {
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(async () => {
      const state = useChatStore.getState();
      if (Object.keys(state.sessions).length === 0) return;
      const ok = await driveSave({
        sessions: state.sessions,
        sessionOrder: state.sessionOrder,
        activeSession: state.activeSession,
        currentModel: state.currentModel,
      });
      set({ driveStatus: ok ? "connected" : "error", lastSynced: Date.now() });
    }, SYNC_DEBOUNCE);
  };

  // ══ Poll for remote changes ════════════════════════════════════════
  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      const data = await driveLoad<{
        sessions: Record<string, ChatSession>;
        sessionOrder: string[];
        activeSession: string | null;
        currentModel: string;
      }>();
      if (!data?.sessions) return;
      const state = useChatStore.getState();
      const remoteMax = Math.max(
        ...Object.values(data.sessions).map((s) => s.updatedAt),
        0
      );
      const localMax = Math.max(
        ...Object.values(state.sessions).map((s) => s.updatedAt),
        0
      );
      if (remoteMax > localMax) {
        set({
          sessions: data.sessions,
          sessionOrder: data.sessionOrder || state.sessionOrder,
          currentModel: data.currentModel || state.currentModel,
          driveStatus: "connected",
        });
        persistToLocal(get());
      }
    }, POLL_INTERVAL);
  };

  // Start polling on first use (triggered by hydrate)
  const originalHydrate = () => {
    const { sessions, order } = loadSessions();
    set((s) => ({
      sessions: { ...s.sessions, ...sessions },
      sessionOrder: Array.from(new Set([...order, ...s.sessionOrder])),
      activeSession: s.activeSession ?? order[0] ?? null,
    }));
    // Start polling on the client side
    if (typeof window !== "undefined") {
      startPolling();
    }
  };

  return {
    sessions: {},
    sessionOrder: [],
    activeSession: null,
    currentModel: DEFAULT_MODEL,
    currentMode: "standard",
    isStreaming: false,
    searchEnabled: false,
    abortController: null,
    driveStatus: "idle",
    lastSynced: null,

    // ── Actions ──────────────────────────────────────────────────────

    newChat: () => {
      const id = uid();
      const session: ChatSession = {
        id,
        title: "New chat",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        model: get().currentModel,
      };
      set((s) => ({
        sessions: { ...s.sessions, [id]: session },
        sessionOrder: [id, ...s.sessionOrder],
        activeSession: id,
      }));
      persistToLocal(get());
      triggerSync();
      return id;
    },

    setActiveSession: (id) => {
      set({ activeSession: id });
      persistToLocal(get());
    },

    loadSession: (id) => {
      if (!get().sessions[id]) return;
      set({ activeSession: id });
      persistToLocal(get());
    },

    deleteSession: (id) => {
      set((s) => {
        const sessions = { ...s.sessions };
        delete sessions[id];
        const order = s.sessionOrder.filter((x) => x !== id);
        const active =
          s.activeSession === id ? order[0] ?? null : s.activeSession;
        return { sessions, sessionOrder: order, activeSession: active };
      });
      persistToLocal(get());
      triggerSync();
    },

    deleteMessage: (sessionId, messageId) => {
      set((s) => {
        const sess = s.sessions[sessionId];
        if (!sess) return s;
        return {
          sessions: {
            ...s.sessions,
            [sessionId]: {
              ...sess,
              messages: sess.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            },
          },
        };
      });
      persistToLocal(get());
      triggerSync();
    },

    renameSession: (id, title) => {
      set((s) => {
        const sess = s.sessions[id];
        if (!sess) return s;
        return {
          sessions: { ...s.sessions, [id]: { ...sess, title } },
        };
      });
      persistToLocal(get());
      triggerSync();
    },

    setModel: (model) => {
      set({ currentModel: model });
      const { activeSession, sessions } = get();
      if (activeSession && sessions[activeSession]) {
        set((s) => ({
          sessions: {
            ...s.sessions,
            [activeSession]: { ...s.sessions[activeSession], model },
          },
        }));
      }
      persistToLocal(get());
      triggerSync();
    },

    setMode: (mode) => set({ currentMode: mode }),
    toggleSearch: () => set((s) => ({ searchEnabled: !s.searchEnabled })),

    hydrateFromStorage: originalHydrate,

    clearAll: () => {
      if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
      set({
        sessions: {},
        sessionOrder: [],
        activeSession: null,
        isStreaming: false,
      });
    },

    stopGeneration: () => {
      const ac = get().abortController;
      if (ac) ac.abort();
      set({ isStreaming: false, abortController: null });
    },

    saveToDrive: async () => {
      set({ driveStatus: "saving" });
      try {
        const { sessions, sessionOrder, activeSession, currentModel } = get();
        const ok = await driveSave({ sessions, sessionOrder, activeSession, currentModel });
        set({ driveStatus: ok ? "connected" : "error", lastSynced: ok ? Date.now() : undefined });
        return ok;
      } catch {
        set({ driveStatus: "error" });
        return false;
      }
    },

    loadFromDrive: async () => {
      set({ driveStatus: "loading" });
      try {
        const data = await driveLoad<{
          sessions: Record<string, ChatSession>;
          sessionOrder: string[];
          activeSession: string | null;
          currentModel: string;
        }>();
        if (data && data.sessions) {
          set({
            sessions: data.sessions,
            sessionOrder: data.sessionOrder || [],
            activeSession: data.activeSession || null,
            currentModel: data.currentModel || DEFAULT_MODEL,
            driveStatus: "connected",
            lastSynced: Date.now(),
          });
          persistToLocal(get());
        } else {
          set({ driveStatus: "idle" });
        }
      } catch {
        set({ driveStatus: "error" });
      }
    },

    // ── sendMessage ──────────────────────────────────────────────────

    sendMessage: async (text, opts) => {
      const trimmed = text.trim();
      if (!trimmed || get().isStreaming) return;

      // ensure a session exists
      let sessionId = get().activeSession;
      if (!sessionId || !get().sessions[sessionId]) {
        sessionId = get().newChat();
      }

      const userMsg: ChatMessage = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const assistantMsg: ChatMessage = {
        id: uid(),
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        model: get().currentModel,
      };

      const wasEmpty = get().sessions[sessionId]?.messages.length === 0;

      set((s) => {
        const sess = s.sessions[sessionId!];
        if (!sess) return s;
        const updated: ChatSession = {
          ...sess,
          messages: [...sess.messages, userMsg, assistantMsg],
          updatedAt: Date.now(),
          title:
            sess.messages.length === 0
              ? trimmed.slice(0, 40) + (trimmed.length > 40 ? "…" : "")
              : sess.title,
        };
        return {
          sessions: { ...s.sessions, [sessionId!]: updated },
          isStreaming: true,
        };
      });
      persistToLocal(get());

      const ac = new AbortController();
      set({ abortController: ac });

      const { currentModel, searchEnabled, currentMode, sessions } = get();
      const prefs = usePrefsStore.getState();
      const memories = useMemoryStore.getState().getMemoriesForPrompt();
      const history = sessions[sessionId].messages
        .filter((m) => m.id !== userMsg.id && m.id !== assistantMsg.id)
        .slice(-20)
        .map((m) => ({ role: m.role, content: m.content }));

      const accessToken = getAccessToken();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: *** ${accessToken}`,
          },
          body: JSON.stringify({
            message: trimmed,
            model: currentModel,
            sessionId,
            searchEnabled,
            mode: currentMode,
            conversationHistory: history,
            customInstructions: prefs.customInstructions || undefined,
            temperature: prefs.temperature ?? 0.7,
            memories: memories || undefined,
          }),
          signal: ac.signal,
        });

        if (res.status === 401) {
          opts?.onAuthError?.();
          throw new Error("Session expired. Please sign in again.");
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const payload = t.slice(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const evt = JSON.parse(payload);
                if (evt.type === "delta" && evt.content) {
                  acc += evt.content;
                  set((s) => {
                    const sess = s.sessions[sessionId!];
                    if (!sess) return s;
                    const msgs = sess.messages.map((m) =>
                      m.id === assistantMsg.id ? { ...m, content: acc } : m
                    );
                    return {
                      sessions: {
                        ...s.sessions,
                        [sessionId!]: { ...sess, messages: msgs },
                      },
                    };
                  });
                } else if (evt.type === "error") {
                  throw new Error(evt.content || "Stream error");
                }
              } catch {
                /* ignore malformed line */
              }
            }
          }
        } else {
          const data = await res.json();
          acc = data.content || data.choices?.[0]?.message?.content || "";
          set((s) => {
            const sess = s.sessions[sessionId!];
            if (!sess) return s;
            const msgs = sess.messages.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: acc } : m
            );
            return {
              sessions: {
                ...s.sessions,
                [sessionId!]: { ...sess, messages: msgs },
              },
            };
          });
        }

        if (!acc) {
          set((s) => {
            const sess = s.sessions[sessionId!];
            if (!sess) return s;
            const msgs = sess.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: "_(no response)_", error: true }
                : m
            );
            return {
              sessions: { ...s.sessions, [sessionId!]: { ...sess, messages: msgs } },
            };
          });
        }
      } catch (e) {
        const err = e as Error;
        if (err.name === "AbortError") {
          // keep partial content
        } else {
          set((s) => {
            const sess = s.sessions[sessionId!];
            if (!sess) return s;
            const msgs = sess.messages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `⚠️ ${err.message}`, error: true }
                : m
            );
            return {
              sessions: { ...s.sessions, [sessionId!]: { ...sess, messages: msgs } },
            };
          });
        }
      } finally {
        set({ isStreaming: false, abortController: null });
        persistToLocal(get());
        // Trigger Drive sync after every message
        triggerSync();
        // Generate AI title after first response if session was empty
        if (wasEmpty && acc && acc.length > 3) {
          const msgs = get().sessions[sessionId]?.messages ?? [];
          generateSessionTitle(sessionId, msgs);
        }
      }
    },
  };
});