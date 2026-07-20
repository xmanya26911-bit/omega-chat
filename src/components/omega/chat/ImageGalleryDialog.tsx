"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Copy, Check, RotateCcw, Download, Image } from "lucide-react";
import { useImageGallery } from "@/lib/image-gallery";
import { cn } from "@/lib/utils";

interface ImageGalleryDialogProps {
  open: boolean;
  onClose: () => void;
  onRegenerate?: (prompt: string) => void;
}

export function ImageGalleryDialog({ open, onClose, onRegenerate }: ImageGalleryDialogProps) {
  const { records, removeRecord, clearAll } = useImageGallery();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-[90vw] max-w-[800px] max-h-[85vh] bg-[var(--omega-bg-2)] border border-[var(--omega-glass-border)] rounded-2xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--omega-glass-border)]">
            <div className="flex items-center gap-2">
              <Image className="size-5 text-[var(--omega-emerald)]" />
              <h3 className="font-semibold text-[var(--omega-fg)]">
                Image Gallery ({records.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {records.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-[var(--omega-glass-border)] text-[var(--omega-muted)] hover:text-[var(--omega-rose)] transition"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={onClose}
                className="size-9 rounded-lg hover:bg-[var(--omega-glass-border)] transition"
                aria-label="Close"
              >
                <X className="size-4.5" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Gallery grid */}
          <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--omega-muted)]">
                <Image className="size-12 mb-3 opacity-30" />
                <p className="text-sm">No images generated yet</p>
                <p className="text-xs mt-1">Images you generate will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {records.map((record) => (
                  <motion.div
                    key={record.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative rounded-xl overflow-hidden border border-[var(--omega-glass-border)] bg-[var(--omega-bg)]"
                  >
                    <div className="aspect-square relative overflow-hidden">
                      <img
                        src={record.url}
                        alt={record.prompt}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      {/* Overlay actions */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(record.prompt);
                            setCopiedId(record.id);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition"
                          title="Copy prompt"
                        >
                          {copiedId === record.id ? (
                            <Check className="size-4 text-white" />
                          ) : (
                            <Copy className="size-4 text-white" />
                          )}
                        </button>
                        {onRegenerate && (
                          <button
                            onClick={() => onRegenerate(record.prompt)}
                            className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition"
                            title="Regenerate"
                          >
                            <RotateCcw className="size-4 text-white" />
                          </button>
                        )}
                        <a
                          href={record.url}
                          download={`omega-${record.id}.png`}
                          className="size-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition"
                          title="Download"
                        >
                          <Download className="size-4 text-white" />
                        </a>
                        <button
                          onClick={() => removeRecord(record.id)}
                          className="size-8 rounded-lg bg-red-500/30 backdrop-blur-sm flex items-center justify-center hover:bg-red-500/50 transition"
                          title="Delete"
                        >
                          <Trash2 className="size-4 text-white" />
                        </button>
                      </div>
                    </div>
                    {/* Prompt tooltip */}
                    <div className="p-2">
                      <p className="text-[10px] text-[var(--omega-muted)] truncate leading-tight">
                        {record.prompt}
                      </p>
                      <p className="text-[9px] text-[var(--omega-fg-dim)] mt-0.5 opacity-50">
                        {new Date(record.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
