'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

// See dashboard/page.tsx in this same folder for why this is a re-export.
// Shows saved end-of-day reports via the generic /api/reports/saved — will
// be sparse for vehicle_service until/unless it starts saving EOD reports,
// but not broken.
export { default } from '../../../restaurant/reports/history/page'
