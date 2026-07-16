"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDown,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useChatStore } from "../store/chat-store";
import { MessageBubble } from "./MessageBubble";
import { ModeTabs } from "./ModeTabs";
import { ChatInput } from "./ChatInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  { icon: "✨", text: "Explain quantum computing" },
  { icon: "🐍", text: "Write a Python web scraper" },
  { icon: "🎨", text: "Design a logo concept" },
  { icon: "🐛", text: "Debug my React effect" },
];

// Distance from bottom (px) under which we consider the user "pinned".
const PIN_THRESHOLD = 80;

/**
 * ChatArea — main chat column: top bar (modes + model badge), scrollable
 * message list with auto-scroll-to-bottom, and the input dock.
 */
export function ChatArea() {
  const activeSession = useChatStore((s) => s.activeSession);
  const sessions = useChatStore((s) => s.sessions);
  const currentModel = useChatStore((s) => s.currentModel);
  const setModel = useChatStore((s) => s.setModel);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [modelOpen, setModelOpen] = React.useState(false);

  const MODEL_LIST = [
    "deepseek-v4-flash-free",
    "mimo-v2.5-free",
    "hy3-free",
    "nemotron-3-ultra-free",
    "north-mini-code-free",
  ];

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = React.useState(true);
  const [showScrollBtn, setShowScrollBtn] = React.useState(false);

  const session = activeSession ? sessions[activeSession] : null;
  const messages = session?.messages ?? [];
  const messageCount = messages.length;
  const lastContent = messages.length
    ? messages[messages.length - 1].content
    : "";
  const lastLen = lastContent.length;

  // ── Auto-scroll handling ──────────────────────────────────────────
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Track pinned state on scroll.
  const onScroll = React.useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isPinned = distance <= PIN_THRESHOLD;
    setPinned(isPinned);
    setShowScrollBtn(!isPinned && el.scrollHeight > el.clientHeight + 16);
  }, []);

  // When new messages arrive or streaming deltas come in, scroll if pinned.
  React.useEffect(() => {
    if (pinned) {
      scrollToBottom(messageCount > 1 ? "smooth" : "auto");
    }
  }, [messageCount, lastLen, pinned, scrollToBottom]);

  // On session change, jump to bottom instantly.
  React.useEffect(() => {
    setPinned(true);
    setShowScrollBtn(false);
    requestAnimationFrame(() => scrollToBottom("auto"));
  }, [activeSession, scrollToBottom]);

  const handleSuggestion = (text: string) => {
    if (isStreaming) return;
    void sendMessage(text);
  };

  const isEmpty = !session || messages.length === 0;

  return (
    <div className="relative flex h-full min-w-0 flex-1 flex-col">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <ModeTabs />
        <div className="flex items-center gap-2">
          <DropdownMenu open={modelOpen} onOpenChange={setModelOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-cursor="hover"
                aria-label="Switch model"
                className="inline-flex items-center gap-1.5 rounded-full omega-glass-thin px-2.5 py-1 font-mono text-[10px] text-[var(--omega-fg-dim)] transition-all duration-200 hover:border-[oklch(0.82_0.17_162_/_0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)] sm:inline-flex"
              >
                <span
                  className="size-1.5 rounded-full shrink-0"
                  style={{
                    background: currentModel.includes("-free")
                      ? "var(--omega-emerald)"
                      : "var(--omega-amber)",
                  }}
                />
                <span className="max-w-[140px] truncate">{currentModel}</span>
                <ChevronDown
                  className={`size-3 shrink-0 transition-transform duration-200 ${
                    modelOpen ? "rotate-180" : ""
                  }`}
                  strokeWidth={2}
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[220px] p-1.5 rounded-xl omega-glass border-[var(--omega-glass-border)]"
            >
              {MODEL_LIST.map((m) => {
                const active = m === currentModel;
                return (
                  <DropdownMenuItem
                    key={m}
                    data-cursor="hover"
                    onSelect={(e) => {
                      e.preventDefault();
                      setModel(m);
                      setModelOpen(false);
                    }}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 cursor-pointer outline-none transition-colors duration-200 data-[highlighted]:bg-[oklch(0.82_0.17_162_/_0.1)] ${
                      active ? "bg-[oklch(0.82_0.17_162_/_0.08)]" : ""
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {active && (
                        <span className="size-1.5 rounded-full shrink-0" style={{ background: "var(--omega-emerald)", boxShadow: "0 0 8px oklch(0.82 0.17 162 / 0.7)" }} />
                      )}
                      <span className={`truncate font-mono text-xs ${active ? "text-[var(--omega-emerald)]" : "text-[var(--omega-fg)]"}`}>
                        {m}
                      </span>
                    </span>
                    <span
                      className="shrink-0 rounded px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        color: "var(--omega-emerald)",
                        background: "oklch(0.82 0.17 162 / 0.12)",
                      }}
                    >
                      Free
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Messages ────────────────────────────────────────────── */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={cn(
          "omega-scrollbar-hide relative flex-1 overflow-y-auto",
          "px-4 sm:px-6"
        )}
      >
        {isEmpty ? (
          <EmptyState onSuggestion={handleSuggestion} disabled={isStreaming} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-5 py-6">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                isStreaming={isStreaming}
                isLast={i === messages.length - 1}
              />
            ))}
            {/* bottom spacer so last bubble clears the input dock */}
            <div className="h-2" />
          </div>
        )}
      </div>

      {/* ── Scroll-to-bottom button ─────────────────────────────── */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            type="button"
            data-cursor="hover"
            aria-label="Scroll to bottom"
            onClick={() => {
              setPinned(true);
              scrollToBottom("smooth");
            }}
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={cn(
              "absolute bottom-32 left-1/2 z-20 -translate-x-1/2",
              "inline-flex size-9 items-center justify-center rounded-full",
              "omega-glass text-[var(--omega-emerald)]",
              "hover:border-[oklch(0.82_0.17_162_/_0.5)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]"
            )}
          >
            <ArrowDown className="size-4" strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Input dock ──────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pb-4 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────
interface EmptyStateProps {
  onSuggestion: (text: string) => void;
  disabled: boolean;
}

function EmptyState({ onSuggestion, disabled }: EmptyStateProps) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-2 py-10 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
        className="mb-6 flex size-20 items-center justify-center rounded-full font-display text-4xl font-semibold omega-text-aurora"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.82 0.17 162 / 0.18), transparent 70%)",
          border: "1px solid var(--omega-glass-border)",
        }}
        aria-hidden
      >
        Ω
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="font-display text-2xl font-semibold tracking-tight text-[var(--omega-fg)] sm:text-3xl"
      >
        How can I help you today?
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-2 text-sm text-[var(--omega-fg-dim)]"
      >
        Ask anything — research, code, design, debug. Omega is ready.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="mt-8 grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            type="button"
            data-cursor="hover"
            disabled={disabled}
            onClick={() => onSuggestion(s.text)}
            className={cn(
              "omega-glass-thin group flex items-center gap-3 rounded-xl p-3 text-left",
              "transition-all duration-300",
              "hover:-translate-y-0.5 hover:border-[oklch(0.82_0.17_162_/_0.4)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
              disabled && "cursor-not-allowed opacity-50 hover:translate-y-0"
            )}
          >
            <span className="text-lg" aria-hidden>
              {s.icon}
            </span>
            <span className="flex-1 text-sm text-[var(--omega-fg)]">
              {s.text}
            </span>
            <Sparkles
              className="size-3.5 text-[var(--omega-muted)] opacity-0 transition-opacity duration-300 group-hover:text-[var(--omega-emerald)] group-hover:opacity-100"
              strokeWidth={2}
            />
          </button>
        ))}
      </motion.div>
    </div>
  );
}

export default ChatArea;
