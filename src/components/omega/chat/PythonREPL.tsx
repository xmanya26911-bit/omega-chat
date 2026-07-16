"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Play, 
  Square, 
  Trash2, 
  Copy, 
  Maximize2,
  RotateCcw,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  X,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PythonREPLProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteCode?: (code: string) => Promise<{ stdout: string; stderr: string; result?: any }>;
}

interface Cell {
  id: string;
  code: string;
  output: string;
  error: string | null;
  running: boolean;
  result?: any;
}

export function PythonREPL({ isOpen, onClose, onExecuteCode }: PythonREPLProps) {
  const [cells, setCells] = React.useState<Cell[]>([{ id: "1", code: "", output: "", error: null, running: false }]);
  const [pyodideReady, setPyodideReady] = React.useState(false);
  const [pyodideLoading, setPyodideLoading] = React.useState(false);
  const [executions, setExecutions] = React.useState(0);

  // Load Pyodide
  React.useEffect(() => {
    if (!isOpen) return;
    loadPyodide();
  }, [isOpen]);

  const loadPyodide = async () => {
    if (pyodideReady) return;
    setPyodideLoading(true);
    try {
      // @ts-ignore
      if ((window as any).loadPyodide) {
        // @ts-ignore
        (window as any).pyodide = await (window as any).loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
        });
        setPyodideReady(true);
      } else {
        // Load pyodide script
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/pyodide.js";
        script.onload = async () => {
          // @ts-ignore
          (window as any).pyodide = await (window as any).loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/",
          });
          setPyodideReady(true);
          setPyodideLoading(false);
        };
        document.head.appendChild(script);
      }
    } catch (e) {
      console.error("Failed to load Pyodide:", e);
      setPyodideLoading(false);
    }
  };

  const addCell = () => {
    setCells(prev => [...prev, { id: Date.now().toString(), code: "", output: "", error: null, running: false }]);
  };

  const removeCell = (id: string) => {
    if (cells.length <= 1) return;
    setCells(prev => prev.filter(c => c.id !== id));
  };

  const updateCellCode = (id: string, code: string) => {
    setCells(prev => prev.map(c => c.id === id ? { ...c, code } : c));
  };

  const runCell = async (id: string) => {
    if (!pyodideReady) {
      alert("Pyodide still loading...");
      return;
    }

    const cell = cells.find(c => c.id === id);
    if (!cell || !cell.code.trim()) return;

    setCells(prev => prev.map(c => c.id === id ? { ...c, running: true, output: "", error: null } : c));
    setExecutions(prev => prev + 1);

    try {
      // @ts-ignore
      const pyodide = (window as any).pyodide;
      if (!pyodide) throw new Error("Pyodide not loaded");

      // Capture stdout/stderr
      let output = "";
      let error = null;
      
      // @ts-ignore
      pyodide.runPython(`
import sys
import io
_stdout = sys.stdout
_stderr = sys.stderr
sys.stdout = io.StringIO()
sys.stderr = io.StringIO()
      `);

      try {
        const result = await pyodide.runPythonAsync(cell.code);
        const stdout = pyodide.runPython("sys.stdout.getvalue()");
        const stderr = pyodide.runPython("sys.stderr.getvalue()");
        
        // @ts-ignore
        pyodide.runPython(`
import sys
sys.stdout = _stdout
sys.stderr = _stderr
        `);
        
        if (stdout) output += stdout;
        if (stderr) error = stderr;
        if (result !== undefined && result !== null) {
          output += (output ? "\n" : "") + String(result);
        }
      } catch (e: any) {
        // @ts-ignore
        pyodide.runPython(`
import sys
sys.stdout = _stdout
sys.stderr = _stderr
        `);
        error = e.message || String(e);
      }

      setCells(prev => prev.map(c => c.id === id ? { ...c, running: false, output: output.trim(), error: error || c.error } : c));
    } catch (e: any) {
      setCells(prev => prev.map(c => c.id === id ? { ...c, running: false, error: e.message || String(e) } : c));
    }
  };

  const runAll = async () => {
    for (const cell of cells) {
      if (cell.code.trim()) {
        await runCell(cell.id);
        await new Promise(r => setTimeout(r, 100));
      }
    }
  };

  const clearOutputs = () => {
    setCells(prev => prev.map(c => ({ ...c, output: "", error: null })));
  };

  const copyOutput = (output: string) => {
    navigator.clipboard.writeText(output);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed right-0 top-0 z-[90] h-full w-96 flex flex-col bg-[var(--omega-bg-2)] border-l border-[var(--omega-glass-border)]"
        data-python-repl="true"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between p-3 border-b border-[var(--omega-glass-border)] bg-[var(--omega-bg)]">
          <div className="flex items-center gap-2">
            <Terminal className="size-5 text-[var(--omega-emerald)]" />
            <h3 className="font-semibold text-[var(--omega-fg)]">Python REPL</h3>
            {pyodideLoading && (
              <Loader2 className="size-4 animate-spin text-[var(--omega-emerald)]" />
            )}
            {pyodideReady && (
              <CheckCircle className="size-4 text-[var(--omega-emerald)]" />
            )}
            {!pyodideReady && !pyodideLoading && (
              <AlertCircle className="size-4 text-[var(--omega-amber)]" />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setExecutions(0)}
              className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
              title="Reset execution count"
            >
              <RotateCcw className="size-4.5" strokeWidth={2} />
            </button>
            <button
              onClick={onClose}
              className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
              aria-label="Close REPL"
            >
              <X className="size-4.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex shrink-0 items-center gap-1.5 p-2 border-b border-[var(--omega-glass-border)] bg-[var(--omega-bg)]">
          <button
            onClick={addCell}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--omega-emerald)] hover:bg-[oklch(0.82_0.17_162_/_0.1)] rounded-lg transition"
          >
            <Plus className="size-3.5" strokeWidth={2} />
            Cell
          </button>
          <button
            onClick={runAll}
            disabled={!pyodideReady || cells.every(c => !c.code.trim())}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] rounded-lg transition disabled:opacity-40"
          >
            <Play className="size-3.5" strokeWidth={2} />
            Run All
          </button>
          <button
            onClick={clearOutputs}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--omega-fg-dim)] hover:bg-[var(--omega-glass-border)] rounded-lg transition"
          >
            <Trash2 className="size-3.5" strokeWidth={2} />
            Clear
          </button>
          <div className="flex-1" />
          <span className="font-mono text-[10px] text-[var(--omega-muted)]">
            {executions} runs
          </span>
        </div>

        {/* Cells */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {cells.map((cell, index) => (
            <Cell
              key={cell.id}
              cell={cell}
              index={index}
              pyodideReady={pyodideReady}
              onCodeChange={updateCellCode}
              onRun={runCell}
              onRemove={removeCell}
              onCopy={copyOutput}
              cellsLength={cells.length}
            />
          ))}
        </div>

        {/* Status bar */}
        <div className="flex shrink-0 items-center justify-between px-3 py-2 border-t border-[var(--omega-glass-border)] bg-[var(--omega-bg)] text-[var(--omega-muted)]">
          <span className="font-mono text-[10px]">
            {pyodideReady ? "Ready" : pyodideLoading ? "Loading Pyodide..." : "Loading..."}
          </span>
          <span className="font-mono text-[10px]">
            {cells.length} cells
          </span>
          <span className="font-mono text-[10px]">
            {cells.reduce((sum, c) => sum + c.code.length, 0)} chars
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function Cell({ 
  cell, 
  index, 
  pyodideReady, 
  onCodeChange, 
  onRun, 
  onRemove, 
  onCopy,
  cellsLength
}: { 
  cell: Cell; 
  index: number; 
  pyodideReady: boolean;
  onCodeChange: (id: string, code: string) => void;
  onRun: (id: string) => void;
  onRemove: (id: string) => void;
  onCopy: (output: string) => void;
  cellsLength: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      if (pyodideReady && cell.code.trim()) {
        // Trigger run
        const event = new CustomEvent("run-cell", { detail: cell.id });
        window.dispatchEvent(event);
      }
    }
    // Tab handling
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const value = e.currentTarget.value;
      e.currentTarget.value = value.substring(0, start) + "    " + value.substring(end);
      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 4;
      // Trigger change
      e.currentTarget.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail === cell.id) onRun(cell.id);
    };
    window.addEventListener("run-cell", handler as EventListener);
    return () => window.removeEventListener("run-cell", handler as EventListener);
  }, [cell.id, onRun]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="flex flex-col gap-2"
      data-cell-id={cell.id}
    >
      {/* Cell header */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-[var(--omega-muted)]">
          In [{index + 1}]
        </span>
        <div className="flex-1" />
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(cell.output);
                }}
                disabled={!cell.output}
                className="size-8 rounded-lg hover:bg-[var(--omega-glass-border)] transition disabled:opacity-40"
                aria-label="Copy output"
              >
                <Copy className="size-3.5" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
              Copy output
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setExpanded(!expanded)}
                className="size-8 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
                aria-label={expanded ? "Collapse" : "Expand"}
              >
                <Maximize2 className="size-4" strokeWidth={2} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
              {expanded ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
          {cellsLength > 1 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onRemove(cell.id)}
                  disabled={cellsLength <= 1}
                  className="size-8 rounded-lg hover:bg-[oklch(0.7_0.21_14_/_0.16)] text-[var(--omega-rose)] transition disabled:opacity-40"
                  aria-label="Remove cell"
                >
                  <Trash2 className="size-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                Remove cell
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Code editor */}
      <div className={cn("relative", expanded && "max-h-[50vh]")}>
        <textarea
          ref={(el) => { if (el) el.style.height = "auto"; el!.style.height = Math.min(el!.scrollHeight, expanded ? 500 : 200) + "px"; }}
          value={cell.code}
          onChange={(e) => onCodeChange(cell.id, e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={index === 0 ? "# Python REPL - Press Ctrl+Enter to run" : "# New cell"}
          disabled={!pyodideReady}
          className={cn(
            "w-full bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] rounded-lg p-3 font-mono text-sm text-[var(--omega-fg)]",
            "placeholder:text-[var(--omega-muted)] focus:outline-none focus:border-[var(--omega-emerald)]",
            "resize-y transition-colors",
            !pyodideReady && "opacity-60 cursor-not-allowed"
          )}
          spellCheck={false}
          style={{ 
            minHeight: expanded ? "300px" : "80px",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: "12px",
            lineHeight: "1.5",
            tabSize: 4
          }}
        />
        {!pyodideReady && (
          <div className="absolute inset-0 bg-[var(--omega-bg)]/90 flex items-center justify-center rounded-lg pointer-events-none">
            <span className="text-[var(--omega-muted)] text-sm">Pyodide loading...</span>
          </div>
        )}
        {cell.running && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-[var(--omega-bg-2)] border border-[var(--omega-emerald)] rounded px-2 py-1">
            <Loader2 className="size-3 animate-spin text-[var(--omega-emerald)]" />
            <span className="font-mono text-xs text-[var(--omega-emerald)]">Running...</span>
          </div>
        )}
      </div>

      {/* Output */}
      {(cell.output || cell.error) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="relative"
        >
          <div className="flex items-center justify-between px-2 py-1 text-[10px] font-mono text-[var(--omega-muted)]">
            <span>Out [{index + 1}]</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onCopy(cell.output)}
                  className="size-7 rounded hover:bg-[var(--omega-glass-border)] transition"
                  aria-label="Copy output"
                >
                  <Copy className="size-3.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                Copy
              </TooltipContent>
            </Tooltip>
          </div>
          <div className={cn(
            "overflow-auto rounded-lg p-3 font-mono text-sm border",
            cell.error 
              ? "bg-[oklch(0.7_0.21_14_/_0.08)] border-[oklch(0.7_0.21_14_/_0.3)] text-[var(--omega-rose)]"
              : "bg-[var(--omega-bg)] border-[var(--omega-glass-border)] text-[var(--omega-fg-dim)]"
          )}
            style={{ maxHeight: "300px", minHeight: "40px" }}
          >
            <pre className="whitespace-pre-wrap break-words m-0">
              {cell.error ? cell.error : cell.output}
            </pre>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default PythonREPL;