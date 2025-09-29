import type { NextConfig } from "next";

// Validate and fix environment variables during build
if (process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL.includes('[your-railway-url]')) {
  console.warn('⚠️ NEXTAUTH_URL contains placeholder - using fallback for build');
  process.env.NEXTAUTH_URL = 'https://temp-build-url.com';
}

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  env: {
    // Ensure NEXTAUTH_URL has a valid fallback during build
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  },
};

export default nextConfig;
