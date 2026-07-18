"use client";

import * as React from "react";
import { Download, FileJson, FileText, FileDown, MessageSquare, Code, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ChatSession, ChatMessage } from "../store/chat-store";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function exportAsMarkdown(session: ChatSession): string {
  const lines: string[] = [];
  lines.push(`# ${session.title}`);
  lines.push(`*Exported on ${formatDate(Date.now())}*`);
  lines.push(`*Model: ${session.model}*`);
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const msg of session.messages) {
    const role = msg.role === "user" ? "**🧑 You**" : msg.role === "assistant" ? "**🤖 Omega**" : "**⚠️ Error**";
    lines.push(`${role} (${formatDate(msg.createdAt)}):`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function exportAsJSON(session: ChatSession): string {
  return JSON.stringify(
    {
      title: session.title,
      exportedAt: new Date().toISOString(),
      model: session.model,
      messages: session.messages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt).toISOString(),
        model: m.model || undefined,
      })),
    },
    null,
    2
  );
}

function exportAsHTML(session: ChatSession): string {
  const messagesHtml = session.messages
    .map((m) => {
      const roleClass = m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "error";
      const roleLabel = m.role === "user" ? "You" : m.role === "assistant" ? "Omega" : "Error";
      return `
<div class="message ${roleClass}">
  <div class="role">${roleLabel}</div>
  <div class="time">${formatDate(m.createdAt)}</div>
  <div class="content">${m.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}</div>
</div>`;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${session.title} — Omega Chat Export</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; max-width: 720px; margin: 0 auto; padding: 24px; background: #0a0a0f; color: #e4e4ed; }
h1 { font-size: 1.5rem; margin-bottom: 4px; }
.subtitle { color: #888; font-size: 0.85rem; margin-bottom: 24px; }
.message { padding: 16px; margin-bottom: 16px; border-radius: 12px; }
.user { background: #1a1a2e; border: 1px solid #2a2a4e; margin-left: 40px; }
.assistant { background: #0f1a12; border: 1px solid #1a3a2a; margin-right: 40px; }
.error { background: #1a0f0f; border: 1px solid #3a1a1a; color: #ff6b6b; }
.role { font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
.time { font-size: 0.7rem; color: #666; margin-bottom: 8px; }
.content { line-height: 1.6; white-space: pre-wrap; }
</style>
</head>
<body>
<h1>${session.title}</h1>
<div class="subtitle">Model: ${session.model} · Exported: ${formatDate(Date.now())}</div>
${messagesHtml}
</body>
</html>`;
}

export function exportConversation(session: ChatSession | null, format: "markdown" | "json" | "html" | "txt") {
  if (!session || session.messages.length === 0) return;

  let content: string;
  let mime: string;
  let ext: string;

  switch (format) {
    case "markdown":
      content = exportAsMarkdown(session);
      mime = "text/markdown";
      ext = "md";
      break;
    case "json":
      content = exportAsJSON(session);
      mime = "application/json";
      ext = "json";
      break;
    case "html":
      content = exportAsHTML(session);
      mime = "text/html";
      ext = "html";
      break;
    case "txt":
    default:
      content = session.messages
        .map(
          (m) =>
            `[${m.role.toUpperCase()}] ${new Date(m.createdAt).toLocaleString()}\n${m.content}`
        )
        .join("\n\n---\n\n");
      mime = "text/plain";
      ext = "txt";
      break;
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${session.title.replace(/[^a-zA-Z0-9]/g, "_")}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportButton({ session, className }: { session: ChatSession | null; className?: string }) {
  const [open, setOpen] = React.useState(false);

  if (!session || session.messages.length === 0) return null;

  return (
    <div className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(!open)}
            className={cn(
              "size-9 flex items-center justify-center rounded-lg",
              "text-[var(--omega-muted)] hover:text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)]",
              "transition-colors duration-200",
              className
            )}
            aria-label="Export conversation"
          >
            <FileDown className="size-4.5" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
          Export
        </TooltipContent>
      </Tooltip>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[60] w-40 p-1.5 bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-xl shadow-xl">
          <button
            onClick={() => { exportConversation(session, "markdown"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
          >
            <FileText className="size-4" strokeWidth={2} />
            Markdown
          </button>
          <button
            onClick={() => { exportConversation(session, "json"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
          >
            <FileJson className="size-4" strokeWidth={2} />
            JSON
          </button>
          <button
            onClick={() => { exportConversation(session, "html"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
          >
            <Code className="size-4" strokeWidth={2} />
            HTML
          </button>
          <button
            onClick={() => { exportConversation(session, "txt"); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
          >
            <FileText className="size-4" strokeWidth={2} />
            Plain Text
          </button>
        </div>
      )}
    </div>
  );
}

export default ExportButton;