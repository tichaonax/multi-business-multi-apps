'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

// Same underlying component as restaurant's — it already reads businessType
// from context and calls the business-agnostic /api/universal/daily-sales,
// not a restaurant-specific endpoint, so it works correctly here unchanged.
// A thin wrapper (this file) is needed purely because Next.js App Router
// requires a physical page at each route; the actual reporting logic lives
// in one place.
export { default } from '../../../restaurant/reports/dashboard/page'
