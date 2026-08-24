'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

// Reusing clothing's End of Day page — it's already fully business-agnostic
// under the hood (generic /api/universal/daily-sales, /api/reports/save,
// /api/rent-account/.../eod-transfer, /api/auto-deposits/.../process-eod —
// none of these are clothing-specific). See src/app/vehicle-service/reports/
// dashboard/page.tsx and sales-analytics/page.tsx for the same pattern.
//
// Known cosmetic gap: the page derives its own "Back to POS" link as
// `/${businessType}/pos`, which for vehicle_service resolves to
// `/vehicle_service/pos` (404) instead of the real route, `/universal/pos`.
// Not worth duplicating this 1100+ line page over — the sidebar and browser
// back button both work fine as a way back.
export { default } from '../../../clothing/reports/end-of-day/page'
