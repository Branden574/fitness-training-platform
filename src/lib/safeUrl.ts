/**
 * Guard before embedding a URL in CSS `background: url(...)` or an <img>
 * src. Rejects `javascript:`, `data:`, `file:`, and anything exotic.
 * Accepted shapes:
 *   - `https://...` (absolute HTTPS)
 *   - `/...` (site-relative)
 * Returns the URL if safe, otherwise null.
 *
 * Defensive layer — JSON.stringify already prevents CSS escape-sequence
 * attacks, and modern browsers block `javascript:` in `url()` anyway, but
 * this future-proofs against a regression where a raw user-input URL
 * leaks into styles. Kept free of `server-only` so both server and
 * client components can call it.
 */
export function safeImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('/')) return url;
  return null;
}
