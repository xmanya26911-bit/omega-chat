"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cloud, CloudOff, LogOut, Plus, Search, Trash2, Download } from "lucide-react";
import { useChatStore } from "../store/chat-store";
import { useAuthStore } from "../store/auth-store";
import { OmegaButton } from "../ui/OmegaButton";
import { ModelSelect } from "./ModelSelect";
import { cn } from "@/lib/utils";

// ── Relative time formatter ───────────────────────────────────────────
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 30) return "now";
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk}w`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo}mo`;
  const yr = Math.floor(day / 365);
  return `${yr}y`;
}

// ── Decorative memory chips ───────────────────────────────────────────
const MEMORY_CHIPS = ["name: user", "lang: auto", "theme: dark"];

interface SessionItemProps {
  id: string;
  title: string;
  updatedAt: number;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

function SessionItem({
  title,
  updatedAt,
  active,
  onSelect,
  onDelete,
}: SessionItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="relative"
    >
      <button
        type="button"
        data-cursor="hover"
        onClick={onSelect}
        className={cn(
          "group relative flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left",
          "transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
          active
            ? "bg-[oklch(0.82_0.17_162_/_0.1)]"
            : "hover:bg-[oklch(0.82_0.17_162_/_0.05)]"
        )}
      >
        {active && (
          <motion.span
            layoutId="omega-session-active-bar"
            className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full"
            style={{ background: "var(--omega-emerald)" }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "truncate text-sm",
              active
                ? "text-[var(--omega-fg)]"
                : "text-[var(--omega-fg-dim)]"
            )}
          >
            {title}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-[var(--omega-muted)]">
            {relativeTime(updatedAt)}
          </div>
        </div>
        <span
          role="button"
          tabIndex={-1}
          aria-label="Delete conversation"
          data-cursor="hover"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md",
            "text-[var(--omega-fg-dim)] opacity-0 transition-all duration-200",
            "hover:bg-[oklch(0.7_0.21_14_/_0.16)] hover:text-[var(--omega-rose)]",
            "group-hover:opacity-100 focus-visible:opacity-100"
          )}
        >
          <Trash2 className="size-3.5" strokeWidth={2} />
        </span>
      </button>
    </motion.div>
  );
}

/**
 * ChatSidebar — left-side control panel: brand, new chat, model select,
 * memory chips, search, conversation list, user footer.
 */
export function ChatSidebar() {
  const sessions = useChatStore((s) => s.sessions);
  const sessionOrder = useChatStore((s) => s.sessionOrder);
  const activeSession = useChatStore((s) => s.activeSession);
  const newChat = useChatStore((s) => s.newChat);
  const loadSession = useChatStore((s) => s.loadSession);
  const deleteSession = useChatStore((s) => s.deleteSession);
  const hydrateFromStorage = useChatStore((s) => s.hydrateFromStorage);

  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);

  const driveStatus = useChatStore((s) => s.driveStatus);
  const lastSynced = useChatStore((s) => s.lastSynced);
  const loadFromDrive = useChatStore((s) => s.loadFromDrive);

  const [query, setQuery] = React.useState("");

  // Restore sessions from localStorage on mount, then auto-load from Drive.
  React.useEffect(() => {
    hydrateFromStorage();
    // Auto-load from Drive if connected
    loadFromDrive();
  }, [hydrateFromStorage, loadFromDrive]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = sessionOrder
      .map((id) => sessions[id])
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    if (!q) return list;
    return list.filter((s) => s.title.toLowerCase().includes(q));
  }, [sessions, sessionOrder, query]);

  // Export current chat as Markdown
  const handleExport = React.useCallback(() => {
    const id = activeSession;
    if (!id || !sessions[id]) return;
    const sess = sessions[id];
    let md = `# ${sess.title}\n\n`;
    md += `*Exported from Omega Cloud • ${new Date(sess.updatedAt).toLocaleString()}*\n\n---\n\n`;
    for (const m of sess.messages) {
      if (m.role === "user") {
        md += `## You\n\n${m.content}\n\n`;
      } else if (m.role === "assistant") {
        md += `## Omega\n\n${m.content}\n\n`;
      }
    }
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sess.title.replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 40) || "omega-chat"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession, sessions]);

  const displayName = user?.name || user?.email || "Omega User";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.picture;

  return (
    <aside
      className={cn(
        "flex h-full w-[240px] shrink-0 flex-col sm:w-[280px]",
        "omega-glass border-r border-[var(--omega-glass-border)]"
      )}
    >
      {/* ── Brand header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full font-display text-base font-semibold text-[oklch(0.06_0.01_264)]"
          style={{
            background: "var(--omega-emerald)",
            boxShadow: "0 0 18px -4px oklch(0.82 0.17 162 / 0.65)",
          }}
          aria-hidden
        >
          Ω
        </div>
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold tracking-tight text-[var(--omega-fg)]">
            Omega
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--omega-muted)]">
            Cloud AI
          </div>
        </div>
      </div>

      {/* ── Home link ──────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <a
          href={process.env.NEXT_PUBLIC_LANDING_APP_URL || "https://omega-nine-weld.vercel.app"}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="hover"
          className={cn(
            "omega-glass-thin flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
            "transition-all duration-200",
            "hover:bg-[oklch(0.82_0.17_162_/_0.1)] hover:text-[var(--omega-emerald)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
            "text-[var(--omega-fg-dim)]"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-sm font-medium">Home</span>
        </a>
      </div>

      {/* ── New chat ─────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <OmegaButton
          variant="primary"
          size="sm"
          magnetic={false}
          className="w-full"
          onClick={() => newChat()}
        >
          <Plus className="size-4" strokeWidth={2.5} />
          New Chat
        </OmegaButton>
      </div>

      {/* ── Model select ─────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        <ModelSelect />
      </div>

      {/* ── Memory chips ─────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--omega-muted)]">
          Active Memory
        </div>
        <div className="flex flex-wrap gap-1.5">
          {MEMORY_CHIPS.map((chip) => (
            <span
              key={chip}
              className="omega-glass-thin rounded-full px-2 py-0.5 font-mono text-[10px] text-[var(--omega-fg-dim)]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      {/* ── Search ───────────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <div className="omega-glass-thin flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <Search
            className="size-3.5 shrink-0 text-[var(--omega-muted)]"
            strokeWidth={2}
          />
          <input
            value={query}
            data-cursor="hover"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="w-full bg-transparent text-xs text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* ── Conversation list ────────────────────────────────────── */}
      <div className="omega-scrollbar-hide flex-1 overflow-y-auto px-2 py-1">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <div className="mb-2 size-8 rounded-full border border-[var(--omega-glass-border)] opacity-40" />
            <div className="text-xs text-[var(--omega-muted)]">
              {query ? "No matches found" : "No conversations yet"}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map((s) => (
              <SessionItem
                key={s.id}
                id={s.id}
                title={s.title}
                updatedAt={s.updatedAt}
                active={s.id === activeSession}
                onSelect={() => loadSession(s.id)}
                onDelete={() => deleteSession(s.id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ── Drive sync ────────────────────────────────────────────── */}
      <div className="border-t border-[var(--omega-glass-border)] px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "inline-flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5",
              driveStatus === "connected"
                ? "bg-[oklch(0.82_0.17_162_/_0.08)]"
                : driveStatus === "error"
                  ? "bg-[oklch(0.7_0.21_14_/_0.08)]"
                  : "omega-glass-thin"
            )}
          >
            {/* Status dot */}
            <span
              className={cn(
                "relative size-2 shrink-0 rounded-full",
                driveStatus === "connected"
                  ? "bg-[var(--omega-emerald)]"
                  : driveStatus === "error"
                    ? "bg-[var(--omega-rose)]"
                    : driveStatus === "saving" || driveStatus === "loading"
                      ? "bg-[var(--omega-emerald)] animate-pulse"
                      : "bg-[var(--omega-muted)]"
              )}
            >
              {driveStatus === "connected" && (
                <span
                  className="absolute inset-0 animate-ping rounded-full bg-[var(--omega-emerald)] opacity-40"
                  style={{ animationDuration: "3s" }}
                />
              )}
            </span>

            {/* Status text */}
            <span className="flex-1 font-mono text-[10px] text-[var(--omega-fg-dim)]">
              {driveStatus === "saving"
                ? "Saving…"
                : driveStatus === "loading"
                  ? "Loading…"
                  : driveStatus === "connected"
                    ? "Synced"
                    : driveStatus === "error"
                      ? "Sync error"
                      : "Drive"}
            </span>

            {/* Last synced time */}
            {lastSynced && driveStatus === "connected" && (
              <span className="font-mono text-[9px] text-[var(--omega-muted)]">
                {relativeTime(lastSynced)}
              </span>
            )}

            {/* Icon */}
            {driveStatus === "error" ? (
              <CloudOff className="size-3 shrink-0 text-[var(--omega-rose)]" strokeWidth={2} />
            ) : (
              <Cloud className="size-3 shrink-0 text-[var(--omega-emerald)]" strokeWidth={2} />
            )}
          </div>
        </div>
      </div>

      {/* ── Export chat ──────────────────────────────────────────── */}
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={handleExport}
          disabled={!activeSession || !sessions[activeSession]?.messages?.length}
          className={cn(
            "omega-glass-thin flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left",
            "transition-all duration-200 text-xs font-medium",
            "hover:bg-[oklch(0.82_0.17_162_/_0.1)] hover:text-[var(--omega-emerald)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
            "disabled:opacity-40 disabled:cursor-not-allowed",
            "text-[var(--omega-fg-dim)]"
          )}
        >
          <Download className="size-4" strokeWidth={2} />
          Export Chat
        </button>
      </div>

      {/* ── User footer ──────────────────────────────────────────── */}
      <div className="border-t border-[var(--omega-glass-border)] p-3">
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="size-9 rounded-full object-cover"
                style={{ border: "1px solid var(--omega-glass-border)" }}
              />
            ) : (
              <div
                className="flex size-9 items-center justify-center rounded-full font-display text-sm font-semibold text-[oklch(0.06_0.01_264)]"
                style={{ background: "var(--omega-emerald)" }}
              >
                {displayName.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full"
              style={{
                background: "var(--omega-emerald)",
                boxShadow: "0 0 6px oklch(0.82 0.17 162 / 0.8)",
                border: "2px solid var(--omega-bg-2)",
              }}
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium text-[var(--omega-fg)]">
              {displayName}
            </div>
            {displayEmail && (
              <div className="truncate font-mono text-[10px] text-[var(--omega-muted)]">
                {displayEmail}
              </div>
            )}
          </div>
          <button
            type="button"
            data-cursor="hover"
            aria-label="Sign out"
            onClick={signOut}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
              "text-[var(--omega-fg-dim)] transition-colors duration-200",
              "hover:bg-[oklch(0.7_0.21_14_/_0.16)] hover:text-[var(--omega-rose)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]"
            )}
          >
            <LogOut className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default ChatSidebar;
