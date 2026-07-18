"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileUp,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  MessageSquare,
  Download,
} from "lucide-react";
import { useChatStore } from "../store/chat-store";
import type { ChatSession, ChatMessage } from "../store/chat-store";
import { cn } from "@/lib/utils";

type ImportStatus = "idle" | "loading" | "parsing" | "importing" | "done" | "error";

interface ChatGPTConversation {
  title?: string;
  create_time?: number;
  update_time?: number;
  mapping?: Record<
    string,
    {
      id: string;
      message?: {
        id: string;
        author?: { role?: string };
        content?: { parts?: string[]; content_type?: string };
        create_time?: number;
      };
      parent?: string;
      children?: string[];
    }
  >;
  current_node?: string;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/**
 * Traverse a ChatGPT conversation DAG from root to current_node,
 * producing a linear array of messages.
 */
function flattenChatGPTConversation(conv: ChatGPTConversation): { role: string; content: string; createdAt: number }[] {
  if (!conv.mapping) return [];

  // Find root (node with no parent)
  let rootId: string | null = null;
  for (const [id, node] of Object.entries(conv.mapping)) {
    if (!node.parent) {
      rootId = id;
      break;
    }
  }
  if (!rootId) return [];

  // Traverse from root following children, prefer first child
  const result: { role: string; content: string; createdAt: number }[] = [];
  let currentId: string | null = rootId;
  const visited = new Set<string>();

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const node = conv.mapping[currentId];
    if (node?.message?.content) {
      const role = node.message.author?.role || "user";
      const parts = node.message.content.parts || [];
      const text = parts.filter((p) => typeof p === "string").join("\n");
      if (text.trim()) {
        result.push({
          role: role === "assistant" ? "assistant" : role === "system" ? "system" : "user",
          content: text,
          createdAt: (node.message.create_time || 0) * 1000,
        });
      }
    }
    // Navigate to next node: prefer the path to current_node
    const children = node?.children || [];
    if (children.length === 0) break;

    // If current_node is a descendant, follow that path
    const currentTarget = conv.current_node;
    if (currentTarget && currentId === currentTarget) break;

    // Take first child, or find the child that leads to current_node
    currentId = children[0];
  }

  return result;
}

async function loadJSZip(): Promise<any> {
  if ((window as any).JSZip) return (window as any).JSZip;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.integrity = "sha512-XMVrBzJT2j3XJH2E1VD7qPqKJ8vqttCqRMiIRkHS1Ed4+JFrYGzMt+WwQRn8njYHcoLOozFNMjDpWCME7USsYg==";
    script.crossOrigin = "anonymous";
    script.onload = () => resolve((window as any).JSZip);
    script.onerror = () => reject(new Error("Failed to load JSZip"));
    document.head.appendChild(script);
  });
}

interface ChatGPTImportProps {
  open: boolean;
  onClose: () => void;
}

export function ChatGPTImport({ open, onClose }: ChatGPTImportProps) {
  const [status, setStatus] = React.useState<ImportStatus>("idle");
  const [error, setError] = React.useState("");
  const [progress, setProgress] = React.useState(0);
  const [total, setTotal] = React.useState(0);
  const [imported, setImported] = React.useState(0);
  const [dragOver, setDragOver] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const newChat = useChatStore((s) => s.newChat);
  const sessions = useChatStore((s) => s.sessions);

  const reset = React.useCallback(() => {
    setStatus("idle");
    setError("");
    setProgress(0);
    setTotal(0);
    setImported(0);
    setDragOver(false);
  }, []);

  const handleFile = React.useCallback(
    async (file: File) => {
      reset();
      if (!file.name.endsWith(".zip")) {
        setError("Please select a ZIP file (ChatGPT export)");
        setStatus("error");
        return;
      }

      setStatus("loading");
      try {
        const JSZip = await loadJSZip();
        setStatus("parsing");

        const zip = await JSZip.loadAsync(file);
        const convFile = zip.file("conversations.json");
        if (!convFile) {
          setError('No conversations.json found in the ZIP. Make sure this is a ChatGPT export.');
          setStatus("error");
          return;
        }

        const raw = await convFile.async("text");
        const conversations: ChatGPTConversation[] = JSON.parse(raw);
        if (!Array.isArray(conversations) || conversations.length === 0) {
          setError("No conversations found in the export.");
          setStatus("error");
          return;
        }

        setTotal(conversations.length);
        setStatus("importing");

        let count = 0;
        for (const conv of conversations) {
          const messages = flattenChatGPTConversation(conv);
          if (messages.length === 0) continue;

          const title = conv.title || messages[0]?.content?.slice(0, 40) || "Imported from ChatGPT";
          const updatedAt = (conv.update_time || 0) * 1000;
          const createdAt = (conv.create_time || 0) * 1000;

          // Create a new session in the store
          const sessionId = uid();
          const session: ChatSession = {
            id: sessionId,
            title: title.slice(0, 100),
            messages: messages.map((m) => ({
              id: uid(),
              role: m.role as any,
              content: m.content,
              createdAt: m.createdAt || Date.now(),
            })),
            createdAt: createdAt || Date.now(),
            updatedAt: updatedAt || Date.now(),
            model: "deepseek-v4-flash-free",
          };

          // Insert into store
          useChatStore.setState((s) => ({
            sessions: { ...s.sessions, [sessionId]: session },
            sessionOrder: [sessionId, ...s.sessionOrder],
          }));

          count++;
          setImported(count);
          setProgress(Math.round((count / conversations.length) * 100));
        }

        setStatus("done");
        // Trigger Drive sync
        useChatStore.getState().saveToDrive();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse export file");
        setStatus("error");
      }
    },
    [reset]
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  const handleClick = React.useCallback(() => {
    fileRef.current?.click();
  }, []);

  const onFileSelect = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-lg -translate-x-1/2 -translate-y-1/2"
          >
            <div className="omega-glass relative overflow-hidden rounded-2xl border border-[var(--omega-glass-border)] p-6 shadow-2xl">
              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 rounded-lg p-1 text-[var(--omega-muted)] hover:bg-[var(--omega-glass-border)] hover:text-[var(--omega-fg)]"
              >
                <X className="size-4" />
              </button>

              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--omega-emerald)]/10">
                  <MessageSquare className="size-5 text-[var(--omega-emerald)]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-[var(--omega-fg)]">Import from ChatGPT</h2>
                  <p className="text-sm text-[var(--omega-fg-dim)]">Upload your ChatGPT export ZIP</p>
                </div>
              </div>

              {status === "idle" && (
                <>
                  {/* Drop zone */}
                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={handleClick}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all",
                      dragOver
                        ? "border-[var(--omega-emerald)] bg-[var(--omega-emerald)]/5"
                        : "border-[var(--omega-glass-border)] hover:border-[var(--omega-muted)]"
                    )}
                  >
                    <div className="flex size-12 items-center justify-center rounded-full bg-[var(--omega-emerald)]/10">
                      <FileUp className="size-6 text-[var(--omega-emerald)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--omega-fg)]">
                        Drop your ChatGPT export ZIP here
                      </p>
                      <p className="mt-1 text-xs text-[var(--omega-muted)]">
                        or click to browse files
                      </p>
                    </div>
                    <p className="text-[10px] text-[var(--omega-muted)]">
                      Export from ChatGPT Settings → Data Controls → Export Data
                    </p>
                  </div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={onFileSelect}
                  />

                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-[var(--omega-glass-border)]/30 p-3 text-xs text-[var(--omega-fg-dim)]">
                    <Download className="size-3.5 shrink-0" />
                    <span>
                      How to export: ChatGPT Settings → Data Controls → Export Data.
                      You'll receive a ZIP file via email.
                    </span>
                  </div>
                </>
              )}

              {/* Loading / Parsing */}
              {(status === "loading" || status === "parsing") && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 className="size-8 animate-spin text-[var(--omega-emerald)]" />
                  <p className="text-sm text-[var(--omega-fg-dim)]">
                    {status === "loading" ? "Loading archive..." : "Parsing conversations..."}
                  </p>
                </div>
              )}

              {/* Importing progress */}
              {status === "importing" && (
                <div className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--omega-fg-dim)]">Importing conversations...</span>
                    <span className="font-medium text-[var(--omega-fg)]">{imported} / {total}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--omega-glass-border)]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--omega-emerald)]"
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {/* Done */}
              {status === "done" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <CheckCircle2 className="size-10 text-[var(--omega-emerald)]" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-[var(--omega-fg)]">
                      Import complete!
                    </p>
                    <p className="mt-1 text-sm text-[var(--omega-fg-dim)]">
                      Successfully imported {imported} conversation{imported !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 rounded-lg bg-[var(--omega-emerald)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--omega-emerald)]/80"
                  >
                    Done
                  </button>
                </div>
              )}

              {/* Error */}
              {status === "error" && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <AlertCircle className="size-10 text-red-500" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-500">Import failed</p>
                    <p className="mt-1 text-xs text-[var(--omega-fg-dim)]">{error}</p>
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className="mt-2 rounded-lg bg-[var(--omega-glass-border)] px-4 py-2 text-sm font-medium text-[var(--omega-fg)] transition-all hover:bg-[var(--omega-muted)]"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
