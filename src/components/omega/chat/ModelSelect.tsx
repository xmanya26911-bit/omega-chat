"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "../store/chat-store";
import { cn } from "@/lib/utils";

interface ModelDef {
  id: string;
  name: string;
  provider: string;
  free?: boolean;
}

// ── The 5 OpenCode free models (the only models available) ──────
const MODELS: ModelDef[] = [
  { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free", provider: "opencode", free: true },
  { id: "mimo-v2.5-free", name: "MiMo-V2.5 Free", provider: "opencode", free: true },
  { id: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free", provider: "opencode", free: true },
  { id: "north-mini-code-free", name: "North Mini Code Free", provider: "opencode", free: true },
  { id: "big-pickle", name: "Big Pickle", provider: "opencode", free: true },
];

function truncateModel(id: string, max = 24): string {
  if (id.length <= max) return id;
  return id.slice(0, max - 1) + "…";
}

export function ModelSelect() {
  const currentModel = useChatStore((s) => s.currentModel);
  const setModel = useChatStore((s) => s.setModel);
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-cursor="hover"
          aria-label="Select model"
          className={cn(
            "group relative inline-flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5",
            "omega-glass-thin text-left transition-all duration-300",
            "hover:border-[oklch(0.82_0.17_162_/_0.4)] focus-visible:outline-none",
            "focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]"
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{
                background: "var(--omega-emerald)",
                boxShadow: "0 0 8px oklch(0.82 0.17 162 / 0.7)",
              }}
            />
            <span className="truncate font-mono text-xs tracking-tight text-[var(--omega-fg)]">
              {truncateModel(currentModel)}
            </span>
            <span
              className="shrink-0 rounded px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider"
              style={{
                color: "var(--omega-emerald)",
                background: "oklch(0.82 0.17 162 / 0.14)",
                border: "1px solid oklch(0.82 0.17 162 / 0.3)",
              }}
            >
              Free
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-[var(--omega-fg-dim)] transition-transform duration-300",
              open && "rotate-180 text-[var(--omega-emerald)]"
            )}
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className={cn(
          "min-w-[300px] max-h-[420px] overflow-y-auto p-2 rounded-xl",
          "omega-glass border-[var(--omega-glass-border)]"
        )}
      >
        <div className="px-2 pb-1 pt-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--omega-emerald)]">
            ⚡ Free
          </div>
        </div>
        {MODELS.map((m) => {
          const active = m.id === currentModel;
          return (
            <DropdownMenuItem
              key={m.id}
              data-cursor="hover"
              onSelect={(e) => {
                e.preventDefault();
                setModel(m.id);
                setOpen(false);
              }}
              className={cn(
                "group/item relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-2",
                "cursor-pointer outline-none transition-colors duration-200",
                "data-[highlighted]:bg-[oklch(0.82_0.17_162_/_0.1)]",
                active && "bg-[oklch(0.82_0.17_162_/_0.08)]"
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {active ? (
                  <Check
                    className="size-3.5 shrink-0 text-[var(--omega-emerald)]"
                    strokeWidth={2.5}
                  />
                ) : (
                  <span className="size-3.5 shrink-0" />
                )}
                <span
                  className={cn(
                    "truncate font-mono text-xs",
                    active
                      ? "text-[var(--omega-emerald)]"
                      : "text-[var(--omega-fg)]"
                  )}
                >
                  {m.name}
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
  );
}

export default ModelSelect;
