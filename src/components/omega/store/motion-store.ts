"use client";

import { create } from "zustand";

/**
 * Single source of truth for global motion state.
 * Updated by ONE rAF loop (in <OmegaMotionProvider/>), read by many components.
 * Keeping this in a store (vs React state) prevents render cascades when
 * dozens of layers subscribe to mouse/scroll simultaneously.
 */
interface MotionState {
  // pointer
  px: number; // raw clientX
  py: number; // raw clientY
  nx: number; // normalized -1..1 from viewport center
  ny: number;
  vx: number; // velocity (raw delta)
  vy: number;
  // scroll (driven by Lenis)
  scroll: number; // current scroll Y
  velocity: number;
  progress: number; // 0..1 overall page progress
  // viewport
  vw: number;
  vh: number;
  // flags
  reducedMotion: boolean;
  pointerFine: boolean;
  ready: boolean;

  setPointer: (x: number, y: number) => void;
  setScroll: (y: number, velocity: number, progress: number) => void;
  setViewport: (w: number, h: number) => void;
  setReducedMotion: (v: boolean) => void;
  setPointerFine: (v: boolean) => void;
  setReady: (v: boolean) => void;
}

export const useMotionStore = create<MotionState>((set) => ({
  px: 0,
  py: 0,
  nx: 0,
  ny: 0,
  vx: 0,
  vy: 0,
  scroll: 0,
  velocity: 0,
  progress: 0,
  vw: typeof window !== "undefined" ? window.innerWidth : 1440,
  vh: typeof window !== "undefined" ? window.innerHeight : 900,
  reducedMotion: false,
  pointerFine: true,
  ready: false,

  setPointer: (x, y) =>
    set((s) => {
      const nx = s.vw ? (x / s.vw) * 2 - 1 : 0;
      const ny = s.vh ? (y / s.vh) * 2 - 1 : 0;
      const vx = x - s.px;
      const vy = y - s.py;
      return { px: x, py: y, nx, ny, vx, vy };
    }),
  setScroll: (y, velocity, progress) =>
    set({ scroll: y, velocity, progress }),
  setViewport: (w, h) => set({ vw: w, vh: h }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  setPointerFine: (v) => set({ pointerFine: v }),
  setReady: (v) => set({ ready: v }),
}));
