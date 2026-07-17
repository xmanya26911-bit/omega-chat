/**
 * Google OAuth access token — persisted in cookies.
 *
 * Two cookies are used:
 *   omega_at      — HTTP-only, for API requests (read by middleware.ts)
 *   omega_at_js   — JS-accessible, for direct Google Drive API calls from the browser
 *
 * Both survive page refresh. The HTTP-only cookie is XSS-proof for our API.
 * The JS-accessible cookie is needed for Drive — same XSS risk as localStorage.
 */

const COOKIE_NAME = "omega_at_js";
const MAX_AGE = 7200; // 2 hours (Google access tokens last ~1h, add buffer)

export function setAccessToken(t: string | null) {
  if (typeof document === "undefined") return;
  if (!t) {
    // Clear
    document.cookie = `${COOKIE_NAME}=; Secure; SameSite=Strict; path=/; max-age=0`;
    return;
  }
  document.cookie = `${COOKIE_NAME}=${t}; Secure; SameSite=Strict; path=/; max-age=${MAX_AGE}`;
}

export function getAccessToken(): string {
  if (typeof document === "undefined") return "";
  const row = document.cookie.split("; ").find((r) => r.startsWith(`${COOKIE_NAME}=`));
  return row ? row.slice(COOKIE_NAME.length + 1) : "";
}
