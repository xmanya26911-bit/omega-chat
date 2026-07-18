"use client";

import * as React from "react";
import { X, Settings, Code, Bot, Save, Trash2, Plus, ChevronDown, ChevronRight, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface CustomInstructions {
  id: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  isActive?: boolean;
}

interface CustomInstructionsStore {
  instructions: CustomInstructions[];
  activeId: string | null;
  add: (ci: CustomInstructions) => void;
  remove: (id: string) => void;
  update: (id: string, data: Partial<CustomInstructions>) => void;
  setActive: (id: string | null) => void;
}

export function useCustomInstructionsStore(): CustomInstructionsStore & {
  hydrate: () => void;
  persist: () => void;
} {
  const [store, setStore] = React.useState<{
    instructions: CustomInstructions[];
    activeId: string | null;
  }>({
    instructions: [
      {
        id: "default",
        name: "Default",
        systemPrompt: "You are Omega, a helpful AI assistant. Be concise, accurate, and direct. Use markdown for formatting.",
        temperature: 0.7,
        isActive: true,
      },
    ],
    activeId: "default",
  });

  const hydrate = React.useCallback(() => {
    try {
      const raw = localStorage.getItem("omega_instructions_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        setStore((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch {}
  }, []);

  const persist = React.useCallback(() => {
    localStorage.setItem("omega_instructions_v1", JSON.stringify(store));
  }, [store]);

  React.useEffect(() => {
    hydrate();
  }, [hydrate]);

  React.useEffect(() => {
    const tid = setTimeout(persist, 500);
    return () => clearTimeout(tid);
  }, [store, persist]);

  return {
    instructions: store.instructions,
    activeId: store.activeId,
    add: (ci) => setStore((prev) => ({
      ...prev,
      instructions: [...prev.instructions, ci],
    })),
    remove: (id) => setStore((prev) => ({
      ...prev,
      instructions: prev.instructions.filter((i) => i.id !== id),
      activeId: prev.activeId === id ? null : prev.activeId,
    })),
    update: (id, data) => setStore((prev) => ({
      ...prev,
      instructions: prev.instructions.map((i) =>
        i.id === id ? { ...i, ...data } : i
      ),
    })),
    setActive: (id) => setStore((prev) => ({
      ...prev,
      activeId: id,
      instructions: prev.instructions.map((i) => ({
        ...i,
        isActive: i.id === id,
      })),
    })),
    hydrate,
    persist,
  };
}

export function CustomInstructionsDialog({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (instructions: CustomInstructions[]) => void;
}) {
  const store = useCustomInstructionsStore();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [newName, setNewName] = React.useState("");

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-[440px] max-h-[70vh] bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--omega-glass-border)]">
            <div className="flex items-center gap-2">
              <Settings className="size-5 text-[var(--omega-emerald)]" />
              <h3 className="font-semibold text-[var(--omega-fg)]">Custom Instructions</h3>
            </div>
            <button
              onClick={onClose}
              className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
              aria-label="Close"
            >
              <X className="size-4.5" strokeWidth={2} />
            </button>
          </div>

          {/* Instructions list */}
          <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3">
            {store.instructions.map((ci) => (
              <div
                key={ci.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  ci.isActive
                    ? "border-[var(--omega-emerald)] bg-[oklch(0.82_0.17_162_/_0.06)]"
                    : "border-[var(--omega-glass-border)] bg-[var(--omega-bg)]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {editingId === ci.id ? (
                      <input
                        value={newName || ci.name}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-transparent text-sm font-medium text-[var(--omega-fg)] border-b border-[var(--omega-emerald)] focus:outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            store.update(ci.id, { name: newName || ci.name });
                            setEditingId(null);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-sm font-medium text-[var(--omega-fg)]">
                        {ci.name}
                      </span>
                    )}
                    {ci.isActive && (
                      <Star className="size-3.5 text-[var(--omega-emerald)] fill-[var(--omega-emerald)]" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => store.setActive(ci.isActive ? null : ci.id)}
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-lg transition",
                        ci.isActive
                          ? "bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)]"
                          : "bg-[var(--omega-glass-border)] text-[var(--omega-fg-dim)] hover:text-[var(--omega-fg)]"
                      )}
                    >
                      {ci.isActive ? "Active" : "Activate"}
                    </button>
                    {ci.id !== "default" && (
                      <button
                        onClick={() => store.remove(ci.id)}
                        className="size-7 flex items-center justify-center rounded-lg text-[var(--omega-muted)] hover:text-[var(--omega-rose)] hover:bg-[oklch(0.7_0.21_14_/_0.1)] transition"
                      >
                        <Trash2 className="size-3.5" strokeWidth={2} />
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={ci.systemPrompt}
                  onChange={(e) => store.update(ci.id, { systemPrompt: e.target.value })}
                  className="w-full bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-lg p-2 text-xs font-mono text-[var(--omega-fg-dim)] resize-none focus:outline-none focus:border-[var(--omega-emerald)] transition"
                  rows={3}
                  placeholder="System prompt..."
                />
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={ci.temperature}
                    onChange={(e) => store.update(ci.id, { temperature: parseFloat(e.target.value) })}
                    className="flex-1 h-1 accent-[var(--omega-emerald)]"
                  />
                  <span className="font-mono text-[10px] text-[var(--omega-muted)] w-10 text-right">
                    {ci.temperature.toFixed(1)}
        </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add new */}
          <div className="p-4 pt-0">
            <button
              onClick={() => {
                const id = Date.now().toString(36);
                store.add({
                  id,
                  name: `Instructions ${store.instructions.length + 1}`,
                  systemPrompt: "",
                  temperature: 0.7,
                });
              }}
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-dashed border-[var(--omega-glass-border)] text-sm text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:border-[var(--omega-emerald)] transition"
            >
              <Plus className="size-4" strokeWidth={2} />
              New instruction set
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CustomInstructionsDialog;