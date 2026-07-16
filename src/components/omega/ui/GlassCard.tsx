"use client";

import { type ReactNode, type HTMLAttributes } from "react";
import { motion, useReducedMotion as useFramerReduced } from "framer-motion";
import { cn } from "@/lib/utils";
import { useTilt } from "../hooks/use-omega";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  tilt?: boolean;
  tiltMax?: number;
  depth?: number; // translateZ for content layering
  glow?: boolean;
}

/**
 * GlassCard — the primary depth-based surface in Omega.
 *  - real glass (blur + saturation + inner highlight)
 *  - optional 3D tilt toward the cursor (perspective rotation)
 *  - depth-aware: content gets translateZ via preserve-3d
 *  - soft emerald glow option
 *  - lifts physically on hover
 */
export function GlassCard({
  children,
  className,
  tilt = true,
  tiltMax = 10,
  depth = 0,
  glow = false,
  ...rest
}: GlassCardProps) {
  const tiltRef = useTilt<HTMLDivElement>(tiltMax, 1000);
  const framerReduced = useFramerReduced();
  const useTiltEnabled = tilt && !framerReduced;

  return (
    <div style={{ perspective: 1000 }} className={cn("group relative", className)}>
      <motion.div
        ref={tiltRef}
        data-cursor={useTiltEnabled ? "view" : "hover"}
        className={cn(
          "omega-glass relative h-full rounded-2xl omega-tilt transition-shadow duration-500",
          glow && "omega-glow-emerald"
        )}
        style={{ transformStyle: "preserve-3d" }}
        whileHover={useTiltEnabled ? undefined : { y: -4 }}
        transition={{ type: "spring", stiffness: 300, damping: 24 }}
        {...rest}
      >
        {/* top sheen / refraction highlight */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[oklch(1_0_0_/_0.35)] to-transparent"
        />
        {/* corner glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(420px circle at var(--mx,50%) var(--my,0%), oklch(0.82 0.17 162 / 0.12), transparent 60%)",
          }}
        />
        <div
          style={{ transform: `translateZ(${depth}px)` }}
          className="relative h-full"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
