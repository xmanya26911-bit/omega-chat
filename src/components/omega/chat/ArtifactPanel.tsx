"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Copy, Maximize2, Minimize2, Download, Code, BarChart2, FileText, Sparkles, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

type ArtifactType = "code" | "markdown" | "chart" | "svg" | "html" | "mermaid";

interface Artifact {
  id: string;
  title: string;
  type: ArtifactType;
  content: string;
  language?: string;
  createdAt: number;
  version: number;
}

interface ArtifactPanelProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, content: string, version: number) => void;
}

const TYPE_ICONS: Record<ArtifactType, React.ReactNode> = {
  code: <Code className="size-3.5" strokeWidth={2} />,
  markdown: <FileText className="size-3.5" strokeWidth={2} />,
  chart: <BarChart2 className="size-3.5" strokeWidth={2} />,
  svg: <Code className="size-3.5" strokeWidth={2} />,
  html: <Code className="size-3.5" strokeWidth={2} />,
  mermaid: <Sparkles className="size-3.5" strokeWidth={2} />,
};

const TYPE_LABELS: Record<ArtifactType, string> = {
  code: "Code",
  markdown: "Document",
  chart: "Chart",
  svg: "SVG",
  html: "HTML",
  mermaid: "Mermaid",
};

function ArtifactList({ artifacts, activeId, onSelect, onDelete }: {
  artifacts: Artifact[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
      {artifacts.map((a) => (
        <Tooltip key={a.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onSelect(a.id)}
              className={cn(
                "w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left",
                "transition-colors duration-200",
                "data-[highlighted]:bg-[oklch(0.82_0.17_162_/_0.1)]",
                activeId === a.id
                  ? "bg-[oklch(0.82_0.17_162_/_0.08)]"
                  : "hover:bg-[oklch(0.82_0.17_162_/_0.05)]"
              )}
            >
              <span className="flex size-6 shrink-0 items-center justify-center text-[var(--omega-emerald)]">
                {TYPE_ICONS[a.type]}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-mono text-xs text-[var(--omega-fg)]">
                  {a.title}
                </div>
                <div className="truncate font-mono text-[9px] text-[var(--omega-muted)]">
                  {TYPE_LABELS[a.type]} · v{a.version} · {a.language || "plain"}
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(a.id); }}
                    aria-label="Delete artifact"
                    className="size-6 shrink-0 rounded opacity-0 group-hover:opacity-100 transition-opacity text-[var(--omega-muted)] hover:text-[var(--omega-rose)]"
                  >
                    <X className="size-3.5" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                  Delete artifact
                </TooltipContent>
              </Tooltip>
            </button>
          </Tooltip>
        ))}
      {artifacts.length === 0 && (
        <div className="flex h-full items-center justify-center px-4 text-center">
          <div className="text-[var(--omega-muted)]">
            <Sparkles className="size-8 mx-auto mb-2 opacity-40" strokeWidth={1.5} />
            <p className="font-mono text-xs">No artifacts yet</p>
            <p className="text-[10px] mt-1">Code, charts, and documents appear here</p>
          </div>
        )}
    </div>
  );
}

function ArtifactViewer({ artifact, onUpdate, onClose }: {
  artifact: Artifact | null;
  onUpdate: (id: string, content: string, version: number) => void;
  onClose: () => void;
}) {
  if (!artifact) return null;

  const [editMode, setEditMode] = React.useState(false);
  const [content, setContent] = React.useState(artifact.content);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onUpdate(artifact.id, content, artifact.version + 1);
    setEditMode(false);
  };

  const renderContent = () => {
    switch (artifact.type) {
      case "mermaid":
        return (
          <div className="mermaid p-4 bg-[var(--omega-bg)] rounded-lg border border-[var(--omega-glass-border)] overflow-auto">
            {content}
          </div>
        );
      case "html":
        return (
          <iframe
            srcDoc={content}
            className="w-full h-96 bg-white rounded-lg border border-[var(--omega-glass-border)]"
            sandbox="allow-scripts allow-same-origin"
          />
        );
      case "svg":
        return (
          <div className="p-4 bg-white rounded-lg border border-[var(--omega-glass-border)] overflow-auto" dangerouslySetInnerHTML={{ __html: content }} />
        );
      case "chart":
        return (
          <div className="p-4 bg-white rounded-lg border border-[var(--omega-glass-border)] overflow-auto" dangerouslySetInnerHTML={{ __html: content }} />
        );
      case "markdown":
        return (
          <div className="prose prose-invert max-w-none p-4" dangerouslySetInnerHTML={{ __html: content }} />
        );
      case "code":
      default:
        return (
          <pre className="p-4 bg-[var(--omega-bg-2)] rounded-lg border border-[var(--omega-glass-border)] overflow-auto">
            <code className={`language-${artifact.language || "plaintext"}`}>{content}</code>
          </pre>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className="fixed inset-0 z-[90] flex flex-col bg-[var(--omega-bg)]"
      data-artifact-viewer="true"
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3 p-4 border-b border-[var(--omega-glass-border)] bg-[var(--omega-bg-2)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
            aria-label="Close artifact"
          >
            <ChevronLeft className="size-4.5" strokeWidth={2} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded bg-[oklch(0.82_0.17_162_/_0.15)] text-[var(--omega-emerald)]">
                {TYPE_ICONS[artifact.type]}
              </span>
              <div>
                <h3 className="font-medium text-[var(--omega-fg)]">{artifact.title}</h3>
                <div className="flex items-center gap-1.5 text-xs text-[var(--omega-muted)]">
                  <span>{TYPE_LABELS[artifact.type]}</span>
                  <span>·</span>
                  <span>v{artifact.version}</span>
                  {artifact.language && <><span>·</span><span>{artifact.language}</span></>}
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCopy}
                  className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
                  aria-label={copied ? "Copied!" : "Copy to clipboard"}
                >
                  <Copy className={cn("size-4.5", copied && "text-[var(--omega-emerald)]")} strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                {copied ? "Copied!" : "Copy to clipboard"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
                  aria-label={editMode ? "Exit edit mode" : "Edit artifact"}
                >
                  <Maximize2 className="size-4.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                {editMode ? "Exit edit" : "Edit artifact"}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    const blob = new Blob([content], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${artifact.title}.${artifact.language || "txt"}`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
                  aria-label="Download artifact"
                >
                  <Download className="size-4.5" strokeWidth={2} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                Download
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          {editMode ? (
            <div className="h-[calc(100%-80px)] flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--omega-muted)]">Editing {artifact.language || "plaintext"}</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave}>
                    Save (v{artifact.version + 1})
                  </Button>
                </div>
              </span>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-lg p-3 font-mono text-sm text-[var(--omega-fg)] placeholder-[var(--omega-muted)] focus:outline-none focus:border-[var(--omega-emerald)] resize-none"
                spellCheck={false}
                style={{ fontFamily: "inherit" }}
              />
            </div>
          ) : (
            renderContent()
          )}
        </div>

        {/* Footer with actions */}
        {!editMode && (
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-3 border-t border-[var(--omega-glass-border)] bg-[var(--omega-bg-2)]">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-[var(--omega-muted)]">
                {artifact.content.length} chars · {artifact.content.split("\n").length} lines
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setEditMode(true)}
                    className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
                    aria-label="Edit artifact"
                  >
                    <Code className="size-4" strokeWidth={2} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
                  Edit
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </motion.div>
    );
  }
}

export function ArtifactPanel({ artifacts, activeArtifactId, onClose, onSelect, onDelete, onUpdate }: ArtifactPanelProps) {
  const activeArtifact = artifacts.find(a => a.id === activeArtifactId) || null;

  return (
    <AnimatePresence mode="wait">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: 380 }}
        animate={{ x: 0 }}
        exit={{ x: 380 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed right-0 top-0 z-[85] h-full w-80 flex flex-col bg-[var(--omega-bg-2)] border-l border-[var(--omega-glass-border)]"
        data-artifact-panel="true"
      >
        <div className="flex shrink-0 items-center justify-between p-4 border-b border-[var(--omega-glass-border)]">
          <h3 className="font-semibold text-[var(--omega-fg)]">Artifacts</h3>
          <button
            onClick={onClose}
            className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition-colors"
            aria-label="Close artifacts panel"
          >
            <X className="size-4.5" strokeWidth={2} />
          </button>
        </div>
        <ArtifactList
          artifacts={artifacts}
          activeId={activeArtifactId}
          onSelect={onSelect}
          onDelete={onDelete}
        />
      </motion.aside>

      {/* Viewer */}
      {activeArtifact && (
        <ArtifactViewer
          artifact={activeArtifact}
          onUpdate={onUpdate}
          onClose={() => onSelect(null)}
        />
      )}
    </AnimatePresence>
  );
}

export default ArtifactPanel;