/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  // Enable instrumentation hook for background services
  experimental: {
    // instrumentationHook is now enabled by default
    // Reduces webpack in-memory cache size during dev — prevents OOM after long sessions
    webpackMemoryOptimizations: true,
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
          {
            key: 'Access-Control-Expose-Headers',
            value: 'Content-Disposition, Content-Type',
          },
        ],
      },
      // MBM-298 — enables crossOriginIsolated mode (multi-threaded WASM) for
      // @imgly/background-removal's ONNX model, used by the product-photo
      // camera/crop pipeline. Without this it silently falls back to
      // single-threaded WASM and routinely exceeds the pipeline's own
      // timeout on real mobile devices. Scoped to only the pages that
      // actually render that pipeline (inventory item editors + POS "quick
      // edit" image upload) rather than site-wide, since
      // Cross-Origin-Embedder-Policy: require-corp can block cross-origin
      // images/scripts/embeds elsewhere in the app (device-integration and
      // Electron code paths) that aren't safe to test exhaustively here.
      {
        source: '/:business(restaurant|grocery|hardware|clothing)/inventory/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/:business(restaurant|grocery|hardware|clothing|universal)/pos/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/hardware/tools',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/inventory/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
      {
        source: '/vehicle-service/parts/:path*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ]
  },
}

module.exports = nextConfig