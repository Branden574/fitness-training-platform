import * as Sentry from '@sentry/nextjs';

// Edge runtime init — applies to middleware.ts and any route that sets
// `export const runtime = 'edge'`. We barely use edge today but the
// config is required by @sentry/nextjs' instrumentation.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
  });
}
