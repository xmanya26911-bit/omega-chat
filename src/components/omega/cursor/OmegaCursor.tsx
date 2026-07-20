"use client";

import { useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "@/hooks/use-omega";

/**
 * OmegaCursor — ultra-premium custom cursor with magnetic pull,
 * morphing ring, and context-aware glow trail.
 * Matches the luxury aesthetic: emerald glow, smooth interpolation.
 */
export function OmegaCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const reduced = useReducedMotion();
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });

  // Magnetic attraction state
  const magnetRef = useRef<{ el: Element; strength: number } | null>(null);

  const bindEvents = useCallback(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    const onMove = (e: MouseEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };

    // Magnetic elements
    const magEls = document.querySelectorAll("[data-cursor='hover']");

    const onMagEnter = (e: Event) => {
      const el = e.currentTarget as HTMLElement;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const strength = parseFloat(el.dataset.magnetStrength || "1");
      magnetRef.current = { el, strength };
      ring?.classList.add("scale-[1.6]", "opacity-60", "border-emerald");
      cursor?.classList.add("scale-150");
    };

    const onMagLeave = () => {
      magnetRef.current = null;
      ring?.classList.remove("scale-[1.6]", "opacity-60", "border-emerald");
      cursor?.classList.remove("scale-150");
    };

    // Input fields — hide cursor
    const inputs = document.querySelectorAll("input, textarea, select");

    const onInputEnter = () => {
      cursor?.classList.add("opacity-0");
      ring?.classList.add("opacity-0");
    };
    const onInputLeave = () => {
      cursor?.classList.remove("opacity-0");
      ring?.classList.remove("opacity-0");
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    magEls.forEach((el) => {
      el.addEventListener("mouseenter", onMagEnter);
      el.addEventListener("mouseleave", onMagLeave);
    });
    inputs.forEach((el) => {
      el.addEventListener("mouseenter", onInputEnter);
      el.addEventListener("mouseleave", onInputLeave);
    });

    return () => {
      window.removeEventListener("mousemove", onMove);
      magEls.forEach((el) => {
        el.removeEventListener("mouseenter", onMagEnter);
        el.removeEventListener("mouseleave", onMagLeave);
      });
      inputs.forEach((el) => {
        el.removeEventListener("mouseenter", onInputEnter);
        el.removeEventListener("mouseleave", onInputLeave);
      });
    };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const cleanup = bindEvents();
    return () => cleanup?.();
  }, [reduced, bindEvents]);

  // Smooth interpolation loop
  useEffect(() => {
    if (reduced) return;
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    const loop = () => {
      const { x, y } = target.current;
      pos.current.x += (x - pos.current.x) * 0.12;
      pos.current.y += (y - pos.current.y) * 0.12;

      // Magnetic pull
      if (magnetRef.current) {
        const rect = magnetRef.current.el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const pull = magnetRef.current.strength * 0.25;
        pos.current.x += (cx - pos.current.x) * pull;
        pos.current.y += (cy - pos.current.y) * pull;
      }

      cursor.style.transform = `translate3d(${pos.current.x - 4}px, ${pos.current.y - 4}px, 0)`;
      ring.style.transform = `translate3d(${pos.current.x - 16}px, ${pos.current.y - 16}px, 0)`;
      ring.style.borderColor = "var(--omega-emerald)";

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    document.body.classList.add("omega-custom-cursor-active");

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.body.classList.remove("omega-custom-cursor-active");
    };
  }, [reduced]);

  if (reduced) return null;

  return (
    <>
      {/* Dot cursor */}
      <div
        ref={cursorRef}
        className="pointer-events-none fixed z-[9999] size-2 rounded-full bg-[var(--omega-emerald)] shadow-[0_0_12px_var(--omega-emerald-glow)] transition-transform duration-100"
        style={{
          willChange: "transform",
          boxShadow: "0 0 12px oklch(0.82 0.17 162 / 0.6)",
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        className="pointer-events-none fixed z-[9998] size-8 rounded-full border transition-all duration-200 ease-out"
        style={{
          borderWidth: "1.5px",
          borderColor: "oklch(0.82 0.17 162 / 0.4)",
          willChange: "transform",
          boxShadow: "inset 0 0 20px oklch(0.82 0.17 162 / 0.08), 0 0 20px oklch(0.82 0.17 162 / 0.08)",
        }}
      />
    </>
  );
}
