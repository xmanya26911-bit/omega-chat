"use client";

import * as React from "react";
import { X, RotateCcw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefsStore } from "../store/prefs-store";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: Props) {
  const customInstructions = usePrefsStore((s) => s.customInstructions);
  const temperature = usePrefsStore((s) => s.temperature);
  const setCustomInstructions = usePrefsStore((s) => s.setCustomInstructions);
  const setTemperature = usePrefsStore((s) => s.setTemperature);

  const [localInstructions, setLocalInstructions] = React.useState(customInstructions);
  const [localTemp, setLocalTemp] = React.useState(temperature);

  React.useEffect(() => {
    if (open) {
      setLocalInstructions(customInstructions);
      setLocalTemp(temperature);
    }
  }, [open, customInstructions, temperature]);

  const handleSave = () => {
    setCustomInstructions(localInstructions.trim());
    setTemperature(localTemp);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-[480px] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="omega-glass rounded-2xl border border-[var(--omega-glass-border)] p-5">
              {/* Header */}
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-base font-semibold text-[var(--omega-fg)]">
                  Settings
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex size-7 items-center justify-center rounded-lg text-[var(--omega-muted)] hover:bg-[var(--omega-glass-border)] hover:text-[var(--omega-fg)] transition"
                  aria-label="Close"
                >
                  <X className="size-4" strokeWidth={2} />
                </button>
              </div>

              {/* Custom Instructions */}
              <div className="mb-4">
                <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--omega-muted)]">
                  Custom Instructions
                </label>
                <textarea
                  value={localInstructions}
                  onChange={(e) => setLocalInstructions(e.target.value)}
                  placeholder="e.g. Always respond in short answers. Use code examples."
                  rows={4}
                  className={cn(
                    "w-full resize-none rounded-xl border border-[var(--omega-glass-border)] bg-[oklch(0.14_0.008_264_/_0.5)] px-3 py-2.5",
                    "text-sm text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)]",
                    "focus:outline-none focus:border-[oklch(0.82_0.17_162_/_0.4)]",
                    "transition-colors duration-200"
                  )}
                />
              </div>

              {/* Temperature */}
              <div className="mb-5">
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--omega-muted)]">
                    Temperature
                  </label>
                  <span className="font-mono text-[11px] tabular-nums text-[var(--omega-emerald)]">
                    {localTemp.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={localTemp}
                  onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, oklch(0.82 0.17 162 / 0.6) ${(localTemp / 2) * 100}%, oklch(0.2 0.01 264) ${(localTemp / 2) * 100}%)`,
                  }}
                  aria-label="Temperature"
                />
                <div className="mt-1 flex justify-between font-mono text-[9px] text-[var(--omega-muted)]">
                  <span>Precise (0)</span>
                  <span>Creative (2)</span>
                </div>
                <div className="mt-1 font-mono text-[10px] text-[var(--omega-fg-dim)]">
                  Lower = focused, higher = creative
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs text-[var(--omega-fg-dim)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-4 py-1.5 text-xs font-medium bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)] rounded-lg hover:opacity-90 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default SettingsDialog;
