import * as Sentry from '@sentry/nextjs';

// Sentry server-side init. No-op when SENTRY_DSN is unset — so local
// dev + Railway before Branden signs up stay silent. Sample rate is
// tight (0.1) to stay inside Sentry's free tier at 50-100 trainers.
// /api/health is a monitoring probe (1 hit/min) and /api/notifications/stream
// is an SSE long-poll — excluding both keeps the transaction volume down.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV ?? 'development',
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    ignoreTransactions: ['/api/health', '/api/notifications/stream'],
  });
}
