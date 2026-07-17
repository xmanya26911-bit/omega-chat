"use client";

import * as React from "react";
import { Check, ChevronDown, Radio } from "lucide-react";
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
  deprecated?: boolean;
  rate_limit?: string;
}

// ── Built-in OpenCode models ──────────────────────────────────
const OPENCODE_MODELS: ModelDef[] = [
  // ── Free Models ──
  { id: "deepseek-v4-flash-free", name: "DeepSeek V4 Flash Free", provider: "OpenCode", free: true },
  { id: "mimo-v2.5-free", name: "MiMo-V2.5 Free", provider: "OpenCode", free: true },
  { id: "nemotron-3-ultra-free", name: "Nemotron 3 Ultra Free", provider: "OpenCode", free: true },
  { id: "north-mini-code-free", name: "North Mini Code Free", provider: "OpenCode", free: true },
  { id: "big-pickle", name: "Big Pickle (Free)", provider: "OpenCode", free: true },

  // ── DeepSeek ──
  { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "DeepSeek" },
  { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "DeepSeek" },

  // ── Claude (Anthropic) ──
  { id: "claude-fable-5", name: "Claude Fable 5", provider: "Anthropic" },
  { id: "claude-opus-4-8", name: "Claude Opus 4.8", provider: "Anthropic" },
  { id: "claude-opus-4-7", name: "Claude Opus 4.7", provider: "Anthropic" },
  { id: "claude-opus-4-6", name: "Claude Opus 4.6", provider: "Anthropic" },
  { id: "claude-opus-4-5", name: "Claude Opus 4.5", provider: "Anthropic" },
  { id: "claude-sonnet-5", name: "Claude Sonnet 5", provider: "Anthropic" },
  { id: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic" },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "Anthropic" },
  { id: "claude-haiku-4-5", name: "Claude Haiku 4.5", provider: "Anthropic" },

  // ── GPT (OpenAI) ──
  { id: "gpt-5.6-sol", name: "GPT 5.6 Sol", provider: "OpenAI" },
  { id: "gpt-5.6-terra", name: "GPT 5.6 Terra", provider: "OpenAI" },
  { id: "gpt-5.6-luna", name: "GPT 5.6 Luna", provider: "OpenAI" },
  { id: "gpt-5.5", name: "GPT 5.5", provider: "OpenAI" },
  { id: "gpt-5.5-pro", name: "GPT 5.5 Pro", provider: "OpenAI" },
  { id: "gpt-5.4", name: "GPT 5.4", provider: "OpenAI" },
  { id: "gpt-5.4-pro", name: "GPT 5.4 Pro", provider: "OpenAI" },
  { id: "gpt-5.4-mini", name: "GPT 5.4 Mini", provider: "OpenAI" },
  { id: "gpt-5.4-nano", name: "GPT 5.4 Nano", provider: "OpenAI" },
  { id: "gpt-5.3-codex", name: "GPT 5.3 Codex", provider: "OpenAI" },
  { id: "gpt-5.3-codex-spark", name: "GPT 5.3 Codex Spark", provider: "OpenAI" },
  { id: "gpt-5.2", name: "GPT 5.2", provider: "OpenAI" },
  { id: "gpt-5.2-codex", name: "GPT 5.2 Codex", provider: "OpenAI", deprecated: true },
  { id: "gpt-5.1", name: "GPT 5.1", provider: "OpenAI" },
  { id: "gpt-5.1-codex", name: "GPT 5.1 Codex", provider: "OpenAI" },
  { id: "gpt-5.1-codex-max", name: "GPT 5.1 Codex Max", provider: "OpenAI" },
  { id: "gpt-5.1-codex-mini", name: "GPT 5.1 Codex Mini", provider: "OpenAI" },
  { id: "gpt-5", name: "GPT 5", provider: "OpenAI" },
  { id: "gpt-5-codex", name: "GPT 5 Codex", provider: "OpenAI" },
  { id: "gpt-5-nano", name: "GPT 5 Nano", provider: "OpenAI" },

  // ── Gemini (Google) ──
  { id: "gemini-3.5-flash", name: "Gemini 3.5 Flash", provider: "Google" },
  { id: "gemini-3.1-pro", name: "Gemini 3.1 Pro", provider: "Google" },
  { id: "gemini-3-flash", name: "Gemini 3 Flash", provider: "Google" },

  // ── Qwen ──
  { id: "qwen3.7-max", name: "Qwen3.7 Max", provider: "Qwen" },
  { id: "qwen3.7-plus", name: "Qwen3.7 Plus", provider: "Qwen" },
  { id: "qwen3.6-plus", name: "Qwen3.6 Plus", provider: "Qwen" },
  { id: "qwen3.5-plus", name: "Qwen3.5 Plus", provider: "Qwen" },

  // ── Kimi ──
  { id: "kimi-k2.7-code", name: "Kimi K2.7 Code", provider: "Kimi" },
  { id: "kimi-k2.6", name: "Kimi K2.6", provider: "Kimi" },
  { id: "kimi-k2.5", name: "Kimi K2.5", provider: "Kimi" },

  // ── GLM (Zhipu) ──
  { id: "glm-5.2", name: "GLM 5.2", provider: "Zhipu" },
  { id: "glm-5.1", name: "GLM 5.1", provider: "Zhipu" },
  { id: "glm-5", name: "GLM 5", provider: "Zhipu" },

  // ── MiniMax ──
  { id: "minimax-m3", name: "MiniMax M3", provider: "MiniMax" },
  { id: "minimax-m2.7", name: "MiniMax M2.7", provider: "MiniMax" },
  { id: "minimax-m2.5", name: "MiniMax M2.5", provider: "MiniMax" },

  // ── Grok (xAI) ──
  { id: "grok-4.5", name: "Grok 4.5", provider: "xAI" },
  { id: "grok-build-0.1", name: "Grok Build 0.1", provider: "xAI" },
];

// ── Proxy models (fetched from API) ────────────────────────────
interface ProxyModel {
  id: string;
  provider: string;
  rate_limit: string;
}

const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq (Via Proxy)",
  google: "Google (Via Proxy)",
  mistral: "Mistral (Via Proxy)",
  openrouter: "OpenRouter (Via Proxy)",
  opencode: "OpenCode",
};

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {};
  for (const item of arr) {
    const k = key(item);
    if (!map[k]) map[k] = [];
    map[k].push(item);
  }
  return map;
}

function truncateModel(id: string, max = 24): string {
  if (id.length <= max) return id;
  return id.slice(0, max - 1) + "…";
}

export function ModelSelect() {
  const currentModel = useChatStore((s) => s.currentModel);
  const setModel = useChatStore((s) => s.setModel);
  const [open, setOpen] = React.useState(false);
  const [proxyModels, setProxyModels] = React.useState<ProxyModel[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Fetch proxy model list on mount
  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.length) {
          setProxyModels(data.data.filter((m: any) => m.configured));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Build the model list ──────────────────────────────────
  const freeModels = OPENCODE_MODELS.filter((m) => m.free);
  const paidOpenCode = OPENCODE_MODELS.filter((m) => !m.free);

  // Merge proxy models into paid list
  const paidFromProxy: ModelDef[] = proxyModels.map((m) => ({
    id: m.id,
    name: m.id.includes("/") ? m.id.split("/")[1] : m.id,
    provider: PROVIDER_LABELS[m.provider] || m.provider,
    rate_limit: m.rate_limit,
  }));

  const allPaid = [...paidOpenCode, ...paidFromProxy];
  const paidGroups = groupBy(allPaid, (m) => m.provider);

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
                background: freeModels.some(m => m.id === currentModel)
                  ? "var(--omega-emerald)"
                  : "var(--omega-amber)",
                boxShadow: freeModels.some(m => m.id === currentModel)
                  ? "0 0 8px oklch(0.82 0.17 162 / 0.7)"
                  : "0 0 8px oklch(0.82 0.17 82 / 0.7)",
              }}
            />
            <span className="truncate font-mono text-xs tracking-tight text-[var(--omega-fg)]">
              {truncateModel(currentModel)}
            </span>
            {freeModels.some(m => m.id === currentModel) ? (
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
            ) : (
              <span
                className="shrink-0 rounded px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wider"
                style={{
                  color: "var(--omega-amber)",
                  background: "oklch(0.82 0.17 82 / 0.14)",
                  border: "1px solid oklch(0.82 0.17 82 / 0.3)",
                }}
              >
                Pro
              </span>
            )}
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
        {/* ── Free Models (clickable) ── */}
        <div className="px-2 pb-1 pt-1.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--omega-emerald)]">
            ⚡ Free
          </div>
        </div>
        {freeModels.map((m) => {
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

        {/* ── Separator ── */}
        <div className="my-2 border-t border-[var(--omega-glass-border)]" />

        {/* ── Pro Models (locked) ── */}
        <div className="px-2 pb-1 pt-0.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--omega-amber)]">
            🔒 Pro — Coming Soon
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 px-3 py-4">
            <Radio className="size-3.5 animate-pulse text-[var(--omega-amber)]" />
            <span className="font-mono text-xs text-[var(--omega-fg-dim)]">
              Loading more models…
            </span>
          </div>
        )}

        {Object.entries(paidGroups).map(([groupName, models]) => (
          <div key={groupName}>
            <div className="px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--omega-muted)]">
              {groupName}
            </div>
            {models.map((m) => (
              <div
                key={m.id}
                className="group/item flex cursor-not-allowed items-center justify-between gap-2 rounded-lg px-2.5 py-2 opacity-40"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-3.5 shrink-0 text-[var(--omega-fg-dim)]">🔒</span>
                  <span className="truncate font-mono text-xs text-[var(--omega-fg-dim)]">
                    {m.name}
                  </span>
                </span>
                <div className="flex items-center gap-1.5">
                  {m.rate_limit && (
                    <span
                      className="shrink-0 rounded px-1 py-px font-mono text-[8px]"
                      style={{
                        color: "var(--omega-fg-dim)",
                        background: "oklch(0.5 0.02 0 / 0.15)",
                      }}
                    >
                      {m.rate_limit}
                    </span>
                  )}
                  <span
                    className="shrink-0 rounded px-1 py-px font-mono text-[9px] uppercase text-[var(--omega-amber)]"
                    style={{ background: "oklch(0.82 0.17 82 / 0.12)" }}
                  >
                    Pro
                  </span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ModelSelect;
