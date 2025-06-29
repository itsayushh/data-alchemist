import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // TypeScript configuration - less strict
  typescript: {
    ignoreBuildErrors: false, // Set to true if you want to ignore TS errors during build
  },
  eslint: {
    ignoreDuringBuilds: false, // Set to true if you want to ignore ESLint during builds
    dirs: ['app', 'components', 'utils', 'lib', 'contexts', 'hooks'], // Specify directories to lint
  },

  // Webpack configuration for additional flexibility
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Allow importing of various file types
    config.module.rules.push({
      test: /\.(csv|txt|xlsx)$/,
      use: 'raw-loader',
    });

    config.ignoreWarnings = [
      /Failed to parse source map/,
    ];

    return config;
  },

  output: 'standalone', 
  async headers() {
    return [
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Be more specific in production
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
