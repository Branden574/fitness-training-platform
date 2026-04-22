// Next.js calls `register()` exactly once at app boot per runtime.
// Each runtime needs its own Sentry init file (server.config,
// edge.config) — we dynamically import the right one so the edge
// bundle doesn't accidentally drag in Node-only transports, and
// vice-versa. All init calls are no-ops when their DSN env vars
// are unset, so this module is safe to ship even without Sentry
// enabled on the Railway side yet.

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Next.js passes the request info through to this hook so Sentry can
// attribute the error to the right route + method. The argument types
// are defined inside @sentry/nextjs' Instrumentation module; use their
// re-export to stay source-compatible across SDK upgrades.
export const onRequestError: typeof import('@sentry/nextjs').captureRequestError =
  async (err, request, context) => {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureRequestError(err, request, context);
  };
