"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plug, Zap, ChevronDown, ChevronRight } from "lucide-react";
import { usePluginStore } from "../store/plugin-store";
import { PLUGIN_DEFS } from "@/lib/plugin-defs";
import { cn } from "@/lib/utils";

export function PluginPanel({ collapsed }: { collapsed?: boolean }) {
  const { plugins, checking, connect, disconnect, fetchStatus } = usePluginStore();
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  if (collapsed) {
    // Show just a tiny icon indicator
    const connected = Object.values(plugins).filter((p) => p.connected).length;
    return (
      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={() => {}}
          className="omega-glass-thin flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition hover:bg-[oklch(0.82_0.17_162_/_0.1)]"
          title={`${connected} plugin(s) connected`}
        >
          <Zap className="size-3.5 text-[var(--omega-emerald)]" strokeWidth={2} />
          <span className="flex-1 text-[10px] font-medium text-[var(--omega-fg-dim)]">
            Plugins
          </span>
          {connected > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-[var(--omega-emerald)] text-[8px] font-bold text-white">
              {connected}
            </span>
          )}
        </button>
      </div>
    );
  }

  const connectedCount = Object.values(plugins).filter((p) => p.connected).length;

  return (
    <div className="px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1.5 text-left transition hover:bg-[oklch(0.82_0.17_162_/_0.06)]"
      >
        {open ? (
          <ChevronDown className="size-3 text-[var(--omega-muted)]" strokeWidth={2} />
        ) : (
          <ChevronRight className="size-3 text-[var(--omega-muted)]" strokeWidth={2} />
        )}
        <Plug className="size-3.5 text-[var(--omega-emerald)]" strokeWidth={2} />
        <span className="flex-1 text-[11px] font-semibold text-[var(--omega-fg)]">
          Plugins
        </span>
        {connectedCount > 0 && (
          <span className="rounded-full bg-[var(--omega-emerald)] px-1.5 py-0.5 text-[9px] font-bold text-white">
            {connectedCount}
          </span>
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="plugins-list"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1">
              {PLUGIN_DEFS.filter(d => d.id === "github" || d.id === "vercel").map((def) => {
                const conn = plugins[def.id];
                const isConnected = conn?.connected ?? false;
                const isLoading = checking[def.id] ?? false;

                return (
                  <div
                    key={def.id}
                    className={cn(
                      "omega-glass-thin flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all",
                      isConnected && "border-l-2 border-[var(--omega-emerald)]",
                      isConnected
                        ? "bg-[oklch(0.82_0.17_162_/_0.04)]"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center text-xs">
                      {def.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11px] font-medium text-[var(--omega-fg)]">
                          {def.name}
                        </span>
                        {isConnected && (
                          <span className="shrink-0 rounded-full bg-[var(--omega-emerald)] px-1.5 py-[1px] text-[8px] font-semibold text-white">
                            ✓
                          </span>
                        )}
                      </div>
                      {def.desc && (
                        <div className="truncate text-[9px] text-[var(--omega-muted)]">
                          {def.desc}
                        </div>
                      )}
                    </div>

                    {isConnected ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => disconnect(def.id)}
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition",
                          "text-[var(--omega-rose)] hover:bg-[oklch(0.7_0.21_14_/_0.1)]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
                          isLoading && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {isLoading ? "…" : "Disconnect"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isLoading || def.coming_soon}
                        onClick={() => connect(def.id)}
                        className={cn(
                          "shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition",
                          "bg-[var(--omega-emerald)]/10 text-[var(--omega-emerald)] hover:bg-[var(--omega-emerald)]/20",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
                          (isLoading || def.coming_soon) && "opacity-40 cursor-not-allowed"
                        )}
                      >
                        {isLoading ? "…" : def.coming_soon ? "Soon" : "Connect"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
