"use client";

import { useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────

export interface SharedSession {
  id: string;
  title: string;
  model: string;
  messages: { role: string; content: string }[];
  created: number;
  expires?: number; // optional expiry timestamp
}

// ── Share session ──────────────────────────────────────────────────────

export function useSessionShare() {
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string>("");

  const shareSession = useCallback(async (
    sessionId: string,
    title: string,
    model: string,
    messages: { role: string; content: string }[],
  ) => {
    setSharing(true);
    setError("");
    setShareUrl(null);

    try {
      // Store the session data and get a share ID
      const shareData: SharedSession = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
        title,
        model,
        messages: messages.map((m) => ({
          role: m.role,
          content: typeof m.content === "string"
            ? m.content.slice(0, 16000) // truncate for storage limits
            : JSON.stringify(m.content).slice(0, 16000),
        })),
        created: Date.now(),
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      // Store in localStorage (shared sessions are local-only for now)
      const stored = JSON.parse(localStorage.getItem("omega_shared_sessions") || "{}");
      stored[shareData.id] = shareData;
      localStorage.setItem("omega_shared_sessions", JSON.stringify(stored));

      // Generate share URL
      const url = new URL(window.location.origin + "/shared");
      url.searchParams.set("id", shareData.id);
      setShareUrl(url.toString());
    } catch (err) {
      setError((err as Error).message || "Failed to create share link");
    } finally {
      setSharing(false);
    }
  }, []);

  const loadSharedSession = useCallback((shareId: string): SharedSession | null => {
    try {
      const stored = JSON.parse(localStorage.getItem("omega_shared_sessions") || "{}");
      const session = stored[shareId] as SharedSession | undefined;
      if (!session) return null;
      if (session.expires && session.expires < Date.now()) {
        delete stored[shareId];
        localStorage.setItem("omega_shared_sessions", JSON.stringify(stored));
        return null;
      }
      return session;
    } catch {
      return null;
    }
  }, []);

  const clearShareUrl = useCallback(() => {
    setShareUrl(null);
  }, []);

  return { shareSession, loadSharedSession, shareUrl, sharing, error, clearShareUrl };
}
