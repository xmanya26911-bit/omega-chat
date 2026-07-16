"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { RevealText, Reveal } from "./RevealText";

/**
 * SectionHeading — consistent cinematic section opener.
 * Eyebrow (kicker) + large display title + optional subtitle, with a parallax
 * drift on the eyebrow driven by scroll.
 */
export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "center",
  className,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const eyebrowY = useTransform(scrollYProgress, [0, 1], [24, -24]);

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className
      )}
    >
      {kicker && (
        <motion.div style={{ y: eyebrowY }} className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-[var(--omega-emerald)]" />
          <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--omega-emerald)]">
            {kicker}
          </span>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-[var(--omega-emerald)]" />
        </motion.div>
      )}
      <RevealText
        as="h2"
        text={title}
        className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-[var(--omega-fg)] sm:text-5xl md:text-6xl"
        stagger={0.04}
      />
      {subtitle && (
        <Reveal delay={0.15}>
          <p
            className={cn(
              "max-w-2xl text-base leading-relaxed text-[var(--omega-fg-dim)] sm:text-lg",
              align === "center" && "mx-auto"
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      )}
    </div>
  );
}
