import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

// Validate and fix environment variables during build
if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('[your-railway-url]')) {
  console.warn('⚠️ NEXTAUTH_URL contains placeholder - using fallback for build');
  process.env.NEXTAUTH_URL = 'https://temp-build-url.com';
}

const nextConfig: NextConfig = {
  eslint: {
    // Errors fail the build; warnings (no-unused-vars, no-img-element,
    // exhaustive-deps, etc) still pass. FoodEntryModal's loose `any`
    // usage is disabled per-line with comments so cleanup is an explicit
    // follow-up rather than silent tech debt.
    ignoreDuringBuilds: false,
  },
  env: {
    // Ensure NEXTAUTH_URL has a valid fallback during build
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
  async redirects() {
    return [
      {
        source: '/contact',
        destination: '/apply',
        permanent: true,
      },
    ];
  },
};

// Sentry wrapper. Source-map upload is gated on SENTRY_AUTH_TOKEN so
// local dev + Railway-without-Sentry don't try to call Sentry's
// release API at build time.
export default withSentryConfig(nextConfig, {
  silent: true,
  // Matches the Sentry dashboard slugs — org was auto-created from Branden's
  // name, project got the default Next.js slug. Source-map upload (gated on
  // SENTRY_AUTH_TOKEN) needs these to be exact or it no-ops.
  org: 'branden-vincent-walker',
  project: 'javascript-nextjs',
  sourcemaps: process.env.SENTRY_AUTH_TOKEN
    ? undefined
    : { disable: true },
});
