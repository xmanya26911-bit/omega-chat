"use client";

import * as React from "react";
import { Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PanelRightOpen, X } from "lucide-react";
import { useOAuth } from "@/components/omega/hooks/use-oauth";
import { useAuthStore } from "@/components/omega/store/auth-store";
import { ChatSidebar } from "@/components/omega/chat/ChatSidebar";
import { ChatArea } from "@/components/omega/chat/ChatArea";
import { OmegaLogin } from "@/components/omega/sections/OmegaLogin";
import { SubscriptionDialog } from "@/components/omega/chat/SubscriptionDialog";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Loader — centered Ω with a soft pulse. Shown while the OAuth hook
 * restores the session from the stored refresh token.
 */
function ChatLoader() {
  return (
    <div className="relative flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-[var(--omega-bg)]">
      {/* subtle static aurora so the loader is not flat */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 35%, oklch(0.82 0.17 162 / 0.08), transparent 70%), radial-gradient(40% 35% at 80% 80%, oklch(0.85 0.15 82 / 0.06), transparent 70%)",
        }}
      />
      <motion.div
        animate={{
          opacity: [0.55, 1, 0.55],
          scale: [0.96, 1.04, 0.96],
        }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex size-20 items-center justify-center rounded-full font-display text-4xl font-semibold omega-text-aurora"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, oklch(0.82 0.17 162 / 0.18), transparent 70%)",
          border: "1px solid var(--omega-glass-border)",
        }}
        aria-label="Loading Omega"
      >
        Ω
      </motion.div>
    </div>
  );
}

/**
 * ChatShell — the auth-gated two-column layout. Renders only after the
 * OAuth hook resolves with an authenticated user.
 */
function ChatShell() {
  const { user } = useAuthStore();
  const { ready } = useOAuth();
  const openLoginOverlay = useAuthStore((s) => s.openLoginOverlay);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // If bounced back from landing with ?needAuth=1, open the login overlay.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("needAuth") === "1") {
      openLoginOverlay();
      // clean the URL
      window.history.replaceState(null, "", "/");
    }
  }, [openLoginOverlay]);

  // Auth gate: if ready and no user, show loader (they can use login overlay)
  React.useEffect(() => {
    if (ready && !user) {
      const t = setTimeout(() => {
        // Stay on page - login overlay will be open
      }, 50);
      return () => clearTimeout(t);
    }
  }, [ready, user]);

  if (!ready) return <ChatLoader />;

  return (
    <div
      className="relative flex h-[100dvh] w-screen overflow-hidden bg-[var(--omega-bg)] text-[var(--omega-fg)]"
    >
      {/* ── Static aurora background (lightweight, no canvas) ────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <div
          className="absolute -left-40 -top-40 size-[520px] rounded-full opacity-40 blur-[120px]"
          style={{ background: "oklch(0.82 0.17 162 / 0.16)" }}
        />
        <div
          className="absolute -right-32 top-1/3 size-[440px] rounded-full opacity-30 blur-[110px]"
          style={{ background: "oklch(0.85 0.15 82 / 0.14)" }}
        />
        <div
          className="absolute bottom-[-180px] left-1/2 size-[560px] -translate-x-1/2 rounded-full opacity-25 blur-[130px]"
          style={{ background: "oklch(0.7 0.21 14 / 0.12)" }}
        />
      </div>

      {/* ── Mobile hamburger ─────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className={cn(
          "fixed left-3 top-3 z-30 inline-flex size-9 items-center justify-center rounded-xl md:hidden",
          "omega-glass text-[var(--omega-fg-dim)]",
          "hover:text-[var(--omega-emerald)] active:scale-95",
          "transition-all"
        )}
        aria-label="Open sidebar"
      >
        <PanelRightOpen className="size-4" strokeWidth={2} />
      </button>

      {/* ── Two-column chat layout ───────────────────────────────────── */}
      <div className="relative z-10 flex h-full w-full">
        {/* Desktop sidebar (always inline) */}
        <div className="hidden md:flex">
          <ChatSidebar />
        </div>

        {/* Mobile sidebar overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: "spring", stiffness: 400, damping: 35 }}
                className="fixed left-0 top-0 z-50 h-full w-[280px] md:hidden"
              >
                <ChatSidebar />
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-lg text-[var(--omega-muted)] hover:text-[var(--omega-fg)]"
                  aria-label="Close sidebar"
                >
                  <X className="size-4" />
                </button>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex min-w-0 flex-1 flex-col md:ml-0">
          <ChatArea />
        </main>
      </div>

      {/* ── Login overlay (z-80, above cursor) ── */}
      <OmegaLogin />
      {/* ── Subscription dialog ── */}
      <SubscriptionDialog />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatLoader />}>
      <ChatShell />
    </Suspense>
  );
}
