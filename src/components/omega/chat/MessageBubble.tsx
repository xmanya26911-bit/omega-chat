"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, Edit3, RefreshCw, ThumbsUp, ThumbsDown, Share2, Pencil, X, CheckCheck, Trash2, Volume2, Code, Terminal } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatMessage } from "../store/chat-store";
import { useChatStore } from "../store/chat-store";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Remark / Rehype plugins for ReactMarkdown ──────────────────────
const REMARK_PLUGINS = [remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

// ── CopyButton sub-component ──────────────────────────────────────────
interface CopyButtonProps {
  getText: () => string;
  className?: string;
  label?: string;
}

function CopyButton({ getText, className, label = "Copy code" }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const onCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <button
      type="button"
      data-cursor="hover"
      aria-label={label}
      onClick={onCopy}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md",
        "omega-glass-thin text-[var(--omega-fg-dim)] transition-colors duration-200",
        "hover:text-[var(--omega-emerald)] hover:border-[oklch(0.82_0.17_162_/_0.4)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
        className
      )}
    >
      {copied ? (
        <Check className="size-3.5 text-[var(--omega-emerald)]" strokeWidth={2.5} />
      ) : (
        <Copy className="size-3.5" strokeWidth={2} />
      )}
    </button>
  );
}

// ── MermaidBlock — renders flowchart / sequence / Gantt diagrams ──────
function MermaidBlock({ value }: { value: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Dynamic import to avoid bundle bloat
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          fontFamily: "var(--font-mono), monospace",
          themeVariables: {
            primaryColor: "oklch(0.82 0.17 162 / 0.2)",
            primaryTextColor: "#e0e4f0",
            primaryBorderColor: "oklch(0.82 0.17 162 / 0.4)",
            lineColor: "oklch(0.82 0.17 162 / 0.5)",
            secondaryColor: "oklch(0.2 0.012 264 / 0.6)",
            tertiaryColor: "oklch(0.14 0.008 264 / 0.8)",
          },
        });
        if (cancelled) return;
        const id = "mermaid-" + Math.random().toString(36).slice(2, 8);
        const { svg } = await mermaid.render(id, value);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch (e) {
        if (!cancelled) setError((e as Error).message || "Render error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [value]);

  if (error) {
    return (
      <div className="my-3 rounded-xl border border-[oklch(0.7_0.21_14_/_0.3)] bg-[oklch(0.7_0.21_14_/_0.06)] p-3 font-mono text-[11px] text-[var(--omega-rose)]">
        Mermaid error: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-3 h-24 animate-pulse rounded-xl bg-[oklch(0.14_0.008_264_/_0.6)]" />
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 flex justify-center overflow-x-auto rounded-xl bg-[oklch(0.1_0.01_264_/_0.4)] p-4"
    />
  );
}

// ── CodeBlock — memoized so streaming re-parses don't blow away state ─
interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = React.memo(function CodeBlock({ language, value }: CodeBlockProps) {
  // Mermaid diagrams
  if (language === "mermaid") {
    return <MermaidBlock value={value} />;
  }

  return (
    <div className="group/code relative my-3 overflow-hidden rounded-xl border border-[var(--omega-glass-border)]">
      {/* header bar */}
      <div className="flex items-center justify-between border-b border-[var(--omega-glass-border)] bg-[oklch(0.1_0.01_264_/_0.6)] px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--omega-muted)]">
          {language}
        </span>
        <CopyButton getText={() => value} label="Copy code" />
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          background: "oklch(0.12 0.01 264)",
          padding: "14px 16px",
          fontSize: "12.5px",
          lineHeight: "1.55",
          fontFamily: "var(--font-mono), ui-monospace, monospace",
        }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-mono), ui-monospace, monospace",
          },
        }}
        wrapLongLines={false}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
});

// ── StreamingDots — three bouncing dots loader ────────────────────────
function StreamingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-1" aria-label="Assistant is thinking">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full"
          style={{ background: "var(--omega-emerald)" }}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.05,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.16,
          }}
        />
      ))}
    </span>
  );
}

// ── LaTeX delimiter normaliser ────────────────────────────────────────
// ── LaTeX delimiter normalizer ────────────────────────────────────────
// AI models output \(...\) and \[...\] but remark-math only parses $...$ and $$...$$
function normalizeMathDelimiters(text: string): string {
  return text
    // \[ ... \] → $$ ... $$
    .replace(/\\\[/g, "$$$$")
    .replace(/\\\]/g, "$$$$")
    // \( ... \) → $ ... $
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

// ── MD_COMPONENTS + plugins ──────────────────────────────────────────

const MD_COMPONENTS = {
  pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  code: ({
    className,
    children,
    ...props
  }: {
    className?: string;
    children?: React.ReactNode;
    [key: string]: unknown;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    const raw = String(children ?? "").replace(/\n$/, "");
    const isMultiline = raw.includes("\n");
    if (!match && !isMultiline) {
      return (
        <code
          className="rounded bg-[oklch(0.82_0.17_162_/_0.1)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--omega-emerald)]"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1] || "text"} value={raw} />;
  },
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      data-cursor="hover"
      className="text-[var(--omega-emerald)] underline decoration-[oklch(0.82_0.17_162_/_0.4)] underline-offset-2 hover:decoration-[var(--omega-emerald)]"
    >
      {children}
    </a>
  ),
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => <li>{children}</li>,
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="mb-3 mt-4 font-display text-xl font-semibold first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="mb-3 mt-4 font-display text-lg font-semibold first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="mb-2 mt-3 font-display text-base font-semibold first:mt-0">{children}</h3>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="my-3 border-l-2 border-[oklch(0.82_0.17_162_/_0.4)] pl-3 text-[var(--omega-fg-dim)] italic">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-4 border-t border-[var(--omega-glass-border)]" />
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="my-3 overflow-x-auto">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-[var(--omega-glass-border)] px-2.5 py-1.5 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-[var(--omega-glass-border)] px-2.5 py-1.5">{children}</td>
  ),
};

// ── MessageBubble ─────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  isLast?: boolean;
  onRegenerate?: (messageId: string) => void;
  onEdit?: (messageId: string, newText: string) => void;
  onFeedback?: (messageId: string, type: "positive" | "negative") => void;
}

function MessageBubbleImpl({
  message,
  isStreaming = false,
  isLast = false,
  onRegenerate,
  onEdit,
  onFeedback,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.error === true;
  const isAssistant = message.role === "assistant";
  const showLoader =
    isAssistant &&
    isLast &&
    isStreaming &&
    message.content.length === 0;

  const [editing, setEditing] = React.useState(false);
  const [editText, setEditText] = React.useState(message.content);
  const [feedback, setFeedback] = React.useState<"positive" | "negative" | null>(null);
  const [speaking, setSpeaking] = React.useState(false);

  const activeSession = useChatStore((s) => s.activeSession);
  const deleteMessage = useChatStore((s) => s.deleteMessage);

  const handleSpeak = React.useCallback(() => {
    if ("speechSynthesis" in window) {
      if (speaking) {
        window.speechSynthesis.cancel();
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(message.content);
      utterance.lang = "en-US";
      utterance.rate = 1;
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  }, [message.content, speaking]);

  const handleCopy = React.useCallback(() => {
    navigator.clipboard.writeText(message.content);
  }, [message.content]);

  const handleEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit?.(message.id, editText.trim());
    }
    setEditing(false);
  };

  const handleRegenerate = () => {
    onRegenerate?.(message.id);
  }; 

  // ── USER ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex w-full flex-col items-end gap-2"
      >
        {editing ? (
          <div className="omega-glass-thin w-full max-w-[80%] rounded-2xl rounded-tr-sm p-3 border-[oklch(0.82_0.17_162_/_0.18)]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-transparent text-sm text-[var(--omega-fg)] resize-none focus:outline-none min-h-[60px]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleEdit();
                }
                if (e.key === "Escape") {
                  setEditing(false);
                  setEditText(message.content);
                }
              }}
            />
            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => { setEditing(false); setEditText(message.content); }}
                className="px-3 py-1.5 text-xs text-[var(--omega-fg-dim)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={!editText.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)] rounded-lg hover:opacity-90 transition disabled:opacity-40"
              >
                Save & Send
              </button>
            </div>
          </div>
        ) : (
          <div className="group flex items-end gap-2">
            <div
              className={cn(
                "omega-glass-thin max-w-[80%] rounded-2xl rounded-br-sm p-4 text-sm",
                "border-[oklch(0.82_0.17_162_/_0.18)] text-[var(--omega-fg)]"
              )}
            >
              <p className="whitespace-pre-wrap break-words leading-relaxed">
                {message.content}
              </p>
            </div>
            <button
              onClick={() => { setEditing(true); setEditText(message.content); }}
              className="size-8 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:bg-[var(--omega-glass-border)]"
              aria-label="Edit message"
            >
              <Pencil className="size-4" strokeWidth={2} />
            </button>
            <button
              onClick={() => {
                if (activeSession) deleteMessage(activeSession, message.id);
              }}
              className="size-8 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-[var(--omega-muted)] hover:text-[var(--omega-rose)] hover:bg-[oklch(0.7_0.21_14_/_0.12)]"
              aria-label="Delete message"
            >
              <Trash2 className="size-4" strokeWidth={2} />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ── ASSISTANT (incl. error) ───────────────────────────────────────
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      className="flex w-full flex-col gap-2"
    >
      <div className="flex w-full justify-start gap-3">
        {/* avatar */}
        <div
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold",
            isError
              ? "text-[var(--omega-rose)]"
              : "text-[oklch(0.06_0.01_264)]"
          )}
          style={{
            background: isError
              ? "oklch(0.7 0.21 14 / 0.18)"
              : "var(--omega-emerald)",
            boxShadow: isError
              ? "0 0 18px -4px oklch(0.7 0.21 14 / 0.6)"
              : "0 0 18px -4px oklch(0.82 0.17 162 / 0.55)",
          }}
          aria-hidden
        >
          Ω
        </div>

        <div
          className={cn(
            "max-w-[88%] rounded-2xl p-4 text-sm",
            isError
              ? "border border-[oklch(0.7_0.21_14_/_0.35)] border-l-2 bg-[oklch(0.7_0.21_14_/_0.06)] text-[var(--omega-rose)]"
              : "text-[var(--omega-fg)]"
          )}
          style={
            isError
              ? { borderLeftColor: "var(--omega-rose)", borderLeftWidth: "3px" }
              : undefined
          }
        >
          {showLoader ? (
            <StreamingDots />
          ) : (
            <div className="omega-prose break-words">
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={MD_COMPONENTS as never}
              >
                {normalizeMathDelimiters(message.content)}
              </ReactMarkdown>
            </div>
          )}
          {isAssistant && !isError && message.model && (
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--omega-muted)]">
              {message.model}
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {!isError && !showLoader && (
        <div className="flex items-center gap-1.5 pl-14">
          {isAssistant && onRegenerate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRegenerate}
                  className="inline-flex size-7 items-center justify-center rounded-md text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:bg-[var(--omega-glass-border)] transition"
                  aria-label="Regenerate response"
                >
                  <RefreshCw className="size-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                Regenerate
              </TooltipContent>
            </Tooltip>
          )}
          {!isUser && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleCopy?.()}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:bg-[var(--omega-glass-border)] transition"
                    aria-label="Copy message"
                  >
                    <Copy className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                  Copy
                </TooltipContent>
              </Tooltip>

              {/* TTS — read aloud */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSpeak}
                    className={cn(
                      "inline-flex size-7 items-center justify-center rounded-md transition",
                      speaking
                        ? "text-[var(--omega-emerald)] bg-[oklch(0.82_0.17_162_/_0.12)]"
                        : "text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:bg-[var(--omega-glass-border)]"
                    )}
                    aria-label={speaking ? "Stop" : "Read aloud"}
                  >
                    <Volume2 className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                  {speaking ? "Stop" : "Read aloud"}
                </TooltipContent>
              </Tooltip>

              {onFeedback && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          const fb = feedback === "positive" ? null : "positive";
                          setFeedback(fb);
                          onFeedback(message.id, fb!);
                        }}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md transition",
                          feedback === "positive"
                            ? "text-green-500 hover:bg-green-500/10"
                            : "text-[var(--omega-muted)] hover:text-green-500 hover:bg-[var(--omega-glass-border)]"
                        )}
                        aria-label="Like response"
                      >
                        <ThumbsUp className="size-3.5" strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                      {feedback === "positive" ? "Liked" : "Like"}
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          const fb = feedback === "negative" ? null : "negative";
                          setFeedback(fb);
                          onFeedback(message.id, fb!);
                        }}
                        className={cn(
                          "inline-flex size-7 items-center justify-center rounded-md transition",
                          feedback === "negative"
                            ? "text-red-500 hover:bg-red-500/10"
                            : "text-[var(--omega-muted)] hover:text-red-500 hover:bg-[var(--omega-glass-border)]"
                        )}
                        aria-label="Dislike response"
                      >
                        <ThumbsDown className="size-3.5" strokeWidth={2} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                      Dislike
                    </TooltipContent>
                  </Tooltip>
                </>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      const text = message.content;
                      navigator.clipboard.writeText(text);
                    }}
                    className="inline-flex size-7 items-center justify-center rounded-md text-[var(--omega-muted)] hover:text-[var(--omega-emerald)] hover:bg-[var(--omega-glass-border)] transition"
                    aria-label="Share"
                  >
                    <Share2 className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                  Share
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}

export const MessageBubble = React.memo(MessageBubbleImpl);
export default MessageBubble;
