"use client";

import * as React from "react";
import {
  X,
  Plus,
  Brain,
  Zap,
  Trash2,
  RotateCcw,
  Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMemoryStore, type Memory } from "../store/memory-store";
import { cn } from "@/lib/utils";

const SUGGESTED_FACTS = [
  { key: "Name", placeholder: "e.g. Manya" },
  { key: "Role", placeholder: "e.g. Developer, Student" },
  { key: "Language", placeholder: "e.g. Python, TypeScript" },
  { key: "Goal", placeholder: "e.g. Build an AI platform" },
];

export function MemoryManager({ onClose }: { onClose: () => void }) {
  const memories = useMemoryStore((s) => s.memories);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const removeMemory = useMemoryStore((s) => s.removeMemory);

  const [editingKey, setEditingKey] = React.useState<string | null>(null);
  const [newKey, setNewKey] = React.useState("");
  const [newValue, setNewValue] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);

  const handleAdd = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    addMemory(newKey.trim(), newValue.trim());
    setNewKey("");
    setNewValue("");
    setShowAdd(false);
  };

  const handleSuggested = (key: string, placeholder: string) => {
    setNewKey(key);
    setNewValue(placeholder);
    setShowAdd(true);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between p-3 border-b border-[var(--omega-glass-border)] bg-[var(--omega-bg)]">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-[var(--omega-emerald)]" />
          <h3 className="font-semibold text-[var(--omega-fg)]">
            Memory
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--omega-emerald)] hover:bg-[oklch(0.82_0.17_162_/_0.1)] transition"
            aria-label="Add memory"
          >
            <Plus className="size-4" strokeWidth={2} />
          </button>
          <button
            onClick={onClose}
            className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--omega-muted)] hover:bg-[var(--omega-glass-border)] transition"
            aria-label="Close"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Add memory form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-[var(--omega-glass-border)]"
          >
            <div className="p-3 space-y-2">
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="Fact label (e.g. Name, Skill)"
                className="w-full bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] rounded-lg px-3 py-2 text-xs text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none focus:border-[var(--omega-emerald)]"
                onKeyDown={(e) => e.key === "Enter" && newValue && handleAdd()}
              />
              <textarea
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="What to remember..."
                rows={2}
                className="w-full bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] rounded-lg px-3 py-2 text-xs text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none focus:border-[var(--omega-emerald)] resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && newKey) handleAdd();
                }}
              />
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 text-xs text-[var(--omega-muted)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)] rounded-lg hover:opacity-90 transition disabled:opacity-40"
                >
                  <Zap className="size-3.5 inline mr-1" strokeWidth={2} />
                  Remember
                </button>
              </div>
              {/* Suggested facts */}
              <div className="pt-1">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--omega-muted)] mb-1.5">
                  Quick add
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_FACTS.map((s) => (
                    <button
                      key={s.key}
                      onClick={() => handleSuggested(s.key, s.placeholder)}
                      className="px-2 py-1 rounded-md border border-[var(--omega-glass-border)] bg-[var(--omega-bg)] text-[11px] text-[var(--omega-fg-dim)] hover:border-[var(--omega-emerald)] hover:text-[var(--omega-emerald)] transition-colors"
                    >
                      + {s.key}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Memory list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {memories.length === 0 && !showAdd && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Brain className="size-10 text-[var(--omega-muted)] mb-3 opacity-40" />
            <div className="text-xs text-[var(--omega-muted)]">
              No memories yet
            </div>
            <div className="text-[10px] text-[var(--omega-muted)] mt-1 opacity-60">
              Teach Omega about yourself for a personalized experience
            </div>
          </div>
        )}
        <AnimatePresence>
          {memories.map((mem) => (
            <MemoryItem
              key={mem.key}
              memory={mem}
              onDelete={() => removeMemory(mem.key)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-[var(--omega-glass-border)] px-3 py-2 bg-[var(--omega-bg)]">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-[var(--omega-muted)]">
            {memories.length} fact{memories.length !== 1 ? "s" : ""} remembered
          </span>
          <span className="font-mono text-[10px] text-[var(--omega-muted)] italic">
            Synced via Drive ☁️
          </span>
        </div>
      </div>
    </div>
  );
}

function MemoryItem({
  memory,
  onDelete,
}: {
  memory: Memory;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className="group flex items-start gap-2 rounded-lg border border-[var(--omega-glass-border)] bg-[var(--omega-bg)] p-2.5"
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-[oklch(0.82_0.17_162_/_0.1)]">
        <Zap className="size-3.5 text-[var(--omega-emerald)]" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium text-[var(--omega-fg)]">
          {memory.key}
        </div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-[var(--omega-fg-dim)]">
          {memory.value}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="shrink-0 rounded-md p-1.5 text-[var(--omega-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--omega-rose)] hover:bg-[oklch(0.7_0.21_14_/_0.1)] transition"
        aria-label={`Delete memory ${memory.key}`}
      >
        <Trash2 className="size-3.5" strokeWidth={2} />
      </button>
    </motion.div>
  );
}

export default MemoryManager;
