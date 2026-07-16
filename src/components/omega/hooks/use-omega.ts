"use client";

import { useEffect, useRef, type RefObject } from "react";
import type Lenis from "lenis";
import { useMotionStore } from "../store/motion-store";

/** Subscribe to the global reduced-motion flag (re-renders on change). */
export function useReducedMotion(): boolean {
  return useMotionStore((s) => s.reducedMotion);
}

/** Overall page scroll progress 0..1 (from the motion store).
 *  NOTE: re-renders on every change — prefer Motion's useScroll for
 *  scroll-driven transforms. Use this only for discrete thresholds. */
export function useScrollProgress(): number {
  return useMotionStore((s) => s.progress);
}

/**
 * Magnetic attraction — element eases toward the pointer when nearby.
 * Returns a ref to attach + nothing else (it mutates style directly via rAF
 * for buttery smoothness without React re-renders).
 */
export function useMagnetic<T extends HTMLElement>(
  strength = 0.35,
  radius = 140
): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = useMotionStore.getState().reducedMotion;
    if (reduced || !useMotionStore.getState().pointerFine) return;

    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const loop = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = () => {
      const { px, py } = useMotionStore.getState();
      const r = el.getBoundingClientRect();
      const ex = r.left + r.width / 2;
      const ey = r.top + r.height / 2;
      const dx = px - ex;
      const dy = py - ey;
      const dist = Math.hypot(dx, dy);
      if (dist < radius) {
        tx = dx * strength;
        ty = dy * strength;
      } else {
        tx = 0;
        ty = 0;
      }
    };

    const onLeave = () => {
      tx = 0;
      ty = 0;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [strength, radius]);
  return ref;
}

/**
 * 3D tilt toward the pointer + glare highlight. Mutates the element's transform
 * directly via rAF. Children with [data-tilt-depth] get translateZ applied.
 */
export function useTilt<T extends HTMLElement>(
  max = 12,
  perspective = 900
): RefObject<T> {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = useMotionStore.getState().reducedMotion;
    if (reduced || !useMotionStore.getState().pointerFine) return;

    el.style.transformStyle = "preserve-3d";
    let raf = 0;
    let trx = 0;
    let try_ = 0;
    let crx = 0;
    let cry = 0;
    let hovering = false;

    const loop = () => {
      crx += (trx - crx) * 0.12;
      cry += (try_ - cry) * 0.12;
      el.style.transform = `perspective(${perspective}px) rotateX(${crx.toFixed(
        2
      )}deg) rotateY(${cry.toFixed(2)}deg)`;
      raf = requestAnimationFrame(loop);
    };

    const onMove = () => {
      if (!hovering) return;
      const { px, py } = useMotionStore.getState();
      const r = el.getBoundingClientRect();
      const x = (px - r.left) / r.width; // 0..1
      const y = (py - r.top) / r.height;
      try_ = (x - 0.5) * max * 2;
      trx = -(y - 0.5) * max * 2;
    };

    const onEnter = () => {
      hovering = true;
    };
    const onLeave = () => {
      hovering = false;
      trx = 0;
      try_ = 0;
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    raf = requestAnimationFrame(loop);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      el.style.transform = "";
    };
  }, [max, perspective]);
  return ref;
}

/**
 * Programmatic smooth-scroll helper bound to the active Lenis instance (set up
 * by <OmegaMotionProvider/>). Falls back to native smooth scroll when Lenis is
 * absent (reduced motion / SSR). Accepts a numeric offset, a selector string,
 * or an element.
 */
export function useLenisScroll() {
  return (target: number | string | HTMLElement, opts?: { offset?: number }) => {
    const lenis = typeof window !== "undefined" ? window.__lenis : undefined;
    if (lenis) {
      lenis.scrollTo(target, { offset: opts?.offset ?? 0, duration: 1.4 });
    } else if (typeof target === "number") {
      window.scrollTo({ top: target, behavior: "smooth" });
    } else if (typeof target === "string") {
      const el = document.querySelector(target);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (target instanceof HTMLElement) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };
}
