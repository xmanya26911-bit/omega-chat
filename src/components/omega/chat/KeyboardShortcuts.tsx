"use client";

import * as React from "react";
import { X, Keyboard, Command, ArrowUp, Enter, Slash, Delete, Search, Plus, FileDown, Settings, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
  icon?: React.ReactNode;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "Enter"], description: "Send message", category: "Chat", icon: <Enter className="size-3.5" /> },
  { keys: ["Shift", "Enter"], description: "New line", category: "Chat", icon: <ArrowUp className="size-3.5 rotate-180" /> },
  { keys: ["Ctrl", "/"], description: "Commands menu", category: "Chat", icon: <Slash className="size-3.5" /> },
  { keys: ["Ctrl", "N"], description: "New chat", category: "Navigation", icon: <Plus className="size-3.5" /> },
  { keys: ["Ctrl", "K"], description: "Search conversations", category: "Navigation", icon: <Search className="size-3.5" /> },
  { keys: ["Ctrl", "L"], description: "Clear chat", category: "Chat", icon: <Delete className="size-3.5" /> },
  { keys: ["Ctrl", "W"], description: "Close dialog / panel", category: "Navigation", icon: <X className="size-3.5" /> },
  { keys: ["Ctrl", "S"], description: "Export conversation", category: "Chat", icon: <FileDown className="size-3.5" /> },
  { keys: ["Ctrl", "Shift", "I"], description: "Toggle Python REPL", category: "Tools", icon: <Command className="size-3.5" /> },
  { keys: ["Ctrl", "Shift", "A"], description: "Toggle Artifacts panel", category: "Tools", icon: <Command className="size-3.5" /> },
  { keys: ["Ctrl", "Shift", "O"], description: "Toggle search", category: "Chat", icon: <Search className="size-3.5" /> },
  { keys: ["Escape"], description: "Cancel generation", category: "Chat", icon: <X className="size-3.5" /> },
  { keys: ["ArrowUp"], description: "Edit last message", category: "Chat", icon: <ArrowUp className="size-3.5" /> },
  { keys: ["Ctrl", "M"], description: "Toggle model selector", category: "Navigation", icon: <Settings className="size-3.5" /> },
  { keys: ["Ctrl", "Shift", "H"], description: "Toggle history sidebar", category: "Navigation", icon: <MessageSquare className="size-3.5" /> },
];

export function KeyboardShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const categories = Array.from(new Set(SHORTCUTS.map((s) => s.category)));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-[420px] max-h-[70vh] bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-4 border-b border-[var(--omega-glass-border)]">
            <div className="flex items-center gap-2">
              <Keyboard className="size-5 text-[var(--omega-emerald)]" />
              <h3 className="font-semibold text-[var(--omega-fg)]">Keyboard Shortcuts</h3>
            </div>
            <button
              onClick={onClose}
              className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
              aria-label="Close"
            >
              <X className="size-4.5" strokeWidth={2} />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[50vh] p-4 space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <h4 className="font-medium text-xs text-[var(--omega-muted)] uppercase tracking-wider mb-2">
                  {category}
                </h4>
                <div className="space-y-1.5">
                  {SHORTCUTS.filter((s) => s.category === category).map((shortcut, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--omega-muted)]">{shortcut.icon}</span>
                        <span className="text-xs text-[var(--omega-fg-dim)]">
                          {shortcut.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, ki) => (
                          <React.Fragment key={ki}>
                            <kbd className={cn(
                              "inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-md",
                              "bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] text-[10px] font-mono font-medium",
                              "text-[var(--omega-fg)] shadow-sm"
                            )}>
                              {key === "Ctrl" ? "⌃" : key === "Command" ? "⌘" : key}
                            </kbd>
                            {ki < shortcut.keys.length - 1 && (
                              <span className="text-[var(--omega-muted)] text-[10px]">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 pt-2 border-t border-[var(--omega-glass-border)] bg-[var(--omega-bg)]">
            <p className="font-mono text-[10px] text-[var(--omega-muted)] text-center">
              Press <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] text-[10px] font-mono">?</kbd> anytime to show this panel
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default KeyboardShortcutsDialog;