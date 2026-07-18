"use client";

import { Loader2, Lightbulb, ChevronDown, ChevronRight, Brain, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import * as React from "react";

interface ReasoningDisplayProps {
  content: string;
  isStreaming?: boolean;
  className?: string;
}

export function ReasoningDisplay({ content, isStreaming, className }: ReasoningDisplayProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  if (!content) return null;

  const lines = content.split("\n").filter(Boolean);
  const preview = lines.slice(0, 3).join("\n");
  const hasMore = lines.length > 3;

  return (
    <div
      className={cn(
        "rounded-xl border border-[oklch(0.82_0.17_162_/_0.2)] bg-[oklch(0.82_0.17_162_/_0.04)] overflow-hidden transition-all",
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-[var(--omega-emerald)] hover:bg-[oklch(0.82_0.17_162_/_0.08)] transition-colors"
      >
        <Brain className="size-3.5" strokeWidth={2} />
        <span className="font-medium">Thinking</span>
        {isStreaming && <Loader2 className="size-3 animate-spin ml-1" />}
        <span className="text-[10px] text-[var(--omega-muted)]">
          {lines.length} {lines.length === 1 ? "step" : "steps"}
        </span>
        <div className="flex-1" />
        {isExpanded ? (
          <ChevronDown className="size-3.5" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="size-3.5" strokeWidth={1.5} />
        )}
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-3 pb-3 space-y-2">
              {lines.map((line, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-mono text-[var(--omega-emerald)] mt-0.5 shrink-0">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-xs text-[var(--omega-fg-dim)] leading-relaxed">{line}</p>
                </div>
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 text-[10px] text-[var(--omega-emerald)] animate-pulse">
                  <Sparkles className="size-3" strokeWidth={2} />
                  Reasoning...
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Citation Display ──────────────────────────────────────────────────

interface Citation {
  id: string;
  title: string;
  url: string;
  snippet: string;
  relevance?: number;
}

interface SearchCitationsProps {
  citations: Citation[];
  className?: string;
}

export function SearchCitations({ citations, className }: SearchCitationsProps) {
  const [expanded, setExpanded] = React.useState(false);

  if (!citations || citations.length === 0) return null;

  return (
    <div className={cn("mt-3", className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs text-[var(--omega-fg-dim)] hover:text-[var(--omega-fg)] transition-colors"
      >
        <Lightbulb className="size-3.5" strokeWidth={1.5} />
        <span>{citations.length} sources</span>
        {expanded ? (
          <ChevronDown className="size-3" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="size-3" strokeWidth={1.5} />
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-2"
          >
            {citations.map((cite) => (
              <a
                key={cite.id}
                href={cite.url}
                target="_blank"
                rel="noreferrer noopener"
                className="flex flex-col gap-1 rounded-lg border border-[var(--omega-glass-border)] bg-[var(--omega-bg)] p-2.5 hover:bg-[var(--omega-glass-border)] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--omega-fg)] truncate">
                    {cite.title || cite.url}
                  </span>
                  {cite.relevance && (
                    <span className="shrink-0 text-[10px] text-[var(--omega-emerald)]">
                      {Math.round(cite.relevance * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--omega-fg-dim)] line-clamp-2">
                  {cite.snippet}
                </p>
                <span className="text-[10px] text-[var(--omega-muted)] truncate">
                  {cite.url}
                </span>
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Token Usage Display ──────────────────────────────────────────────

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number;
  model: string;
}

interface TokenUsageProps {
  usage: TokenUsage | null;
  className?: string;
}

export function TokenUsageDisplay({ usage, className }: TokenUsageProps) {
  if (!usage) return null;

  const formatTokens = (n: number) => {
    if (n >= 1000) return (n / 1000).toFixed(1) + "k";
    return n.toString();
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-2 py-1.5 text-[10px] font-mono text-[var(--omega-muted)]",
        className
      )}
    >
      <span className="flex items-center gap-1">
        <span className="inline-block size-1.5 rounded-full bg-blue-400" />
        {formatTokens(usage.inputTokens)} in
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-1.5 rounded-full bg-green-400" />
        {formatTokens(usage.outputTokens)} out
      </span>
      <span className="flex items-center gap-1">
        <span className="inline-block size-1.5 rounded-full bg-[var(--omega-muted)]" />
        {formatTokens(usage.totalTokens)} total
      </span>
      {usage.cost !== undefined && usage.cost > 0 && (
        <span className="text-[var(--omega-emerald)]">
          ${usage.cost.toFixed(6)}
        </span>
      )}
    </div>
  );
}

export default ReasoningDisplay;