"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUp,
  Globe,
  Image as ImageIcon,
  Loader2,
  Mic,
  Paperclip,
  Square,
  X,
  FileText,
  Camera,
} from "lucide-react";
import { useChatStore } from "../store/chat-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAccessToken } from "@/lib/access-token";
import { cn } from "@/lib/utils";

const MAX_HEIGHT = 200;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ── Types ──────────────────────────────────────────────────────────
interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: "image" | "text" | "pdf" | "other";
  content: string; // text content or data URL for images
  previewUrl?: string; // thumbnail for images
}

// ── Helpers ────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getFileType(name: string): FileAttachment["type"] {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "image";
  if (["txt", "md", "json", "csv", "js", "ts", "py", "rb", "go", "rs", "java", "kt", "swift",
    "html", "css", "scss", "less", "xml", "yaml", "yml", "toml", "ini", "cfg", "env",
    "log", "sh", "bash", "zsh", "bat", "ps1", "sql", "graphql", "r", "mjs", "cjs", "mts",
    "cts", "vue", "svelte", "astro", "php", "pl", "pm", "lua", "dart", "scala", "clj",
    "cljs", "edn", "tex", "bib", "rst", "adoc", "gradle", "lock", "gitignore", "dockerfile",
    "makefile", "cmake", "conf", "cfg"].includes(ext)) return "text";
  if (["pdf"].includes(ext)) return "pdf";
  return "other";
}

const TEXT_EXTS = new Set([
  "txt", "md", "json", "csv", "js", "ts", "py", "rb", "go", "rs", "java", "kt", "swift",
  "html", "css", "scss", "less", "xml", "yaml", "yml", "toml", "ini", "cfg", "env",
  "log", "sh", "bash", "zsh", "bat", "ps1", "sql", "graphql", "r", "mjs", "cjs", "mts",
  "cts", "vue", "svelte", "astro", "php", "pl", "pm", "lua", "dart", "scala", "clj",
  "cljs", "edn", "tex", "bib", "rst", "adoc", "gradle", "lock", "gitignore", "dockerfile",
  "makefile", "cmake", "conf", "cfg"
]);

async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

// ── ToolbarButton ──────────────────────────────────────────────────
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

// ── AttachmentChip ─────────────────────────────────────────────────
function AttachmentChip({
  attachment,
  onRemove,
}: {
  attachment: FileAttachment;
  onRemove: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 8 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px]",
        "bg-[oklch(0.82_0.17_162_/_0.08)] border border-[oklch(0.82_0.17_162_/_0.15)]"
      )}
    >
      {attachment.type === "image" && attachment.previewUrl ? (
        <img
          src={attachment.previewUrl}
          alt=""
          className="size-6 rounded object-cover"
        />
      ) : attachment.type === "text" || attachment.type === "pdf" ? (
        <FileText className="size-3.5 shrink-0 text-[var(--omega-emerald)]" strokeWidth={2} />
      ) : (
        <Paperclip className="size-3.5 shrink-0 text-[var(--omega-fg-dim)]" strokeWidth={2} />
      )}
      <span className="max-w-[120px] truncate text-[var(--omega-fg)]">
        {attachment.name}
      </span>
      <span className="shrink-0 font-mono text-[10px] text-[var(--omega-muted)]">
        {formatSize(attachment.size)}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex size-4 items-center justify-center rounded text-[var(--omega-muted)] hover:bg-[oklch(0.7_0.21_14_/_0.16)] hover:text-[var(--omega-rose)] transition-colors"
        aria-label={`Remove ${attachment.name}`}
      >
        <X className="size-3" strokeWidth={2.5} />
      </button>
    </motion.div>
  );
}

// ── DragOverlay ────────────────────────────────────────────────────
function DragOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={cn(
            "absolute inset-0 z-50 flex items-center justify-center rounded-2xl",
            "bg-[var(--omega-bg-2)]/80 backdrop-blur-sm",
            "border-2 border-dashed border-[var(--omega-emerald)]"
          )}
        >
          <div className="flex flex-col items-center gap-2 text-[var(--omega-emerald)]">
            <Paperclip className="size-8" strokeWidth={1.5} />
            <span className="font-display text-sm font-semibold">Drop files here</span>
            <span className="text-[10px] font-mono text-[var(--omega-muted)]">
              Images, text, PDFs, code
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── ChatInput ──────────────────────────────────────────────────────
export function ChatInput() {
  const [text, setText] = React.useState("");
  const [isListening, setIsListening] = React.useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [attachments, setAttachments] = React.useState<FileAttachment[]>([]);
  const [recordingDuration, setRecordingDuration] = React.useState(0);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const recTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const isStreaming = useChatStore((s) => s.isStreaming);
  const searchEnabled = useChatStore((s) => s.searchEnabled);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const stopGeneration = useChatStore((s) => s.stopGeneration);
  const toggleSearch = useChatStore((s) => s.toggleSearch);

  // ── Auto-resize ──────────────────────────────────────────────
  const autoResize = React.useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
  }, []);

  React.useEffect(() => {
    autoResize();
  }, [text, autoResize]);

  // ── Recording timer ──────────────────────────────────────────
  React.useEffect(() => {
    if (isListening) {
      setRecordingDuration(0);
      recTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } else {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
      recTimerRef.current = null;
      setRecordingDuration(0);
    }
    return () => {
      if (recTimerRef.current) clearInterval(recTimerRef.current);
    };
  }, [isListening]);

  const canSend = (text.trim().length > 0 || attachments.length > 0) && !isStreaming;

  // ── Send ────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!canSend) return;

    // Build message from text + attachments
    let fullMessage = text;
    for (const att of attachments) {
      if (att.type === "image") {
        fullMessage += (fullMessage ? "\n\n" : "") + `![${att.name}](${att.content})`;
      } else if (att.type === "text" || att.type === "pdf") {
        const lang = att.name.split(".").pop() || "";
        fullMessage += (fullMessage ? "\n\n" : "") + `\`\`\`${lang}\n// ${att.name}\n${att.content}\n\`\`\``;
      } else {
        fullMessage += (fullMessage ? "\n\n" : "") + `[Attachment: ${att.name}]`;
      }
    }

    setText("");
    setAttachments([]);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    });
    void sendMessage(fullMessage, {
      onAuthError: () => {},
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ── File processing ─────────────────────────────────────────
  const processFile = React.useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setText((prev) => prev + (prev ? "\n\n" : "") + `⚠️ File too large (${formatSize(file.size)}). Max 10MB.`);
      return;
    }

    const fileType = getFileType(file.name);
    const id = uid();

    if (fileType === "image") {
      const dataUrl = await readFileAsDataURL(file);
      // Create a thumbnail for the chip
      const previewUrl = dataUrl.length > 50000
        ? undefined  // skip thumbnail for large images to keep UI fast
        : dataUrl;
      setAttachments((prev) => [...prev, {
        id, name: file.name, size: file.size,
        type: "image", content: dataUrl, previewUrl,
      }]);
    } else if (fileType === "text" || fileType === "pdf") {
      let content: string;
      if (fileType === "pdf") {
        // For PDFs, just note the filename and size
        content = `[PDF: ${file.name}, ${formatSize(file.size)}. Content extraction not available in browser.]`;
      } else {
        content = await readFileAsText(file);
        if (content.length > 10000) {
          content = content.slice(0, 10000) + `\n\n[...truncated, original was ${formatSize(file.size)}]`;
        }
      }
      setAttachments((prev) => [...prev, {
        id, name: file.name, size: file.size,
        type: fileType, content,
      }]);
    } else {
      setAttachments((prev) => [...prev, {
        id, name: file.name, size: file.size,
        type: "other", content: `[Attachment: ${file.name}]`,
      }]);
    }
  }, []);

  // ── File input handler ──────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        await processFile(file);
      }
    }
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // ── Drag & drop ─────────────────────────────────────────────
  const dragCountRef = React.useRef(0);

  const handleDragEnter = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current++;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, []);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCountRef.current--;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCountRef.current = 0;
    const files = e.dataTransfer?.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      await processFile(file);
    }
  }, [processFile]);

  // ── Remove attachment ───────────────────────────────────────
  const removeAttachment = React.useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ── Paste handler ───────────────────────────────────────────
  const handlePaste = React.useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        await processFile(file);
        return;
      }
    }
  }, [processFile]);

  // ── Image generation ────────────────────────────────────────
  const handleGenerateImage = async () => {
    const prompt = text.trim();
    if (!prompt) {
      setText("Enter a prompt first, then click the image button.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const accessToken = getAccessToken();
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
        // Add as image attachment
        const id = uid();
        setAttachments((prev) => [...prev, {
          id,
          name: `Generated: ${prompt.slice(0, 40)}${prompt.length > 40 ? "…" : ""}.png`,
          size: 0,
          type: "image",
          content: data.url,
          previewUrl: data.url,
        }]);
      } else {
        setText((prev) => prev + `\n\n⚠️ Image generation failed: ${data.error || "unknown error"}`);
      }
    } catch (err) {
      setText((prev) => prev + `\n\n⚠️ Image generation error: ${(err as Error).message}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ── Voice input ─────────────────────────────────────────────
  const recognitionRef = React.useRef<any>(null);

  const handleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
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
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setText((prev) => {
        // Replace the current line after the last voice input
        return transcript;
      });
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  // ── Format recording duration ───────────────────────────────
  const fmtDuration = `${Math.floor(recordingDuration / 60)}:${String(recordingDuration % 60).padStart(2, "0")}`;

  // ── Render ──────────────────────────────────────────────────
  return (
    <div
      className="relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop overlay */}
      <DragOverlay visible={isDragging} />

      {/* top gradient fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-6 left-0 right-0 h-6"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--omega-bg) 90%)",
        }}
      />

      <AnimatePresence>
        {attachments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-1.5 flex flex-wrap gap-1.5 px-0.5"
          >
            {attachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachment={att}
                onRemove={() => removeAttachment(att.id)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          "omega-glass rounded-2xl p-2.5",
          "transition-all duration-300",
          "focus-within:border-[oklch(0.82_0.17_162_/_0.4)]",
          isListening && "ring-2 ring-[oklch(0.7_0.21_14_/_0.5)]"
        )}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml,.yaml,.yml,.log,.sh,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
          aria-hidden
        />
        <input
          ref={imageInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleImageSelect}
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
          placeholder={
            isListening
              ? "Listening…"
              : attachments.length > 0
                ? "Add a message or send files…"
                : "Message Omega…"
          }
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
            aria-label="Upload files"
            tooltip="Upload files"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" strokeWidth={2} />
          </ToolbarButton>

          <ToolbarButton
            aria-label="Upload image"
            tooltip="Upload image"
            onClick={() => imageInputRef.current?.click()}
          >
            <Camera className="size-4" strokeWidth={2} />
          </ToolbarButton>

          <ToolbarButton
            aria-label="Generate image from prompt"
            tooltip="Generate image"
            disabled={isGeneratingImage}
            onClick={handleGenerateImage}
          >
            {isGeneratingImage ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Loader2 className="size-4" strokeWidth={2} />
              </motion.div>
            ) : (
              <ImageIcon className="size-4" strokeWidth={2} />
            )}
          </ToolbarButton>

          <ToolbarButton
            aria-label="Voice input"
            tooltip={isListening ? `Recording ${fmtDuration} — tap to stop` : "Voice input"}
            active={isListening}
            onClick={handleVoiceInput}
            className={isListening ? "relative" : ""}
          >
            {isListening ? (
              <span className="relative flex items-center justify-center">
                <motion.span
                  className="absolute inset-0 rounded-full bg-[var(--omega-rose)]"
                  animate={{
                    scale: [1, 1.4, 1],
                    opacity: [0.5, 0, 0.5],
                  }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <Mic className="size-4 relative z-10" strokeWidth={2} />
              </span>
            ) : (
              <Mic className="size-4" strokeWidth={2} />
            )}
          </ToolbarButton>

          {/* Recording indicator */}
          {isListening && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              className="font-mono text-[10px] text-[var(--omega-rose)] tabular-nums px-1"
            >
              {fmtDuration}
            </motion.span>
          )}

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
        <kbd className="font-mono">Shift+Enter</kbd> for newline ·{" "}
        drag & drop files
      </div>
    </div>
  );
}

export default ChatInput;
