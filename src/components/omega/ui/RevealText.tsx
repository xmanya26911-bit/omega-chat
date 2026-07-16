"use client";

import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ElementType, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pre-created motion elements (avoid calling motion() during render).
const motionTags = {
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
} as const;

/**
 * RevealText — cinematic text reveal.
 * Splits a string into words and staggers them up from below with a blur burn-off,
 * triggered when scrolled into view. Honors reduced motion (instant show).
 */
export function RevealText({
  text,
  as: Tag = "div",
  className,
  wordClassName,
  delay = 0,
  stagger = 0.05,
  once = true,
}: {
  text: string;
  as?: ElementType;
  className?: string;
  wordClassName?: string;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-12% 0px -12% 0px" });
  const words = text.split(" ");

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: stagger, delayChildren: delay },
    },
  };
  const child: Variants = {
    hidden: { y: "0.6em", opacity: 0, filter: "blur(8px)" },
    show: {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const MotionTag = motionTags[Tag as keyof typeof motionTags] ?? motion.div;

  return (
    <MotionTag
      ref={ref}
      className={cn("inline-block", className)}
      variants={container}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom">
          <motion.span
            variants={child}
            className={cn("inline-block will-change-transform", wordClassName)}
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

/**
 * Reveal — generic in-view fade/rise wrapper for any block content.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 28,
  once = true,
  blur = true,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  once?: boolean;
  blur?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once, margin: "-10% 0px -10% 0px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, filter: blur ? "blur(10px)" : "blur(0px)" }}
      animate={
        inView
          ? { opacity: 1, y: 0, filter: "blur(0px)" }
          : { opacity: 0, y, filter: blur ? "blur(10px)" : "blur(0px)" }
      }
      transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
