"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface SharedSessionData {
  id: string;
  title: string;
  model: string;
  messages: { role: string; content: string }[];
  created: number;
  expires?: number;
}

export default function SharedPage() {
  const [session, setSession] = useState<SharedSessionData | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    try {
      const stored = JSON.parse(localStorage.getItem("omega_shared_sessions") || "{}");
      const data = stored[id] as SharedSessionData | undefined;

      if (!data) {
        setError("Session not found or has expired");
        setLoading(false);
        return;
      }

      if (data.expires && data.expires < Date.now()) {
        delete stored[id];
        localStorage.setItem("omega_shared_sessions", JSON.stringify(stored));
        setError("This share link has expired");
        setLoading(false);
        return;
      }

      setSession(data);
    } catch {
      setError("Failed to load shared session");
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--omega-bg)]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 rounded-full border-2 border-[var(--omega-emerald)] border-t-transparent animate-spin" />
          <p className="text-sm text-[var(--omega-muted)]">Loading shared session…</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--omega-bg)]">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center px-6">
          <div className="size-12 rounded-full bg-[oklch(0.7_0.21_14_/_0.1)] flex items-center justify-center">
            <span className="text-xl">🔗</span>
          </div>
          <h1 className="text-lg font-semibold text-[var(--omega-fg)]">Session not found</h1>
          <p className="text-sm text-[var(--omega-muted)]">{error || "The shared session could not be loaded"}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--omega-emerald)] text-sm font-medium text-[oklch(0.06_0.01_264)] hover:opacity-90 transition"
          >
            Go to Omega Chat
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--omega-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--omega-glass-border)] bg-[var(--omega-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-[var(--omega-fg)] hover:text-[var(--omega-emerald)] transition">
              Ω Omega
            </Link>
            <span className="text-[var(--omega-muted)]">/</span>
            <span className="text-sm text-[var(--omega-fg-dim)]">Shared session</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-1 rounded-md bg-[oklch(0.82_0.17_162_/_0.08)] text-[var(--omega-emerald)]">
              {session.model}
            </span>
            <span className="text-[10px] text-[var(--omega-muted)]">
              {new Date(session.created).toLocaleDateString()}
            </span>
          </div>
        </div>
      </header>

      {/* Chat view */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-xl font-semibold text-[var(--omega-fg)]">{session.title}</h1>

          <div className="space-y-4">
            {session.messages.map((msg, i) => (
              <div
                key={i}
                className={`rounded-xl p-4 ${
                  msg.role === "user"
                    ? "bg-[oklch(0.82_0.17_162_/_0.06)] border border-[oklch(0.82_0.17_162_/_0.1)]"
                    : "bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`size-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      msg.role === "user"
                        ? "bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)]"
                        : "bg-[var(--omega-glass-border)] text-[var(--omega-fg)]"
                    }`}
                  >
                    {msg.role === "user" ? "U" : "Ω"}
                  </div>
                  <span className="text-[10px] font-medium text-[var(--omega-muted)] uppercase tracking-wider">
                    {msg.role === "user" ? "You" : "Omega"}
                  </span>
                </div>
                <div className="text-sm text-[var(--omega-fg)] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 pb-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--omega-emerald)] text-sm font-medium text-[oklch(0.06_0.01_264)] hover:opacity-90 transition"
            >
              Start your own chat
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
