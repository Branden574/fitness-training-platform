import * as Sentry from '@sentry/nextjs';

// Client-side init. No-op without NEXT_PUBLIC_SENTRY_DSN so the
// browser never calls Sentry when we haven't wired it. Replays are
// disabled by default (privacy + cost) and only captured on error.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.05,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    environment: process.env.NODE_ENV ?? 'development',
  });
}
