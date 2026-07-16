/**
 * Module-scoped Google OAuth access token.
 *
 * Stored in a closure variable instead of `window` to prevent
 * XSS / browser-extension theft via the global scope.
 */

let _token: string | null = null;

export function setAccessToken(t: string | null) {
  _token = t;
}

/** Returns the access token, or empty string if not set. */
export function getAccessToken(): string {
  return _token ?? "";
}
