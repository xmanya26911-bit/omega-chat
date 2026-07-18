"use client";

import * as React from "react";
import { Paperclip, X, Image, FileText, FileCode, File, Loader2, Upload, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type UploadedFile = {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
  content?: string;
  preview?: string;
  status: "uploading" | "ready" | "error";
  error?: string;
};

interface FileUploadProps {
  files: UploadedFile[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  disabled?: boolean;
  maxSize?: number; // MB
  maxFiles?: number;
}

const FILE_ICONS: Record<string, React.ReactNode> = {
  "image": <Image className="size-5" />,
  "text": <FileText className="size-5" />,
  "code": <FileCode className="size-5" />,
  "default": <File className="size-5" />,
};

function getFileIcon(mime: string): React.ReactNode {
  if (mime.startsWith("image/")) return FILE_ICONS.image;
  if (mime.startsWith("text/")) return FILE_ICONS.text;
  if (mime.includes("javascript") || mime.includes("python") || mime.includes("typescript") || mime.includes("json") || mime.includes("html") || mime.includes("css")) return FILE_ICONS.code;
  return FILE_ICONS.default;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function FilePreview({ file }: { file: UploadedFile }) {
  const isImage = file.type.startsWith("image/");
  const isCode = file.type.includes("javascript") || file.type.includes("python") || file.type.includes("typescript") || file.type.includes("json") || file.type.includes("html") || file.type.includes("css") || file.type.includes("yaml") || file.type.includes("xml");
  const isText = file.type.startsWith("text/");

  if (isImage && file.preview) {
    return (
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--omega-glass-border)]">
        <img
          src={file.preview}
          alt={file.name}
          className="h-full w-full object-cover"
          onLoad={(e) => URL.revokeObjectURL?.(file.preview!)}
        />
      </div>
    );
  }

  if (isCode || isText) {
    return (
      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-[oklch(0.82_0.17_162_/_0.1)] border border-[var(--omega-glass-border)] text-[var(--omega-emerald)]">
        {getFileIcon(file.type)}
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--omega-glass-border)] border border-[var(--omega-glass-border)] text-[var(--omega-muted)]">
      {getFileIcon(file.type)}
    </div>
  );
}

export function FileUpload({ files, onAdd, onRemove, onClear, disabled, maxSize = 10, maxFiles = 5 }: FileUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const handleFiles = (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    const tooMany = files.length + incoming.length > maxFiles;
    const tooBig = incoming.some(f => f.size > maxSize * 1024 * 1024);

    if (tooMany) {
      alert(`Max ${maxFiles} files allowed`);
      return;
    }
    if (tooBig) {
      alert(`Each file must be under ${maxSize}MB`);
      return;
    }

    onAdd(incoming);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  if (files.length === 0) {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.txt,.json,.js,.py,.tsx,.ts,.html,.css,.md,.csv,.xml,.yaml,.yml"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
          disabled={disabled}
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className={cn(
                "size-9 flex items-center justify-center rounded-lg",
                "text-[var(--omega-muted)] hover:text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)]",
                "transition-colors duration-200",
                disabled && "opacity-40 cursor-not-allowed"
              )}
              aria-label="Attach file"
            >
              <Paperclip className="size-4.5" strokeWidth={2} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="omega-glass border-[var(--omega-glass-border)]">
            Attach files (images, code, PDFs)
          </TooltipContent>
        </Tooltip>
      </>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={cn(
        "flex flex-wrap items-center gap-2 px-3 py-2",
        "border-t border-[var(--omega-glass-border)]",
        dragOver && "bg-[oklch(0.82_0.17_162_/_0.08)]"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.json,.js,.py,.tsx,.ts,.html,.css,.md,.csv,.xml,.yaml,.yml"
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        disabled={disabled}
      />
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            "group relative flex items-center gap-2 rounded-lg p-1.5 pr-2",
            "bg-[var(--omega-bg)] border border-[var(--omega-glass-border)]",
            file.status === "error" && "border-[oklch(0.7_0.21_14_/_0.4)]"
          )}
        >
          <FilePreview file={file} />
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium text-[var(--omega-fg)] truncate max-w-[120px]">
              {file.name}
            </span>
            <span className="text-[10px] text-[var(--omega-muted)]">
              {file.status === "uploading" ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Uploading...
                </span>
              ) : file.status === "error" ? (
                <span className="flex items-center gap-1 text-[var(--omega-rose)]">
                  <AlertCircle className="size-3" />
                  {file.error || "Error"}
                </span>
              ) : (
                formatSize(file.size)
              )}
            </span>
          </div>
          <button
            onClick={() => onRemove(file.id)}
            className="size-6 shrink-0 rounded hover:bg-[oklch(0.7_0.21_14_/_0.1)] text-[var(--omega-muted)] hover:text-[var(--omega-rose)] transition-colors absolute -top-1.5 -right-1.5 bg-[var(--omega-bg)] border border-[var(--omega-glass-border)] rounded-full"
            aria-label={`Remove ${file.name}`}
          >
            <X className="size-3" strokeWidth={2} />
          </button>
        </div>
      ))}
      {files.length < maxFiles && (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="size-9 flex items-center justify-center rounded-lg border border-dashed border-[var(--omega-glass-border)] text-[var(--omega-muted)] hover:text-[var(--omega-fg)] hover:bg-[var(--omega-glass-border)] transition-colors"
        >
          <Upload className="size-4" strokeWidth={2} />
        </button>
      )}
      <div className="flex-1" />
      {files.some(f => f.status === "ready") && (
        <button
          onClick={onClear}
          className="text-[10px] text-[var(--omega-muted)] hover:text-[var(--omega-rose)] transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export default FileUpload;