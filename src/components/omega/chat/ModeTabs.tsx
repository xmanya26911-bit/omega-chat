"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Code2, MessageSquare, PenTool, Search, Terminal } from "lucide-react";
import { useChatStore, type ChatMode } from "../store/chat-store";
import { cn } from "@/lib/utils";

interface ModeDef {
  id: ChatMode;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const MODES: ModeDef[] = [
  { id: "standard", label: "Standard", icon: MessageSquare },
  { id: "research", label: "Deep Research", icon: Search },
  { id: "coding", label: "Coding", icon: Code2 },
  { id: "canvas", label: "Canvas", icon: PenTool },
  { id: "python", label: "Python", icon: Terminal },
];

/**
 * ModeTabs — pill-style horizontal tab bar for chat modes.
 *  - active tab: emerald text + animated emerald underline (layoutId)
 *  - inactive: muted
 *  - reads / writes currentMode on the chat store
 */
export function ModeTabs() {
  const currentMode = useChatStore((s) => s.currentMode);
  const setMode = useChatStore((s) => s.setMode);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full p-1",
        "omega-glass-thin"
      )}
    >
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = m.id === currentMode;
        return (
          <button
            key={m.id}
            type="button"
            data-cursor="hover"
            onClick={() => setMode(m.id)}
            aria-pressed={active}
            aria-label={`${m.label} mode`}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
              "text-xs font-medium tracking-tight transition-colors duration-300",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
              active
                ? "text-[var(--omega-emerald)]"
                : "text-[var(--omega-fg-dim)] hover:text-[var(--omega-fg)]"
            )}
          >
            {active && (
              <motion.span
                layoutId="omega-mode-underline"
                className="absolute inset-0 rounded-full"
                style={{
                  background: "oklch(0.82 0.17 162 / 0.12)",
                  boxShadow:
                    "inset 0 0 0 1px oklch(0.82 0.17 162 / 0.35)",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            {active && (
              <motion.span
                layoutId="omega-mode-bar"
                className="absolute -bottom-px left-1/2 h-px w-6 -translate-x-1/2 rounded-full"
                style={{ background: "var(--omega-emerald)" }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Icon className="relative z-10 size-3.5" strokeWidth={2} />
            <span className="relative z-10 whitespace-nowrap">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ModeTabs;
