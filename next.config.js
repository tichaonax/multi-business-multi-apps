/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  // Enable instrumentation hook for background services
  experimental: {
    // instrumentationHook is now enabled by default
  },
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds
    ignoreBuildErrors: true,
  },
  // Skip trailing slash and middleware URL normalization
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Configure webpack for path mapping
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    };

    // Mark sharp as external for server-side to prevent webpack bundling issues
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('sharp');
    }

    return config;
  },
  // Add CORS headers for cross-origin authentication
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*', // Allow all origins for development - restrict in production
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With',
          },
          {
            key: 'Access-Control-Allow-Credentials',
            value: 'true',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig