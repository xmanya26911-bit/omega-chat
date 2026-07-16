"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowUp,
  Globe,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Square,
} from "lucide-react";
import { useChatStore } from "../store/chat-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 200;

interface ToolbarButtonProps {
  "aria-label": string;
  active?: boolean;
  disabled?: boolean;
  tooltip?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

function ToolbarButton({
  "aria-label": ariaLabel,
  active = false,
  disabled = false,
  tooltip,
  onClick,
  children,
  className,
}: ToolbarButtonProps) {
  const btn = (
    <button
      type="button"
      data-cursor="hover"
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-lg transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
        disabled
          ? "cursor-not-allowed text-[var(--omega-muted)] opacity-50"
          : active
            ? "bg-[oklch(0.82_0.17_162_/_0.14)] text-[var(--omega-emerald)]"
            : "text-[var(--omega-fg-dim)] hover:bg-[oklch(0.82_0.17_162_/_0.08)] hover:text-[var(--omega-fg)]",
        className
      )}
    >
      {children}
    </button>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="omega-glass border-[var(--omega-glass-border)] bg-[var(--omega-bg-2)] text-[var(--omega-fg)]"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}

/**
 * ChatInput — auto-resizing textarea + bottom toolbar.
 *  - Enter to send, Shift+Enter for newline
 *  - search toggle, file upload, image generation, voice input
 *  - send button becomes a stop button while streaming
 +  *  - paste images/files inline
 */
export function ChatInput() {
  const [text, setText] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isStreaming = useChatStore((s) => s.isStreaming);
  const searchEnabled = useChatStore((s) => s.searchEnabled);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const toggleSearch = useChatStore((s) => s.toggleSearch);

  const autoResize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
  }, []);

  React.useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  const canSend = text.trim().length > 0 && !isStreaming;

  const handleSubmit = () => {
    if (!canSend) return;
    const value = text;
    setText("");
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    });
    void sendMessage(value, {
      onAuthError: () => {},
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── File upload ────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const textExts = ["txt", "md", "json", "csv", "js", "ts", "py", "html", "css", "xml", "yaml", "yml", "log", "sh", "bat", "env", "cfg", "ini", "toml"];
    if (!textExts.includes(ext)) {
      setText((prev) => prev + ` [file: ${file.name}]`);
      return;
    }
    const content = await file.text();
    const snippet = content.length > 2000 ? content.slice(0, 2000) + "\n\n_[file truncated, full content: " + file.size + " bytes]_" : content;
    setText((prev) => prev + (prev ? "\n\n" : "") + `\`\`\`\n// ${file.name}\n${snippet}\n\`\`\``);
    // Reset input so same file can be picked again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Image generation ───────────────────────────────────────
  const handleGenerateImage = async () => {
    const prompt = text.trim();
    if (!prompt) {
      setText("Enter a prompt first, then click the image button.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const accessToken =
        typeof window !== "undefined"
          ? window.__omega_access_token ?? ""
          : "";
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (data.url) {
        setText((prev) => prev + `\n\n![Generated](${data.url})`);
      } else {
        setText((prev) => prev + `\n\n⚠️ Image generation failed: ${data.error || "unknown error"}`);
      }
    } catch (err) {
      setText((prev) => prev + `\n\n⚠️ Image generation error: ${(err as Error).message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ── Paste handler (images from clipboard) ─────────────────────
  const handlePaste = React.useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setText((prev) => prev + (prev ? "\n" : "") + `![Pasted image](${dataUrl})`);
        };
        reader.readAsDataURL(file);
        return;
      }
    }
  }, []);

  // ── Voice input ────────────────────────────────────────────
  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setText((prev) => prev + " [Voice input not supported in this browser]");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setText((prev) => prev + (prev ? " " : "") + transcript);
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="relative">
      {/* top gradient fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 left-0 right-0 h-6"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--omega-bg) 90%)",
        }}
      />

      <div
        className={cn(
          "omega-glass rounded-2xl p-2.5",
          "transition-all duration-300",
          "focus-within:border-[oklch(0.82_0.17_162_/_0.4)]"
        )}
      >
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml,.yaml,.yml,.log,.sh"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={text}
          data-cursor="hover"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={autoResize}
          onPaste={handlePaste}
          rows={1}
          placeholder="Message Omega…"
          aria-label="Message input"
          className={cn(
            "block max-h-[200px] w-full resize-none bg-transparent px-2 py-1.5",
            "text-sm leading-relaxed text-[var(--omega-fg)]",
            "placeholder:text-[var(--omega-muted)]",
            "focus:outline-none omega-scrollbar-hide"
          )}
          style={{ minHeight: "28px" }}
        />

        {/* Toolbar */}
        <div className="mt-1 flex items-center gap-1">
          <ToolbarButton
            aria-label="Toggle web search"
            tooltip="Web search"
            active={searchEnabled}
            onClick={toggleSearch}
          >
            <Globe className="size-4" strokeWidth={2} />
          </ToolbarButton>

          <ToolbarButton
            aria-label="Upload file"
            tooltip="Upload file"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" strokeWidth={2} />
          </ToolbarButton>

          <ToolbarButton
            aria-label="Generate image"
            tooltip="Generate image from prompt"
            disabled={isGeneratingImage}
            onClick={handleGenerateImage}
          >
            {isGeneratingImage ? (
              <Loader2 className="size-4 animate-spin" strokeWidth={2} />
            ) : (
              <ImageIcon className="size-4" strokeWidth={2} />
            )}
          </ToolbarButton>

          <ToolbarButton
            aria-label="Voice input"
            tooltip={isListening ? "Listening… tap to stop" : "Voice input"}
            active={isListening}
            onClick={handleVoiceInput}
          >
            <Mic className="size-4" strokeWidth={2} />
          </ToolbarButton>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Send / Stop */}
          {isStreaming ? (
            <motion.button
              key="stop"
              type="button"
              data-cursor="hover"
              aria-label="Stop generation"
              onClick={stopGeneration}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg",
                "bg-[oklch(0.7_0.21_14_/_0.16)] text-[var(--omega-rose)]",
                "border border-[oklch(0.7_0.21_14_/_0.4)]",
                "transition-colors duration-200 hover:bg-[oklch(0.7_0.21_14_/_0.26)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[oklch(0.7_0.21_14_/_0.5)]"
              )}
            >
              <Square className="size-3.5 fill-current" strokeWidth={0} />
            </motion.button>
          ) : (
            <motion.button
              key="send"
              type="button"
              data-cursor="hover"
              aria-label="Send message"
              disabled={!canSend}
              onClick={handleSubmit}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "inline-flex size-9 items-center justify-center rounded-lg transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)]",
                canSend
                  ? "bg-[var(--omega-emerald)] text-[oklch(0.06_0.01_264)] shadow-[0_6px_24px_-8px_oklch(0.82_0.17_162_/_0.7)] hover:bg-[oklch(0.88_0.15_162)]"
                  : "cursor-not-allowed bg-[oklch(0.2_0.012_264_/_0.5)] text-[var(--omega-muted)]"
              )}
            >
              <ArrowUp className="size-4" strokeWidth={2.5} />
            </motion.button>
          )}
        </div>
      </div>

      {/* helper hint */}
      <div className="mt-1.5 px-1 text-center font-mono text-[10px] text-[var(--omega-muted)]">
        <kbd className="font-mono">Enter</kbd> to send ·{" "}
        <kbd className="font-mono">Shift+Enter</kbd> for newline
      </div>
    </div>
  );
}

export default ChatInput;
