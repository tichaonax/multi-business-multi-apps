/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable type checking during builds
    ignoreBuildErrors: true,
  },
  // Skip prerendering error pages to avoid Next-Auth Pages Router / App Router conflicts
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  experimental: {
    // Disable automatic error page generation
    skipPrerendering: false,
  },
}

module.exports = nextConfig