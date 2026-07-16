"use client";

import { useEffect, useCallback } from "react";
import { useAuthStore, REFRESH_KEY, type OmegaUser } from "../store/auth-store";
import { useChatStore } from "../store/chat-store";

const GOOGLE_CLIENT_ID =
  "855819039877-5f4a8biid8hkf8j2hhd1jk3bj9ng2f5f.apps.googleusercontent.com";
const SCOPES =
  "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

// ── PKCE helpers ──────────────────────────────────────────────────────
function generateCodeVerifier(): string {
  const arr = new Uint8Array(96);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")
    .slice(0, 128);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateState(): string {
  return crypto.randomUUID();
}

// ── Token helpers ─────────────────────────────────────────────────────
async function exchangeCode(code: string, codeVerifier: string, redirectUri: string) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || "Token exchange failed");
  }
  return res.json();
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "refresh", refresh_token: refreshToken }),
  });
  if (!res.ok) {
    throw new Error("Refresh failed");
  }
  const data = await res.json();
  return data.access_token;
}

async function fetchUserInfo(accessToken: string): Promise<OmegaUser> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  const d = await res.json();
  return {
    email: d.email || "",
    name: d.name || d.email || "Omega User",
    picture: d.picture || "",
    sub: d.sub || "",
  };
}

/**
 * useOAuth — drives the full Google PKCE auth lifecycle:
 *  - beginLogin(): generate verifier/challenge/state → redirect to Google
 *  - on mount: if `?code=` in URL → exchange, fetch user, clean URL → /chat
 *               else try to restore session from stored refresh token
 *  - signOut(): clears everything
 *  - exposes auth state from the auth store
 */
export function useOAuth() {
  const {
    user,
    accessToken,
    ready,
    loginOverlayOpen,
    setUser,
    setAccessToken,
    setReady,
    openLoginOverlay,
    closeLoginOverlay,
    signOut: storeSignOut,
  } = useAuthStore();

  // Chat app URL from env or fallback to current origin
  const chatAppUrl = process.env.NEXT_PUBLIC_CHAT_APP_URL || (typeof window !== "undefined" ? window.location.origin : "");

  // ── Begin login: PKCE redirect ────────────────────────────────────
  const beginLogin = useCallback(async () => {
    // Use env var for chat app URL, fallback to current origin
    const chatAppUrl = process.env.NEXT_PUBLIC_CHAT_APP_URL || window.location.origin;
    const state = generateState();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    sessionStorage.setItem("omega_state", state);
    sessionStorage.setItem("omega_verifier", verifier);

    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: chatAppUrl,
      response_type: "code",
      scope: SCOPES,
      state,
      code_challenge_method: "S256",
      code_challenge: challenge,
      access_type: "offline",
      prompt: "consent",
    });
    window.location.href = `${AUTH_URL}?${params.toString()}`;
  }, []);

  // ── Handle redirect-back or restore on mount ──────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      console.log('[useOAuth] init start');
      // 1. Check for OAuth redirect (?code= in URL)
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const incomingState = url.searchParams.get("state");

      if (code) {
        console.log('[useOAuth] code found in URL');
        const storedState = sessionStorage.getItem("omega_state");
        const verifier = sessionStorage.getItem("omega_verifier");
        // CSRF check
        if (!storedState || storedState !== incomingState || !verifier) {
          console.log('[useOAuth] CSRF check failed');
          history.replaceState(null, "", "/");
          if (!cancelled) setReady(true);
          return;
        }
        try {
          const data = await exchangeCode(code, verifier, chatAppUrl);
          if (cancelled) return;
          setAccessToken(data.access_token);
          if (data.refresh_token) {
            localStorage.setItem(REFRESH_KEY, data.refresh_token);
          }
          const u = await fetchUserInfo(data.access_token);
          if (cancelled) return;
          setUser(u);
          sessionStorage.removeItem("omega_state");
          sessionStorage.removeItem("omega_verifier");
          history.replaceState(null, "", "/chat");
          setReady(true);
          console.log('[useOAuth] OAuth success, ready=true');
        } catch (err) {
          console.error('[useOAuth] OAuth error:', err);
          history.replaceState(null, "", "/");
          if (!cancelled) setReady(true);
        }
        return;
      }

      // 2. No code → try restore from stored user + refresh token
      console.log('[useOAuth] No code, trying restore');
      const storedUser = localStorage.getItem("omega_user");
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (storedUser && refreshToken) {
        try {
          const fresh = await refreshAccessToken(refreshToken);
          if (cancelled) return;
          setAccessToken(fresh);
          setUser(JSON.parse(storedUser) as OmegaUser);
          setReady(true);
          console.log('[useOAuth] Restored from refresh token');
        } catch (err) {
          console.error('[useOAuth] Refresh failed:', err);
          localStorage.removeItem("omega_user");
          localStorage.removeItem(REFRESH_KEY);
          setUser(null);
          setAccessToken(null);
          setReady(true);
        }
      } else {
        console.log('[useOAuth] No stored session, ready=true');
        setReady(true);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Sign out ─────────────────────────────────────────────────────
  const signOut = useCallback(() => {
    storeSignOut();
    useChatStore.getState().clearAll();
    // back to landing page
    if (typeof window !== "undefined") {
      const landingUrl = process.env.NEXT_PUBLIC_LANDING_APP_URL || "https://omega-nine-weld.vercel.app";
      window.location.href = landingUrl;
    }
  }, [storeSignOut]);

  return {
    user,
    accessToken,
    ready,
    loginOverlayOpen,
    beginLogin,
    signOut,
    openLoginOverlay,
    closeLoginOverlay,
  };
}
