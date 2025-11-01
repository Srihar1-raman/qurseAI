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
    ],
  },
};

// Only wrap with Sentry if DSN is configured
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      // Sentry webpack plugin options
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      // Upload source maps (only in production builds)
      hideSourceMaps: true,
      // Automatically instrument server routes
      widenClientFileUpload: true,
      // Transpile client-side code
      transpileClientSDK: true,
      // Tunnel requests to avoid ad blockers
      tunnelRoute: "/monitoring",
      // Enable route instrumentation
      routeInstrumentationOptions: {
        enabled: true,
      },
    })
  : nextConfig;
