'use client'

// Force dynamic rendering for session-based pages
export const dynamic = 'force-dynamic';

import { R710SalesPanel } from '@/components/r710/r710-sales-panel'

export default function R710SalesPage() {
  return <R710SalesPanel />
}
