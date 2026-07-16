"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, History, Cloud, MonitorSmartphone } from "lucide-react";
import { useAuthStore } from "../store/auth-store";
import { useOAuth } from "../hooks/use-oauth";
import { useEffect, useState } from "react";

const BADGES = [
  { icon: History, label: "Chat history" },
  { icon: Shield, label: "Memories persist" },
  { icon: Cloud, label: "Your data" },
  { icon: MonitorSmartphone, label: "Sync across devices" },
];

/**
 * OmegaLogin — full-screen glass overlay for Google sign-in.
 * z-index: 80 (above the cursor layer at z-60). Animated entrance
 * (fade + scale). Renders only when `loginOverlayOpen` is true in the auth
 * store.
 */
export function OmegaLogin() {
  const { loginOverlayOpen, beginLogin, closeLoginOverlay } = useOAuth();
  const [redirecting, setRedirecting] = useState(false);
  
  // Check if this is mandatory auth (from needAuth=1 redirect)
  const [isMandatoryAuth, setIsMandatoryAuth] = useState(false);
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mandatory = params.get("needAuth") === "1";
      setIsMandatoryAuth(mandatory);
    }
  }, []);

  // Close on Escape (only if not mandatory auth)
  useEffect(() => {
    if (!loginOverlayOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isMandatoryAuth) closeLoginOverlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loginOverlayOpen, closeLoginOverlay, isMandatoryAuth]);

  const handleSignIn = async () => {
    setRedirecting(true);
    try {
      await beginLogin();
    } catch {
      setRedirecting(false);
    }
  };

  return (
    <AnimatePresence>
      {loginOverlayOpen && (
        <motion.div
          key="login-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-[80] flex items-center justify-center px-4"
          data-omega-auth="true"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0.05 0.01 264 / 0.7), oklch(0.02 0 0 / 0.92))",
            backdropFilter: "blur(16px) saturate(120%)",
            WebkitBackdropFilter: "blur(16px) saturate(120%)",
          }}
        >
          {/* Close button (hidden for mandatory auth) */}
          {!isMandatoryAuth && (
            <button
              onClick={closeLoginOverlay}
              data-cursor="hover"
              aria-label="Close login"
              className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full border border-[var(--omega-glass-border)] text-[var(--omega-fg-dim)] transition-colors hover:border-[var(--omega-emerald)]/50 hover:text-[var(--omega-fg)]"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          )}

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="omega-glass relative w-full max-w-md overflow-hidden rounded-3xl p-8 sm:p-10"
            style={{ boxShadow: "0 40px 120px -40px oklch(0.82 0.17 162 / 0.35)" }}
          >
            {/* aurora glow behind the logo */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full opacity-60 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, var(--omega-emerald), transparent 70%)",
              }}
            />

            {/* Logo */}
            <div className="relative flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
                className="relative mb-6 grid h-16 w-16 place-items-center rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.82 0.17 162 / 0.2), oklch(0.85 0.15 82 / 0.12))",
                  border: "1px solid oklch(0.82 0.17 162 / 0.4)",
                  boxShadow:
                    "0 0 40px -8px oklch(0.82 0.17 162 / 0.6), inset 0 0 20px -6px oklch(0.82 0.17 162 / 0.3)",
                }}
              >
                <span className="font-display text-3xl font-bold text-[var(--omega-emerald)]">
                  Ω
                </span>
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="font-display text-2xl font-semibold tracking-tight text-[var(--omega-fg)]"
              >
                Omega Cloud
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.32 }}
                className="mt-2 max-w-xs text-sm leading-relaxed text-[var(--omega-fg-dim)]"
              >
                {isMandatoryAuth
                  ? "Sign in with Google to access your chats and memories."
                  : "Sign in with Google to access your chats and memories."}
              </motion.p>

              {/* Google sign-in button */}
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                onClick={handleSignIn}
                disabled={redirecting}
                data-cursor="hover"
                whileTap={{ scale: 0.97 }}
                className="group relative mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[var(--omega-emerald)] px-6 py-3.5 text-[15px] font-semibold text-[oklch(0.06_0.01_264)] shadow-[0_10px_40px_-10px_oklch(0.82_0.17_162_/_0.7)] transition-colors hover:bg-[oklch(0.88_0.15_162)] disabled:opacity-70"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {redirecting ? "Redirecting…" : "Sign in with Google"}
              </motion.button>

              {/* Feature badges */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-7 grid w-full grid-cols-2 gap-2.5"
              >
                {BADGES.map((b) => {
                  const Icon = b.icon;
                  return (
                    <div
                      key={b.label}
                      className="flex items-center gap-2 rounded-lg border border-[var(--omega-glass-border)] bg-[oklch(1_0_0_/_0.03)] px-3 py-2"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--omega-emerald)]" />
                      <span className="truncate text-[11px] text-[var(--omega-fg-dim)]">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </motion.div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="mt-6 text-center text-[10px] leading-relaxed text-[var(--omega-fg-dim)]/70"
              >
                By continuing, you agree to Omega's Terms & Privacy Policy.
                Your Google credentials never touch our servers — auth flows
                directly through Google.
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
