"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor,
  Power,
  PowerOff,
  RefreshCw,
  FolderOpen,
  FileCode,
  X,
  Loader2,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { usePCRemote, type ExecResult } from "../hooks/use-pc-remote";
import { cn } from "@/lib/utils";

interface TerminalLine {
  id: number;
  text: string;
  type: "input" | "output" | "error" | "system";
}

let lineId = 0;

export function PCRemotePanel() {
  const { status, hostname, os, error, exec, listDir, reconnect } =
    usePCRemote();

  const [lines, setLines] = React.useState<TerminalLine[]>([
    { id: ++lineId, text: "PC Remote Agent", type: "system" },
  ]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [showExplorer, setShowExplorer] = React.useState(false);
  const [explorerPath, setExplorerPath] = React.useState("D:\\TERMINALCLI");
  const [explorerItems, setExplorerItems] = React.useState<string[]>([]);
  const [explorerBusy, setExplorerBusy] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  React.useEffect(() => {
    setLines((prev) => [
      ...prev,
      { id: ++lineId, text: "Status: " + status + (hostname ? " - " + hostname : ""), type: "system" },
    ]);
  }, [status, hostname]);

  const addLine = (text: string, type: TerminalLine["type"]) => {
    setLines((prev) => [...prev, { id: ++lineId, text, type }]);
  };

  const handleSubmit = async () => {
    const cmd = input.trim();
    if (!cmd || busy) return;
    setInput("");
    addLine("$ " + cmd, "input");
    setBusy(true);
    try {
      const result = await exec(cmd);
      if (result.stdout) {
        result.stdout.split("\n").forEach((line) => {
          if (line.trim()) addLine(line, "output");
        });
      }
      if (result.stderr) {
        result.stderr.split("\n").forEach((line) => {
          if (line.trim()) addLine(line, "error");
        });
      }
      addLine("-> exit " + result.exit_code, "system");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Command failed";
      addLine(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const openExplorer = async () => {
    if (explorerBusy) return;
    setExplorerBusy(true);
    try {
      const items = await listDir(explorerPath);
      setExplorerItems(items);
      setShowExplorer(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to list directory";
      addLine(msg, "error");
    } finally {
      setExplorerBusy(false);
    }
  };

  const explorerSelect = async (item: string) => {
    const newPath = explorerPath.endsWith("\\")
      ? explorerPath + item
      : explorerPath + "\\" + item;
    setExplorerPath(newPath);
    setExplorerBusy(true);
    try {
      const items = await listDir(newPath);
      setExplorerItems(items);
    } catch {
      addLine("Selected: " + newPath, "system");
    } finally {
      setExplorerBusy(false);
    }
  };

  const explorerGoUp = () => {
    const parent = explorerPath.replace(/\\[^\\]*$/, "");
    if (parent && parent.length >= 3) {
      setExplorerPath(parent);
      openExplorer();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Connection bar */}
      <div
        className={cn(
          "flex items-center gap-2 border-b border-[var(--omega-glass-border)] px-3 py-2",
          status === "online"
            ? "bg-[oklch(0.82_0.17_162_/_0.08)]"
            : "bg-[oklch(0.7_0.21_14_/_0.08)]"
        )}
      >
        <span
          className={cn(
            "relative flex h-2 w-2",
            status === "online" ? "text-[var(--omega-emerald)]" : status === "connecting" ? "text-[var(--omega-amber)]" : "text-[var(--omega-rose)]"
          )}
        >
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-70",
              status === "online" ? "bg-[var(--omega-emerald)]" : status === "connecting" ? "bg-[var(--omega-amber)]" : "bg-[var(--omega-rose)]"
            )}
          />
          <span
            className={cn(
              "relative inline-flex h-2 w-2 rounded-full",
              status === "online" ? "bg-[var(--omega-emerald)]" : status === "connecting" ? "bg-[var(--omega-amber)]" : "bg-[var(--omega-rose)]"
            )}
          />
        </span>
        <span className="flex-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[var(--omega-fg-dim)]">
          {status === "online" ? "PC: " + (hostname || "Connected") : status === "connecting" ? "Connecting..." : "PC Offline"}
        </span>
        {status === "offline" && (
          <button type="button" onClick={reconnect} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[var(--omega-fg-dim)] hover:text-[var(--omega-emerald)]">
            <RefreshCw className="size-3" strokeWidth={2} />
            Retry
          </button>
        )}
      </div>

      {/* Quick actions */}
      {status === "online" && (
        <div className="flex items-center gap-1 border-b border-[var(--omega-glass-border)] px-2 py-1.5">
          <button type="button" onClick={openExplorer} disabled={explorerBusy} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[var(--omega-fg-dim)] transition-colors hover:bg-[oklch(0.82_0.17_162_/_0.1)] hover:text-[var(--omega-emerald)] disabled:opacity-40">
            {explorerBusy ? <Loader2 className="size-3 animate-spin" strokeWidth={2} /> : <FolderOpen className="size-3" strokeWidth={2} />}
            Explorer
          </button>
          <button type="button" onClick={() => {
            addLine("Listing D:\\TERMINALCLI ...", "system");
            exec("dir D:\\TERMINALCLI /B").then((r) => {
              if (r.stdout) r.stdout.split("\n").filter(Boolean).forEach((l) => addLine(l, "output"));
              if (r.stderr) r.stderr.split("\n").filter(Boolean).forEach((l) => addLine(l, "error"));
              addLine("-> exit " + r.exit_code, "system");
            }).catch((e) => addLine(String(e), "error"));
          }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-[var(--omega-fg-dim)] transition-colors hover:bg-[oklch(0.82_0.17_162_/_0.1)] hover:text-[var(--omega-emerald)]">
            <FileCode className="size-3" strokeWidth={2} />
            Projects
          </button>
        </div>
      )}

      {/* File Explorer */}
      <AnimatePresence>
        {showExplorer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-[var(--omega-glass-border)]">
            <div className="px-3 py-2">
              <div className="mb-1 flex items-center gap-1">
                <button type="button" onClick={explorerGoUp} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--omega-fg-dim)] hover:text-[var(--omega-emerald)]">..</button>
                <span className="flex-1 truncate font-mono text-[9px] text-[var(--omega-muted)]">{explorerPath}</span>
                <button type="button" onClick={() => setShowExplorer(false)} className="rounded px-1 py-0.5 text-[var(--omega-fg-dim)] hover:text-[var(--omega-rose)]">
                  <X className="size-3" strokeWidth={2} />
                </button>
              </div>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-[var(--omega-bg-2)] p-1">
                {explorerBusy ? (
                  <div className="flex items-center justify-center py-4"><Loader2 className="size-4 animate-spin text-[var(--omega-muted)]" /></div>
                ) : explorerItems.length === 0 ? (
                  <div className="py-2 text-center text-[10px] text-[var(--omega-muted)]">Empty directory</div>
                ) : (
                  explorerItems.map((item) => (
                    <button key={item} type="button" onClick={() => explorerSelect(item)} className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[10px] text-[var(--omega-fg-dim)] transition-colors hover:bg-[oklch(0.82_0.17_162_/_0.1)] hover:text-[var(--omega-fg)]">
                      <ChevronRight className="size-2.5 shrink-0 text-[var(--omega-muted)]" />
                      {item}
                    </button>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal output */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed">
        {lines.map((line) => (
          <div key={line.id} className={cn(
            "whitespace-pre-wrap break-all",
            line.type === "input" && "text-[var(--omega-emerald)]",
            line.type === "output" && "text-[var(--omega-fg)]",
            line.type === "error" && "text-[var(--omega-rose)]",
            line.type === "system" && "text-[var(--omega-muted)] italic"
          )}>
            {line.text}
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-[var(--omega-muted)]">
            <Loader2 className="size-3 animate-spin" strokeWidth={2} />
            Running...
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[var(--omega-glass-border)] px-3 py-2">
        <div className="omega-glass-thin flex items-center gap-2 rounded-lg px-2.5 py-1.5">
          <span className="font-mono text-[10px] text-[var(--omega-emerald)]">$</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === "online" ? "Enter command..." : "Waiting for connection..."}
            disabled={status !== "online" || busy}
            className="w-full bg-transparent text-xs text-[var(--omega-fg)] placeholder:text-[var(--omega-muted)] focus:outline-none disabled:opacity-40"
          />
          {busy && <Loader2 className="size-3 animate-spin text-[var(--omega-muted)]" />}
        </div>
      </div>
    </div>
  );
}
