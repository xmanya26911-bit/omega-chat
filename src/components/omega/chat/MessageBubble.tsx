"use client";

import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy } from "lucide-react";
import { motion } from "framer-motion";
import type { ChatMessage } from "../store/chat-store";
import { cn } from "@/lib/utils";

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

// ── CodeBlock — memoized so streaming re-parses don't blow away state ─
interface CodeBlockProps {
  language: string;
  value: string;
}

const CodeBlock = React.memo(function CodeBlock({ language, value }: CodeBlockProps) {
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

// ── Markdown components (stable ref) ──────────────────────────────────
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
  isStreaming?: boolean; // global streaming state
  isLast?: boolean;
}

function MessageBubbleImpl({
  message,
  isStreaming = false,
  isLast = false,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isError = message.error === true;
  const isAssistant = message.role === "assistant";
  const showLoader =
    isAssistant &&
    isLast &&
    isStreaming &&
    message.content.length === 0;

  // ── USER ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="flex w-full justify-end"
      >
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
      className="flex w-full justify-start gap-3"
    >
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
            <ReactMarkdown components={MD_COMPONENTS as never}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {isAssistant && !isError && message.model && (
          <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--omega-muted)]">
            {message.model}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export const MessageBubble = React.memo(MessageBubbleImpl);
export default MessageBubble;
