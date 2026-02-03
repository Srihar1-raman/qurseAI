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
  serverExternalPackages: ['vega', 'vega-lite', 'vega-embed', 'vega-canvas', 'canvas'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Completely ignore canvas and vega-canvas modules
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'vega-canvas': false,
      '@napi-rs/canvas': false,
      'napi-rs/canvas': false,
    };
    
    // Make vega packages external for both client and server
    config.externals = config.externals || [];
    const externalPackages = ['vega', 'vega-lite', 'vega-embed', 'vega-canvas', 'canvas'];
    
    if (Array.isArray(config.externals)) {
      config.externals = [...config.externals, ...externalPackages];
    } else if (typeof config.externals === 'function') {
      const originalExternals = config.externals as any;
      config.externals = ({ request }: any, callback: any) => {
        if (externalPackages.includes(request)) {
          return callback(null, `commonjs ${request}`);
        }
        return originalExternals({ request }, callback);
      };
    }
    
    return config;
  },
};

export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: true,
      tunnelRoute: "/monitoring",
    })
  : nextConfig;
