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
  images: {
    // next/image rejects any remote host not listed here. R2 CDN is where
    // all trainer/client photos live (see project_r2_storage memory); without
    // this, profile/cover/gallery images fall back to rendering alt text
    // and the RoundAvatar/TrainerCover components look broken.
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.replab.com' },
      // Fallback: default R2 public bucket domain on Cloudflare.
      { protocol: 'https', hostname: '**.r2.dev' },
    ],
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

// withSentryConfig wraps the Next config with Sentry's webpack plugin.
// The plugin does source-map upload + release tracking, BOTH of which
// talk to Sentry's API at build time and require SENTRY_AUTH_TOKEN. On
// Railway without that token, the plugin has failed the whole build
// (observed with commit 260aa31). Only wrap when the auth token is
// present — runtime error capture is driven by SENTRY_DSN at app boot,
// not by the webpack plugin, so Sentry still catches errors without
// the build-time wrapper.
const config: NextConfig = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: 'branden-vincent-walker',
      project: 'javascript-nextjs',
    })
  : nextConfig;

export default config;
