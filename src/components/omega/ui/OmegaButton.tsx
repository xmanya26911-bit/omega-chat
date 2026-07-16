"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useMagnetic } from "../hooks/use-omega";

type Variant = "primary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface OmegaButtonProps extends Omit<HTMLMotionProps<"button">, "ref"> {
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
  children: ReactNode;
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-[15px]",
};

/**
 * OmegaButton — premium tactile button.
 *  - magnetic attraction toward the cursor (optional)
 *  - realistic compression on press (whileTap scale 0.96)
 *  - soft glow border on hover (emerald) with an inner sheen sweep
 *  - variants: primary (solid jade), ghost (glass), outline (ring)
 */
export function OmegaButton({
  variant = "primary",
  size = "md",
  magnetic = true,
  className,
  children,
  ...rest
}: OmegaButtonProps) {
  const magRef = useMagnetic<HTMLButtonElement>(0.32, 120);

  const base =
    "group relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight select-none " +
    "transition-colors duration-300 will-change-transform overflow-hidden " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--omega-ring)] focus-visible:ring-offset-0";

  const variants: Record<Variant, string> = {
    primary:
      "text-[oklch(0.06_0.01_264)] bg-[var(--omega-emerald)] hover:bg-[oklch(0.88_0.15_162)] shadow-[0_8px_30px_-8px_oklch(0.82_0.17_162_/_0.6)]",
    ghost:
      "text-[var(--omega-fg)] omega-glass hover:border-[oklch(0.82_0.17_162_/_0.35)]",
    outline:
      "text-[var(--omega-fg)] border border-[var(--omega-glass-border)] hover:border-[oklch(0.82_0.17_162_/_0.5)] hover:bg-[oklch(0.82_0.17_162_/_0.08)]",
  };

  return (
    <motion.button
      ref={magRef}
      data-cursor="hover"
      className={cn(base, sizes[size], variants[variant], className)}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      {...rest}
    >
      {/* sheen sweep on hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-[oklch(1_0_0_/_0.25)] to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full"
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
