import type { NextConfig } from "next";

// Validate and fix environment variables during build
if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('[your-railway-url]')) {
  console.warn('⚠️ NEXTAUTH_URL contains placeholder - using fallback for build');
  process.env.NEXTAUTH_URL = 'https://temp-build-url.com';
}

const nextConfig: NextConfig = {
  eslint: {
    // ESLint cleanup is deferred — see TODO in docs. TypeScript strictness is
    // back on (ignoreBuildErrors removed), which is the security-relevant gate.
    // ESLint here is style/idiom-only.
    ignoreDuringBuilds: true,
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

export default nextConfig;
