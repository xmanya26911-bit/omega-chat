"use client";

import { useState, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────

export interface ImageGenRecord {
  id: string;
  prompt: string;
  url: string;
  timestamp: number;
  model?: string;
  width?: number;
  height?: number;
}

// ── Storage ────────────────────────────────────────────────────────────

const STORAGE_KEY = "omega_image_gallery_v1";
const MAX_RECORDS = 100;

function load(): ImageGenRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function save(records: ImageGenRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch { /* quota */ }
}

// ── Hook ───────────────────────────────────────────────────────────────

export function useImageGallery() {
  const [records, setRecords] = useState<ImageGenRecord[]>(load);

  const addRecord = useCallback((record: Omit<ImageGenRecord, "id" | "timestamp">) => {
    const newRecord: ImageGenRecord = {
      ...record,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
      timestamp: Date.now(),
    };
    setRecords((prev) => {
      const updated = [newRecord, ...prev];
      save(updated);
      return updated;
    });
    return newRecord;
  }, []);

  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const updated = prev.filter((r) => r.id !== id);
      save(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    setRecords([]);
    save([]);
  }, []);

  return { records, addRecord, removeRecord, clearAll };
}
