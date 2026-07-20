"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * OmegaLoader — premium animated loading screen.
 * Shows the Omega emblem with a pulsing ring, morphing gradient,
 * and particle-like dots. Gracefully reduces motion.
 */
export function OmegaLoader({ onLoaded }: { onLoaded?: () => void }) {
  const [progress, setProgress] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setShow(false);
            onLoaded?.();
          }, 400);
          return 100;
        }
        // Non-linear progress: fast start, slow finish
        const increment = p < 60 ? 3 + Math.random() * 4 : 1 + Math.random() * 2;
        return Math.min(p + increment, 100);
      });
    }, 80);

    return () => clearInterval(interval);
  }, [onLoaded]);

  if (!show) return null;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[var(--omega-bg)]"
    >
      {/* Emblem */}
      <div className="relative mb-8 flex items-center justify-center">
        {/* Pulsing ring */}
        <motion.div
          className="absolute size-24 rounded-full border"
          style={{ borderColor: "var(--omega-emerald)" }}
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.3, 0.1, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Inner glow */}
        <motion.div
          className="absolute size-16 rounded-full"
          style={{
            background: "radial-gradient(circle, oklch(0.82 0.17 162 / 0.15) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Omega symbol */}
        <span className="relative font-display text-5xl font-bold text-[var(--omega-fg)]">
          Ω
        </span>
      </div>

      {/* Loading bar */}
      <div className="h-[2px] w-48 overflow-hidden rounded-full bg-[var(--omega-glass-border)]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: "var(--omega-emerald)" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Percentage */}
      <p className="mt-3 font-mono text-[11px] tracking-widest text-[var(--omega-muted)]">
        {Math.round(progress)}%
      </p>

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute size-1 rounded-full"
            style={{
              background: "var(--omega-emerald)",
              left: `${15 + i * 10}%`,
              top: `${40 + Math.sin(i * 1.5) * 20}%`,
              opacity: 0.3,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
