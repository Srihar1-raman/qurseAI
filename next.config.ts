import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/s2/favicons/**',
      },
    ],
  },
  // Exclude Sentry's optional dependencies from externalization
  // These packages should be bundled, not externalized (they're optional Sentry deps)
  serverExternalPackages: [],
  // Ignore ESLint errors during build for Vercel deployment
  // ESLint will still run in development and can be fixed incrementally
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during build (only if needed)
  // typescript: {
  //   ignoreBuildErrors: false, // Keep this false to catch TS errors
  // },
};

// Only wrap with Sentry if DSN is configured
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry webpack plugin options
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Automatically instrument server routes
      widenClientFileUpload: true,
      // Tunnel requests to avoid ad blockers
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
