import 'server-only';
import { NextResponse } from 'next/server';
import { checkRateLimitAsync } from './rate-limit';

// Shared guard for every upload endpoint (trainer photo, client photo,
// progress photos, transformations, exercise images). Centralizes the
// anti-abuse controls so new upload routes can't ship without them:
//
// 1. Per-user rate limit — prevents a malicious (or broken) client from
//    pinning the Railway container at 100% and burning R2 writes. Keyed
//    by session user id, not IP, so multiple tabs from one user share a
//    single bucket.
// 2. Content-Length pre-check — Next.js App Router has no default body
//    size limit, and `request.formData()` buffers the entire multipart
//    body into memory before any `file.size > N` check. An attacker
//    could otherwise send a 500MB multipart and OOM the container
//    before the size-per-file check kicks in. Short-circuit here.
//
// Content-Length is a client-supplied header and is spoofable, but that
// just means the attacker has to send a correct length. At that point
// the formData parser will see the honest byte count and the per-file
// checks inside the handler catch it. The value of this pre-check is
// rejecting honest-but-too-large requests before allocation.

export interface UploadGuardOptions {
  /** Used as part of the rate-limit bucket key. Pick a stable short tag. */
  scope: string;
  /** Session user id (stable per-user bucket key) */
  userId: string;
  /** Max total bytes the server will accept (all files + form fields). */
  maxBodyBytes: number;
  /** Requests per window per user. Default 20. */
  maxRequests?: number;
  /** Rate-limit window in seconds. Default 60. */
  windowSeconds?: number;
}

/**
 * Call at the top of every upload handler, immediately after the session
 * check. Returns null if the request passes all guards; otherwise returns
 * a Response ready to `return` from the handler.
 *
 * Async because the Upstash-backed rate limit is a network call. At the
 * call site: `const blocked = await guardUpload(...); if (blocked) return blocked;`
 */
export async function guardUpload(
  request: Request,
  opts: UploadGuardOptions,
): Promise<Response | null> {
  // Rate limit (Upstash in prod, in-memory otherwise)
  const rl = await checkRateLimitAsync(`upload:${opts.scope}:${opts.userId}`, {
    maxRequests: opts.maxRequests ?? 20,
    windowSeconds: opts.windowSeconds ?? 60,
  });
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many uploads. Please slow down and try again soon.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rl.resetIn),
        },
      },
    );
  }

  // Content-Length pre-check
  const header = request.headers.get('content-length');
  if (header) {
    const len = Number(header);
    if (Number.isFinite(len) && len > opts.maxBodyBytes) {
      return NextResponse.json(
        { error: 'Request too large.' },
        { status: 413 },
      );
    }
  }

  return null;
}
