"use client";

import * as React from "react";
import { Check, ChevronDown, CloudOff, Radio } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useChatStore } from "../store/chat-store";
import { cn } from "@/lib/utils";

interface ProxyModel {
  id: string;
  provider: string;
  configured: boolean;
  rate_limit: string;
}

// Fallback if proxy is unreachable
const FALLBACK_MODELS: ProxyModel[] = [
  { id: "deepseek-v4-flash-free", provider: "opencode", configured: true, rate_limit: "50 req/day" },
];

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  google: "Google",
  mistral: "Mistral",
  openrouter: "OpenRouter",
  opencode: "OpenCode (Legacy)",
};

const PROVIDER_COLORS: Record<string, string> = {
  groq: "oklch(0.65 0.22 210)",      // blue
  google: "oklch(0.55 0.18 142)",     // green
  mistral: "oklch(0.60 0.20 280)",    // purple
  openrouter: "oklch(0.65 0.18 35)",  // amber
  opencode: "oklch(0.60 0.10 0)",     // gray
};

/**
 * ModelSelect — fetches model list from FreeLLMAPI proxy and shows
 * models grouped by provider with rate-limit badges.
 */
export function ModelSelect() {
  const currentModel = useChatStore((s) => s.currentModel);
  const setModel = useChatStore((s) => s.setModel);
  const [open, setOpen] = React.useState(false);
  const [models, setModels] = React.useState<ProxyModel[]>(FALLBACK_MODELS);
  const [loading, setLoading] = React.useState(true);

  // Fetch model list on mount
  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.length) setModels(data.data);
      })
      .catch(() => {
        if (!cancelled) setModels(FALLBACK_MODELS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Group by provider
  const configuredModels = models.filter((m) => m.configured);
  const unconfiguredModels = models.filter((m) => !m.configured);
  const groups = groupBy(configuredModels, (m) => m.provider);
  const unconfGroups = groupBy(unconfiguredModels, (m) => m.provider);

  function truncateModel(id: string, max = 28): string {
    if (id.length <= max) return id;
    return id.slice(0, max - 1) + "…";
  }

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
        {loading && (
          <div className="flex items-center justify-center gap-2 px-3 py-6">
            <Radio className="size-3.5 animate-pulse text-[var(--omega-emerald)]" />
            <span className="font-mono text-xs text-[var(--omega-fg-dim)]">
              Loading models…
            </span>
          </div>
        )}

        {!loading && (
          <>
            {/* ── Configured Providers ── */}
            {Object.entries(groups).map(([provider, providerModels]) => (
              <div key={provider}>
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ background: PROVIDER_COLORS[provider] || "oklch(0.6 0.1 0)" }}
                  />
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--omega-muted)]">
                    {PROVIDER_LABELS[provider] || provider}
                  </span>
                </div>
                {providerModels.map((m) => {
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
                          {m.id.includes("/") ? m.id.split("/")[1] : m.id}
                        </span>
                      </span>

                      {/* Rate limit badge */}
                      <span
                        className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[8px] font-semibold whitespace-nowrap"
                        style={{
                          color: "var(--omega-amber)",
                          background: "oklch(0.82 0.17 82 / 0.12)",
                          border: "1px solid oklch(0.82 0.17 82 / 0.2)",
                        }}
                        title={m.rate_limit}
                      >
                        {m.rate_limit}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </div>
            ))}

            {/* ── Unconfigured Providers ── */}
            {Object.entries(unconfGroups).length > 0 && (
              <>
                <div className="my-2 border-t border-[var(--omega-glass-border)]" />
                <div className="px-2.5 py-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--omega-fg-dim)]">
                    ⏳ Unconfigured
                  </span>
                </div>
                {Object.entries(unconfGroups).map(([provider, providerModels]) => (
                  <div key={`unconf-${provider}`}>
                    <div className="px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--omega-muted)]">
                      {PROVIDER_LABELS[provider] || provider}
                    </div>
                    {providerModels.map((m) => (
                      <div
                        key={m.id}
                        className="group/item flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-2.5 py-2 opacity-40"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <CloudOff className="size-3.5 shrink-0 text-[var(--omega-fg-dim)]" />
                          <span className="truncate font-mono text-xs text-[var(--omega-fg-dim)]">
                            {m.id.includes("/") ? m.id.split("/")[1] : m.id}
                          </span>
                        </span>
                        {m.rate_limit && (
                          <span className="shrink-0 rounded px-1 py-px font-mono text-[9px] text-[var(--omega-fg-dim)]">
                            {m.rate_limit}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModelSelect;
